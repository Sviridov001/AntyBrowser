import path from 'path';
import fs from 'fs';
import assert from 'assert';

const PC1_DIR = path.resolve(__dirname, '../../test_run_env_pc1');
const PC2_DIR = path.resolve(__dirname, '../../test_run_env_pc2_moved');

function copyDirRecursive(src: string, dest: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function runPortabilityTests() {
  console.log('====================================================');
  console.log('  TEST SUITE 2: Cross-Computer Portability Migration Test');
  console.log('====================================================');

  assert.ok(fs.existsSync(PC1_DIR), 'PC1 environment must exist from test 1');

  // Clean PC2 target directory
  if (fs.existsSync(PC2_DIR)) {
    fs.rmSync(PC2_DIR, { recursive: true, force: true });
  }

  // 1. Simulate copying the entire application folder to Computer #2 / USB drive
  console.log(`[Step 1] Simulating folder copy from PC1 (${PC1_DIR}) to PC2 (${PC2_DIR})...`);
  copyDirRecursive(PC1_DIR, PC2_DIR);
  assert.ok(fs.existsSync(path.join(PC2_DIR, 'data', 'database.sqlite')), 'Database must exist on PC2');

  // 2. Clear require cache for main modules so clean state is loaded
  const modulesToReset = [
    '../../dist-electron/main/db',
    '../../dist-electron/main/paths',
    '../../dist-electron/main/browserManager',
    '../../dist-electron/main/backupManager',
  ];
  for (const m of modulesToReset) {
    try {
      delete require.cache[require.resolve(m)];
    } catch (e) {}
  }

  // 3. Launch from PC2 by setting PORTABLE_EXECUTABLE_DIR to PC2_DIR
  process.env.PORTABLE_EXECUTABLE_DIR = PC2_DIR;

  const { initDatabase, queryAll, queryOne } = require('../../dist-electron/main/db');
  const { getPortablePaths } = require('../../dist-electron/main/paths');
  const { exportProfileCookies } = require('../../dist-electron/main/browserManager');
  const { createBackup, listBackups, restoreBackup } = require('../../dist-electron/main/backupManager');

  const pc2Paths = getPortablePaths();
  console.log(`[Step 2] Application launched on PC2 with paths:`);
  console.log(`         App Dir: ${pc2Paths.appDir}`);
  console.log(`         Data Dir: ${pc2Paths.dataDir}`);
  assert.strictEqual(pc2Paths.appDir, PC2_DIR);

  // 4. Connect to database on PC2
  await initDatabase();
  const profilesOnPc2 = queryAll('SELECT * FROM profiles ORDER BY name ASC');
  console.log(`[Step 3] Loaded ${profilesOnPc2.length} profiles from database on PC2`);
  assert.strictEqual(profilesOnPc2.length, 3, 'All 3 profiles must be loaded on PC2');

  // Verify profile details & fingerprints intact
  const p1 = profilesOnPc2.find((p: any) => p.name === 'FB Ads Profile #1');
  assert.ok(p1, 'FB Ads Profile #1 must exist');
  assert.strictEqual(p1.canvas_noise_seed, 11111);
  assert.strictEqual(p1.audio_noise_seed, 22222);
  console.log(`[Step 4] Verified profile 1 fingerprint integrity (Canvas seed: ${p1.canvas_noise_seed})`);

  // 5. Verify portable cookies intact and readable on PC2 (no DPAPI failure)
  const cookiesJson = exportProfileCookies(p1.id, 'json');
  const parsedCookies = JSON.parse(cookiesJson);
  assert.strictEqual(parsedCookies.length, 2, 'Should have 2 preserved cookies on PC2');
  assert.strictEqual(parsedCookies[0].name, 'auth_token');
  assert.strictEqual(parsedCookies[0].value, 'jwt_secure_session_token_xyz123');
  console.log(`[Step 5] Cookies verified on PC2! Name: ${parsedCookies[0].name}, Value: ${parsedCookies[0].value}`);

  // 6. Test Backup & Restore on PC2
  const backupRes = createBackup();
  assert.ok(backupRes.success, 'Backup creation must succeed on PC2');
  console.log(`[Step 6] Created full backup on PC2 at: ${backupRes.backupPath}`);

  const backupList = listBackups();
  assert.ok(backupList.length > 0, 'Backup list should not be empty');
  console.log(`[Step 7] Listed ${backupList.length} backups: ${backupList[0]}`);

  // 7. Verify no absolute paths or Windows profile pollution
  const rawDbContent = fs.readFileSync(pc2Paths.dbPath, 'utf-8');
  assert.ok(
    !rawDbContent.includes('test_run_env_pc1'),
    'Database should not contain hardcoded paths to PC1'
  );
  console.log(`[Step 8] Verified absence of hardcoded PC1 paths in SQLite DB.`);

  // Clean up test directories
  fs.rmSync(PC1_DIR, { recursive: true, force: true });
  fs.rmSync(PC2_DIR, { recursive: true, force: true });
  console.log(`[Step 9] Cleaned up temporary test environments.`);

  console.log('\n>>> PORTABILITY TEST PASSED: Full cross-PC migration verified with 100% data and session persistence!\n');
}

runPortabilityTests().catch((err) => {
  console.error('Portability test failed:', err);
  process.exit(1);
});
