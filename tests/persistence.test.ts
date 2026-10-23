import path from 'path';
import fs from 'fs';
import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';

// Test isolated portable directory
const TEST_DIR = path.resolve(__dirname, '../../test_run_env_pc1');

async function runPersistenceTests() {
  console.log('====================================================');
  console.log('  TEST SUITE 1: Profile & Data Persistence Test');
  console.log('====================================================');

  // Clean test directory
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });

  // Point portable env to TEST_DIR
  process.env.PORTABLE_EXECUTABLE_DIR = TEST_DIR;

  // Import after setting env
  const { initDatabase, queryAll, queryOne, runQuery } = require('../../dist-electron/main/db');
  const { getPortablePaths } = require('../../dist-electron/main/paths');
  const { exportProfileCookies, importProfileCookies } = require('../../dist-electron/main/browserManager');
  const { generateRandomFingerprint } = require('../../dist-electron/main/fingerprint');

  const paths = getPortablePaths();
  console.log(`[OK] Portable paths initialized at: ${paths.appDir}`);
  assert.strictEqual(paths.appDir, TEST_DIR);
  assert.strictEqual(paths.dataDir, path.join(TEST_DIR, 'data'));

  // 1. Initialize SQLite
  await initDatabase();
  console.log(`[OK] SQLite database created at: ${paths.dbPath}`);
  assert.ok(fs.existsSync(paths.dbPath), 'database.sqlite should exist');

  // 2. Create 3 independent profiles
  const profile1Id = uuidv4();
  const profile2Id = uuidv4();
  const profile3Id = uuidv4();

  const fp1 = generateRandomFingerprint('windows');
  const fp2 = generateRandomFingerprint('macos');
  const fp3 = generateRandomFingerprint('linux');

  const now = new Date().toISOString();

  runQuery(
    `INSERT INTO profiles (
      id, name, group_name, tags, os, browser_type, user_agent,
      screen_width, screen_height, canvas_mode, canvas_noise_seed,
      webgl_mode, webgl_vendor, webgl_renderer, audio_mode, audio_noise_seed,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profile1Id,
      'FB Ads Profile #1',
      'Facebook',
      JSON.stringify(['FB', 'Crypto', 'US']),
      'windows',
      'chromium',
      fp1.user_agent,
      fp1.screen_width,
      fp1.screen_height,
      'noise',
      11111,
      'noise',
      fp1.webgl_vendor,
      fp1.webgl_renderer,
      'noise',
      22222,
      now,
      now,
    ]
  );

  runQuery(
    `INSERT INTO profiles (
      id, name, group_name, tags, os, browser_type, user_agent,
      screen_width, screen_height, canvas_mode, canvas_noise_seed,
      webgl_mode, webgl_vendor, webgl_renderer, audio_mode, audio_noise_seed,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profile2Id,
      'Google Crypto Profile #2',
      'Crypto',
      JSON.stringify(['Google', 'MetaMask']),
      'macos',
      'chromium',
      fp2.user_agent,
      fp2.screen_width,
      fp2.screen_height,
      'noise',
      33333,
      'noise',
      fp2.webgl_vendor,
      fp2.webgl_renderer,
      'noise',
      44444,
      now,
      now,
    ]
  );

  runQuery(
    `INSERT INTO profiles (
      id, name, group_name, tags, os, browser_type, user_agent,
      screen_width, screen_height, canvas_mode, canvas_noise_seed,
      webgl_mode, webgl_vendor, webgl_renderer, audio_mode, audio_noise_seed,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profile3Id,
      'E-Commerce Stealth #3',
      'Shopify',
      JSON.stringify(['Ecom', 'Proxy']),
      'linux',
      'chromium',
      fp3.user_agent,
      fp3.screen_width,
      fp3.screen_height,
      'real',
      55555,
      'real',
      fp3.webgl_vendor,
      fp3.webgl_renderer,
      'real',
      66666,
      now,
      now,
    ]
  );

  const allProfiles = queryAll('SELECT * FROM profiles');
  assert.strictEqual(allProfiles.length, 3, 'Should have 3 saved profiles');
  console.log(`[OK] Created 3 independent profiles in SQLite database`);

  // 3. Test Proxy persistence
  const proxyId = uuidv4();
  runQuery(
    `INSERT INTO proxies (id, name, type, host, port, username, password, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [proxyId, 'US Residential SOCKS5', 'socks5', '198.51.100.25', 1080, 'test_user', 'secr3t_pass', now]
  );
  const savedProxy = queryOne('SELECT * FROM proxies WHERE id = ?', [proxyId]);
  assert.ok(savedProxy, 'Proxy should be saved in DB');
  assert.strictEqual(savedProxy.host, '198.51.100.25');
  console.log(`[OK] Saved proxy with authentication in database`);

  // 4. Test Cookies persistence (JSON & Netscape)
  const testCookiesJson = JSON.stringify([
    {
      name: 'auth_token',
      value: 'jwt_secure_session_token_xyz123',
      domain: '.facebook.com',
      path: '/',
      secure: true,
      httpOnly: true,
    },
    {
      name: 'c_user',
      value: '1000847291847',
      domain: '.facebook.com',
      path: '/',
    },
  ]);

  const importedCount = importProfileCookies(profile1Id, testCookiesJson);
  assert.strictEqual(importedCount, 2, 'Should import 2 cookies');
  console.log(`[OK] Imported ${importedCount} cookies via JSON format into profile 1`);

  // Verify cookie file on disk
  const cookieFile = path.join(paths.profilesDir, profile1Id, 'cookies.json');
  assert.ok(fs.existsSync(cookieFile), 'cookies.json should exist inside profile directory');
  const diskCookies = JSON.parse(fs.readFileSync(cookieFile, 'utf-8'));
  assert.strictEqual(diskCookies[0].name, 'auth_token');
  assert.strictEqual(diskCookies[1].value, '1000847291847');
  console.log(`[OK] Cookies strictly stored in isolated profile directory: ${cookieFile}`);

  // Test Netscape export & import
  const netscapeExport = exportProfileCookies(profile1Id, 'netscape');
  assert.ok(netscapeExport.includes('auth_token'), 'Netscape export should include cookie name');
  console.log(`[OK] Netscape cookies export validated`);

  const netscapeCount = importProfileCookies(profile2Id, netscapeExport);
  assert.strictEqual(netscapeCount, 2, 'Netscape import should parse 2 cookies');
  console.log(`[OK] Imported Netscape cookies into profile 2`);

  // 5. Test Settings persistence
  runQuery(`INSERT INTO settings (key, value) VALUES ('api_port', '3001')`);
  const settingRow = queryOne(`SELECT value FROM settings WHERE key = 'api_port'`);
  assert.strictEqual(settingRow.value, '3001');
  console.log(`[OK] Settings saved and verified`);

  console.log('\n>>> PERSISTENCE TEST PASSED: All profile data, fingerprints, proxies, and cookies successfully persisted in portable ./data directory!\n');
}

runPersistenceTests().catch((err) => {
  console.error('Persistence test failed:', err);
  process.exit(1);
});
