import assert from 'assert';
import http from 'http';
import net from 'net';
import { createLocalProxyBridge } from '../src/main/localProxyBridge';

console.log('====================================================');
console.log('  TEST SUITE 4: Local Proxy Bridge (Auth Auto-Inject)');
console.log('====================================================');

async function testBridge() {
  // 1. Mock an upstream proxy that requires Basic Auth
  let authHeaderReceived = '';
  const mockUpstream = http.createServer((req, res) => {
    authHeaderReceived = req.headers['proxy-authorization'] || '';
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('UPSTREAM_OK');
  });

  await new Promise<void>((resolve) => mockUpstream.listen(0, '127.0.0.1', () => resolve()));
  const upstreamPort = (mockUpstream.address() as net.AddressInfo).port;
  console.log(`[Step 1] Mock upstream proxy listening on port ${upstreamPort}`);

  // 2. Start local bridge pointing to mock upstream with auth credentials
  const bridge = await createLocalProxyBridge({
    host: '127.0.0.1',
    port: upstreamPort,
    type: 'http',
    username: 'test_user',
    password: 'secret_password',
  });
  console.log(`[Step 2] Local proxy bridge started on port ${bridge.port}`);

  // 3. Make an unauthenticated request from client to local bridge (simulating Chromium)
  const clientReq = http.request({
    host: '127.0.0.1',
    port: bridge.port,
    path: 'http://example.com/test',
    method: 'GET',
    headers: {
      Host: 'example.com',
    },
  });

  const responseText = await new Promise<string>((resolve, reject) => {
    clientReq.on('response', (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    });
    clientReq.on('error', reject);
    clientReq.end();
  });

  console.log(`[Step 3] Client received response: ${responseText}`);
  assert.strictEqual(responseText, 'UPSTREAM_OK');

  // Verify that bridge automatically injected credentials to upstream
  const expectedAuth = `Basic ${Buffer.from('test_user:secret_password').toString('base64')}`;
  assert.strictEqual(authHeaderReceived, expectedAuth);
  console.log(`[Step 4] Verified Proxy-Authorization was automatically injected: ${authHeaderReceived}`);

  // Clean up
  await bridge.close();
  await new Promise<void>((resolve) => mockUpstream.close(() => resolve()));
  console.log(`[Step 5] Closed bridge and mock upstream cleanly.`);

  console.log('\n>>> LOCAL PROXY BRIDGE TEST PASSED! No credentials prompt will ever appear in Chromium!\n');
}

testBridge().catch((err) => {
  console.error('Bridge test failed:', err);
  process.exit(1);
});
