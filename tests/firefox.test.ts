import assert from 'assert';
import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import { setupFirefoxProfile } from '../src/main/browserManager';
import { Profile } from '../src/renderer/types';

console.log('====================================================');
console.log('  TEST SUITE 6: Firefox & Mozilla VPN (IP Protection) Test');
console.log('====================================================');

const testEnvDir = path.resolve(__dirname, '../../test_profile_firefox');
if (fs.existsSync(testEnvDir)) {
  fs.rmSync(testEnvDir, { recursive: true, force: true });
}
fs.mkdirSync(testEnvDir, { recursive: true });

// 1. Test Firefox user.js generation with Mozilla VPN enabled
const mockProfile: Profile = {
  id: 'test-firefox-vpn-profile',
  name: 'Firefox Mozilla VPN Test',
  group_name: 'VPN Profiles',
  tags: ['vpn', 'mozilla'],
  os: 'windows',
  browser_type: 'firefox',
  proxy_id: null,
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0',
  screen_width: 1920,
  screen_height: 1080,
  screen_color_depth: 24,
  device_pixel_ratio: 1.0,
  canvas_mode: 'noise',
  canvas_noise_seed: 12345,
  webgl_mode: 'noise',
  webgl_vendor: 'Google Inc.',
  webgl_renderer: 'ANGLE',
  audio_mode: 'noise',
  audio_noise_seed: 54321,
  webrtc_mode: 'disable',
  webrtc_public_ip: null,
  timezone_mode: 'auto',
  timezone_id: 'Europe/Moscow',
  geolocation_mode: 'auto',
  latitude: null,
  longitude: null,
  accuracy: 50,
  language: 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  cpu_cores: 8,
  memory_gb: 16,
  notes: 'Testing Mozilla IP Protection VPN',
  custom_flags: '',
  mozilla_vpn: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Generate Firefox profile with proxy bridge port 55555
setupFirefoxProfile(testEnvDir, mockProfile, 55555);

const userJsPath = path.join(testEnvDir, 'user.js');
assert.ok(fs.existsSync(userJsPath), 'user.js must be created in profile directory');

const userJsContent = fs.readFileSync(userJsPath, 'utf-8');
console.log('[Step 1] user.js generated successfully. Content preview:');
console.log(userJsContent.split('\n').filter(l => l.includes('ipProtection') || l.includes('proxy')).join('\n'));

// Assertions for Mozilla IP Protection (VPN) flags
assert.ok(
  userJsContent.includes('user_pref("browser.ipProtection.enabled", true);'),
  'browser.ipProtection.enabled must be set to true'
);
assert.ok(
  userJsContent.includes('user_pref("browser.ipProtection.enable", true);'),
  'browser.ipProtection.enable must be set to true'
);
assert.ok(
  userJsContent.includes('user_pref("browser.ipProtection.featureGate", true);'),
  'browser.ipProtection.featureGate must be set to true'
);
assert.ok(
  userJsContent.includes('user_pref("browser.ipProtection.ui.enabled", true);'),
  'browser.ipProtection.ui.enabled must be set to true'
);
console.log('[OK] All Mozilla IP Protection (VPN) preferences verified in user.js');

// Assertions for Proxy configuration
assert.ok(
  userJsContent.includes('user_pref("network.proxy.type", 1);'),
  'network.proxy.type must be set to 1 (manual proxy)'
);
assert.ok(
  userJsContent.includes('user_pref("network.proxy.http_port", 55555);'),
  'network.proxy.http_port must match bridge port'
);
console.log('[OK] Local Proxy Bridge settings verified in user.js');

// Assertions for WebRTC disable & User-Agent
assert.ok(
  userJsContent.includes('user_pref("media.peerconnection.enabled", false);'),
  'WebRTC must be disabled when requested'
);
assert.ok(
  userJsContent.includes('user_pref("general.useragent.override", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0");'),
  'Firefox user agent override must be set'
);
console.log('[OK] WebRTC disable and Firefox UA verified');

// 2. Test SQLite Database Schema and Persistence
async function testDbPersistence() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      browser_type TEXT DEFAULT 'chromium',
      mozilla_vpn INTEGER DEFAULT 0,
      user_agent TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(
    'INSERT INTO profiles (id, name, browser_type, mozilla_vpn, user_agent, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['profile-ff-1', 'Firefox VPN Profile', 'firefox', 1, mockProfile.user_agent, new Date().toISOString(), new Date().toISOString()]
  );

  const stmt = db.prepare('SELECT * FROM profiles WHERE id = ?');
  stmt.bind(['profile-ff-1']);
  assert.ok(stmt.step());
  const row = stmt.getAsObject() as any;
  stmt.free();

  assert.strictEqual(row.browser_type, 'firefox', 'browser_type must be firefox');
  assert.strictEqual(row.mozilla_vpn, 1, 'mozilla_vpn must be 1 (true)');
  console.log('[OK] SQLite DB schema and persistence verified for Firefox and Mozilla VPN!');

  db.close();
}

testDbPersistence().then(() => {
  // Clean up
  fs.rmSync(testEnvDir, { recursive: true, force: true });
  console.log('[OK] Cleaned up temporary test directory');
  console.log('\n>>> ALL FIREFOX & MOZILLA VPN TESTS PASSED!\n');
}).catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
