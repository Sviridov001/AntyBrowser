import assert from 'assert';
import { parseProxyString, cleanHost, sanitizeProxy } from '../src/shared/proxyUtils';

console.log('====================================================');
console.log('  TEST SUITE 3: Proxy Parsing & Sanitization Test');
console.log('====================================================');

// Test 1: Full URL with protocol
const p1 = parseProxyString('http://134.195.155.129:9559');
assert.ok(p1);
assert.strictEqual(p1.type, 'http');
assert.strictEqual(p1.host, '134.195.155.129');
assert.strictEqual(p1.port, 9559);
console.log('[OK] Parsed http://134.195.155.129:9559');

// Test 2: URL with credentials
const p2 = parseProxyString('http://rPwttd:secret123@134.195.155.129:9559');
assert.ok(p2);
assert.strictEqual(p2.type, 'http');
assert.strictEqual(p2.host, '134.195.155.129');
assert.strictEqual(p2.port, 9559);
assert.strictEqual(p2.username, 'rPwttd');
assert.strictEqual(p2.password, 'secret123');
console.log('[OK] Parsed http://rPwttd:secret123@134.195.155.129:9559');

// Test 3: SOCKS5 format
const p3 = parseProxyString('socks5://user:pass@95.164.111.109:9055');
assert.ok(p3);
assert.strictEqual(p3.type, 'socks5');
assert.strictEqual(p3.host, '95.164.111.109');
assert.strictEqual(p3.port, 9055);
assert.strictEqual(p3.username, 'user');
assert.strictEqual(p3.password, 'pass');
console.log('[OK] Parsed socks5://user:pass@95.164.111.109:9055');

// Test 4: Delimiter format IP:PORT:USER:PASS
const p4 = parseProxyString('134.195.155.129:9559:rPwttd:mypass');
assert.ok(p4);
assert.strictEqual(p4.host, '134.195.155.129');
assert.strictEqual(p4.port, 9559);
assert.strictEqual(p4.username, 'rPwttd');
assert.strictEqual(p4.password, 'mypass');
console.log('[OK] Parsed 134.195.155.129:9559:rPwttd:mypass');

// Test 5: What the user in the screenshot entered:
// Host field contained "http://134.195.155.129", port field was "9559"
const sanitized = sanitizeProxy({
  host: 'http://134.195.155.129',
  port: 9559,
  username: 'rPwttd',
  password: 'secret',
  type: 'http',
});
assert.strictEqual(sanitized.host, '134.195.155.129');
assert.strictEqual(sanitized.port, 9559);
assert.strictEqual(sanitized.username, 'rPwttd');
assert.strictEqual(sanitized.password, 'secret');
assert.ok(!sanitized.host.includes('http'), 'Host must not contain http protocol');
console.log('[OK] Sanitized user input from screenshot (http:// prefix successfully stripped)');

// Test 6: Host field with slash or port
const cleanedHost = cleanHost('http://95.164.111.109:9055/');
assert.strictEqual(cleanedHost.host, '95.164.111.109');
assert.strictEqual(cleanedHost.port, 9055);
console.log('[OK] Cleaned host with trailing slash and port');

console.log('\n>>> PROXY PARSING & SANITIZATION TEST PASSED!\n');
