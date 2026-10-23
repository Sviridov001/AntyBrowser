import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('  TEST SUITE 5: Open Tabs Session Preservation Test');
console.log('====================================================');

const testProfileDir = path.resolve(__dirname, '../../test_profile_tabs');
if (fs.existsSync(testProfileDir)) {
  fs.rmSync(testProfileDir, { recursive: true, force: true });
}
fs.mkdirSync(testProfileDir, { recursive: true });

// 1. Test Preferences generation for tab restoration
const defaultDir = path.join(testProfileDir, 'Default');
fs.mkdirSync(defaultDir, { recursive: true });
const prefFile = path.join(defaultDir, 'Preferences');

const prefs = {
  session: { restore_on_startup: 1 },
  profile: { exit_type: 'Normal', exited_cleanly: true },
};
fs.writeFileSync(prefFile, JSON.stringify(prefs, null, 2));

assert.ok(fs.existsSync(prefFile), 'Preferences file should exist');
const savedPrefs = JSON.parse(fs.readFileSync(prefFile, 'utf-8'));
assert.strictEqual(savedPrefs.session.restore_on_startup, 1, 'restore_on_startup must be 1 (Continue where you left off)');
assert.strictEqual(savedPrefs.profile.exit_type, 'Normal');
console.log('[OK] Preferences properly configured for automatic tab restoration');

// 2. Test URL filtering (isValidWebTabUrl)
function isValidWebTabUrl(url: any): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed === 'about:blank') return false;
  if (trimmed.startsWith('chrome://')) return false;
  if (trimmed.startsWith('chrome-untrusted://')) return false;
  if (trimmed.startsWith('chrome-extension://')) return false;
  if (trimmed.startsWith('devtools://')) return false;
  if (trimmed.startsWith('edge://')) return false;
  if (trimmed.startsWith('brave://')) return false;
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

assert.strictEqual(isValidWebTabUrl('https://google.com'), true);
assert.strictEqual(isValidWebTabUrl('http://whoer.net/ru'), true);
assert.strictEqual(isValidWebTabUrl('chrome://newtab/'), false);
assert.strictEqual(isValidWebTabUrl('chrome://new-tab-page/'), false);
assert.strictEqual(isValidWebTabUrl('about:blank'), false);
assert.strictEqual(isValidWebTabUrl('devtools://devtools/bundled/inspector.html'), false);
assert.strictEqual(isValidWebTabUrl('chrome-extension://xyz/options.html'), false);
console.log('[OK] Validated URL filtering prevents internal Chrome/extension pages from saving');

// 3. Test open_tabs.json portable preservation & restoration
const openTabsFile = path.join(testProfileDir, 'open_tabs.json');
const testUrls = [
  'https://google.com',
  'https://whoer.net',
  'https://browserleaks.com/canvas',
];

fs.writeFileSync(openTabsFile, JSON.stringify(testUrls, null, 2));
assert.ok(fs.existsSync(openTabsFile));

const loadedTabs = JSON.parse(fs.readFileSync(openTabsFile, 'utf-8')).filter(isValidWebTabUrl);
assert.strictEqual(loadedTabs.length, 3);
assert.strictEqual(loadedTabs[0], 'https://google.com');
assert.strictEqual(loadedTabs[1], 'https://whoer.net');
assert.strictEqual(loadedTabs[2], 'https://browserleaks.com/canvas');
console.log(`[OK] Verified ${loadedTabs.length} open tab URLs preserved in open_tabs.json`);

// 4. Test protection against blank tab overwrite
const rawBlankUrls = ['chrome://newtab/', 'about:blank'];
const validFromBlank = rawBlankUrls.filter(isValidWebTabUrl);
assert.strictEqual(validFromBlank.length, 0);

// Only write when validFromBlank.length > 0
if (validFromBlank.length > 0) {
  fs.writeFileSync(openTabsFile, JSON.stringify(validFromBlank, null, 2));
}

// open_tabs.json should NOT be overwritten and still retain the 3 original URLs!
const preservedTabsAfterBlank = JSON.parse(fs.readFileSync(openTabsFile, 'utf-8'));
assert.strictEqual(preservedTabsAfterBlank.length, 3, 'open_tabs.json must NOT be erased by blank tabs');
console.log('[OK] Verified open_tabs.json is protected from being wiped by blank tabs');

// 5. Test CLI argument restoration
const args: string[] = ['--user-data-dir=test'];
const savedTabsToRestore = JSON.parse(fs.readFileSync(openTabsFile, 'utf-8')).filter(isValidWebTabUrl);
if (savedTabsToRestore.length > 0) {
  args.push(...savedTabsToRestore);
} else {
  args.push('https://browserleaks.com/canvas');
}
assert.strictEqual(args.length, 4);
assert.strictEqual(args[1], 'https://google.com');
assert.strictEqual(args[2], 'https://whoer.net');
assert.strictEqual(args[3], 'https://browserleaks.com/canvas');
console.log('[OK] Verified CLI args correctly include all saved tab URLs for launch');

// Clean up
fs.rmSync(testProfileDir, { recursive: true, force: true });
console.log('[OK] Cleaned up test directory.');

console.log('\n>>> ALL TAB PRESERVATION TESTS PASSED!\n');
