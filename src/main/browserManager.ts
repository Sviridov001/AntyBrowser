import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import WebSocket from 'ws';
import { getPortablePaths } from './paths';
import { Profile, ProxyItem, CookieItem } from '../renderer/types';
import { queryOne, runQuery } from './db';
import { buildStealthInjectionScript, createProfileStealthExtension } from './fingerprint';
import { sanitizeProxy } from '../shared/proxyUtils';
import { createLocalProxyBridge, LocalProxyBridge } from './localProxyBridge';

export interface RunningInstance {
  profileId: string;
  process: ChildProcess;
  cdpPort: number;
  wsEndpoint: string; // Browser-level WebSocket URL for Playwright connectOverCDP
  pageWs?: WebSocket; // Page-level WebSocket for Page / Runtime / Network commands
  browserWs?: WebSocket; // Browser-level WebSocket for Browser.close
  cookieSyncInterval?: NodeJS.Timeout;
  tabSyncInterval?: NodeJS.Timeout;
  proxyBridge?: LocalProxyBridge | null;
  startedAt: string;
}

const runningInstances: Map<string, RunningInstance> = new Map();

/**
 * Configure Chromium preferences to always restore previous session tabs
 * and prevent "Crashed" exit recovery prompt.
 */
function setupProfilePreferences(profileDir: string): void {
  const defaultDir = path.join(profileDir, 'Default');
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }

  const prefFile = path.join(defaultDir, 'Preferences');
  let prefs: any = {};
  if (fs.existsSync(prefFile)) {
    try {
      prefs = JSON.parse(fs.readFileSync(prefFile, 'utf-8'));
    } catch (e) {
      prefs = {};
    }
  }

  if (!prefs.session) prefs.session = {};
  prefs.session.restore_on_startup = 1; // 1 = Restore the last session

  if (!prefs.profile) prefs.profile = {};
  prefs.profile.exit_type = 'Normal';
  prefs.profile.exited_cleanly = true;

  try {
    fs.writeFileSync(prefFile, JSON.stringify(prefs, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not write profile preferences:', e);
  }
}

/**
 * Detect available Chromium / Chrome / Edge executable
 */
export function getChromiumExecutablePath(customPath?: string): string {
  const paths = getPortablePaths();

  // 1. User configured custom path
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }

  // 2. Bundled Portable Chromium in ./bin/chromium/
  const bundledCandidates = [
    path.join(paths.binDir, 'chromium', 'chrome.exe'),
    path.join(paths.binDir, 'chrome.exe'),
    path.join(paths.appDir, 'chromium', 'chrome.exe'),
  ];
  for (const p of bundledCandidates) {
    if (fs.existsSync(p)) return p;
  }

  // 3. System Google Chrome
  const chromeCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ];
  for (const p of chromeCandidates) {
    if (p && fs.existsSync(p)) return p;
  }

  // 4. System Microsoft Edge
  const edgeCandidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ];
  for (const p of edgeCandidates) {
    if (p && fs.existsSync(p)) return p;
  }

  throw new Error('Chromium executable not found. Please install Chrome/Edge or specify path in Settings.');
}

/**
 * Find an open TCP port for CDP
 */
function findOpenPort(): Promise<number> {
  return new Promise((resolve) => {
    const srv = http.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as any).port;
      srv.close(() => resolve(port));
    });
  });
}

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

interface CdpEndpoints {
  browserWsEndpoint: string;
  pageWsEndpoint: string;
  targetId: string;
}

/**
 * Wait for Chromium to expose both browser-level and page-level debugger endpoints
 */
async function waitForCdpEndpoints(port: number, maxRetries = 40): Promise<CdpEndpoints> {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const version = await fetchJson(`http://127.0.0.1:${port}/json/version`);
      const browserWsEndpoint = version.webSocketDebuggerUrl;

      const list = await fetchJson(`http://127.0.0.1:${port}/json/list`);
      if (Array.isArray(list) && list.length > 0) {
        // Find main page target
        const page = list.find((t: any) => t.type === 'page' && t.webSocketDebuggerUrl);
        if (page && browserWsEndpoint) {
          return {
            browserWsEndpoint,
            pageWsEndpoint: page.webSocketDebuggerUrl,
            targetId: page.id,
          };
        }
      }
    } catch (e) {
      // Waiting for browser to spin up
    }
  }
  throw new Error(`Таймаут подключения к CDP на порту ${port}. Браузер не ответил вовремя.`);
}

/**
 * Helper to send a CDP message over WebSocket
 */
function sendCdpCommand(ws: WebSocket, method: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    if (ws.readyState !== WebSocket.OPEN) {
      return reject(new Error('WebSocket is not open'));
    }
    const id = Math.floor(Math.random() * 1000000);
    const handler = (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          ws.removeListener('message', handler);
          if (msg.error) {
            const errMsg = typeof msg.error === 'object'
              ? (msg.error.message || JSON.stringify(msg.error))
              : String(msg.error);
            reject(new Error(errMsg));
          } else {
            resolve(msg.result);
          }
        }
      } catch (err) {
        // ignore
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

/**
 * Check if a URL represents a real web page (not internal Chrome/DevTools/extension pages)
 */
export function isValidWebTabUrl(url: any): boolean {
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

/**
 * Save current open tabs URLs to open_tabs.json for 100% portable session restoration
 */
export async function saveOpenTabs(port: number, openTabsFile: string): Promise<string[]> {
  try {
    const list = await fetchJson(`http://127.0.0.1:${port}/json/list`);
    if (Array.isArray(list)) {
      const rawUrls: string[] = list
        .filter((t: any) => t.type === 'page' && t.url)
        .map((t: any) => t.url);

      const validUrls: string[] = [];
      for (const u of rawUrls) {
        if (isValidWebTabUrl(u) && !validUrls.includes(u)) {
          validUrls.push(u);
        }
      }

      // CRITICAL: Only overwrite open_tabs.json if there are actual valid web URLs!
      // This protects against wiping tabs during browser startup, teardown, or when
      // targets are briefly unavailable or transitioning.
      if (validUrls.length > 0) {
        fs.writeFileSync(openTabsFile, JSON.stringify(validUrls, null, 2), 'utf-8');
        return validUrls;
      }
    }
  } catch (e) {}
  return [];
}

/**
 * Start a browser profile
 */
export async function startProfile(profileId: string, customExecPath?: string): Promise<RunningInstance> {
  if (runningInstances.has(profileId)) {
    return runningInstances.get(profileId)!;
  }

  const paths = getPortablePaths();
  const profile = queryOne<Profile>('SELECT * FROM profiles WHERE id = ?', [profileId]);
  if (!profile) {
    throw new Error(`Profile with ID ${profileId} not found`);
  }

  // Load proxy if configured
  let proxy: ProxyItem | null = null;
  if (profile.proxy_id) {
    proxy = queryOne<ProxyItem>('SELECT * FROM proxies WHERE id = ?', [profile.proxy_id]);
  }
  const cleanProxy = proxy ? sanitizeProxy(proxy) : null;

  const execPath = getChromiumExecutablePath(customExecPath);
  const profileDir = path.join(paths.profilesDir, profile.id);
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  // Setup Chromium Preferences for automatic tab preservation (restore_on_startup: 1)
  setupProfilePreferences(profileDir);

  const cdpPort = await findOpenPort();

  // Create stealth unpacked extension inside profile directory
  const extensionDir = path.join(profileDir, 'anty_stealth_extension');
  const proxyAuth = (cleanProxy && cleanProxy.username && cleanProxy.password)
    ? { username: cleanProxy.username, password: cleanProxy.password }
    : undefined;
  createProfileStealthExtension(extensionDir, proxyAuth);

  // Load saved tabs from previous session if they exist
  const openTabsFile = path.join(profileDir, 'open_tabs.json');
  let savedTabs: string[] = [];
  if (fs.existsSync(openTabsFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(openTabsFile, 'utf-8'));
      if (Array.isArray(parsed)) {
        savedTabs = parsed.filter(isValidWebTabUrl);
      }
    } catch (e) {
      console.warn('Could not read open_tabs.json:', e);
    }
  }

  // Build Chromium flags
  const args = [
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${cdpPort}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-infobars',
    '--password-store=basic',
    '--use-mock-keychain',
    '--disable-features=Translate,OptimizationHints,MediaRouter',
    `--window-size=${profile.screen_width || 1920},${profile.screen_height || 1080}`,
    `--lang=${(profile.language || 'ru-RU').split(',')[0]}`,
    `--load-extension=${extensionDir}`,
  ];

  let proxyBridge: LocalProxyBridge | null = null;
  if (cleanProxy && cleanProxy.host && cleanProxy.port) {
    if (cleanProxy.username && cleanProxy.password) {
      try {
        proxyBridge = await createLocalProxyBridge(cleanProxy);
        args.push(`--proxy-server=http://127.0.0.1:${proxyBridge.port}`);
      } catch (bridgeErr) {
        console.error('Failed to start proxy bridge:', bridgeErr);
        const proto = cleanProxy.type === 'socks5' ? 'socks5' : (cleanProxy.type === 'https' ? 'https' : 'http');
        args.push(`--proxy-server=${proto}://${cleanProxy.host}:${cleanProxy.port}`);
      }
    } else {
      const proto = cleanProxy.type === 'socks5' ? 'socks5' : (cleanProxy.type === 'https' ? 'https' : 'http');
      args.push(`--proxy-server=${proto}://${cleanProxy.host}:${cleanProxy.port}`);
    }
  }

  if (profile.webrtc_mode === 'disable') {
    args.push('--disable-webrtc');
  }

  if (profile.custom_flags) {
    const extra = profile.custom_flags.split(' ').map((s) => s.trim()).filter(Boolean);
    args.push(...extra);
  }

  // Tab Restoration:
  // If we have saved tabs from previous session, restore them all!
  // If no saved tabs exist (first run), open the canvas test page.
  if (savedTabs.length > 0) {
    args.push(...savedTabs);
    console.log(`[AntyBrowser] Restoring ${savedTabs.length} tabs for profile ${profileId}:`, savedTabs);
  } else {
    args.push('https://browserleaks.com/canvas');
  }

  // Spawn Chromium
  const child = spawn(execPath, args, {
    detached: false,
    stdio: 'ignore',
  });

  child.on('error', (err) => {
    console.error(`Browser process error for profile ${profileId}:`, err);
    runningInstances.delete(profileId);
  });

  child.on('exit', () => {
    console.log(`Browser process exited for profile ${profileId}`);
    const inst = runningInstances.get(profileId);
    if (inst) {
      if (inst.cookieSyncInterval) clearInterval(inst.cookieSyncInterval);
      if (inst.tabSyncInterval) clearInterval(inst.tabSyncInterval);
      if (inst.pageWs && inst.pageWs.readyState === WebSocket.OPEN) {
        inst.pageWs.close();
      }
      if (inst.browserWs && inst.browserWs.readyState === WebSocket.OPEN) {
        inst.browserWs.close();
      }
      if (inst.proxyBridge) {
        inst.proxyBridge.close().catch(() => {});
      }
      runningInstances.delete(profileId);
    }
  });

  // Wait for CDP endpoints (Page target and Browser target)
  const endpoints = await waitForCdpEndpoints(cdpPort);

  // Connect to Page target for stealth injections and page manipulation
  const pageWs = new WebSocket(endpoints.pageWsEndpoint);
  await new Promise<void>((resolve, reject) => {
    pageWs.on('open', () => resolve());
    pageWs.on('error', (err) => reject(err));
  });

  // Connect to Browser target for Browser.close and global management
  const browserWs = new WebSocket(endpoints.browserWsEndpoint);
  await new Promise<void>((resolve, reject) => {
    browserWs.on('open', () => resolve());
    browserWs.on('error', (err) => reject(err));
  });

  // Inject stealth script on Page target
  const stealthScript = buildStealthInjectionScript(profile);
  try {
    await sendCdpCommand(pageWs, 'Page.enable');
    await sendCdpCommand(pageWs, 'Runtime.enable');
    await sendCdpCommand(pageWs, 'Network.enable');

    await sendCdpCommand(pageWs, 'Page.addScriptToEvaluateOnNewDocument', {
      source: stealthScript,
    });

    // Emulation overrides
    await sendCdpCommand(pageWs, 'Emulation.setUserAgentOverride', {
      userAgent: profile.user_agent,
      acceptLanguage: profile.language || 'ru-RU,ru',
      platform: profile.os === 'macos' ? 'MacIntel' : (profile.os === 'linux' ? 'Linux x86_64' : 'Win32'),
    });

    if (profile.timezone_id) {
      await sendCdpCommand(pageWs, 'Emulation.setTimezoneId', {
        timezoneId: profile.timezone_id,
      }).catch(() => {});
    }

    if (profile.geolocation_mode === 'manual' && profile.latitude != null && profile.longitude != null) {
      await sendCdpCommand(pageWs, 'Emulation.setGeolocationOverride', {
        latitude: profile.latitude,
        longitude: profile.longitude,
        accuracy: profile.accuracy || 100,
      }).catch(() => {});
    }
  } catch (e: any) {
    console.warn('[AntyBrowser] Minor CDP override warning:', e.message);
  }

  // Restore Portable Cookies from disk if exists
  const cookieFile = path.join(profileDir, 'cookies.json');
  if (fs.existsSync(cookieFile)) {
    try {
      const raw = fs.readFileSync(cookieFile, 'utf-8');
      const cookies: CookieItem[] = JSON.parse(raw);
      if (Array.isArray(cookies) && cookies.length > 0) {
        await sendCdpCommand(pageWs, 'Network.setCookies', { cookies }).catch(() => {});
        console.log(`[AntyBrowser] Restored ${cookies.length} portable cookies for profile ${profileId}`);
      }
    } catch (err) {
      console.error('Error restoring portable cookies:', err);
    }
  }

  // Periodic cookie sync
  const syncCookies = async () => {
    try {
      if (browserWs.readyState === WebSocket.OPEN) {
        const result = await sendCdpCommand(browserWs, 'Storage.getCookies');
        if (result && Array.isArray(result.cookies)) {
          fs.writeFileSync(cookieFile, JSON.stringify(result.cookies, null, 2), 'utf-8');
        }
      } else if (pageWs.readyState === WebSocket.OPEN) {
        const result = await sendCdpCommand(pageWs, 'Network.getAllCookies');
        if (result && Array.isArray(result.cookies)) {
          fs.writeFileSync(cookieFile, JSON.stringify(result.cookies, null, 2), 'utf-8');
        }
      }
    } catch (e) {}
  };
  const cookieSyncInterval = setInterval(syncCookies, 10000);

  // Periodic open tabs sync (saves open tabs for next launch and cross-PC transfer)
  const syncTabs = async () => {
    await saveOpenTabs(cdpPort, openTabsFile);
  };
  const tabSyncInterval = setInterval(syncTabs, 2500);

  const instance: RunningInstance = {
    profileId,
    process: child,
    cdpPort,
    wsEndpoint: endpoints.browserWsEndpoint, // Playwright connects to this browser-level endpoint
    pageWs,
    browserWs,
    cookieSyncInterval,
    tabSyncInterval,
    proxyBridge,
    startedAt: new Date().toISOString(),
  };

  runningInstances.set(profileId, instance);
  return instance;
}

/**
 * Stop running profile gracefully: saves cookies, open tabs, and exits cleanly via Browser.close
 */
export async function stopProfile(profileId: string): Promise<boolean> {
  const instance = runningInstances.get(profileId);
  if (!instance) return false;

  const paths = getPortablePaths();
  const profileDir = path.join(paths.profilesDir, profileId);
  const cookieFile = path.join(profileDir, 'cookies.json');
  const openTabsFile = path.join(profileDir, 'open_tabs.json');

  // 1. Save open tabs before closing
  try {
    await saveOpenTabs(instance.cdpPort, openTabsFile);
  } catch (e) {}

  // 2. Final cookie dump (try browserWs first for browser-wide cookies, fallback to pageWs)
  try {
    if (instance.browserWs && instance.browserWs.readyState === WebSocket.OPEN) {
      const result = await sendCdpCommand(instance.browserWs, 'Storage.getCookies');
      if (result && Array.isArray(result.cookies)) {
        fs.writeFileSync(cookieFile, JSON.stringify(result.cookies, null, 2), 'utf-8');
        console.log(`[AntyBrowser] Saved ${result.cookies.length} cookies on profile stop.`);
      }
    } else if (instance.pageWs && instance.pageWs.readyState === WebSocket.OPEN) {
      const result = await sendCdpCommand(instance.pageWs, 'Network.getAllCookies');
      if (result && Array.isArray(result.cookies)) {
        fs.writeFileSync(cookieFile, JSON.stringify(result.cookies, null, 2), 'utf-8');
        console.log(`[AntyBrowser] Saved ${result.cookies.length} cookies on profile stop.`);
      }
    }
  } catch (e) {
    console.error('Error dumping cookies on stop:', e);
  }

  if (instance.cookieSyncInterval) clearInterval(instance.cookieSyncInterval);
  if (instance.tabSyncInterval) clearInterval(instance.tabSyncInterval);

  // 3. Gracefully close Chromium via CDP Browser.close so Chrome saves session state cleanly
  let gracefullyClosed = false;
  if (instance.browserWs && instance.browserWs.readyState === WebSocket.OPEN) {
    try {
      await sendCdpCommand(instance.browserWs, 'Browser.close');
      gracefullyClosed = true;
    } catch (e) {}
  }

  if (instance.pageWs && instance.pageWs.readyState === WebSocket.OPEN) {
    instance.pageWs.close();
  }
  if (instance.browserWs && instance.browserWs.readyState === WebSocket.OPEN) {
    instance.browserWs.close();
  }

  if (instance.proxyBridge) {
    try {
      await instance.proxyBridge.close();
    } catch (e) {}
  }

  // If Browser.close was called, give Chrome up to 1.5s to exit gracefully and write session files
  if (gracefullyClosed) {
    await new Promise((r) => setTimeout(r, 800));
  }

  // Fallback kill only if process is still running
  try {
    if (instance.process && !instance.process.killed) {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', instance.process.pid!.toString(), '/T', '/F']);
      } else {
        instance.process.kill('SIGKILL');
      }
    }
  } catch (e) {}

  runningInstances.delete(profileId);
  return true;
}

/**
 * Check if profile is running
 */
export function isProfileRunning(profileId: string): boolean {
  return runningInstances.has(profileId);
}

/**
 * Get all running profile instances
 */
export function getRunningProfiles(): { profileId: string; cdpPort: number; wsEndpoint: string; startedAt: string }[] {
  return Array.from(runningInstances.values()).map((inst) => ({
    profileId: inst.profileId,
    cdpPort: inst.cdpPort,
    wsEndpoint: inst.wsEndpoint,
    startedAt: inst.startedAt,
  }));
}

/**
 * Stop all running profiles (e.g. before app exit)
 */
export async function stopAllProfiles(): Promise<void> {
  const ids = Array.from(runningInstances.keys());
  for (const id of ids) {
    await stopProfile(id);
  }
}

/**
 * Export cookies for profile as JSON string or Netscape string
 */
export function exportProfileCookies(profileId: string, format: 'json' | 'netscape' = 'json'): string {
  const paths = getPortablePaths();
  const cookieFile = path.join(paths.profilesDir, profileId, 'cookies.json');
  if (!fs.existsSync(cookieFile)) {
    return format === 'json' ? '[]' : '# Netscape HTTP Cookie File\n';
  }

  const raw = fs.readFileSync(cookieFile, 'utf-8');
  const cookies: CookieItem[] = JSON.parse(raw);

  if (format === 'json') {
    return JSON.stringify(cookies, null, 2);
  }

  let out = '# Netscape HTTP Cookie File\n# http://curl.haxx.se/rfc/cookie_spec.html\n# This file was generated by AntyBrowser\n\n';
  for (const c of cookies) {
    const domain = c.domain || '';
    const flag = domain.startsWith('.') ? 'TRUE' : 'FALSE';
    const cookiePath = c.path || '/';
    const secure = c.secure ? 'TRUE' : 'FALSE';
    const expires = Math.floor(c.expires || Date.now() / 1000 + 3600 * 24 * 365);
    out += `${domain}\t${flag}\t${cookiePath}\t${secure}\t${expires}\t${c.name}\t${c.value}\n`;
  }
  return out;
}

/**
 * Import cookies into profile from JSON or Netscape format
 */
export function importProfileCookies(profileId: string, content: string): number {
  const paths = getPortablePaths();
  const profileDir = path.join(paths.profilesDir, profileId);
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }
  const cookieFile = path.join(profileDir, 'cookies.json');
  let cookies: CookieItem[] = [];

  const trimmed = content.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed);
    cookies = Array.isArray(parsed) ? parsed : [parsed];
  } else {
    const lines = trimmed.split('\n');
    for (const line of lines) {
      const l = line.trim();
      if (!l || l.startsWith('#')) continue;
      const parts = l.split('\t');
      if (parts.length >= 7) {
        cookies.push({
          domain: parts[0],
          path: parts[2],
          secure: parts[3].toUpperCase() === 'TRUE',
          expires: parseInt(parts[4], 10),
          name: parts[5],
          value: parts[6],
        });
      }
    }
  }

  fs.writeFileSync(cookieFile, JSON.stringify(cookies, null, 2), 'utf-8');

  // If profile is currently running, inject cookies immediately via CDP
  const instance = runningInstances.get(profileId);
  if (instance && instance.pageWs && instance.pageWs.readyState === WebSocket.OPEN) {
    sendCdpCommand(instance.pageWs, 'Network.setCookies', { cookies }).catch((e) =>
      console.warn('Failed to inject imported cookies to running profile:', e)
    );
  }

  return cookies.length;
}
