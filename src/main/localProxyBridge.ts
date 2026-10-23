import http from 'http';
import net from 'net';
import { SocksClient } from 'socks';
import { ProxyItem } from '../renderer/types';
import { sanitizeProxy } from '../shared/proxyUtils';

export interface LocalProxyBridge {
  port: number;
  server: http.Server;
  close: () => Promise<void>;
}

/**
 * Creates an unauthenticated local loopback proxy bridge on 127.0.0.1
 * that forwards all browser traffic to the upstream authenticated HTTP/HTTPS or SOCKS5 proxy.
 * This completely eliminates the Chromium "Proxy Authentication Required" popup.
 */
export function createLocalProxyBridge(rawProxy: Partial<ProxyItem>): Promise<LocalProxyBridge> {
  const proxy = sanitizeProxy(rawProxy);

  return new Promise((resolve, reject) => {
    const authHeader = (proxy.username && proxy.password)
      ? `Basic ${Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64')}`
      : null;

    const server = http.createServer((req, res) => {
      // Handle plain HTTP proxy requests
      if (proxy.type === 'socks5') {
        // Plain HTTP over SOCKS5 upstream
        try {
          const parsedUrl = new URL(req.url!);
          const targetHost = parsedUrl.hostname;
          const targetPort = parseInt(parsedUrl.port || '80', 10);

          SocksClient.createConnection({
            proxy: {
              host: proxy.host,
              port: proxy.port,
              type: 5,
              userId: proxy.username || undefined,
              password: proxy.password || undefined,
            },
            command: 'connect',
            destination: {
              host: targetHost,
              port: targetPort,
            },
            timeout: 15000,
          })
            .then((info) => {
              const upstreamReq = http.request(
                req.url!,
                {
                  method: req.method,
                  headers: req.headers,
                  createConnection: () => info.socket,
                },
                (upstreamRes) => {
                  res.writeHead(upstreamRes.statusCode || 200, upstreamRes.headers);
                  upstreamRes.pipe(res);
                }
              );

              upstreamReq.on('error', (err) => {
                res.writeHead(502);
                res.end(`SOCKS5 upstream error: ${err.message}`);
              });

              req.pipe(upstreamReq);
            })
            .catch((err) => {
              res.writeHead(502);
              res.end(`SOCKS5 connect error: ${err.message}`);
            });
        } catch (e: any) {
          res.writeHead(500);
          res.end(`Invalid URL: ${e.message}`);
        }
      } else {
        // Plain HTTP over HTTP upstream proxy
        const headers = { ...req.headers };
        if (authHeader) {
          headers['proxy-authorization'] = authHeader;
        }

        const upstreamReq = http.request(
          {
            host: proxy.host,
            port: proxy.port,
            path: req.url,
            method: req.method,
            headers,
          },
          (upstreamRes) => {
            res.writeHead(upstreamRes.statusCode || 200, upstreamRes.headers);
            upstreamRes.pipe(res);
          }
        );

        upstreamReq.on('error', (err) => {
          res.writeHead(502);
          res.end(`HTTP proxy upstream error: ${err.message}`);
        });

        req.pipe(upstreamReq);
      }
    });

    // Handle HTTPS CONNECT tunneling
    server.on('connect', (req, clientSocket, head) => {
      const [targetHost, targetPortStr] = (req.url || '').split(':');
      const targetPort = parseInt(targetPortStr || '443', 10);

      if (proxy.type === 'socks5') {
        // SOCKS5 HTTPS tunnel
        SocksClient.createConnection({
          proxy: {
            host: proxy.host,
            port: proxy.port,
            type: 5,
            userId: proxy.username || undefined,
            password: proxy.password || undefined,
          },
          command: 'connect',
          destination: {
            host: targetHost,
            port: targetPort,
          },
          timeout: 15000,
        })
          .then((info) => {
            clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
            if (head && head.length > 0) {
              info.socket.write(head);
            }
            info.socket.pipe(clientSocket);
            clientSocket.pipe(info.socket);

            info.socket.on('error', () => clientSocket.destroy());
            clientSocket.on('error', () => info.socket.destroy());
          })
          .catch((err) => {
            clientSocket.write(`HTTP/1.1 502 Bad Gateway\r\n\r\nSOCKS5 Connect Failed: ${err.message}`);
            clientSocket.destroy();
          });
      } else {
        // HTTP / HTTPS Upstream proxy CONNECT tunnel
        const upstreamSocket = net.connect(proxy.port, proxy.host, () => {
          let connectPayload = `CONNECT ${req.url} HTTP/1.1\r\nHost: ${req.url}\r\n`;
          if (authHeader) {
            connectPayload += `Proxy-Authorization: ${authHeader}\r\n`;
          }
          connectPayload += '\r\n';

          upstreamSocket.write(connectPayload);
        });

        let headersReceived = false;
        let buffer = Buffer.alloc(0);

        upstreamSocket.on('data', (chunk: Buffer | string) => {
          if (!headersReceived) {
            const chunkBuf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
            buffer = Buffer.concat([buffer, chunkBuf]);
            const headerEndIndex = buffer.indexOf('\r\n\r\n');

            if (headerEndIndex !== -1) {
              headersReceived = true;
              const headerStr = buffer.slice(0, headerEndIndex).toString('ascii');
              const remainder = buffer.slice(headerEndIndex + 4);

              // Check if upstream accepted CONNECT
              if (headerStr.includes('200')) {
                clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                if (remainder.length > 0) {
                  clientSocket.write(remainder);
                }
                if (head && head.length > 0) {
                  upstreamSocket.write(head);
                }
                // Pipe client and upstream sockets directly
                upstreamSocket.pipe(clientSocket);
                clientSocket.pipe(upstreamSocket);
              } else {
                // Upstream rejected CONNECT (e.g. 407 or 403)
                clientSocket.write(buffer);
                clientSocket.destroy();
                upstreamSocket.destroy();
              }
            }
          }
        });

        upstreamSocket.on('error', (err) => {
          clientSocket.write(`HTTP/1.1 502 Bad Gateway\r\n\r\nProxy Error: ${err.message}`);
          clientSocket.destroy();
        });

        clientSocket.on('error', () => {
          upstreamSocket.destroy();
        });
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as net.AddressInfo;
      const port = addr.port;
      console.log(`[AntyBrowser] Local authenticated proxy bridge started on 127.0.0.1:${port} -> ${proxy.host}:${proxy.port}`);

      resolve({
        port,
        server,
        close: () =>
          new Promise<void>((res) => {
            server.close(() => res());
          }),
      });
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}
