import { ProxyItem, ProxyType } from '../renderer/types';

export interface ParsedProxy {
  type: ProxyType;
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  change_url?: string | null;
}

/**
 * Clean and normalize host (remove http://, https://, socks5://, slashes, ports)
 */
export function cleanHost(rawHost: string): { host: string; port?: number } {
  if (!rawHost) return { host: '' };

  let h = rawHost.trim();
  // Strip protocol
  h = h.replace(/^(https?|socks5|socks4):\/\//i, '');
  // Strip credentials if present in host field
  if (h.includes('@')) {
    h = h.split('@')[1];
  }
  // Strip trailing slash
  h = h.replace(/\/.*$/, '').trim();

  // Check if port is inside host string e.g. "134.195.155.129:9559"
  if (h.includes(':')) {
    const parts = h.split(':');
    const portNum = parseInt(parts[1], 10);
    return {
      host: parts[0].trim(),
      port: isNaN(portNum) ? undefined : portNum,
    };
  }

  return { host: h };
}

/**
 * Intelligently parse any proxy string format:
 * - http://user:pass@ip:port
 * - socks5://ip:port:user:pass
 * - ip:port:user:pass
 * - ip:port@user:pass
 * - ip:port (space / tab / colon / semicolon)
 */
export function parseProxyString(raw: string, fallbackType: ProxyType = 'http'): ParsedProxy | null {
  if (!raw || !raw.trim()) return null;

  let str = raw.trim();
  let type: ProxyType = fallbackType;

  // Detect protocol prefix
  if (/^socks5:\/\//i.test(str)) {
    type = 'socks5';
    str = str.replace(/^socks5:\/\//i, '');
  } else if (/^https:\/\//i.test(str)) {
    type = 'https';
    str = str.replace(/^https:\/\//i, '');
  } else if (/^http:\/\//i.test(str)) {
    type = 'http';
    str = str.replace(/^http:\/\//i, '');
  }

  // Check URL with credentials: user:pass@host:port
  if (str.includes('@')) {
    const [authPart, hostPart] = str.split('@');
    const authTokens = authPart.split(':');
    const hostTokens = hostPart.split(':');

    return {
      type,
      host: hostTokens[0].replace(/\/.*$/, '').trim(),
      port: parseInt(hostTokens[1], 10) || 8080,
      username: authTokens[0] ? decodeURIComponent(authTokens[0].trim()) : null,
      password: authTokens[1] ? decodeURIComponent(authTokens[1].trim()) : null,
    };
  }

  // Delimiter split: supports colon (:), semicolon (;), tab (\t), or space ( )
  let delimiter = ':';
  if (str.includes(';')) delimiter = ';';
  else if (str.includes('\t')) delimiter = '\t';
  else if (str.includes('|')) delimiter = '|';
  else if (str.includes(' ') && !str.includes(':')) delimiter = ' ';

  const parts = str.split(delimiter).map((s) => s.trim()).filter(Boolean);

  if (parts.length === 0) return null;

  // Pattern: IP:PORT:USER:PASS
  if (parts.length >= 4) {
    return {
      type,
      host: cleanHost(parts[0]).host,
      port: parseInt(parts[1], 10) || 8080,
      username: parts[2] || null,
      password: parts[3] || null,
    };
  }

  // Pattern: USER:PASS:IP:PORT (some providers)
  if (parts.length === 4 && isNaN(Number(parts[1])) && !isNaN(Number(parts[3]))) {
    return {
      type,
      host: cleanHost(parts[2]).host,
      port: parseInt(parts[3], 10) || 8080,
      username: parts[0] || null,
      password: parts[1] || null,
    };
  }

  // Pattern: IP:PORT
  if (parts.length >= 2) {
    const cleaned = cleanHost(parts[0]);
    return {
      type,
      host: cleaned.host,
      port: parseInt(parts[1], 10) || cleaned.port || 8080,
      username: null,
      password: null,
    };
  }

  // Only IP provided
  const single = cleanHost(parts[0]);
  return {
    type,
    host: single.host,
    port: single.port || 8080,
    username: null,
    password: null,
  };
}

/**
 * Clean an existing proxy object to guarantee valid host & port
 */
export function sanitizeProxy(proxy: Partial<ProxyItem>): {
  type: ProxyType;
  host: string;
  port: number;
  username: string | null;
  password: string | null;
} {
  const type = proxy.type || 'http';
  let rawHost = (proxy.host || '').trim();
  let port = Number(proxy.port) || 8080;
  let username = proxy.username ? String(proxy.username).trim() : null;
  let password = proxy.password ? String(proxy.password).trim() : null;

  // If host contains full string or protocol
  const parsed = parseProxyString(rawHost, type);
  if (parsed && parsed.host) {
    rawHost = parsed.host;
    if (parsed.port && parsed.port !== 8080) port = parsed.port;
    if (parsed.username && !username) username = parsed.username;
    if (parsed.password && !password) password = parsed.password;
    if (parsed.type && !proxy.type) (proxy as any).type = parsed.type;
  } else {
    const cleaned = cleanHost(rawHost);
    rawHost = cleaned.host;
    if (cleaned.port) port = cleaned.port;
  }

  return {
    type,
    host: rawHost,
    port,
    username: username || null,
    password: password || null,
  };
}
