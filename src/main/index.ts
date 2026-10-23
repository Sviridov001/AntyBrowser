import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getPortablePaths } from './paths';
import { initDatabase, queryAll, queryOne, runQuery, saveDatabase } from './db';
import { startApiServer, stopApiServer } from './apiServer';
import {
  startProfile,
  stopProfile,
  isProfileRunning,
  getRunningProfiles,
  stopAllProfiles,
  exportProfileCookies,
  importProfileCookies,
} from './browserManager';
import { generateRandomFingerprint } from './fingerprint';
import { checkProxy } from './proxyChecker';
import { createBackup, listBackups, restoreBackup } from './backupManager';
import { sanitizeProxy, parseProxyString } from '../shared/proxyUtils';
import { Profile, ProxyItem, AppSettings } from '../renderer/types';

// Ensure portable paths before app is ready
const paths = getPortablePaths();
app.setPath('userData', paths.electronUserDataDir);
app.setPath('sessionData', path.join(paths.dataDir, 'electron_session_data'));
app.setPath('temp', paths.tempDir);
app.setPath('logs', path.join(paths.dataDir, 'logs'));

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: 'AntyBrowser Portable',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    autoHideMenuBar: true,
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    const indexPath = path.resolve(__dirname, '../../dist-renderer/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  // Toggle DevTools on F12 or Ctrl+Shift+I
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow?.webContents.toggleDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  // Profiles IPC
  ipcMain.handle('profiles:getAll', async () => {
    const profiles = queryAll<Profile>('SELECT * FROM profiles ORDER BY created_at DESC');
    const running = new Map(getRunningProfiles().map((r) => [r.profileId, r]));

    return profiles.map((p) => {
      const r = running.get(p.id);
      return {
        ...p,
        tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : p.tags,
        status: r ? 'running' : 'stopped',
        cdp_port: r ? r.cdpPort : undefined,
        ws_endpoint: r ? r.wsEndpoint : undefined,
      };
    });
  });

  ipcMain.handle('profiles:save', async (_, profileData: Partial<Profile>) => {
    const now = new Date().toISOString();
    const id = profileData.id || uuidv4();
    const existing = queryOne<Profile>('SELECT id FROM profiles WHERE id = ?', [id]);

    const tagsJson = JSON.stringify(profileData.tags || []);

    if (existing) {
      runQuery(
        `UPDATE profiles SET
          name = ?, group_name = ?, tags = ?, os = ?, browser_type = ?, proxy_id = ?,
          user_agent = ?, screen_width = ?, screen_height = ?, screen_color_depth = ?, device_pixel_ratio = ?,
          canvas_mode = ?, canvas_noise_seed = ?, webgl_mode = ?, webgl_vendor = ?, webgl_renderer = ?,
          audio_mode = ?, audio_noise_seed = ?, webrtc_mode = ?, webrtc_public_ip = ?,
          timezone_mode = ?, timezone_id = ?, geolocation_mode = ?, latitude = ?, longitude = ?, accuracy = ?,
          language = ?, cpu_cores = ?, memory_gb = ?, notes = ?, custom_flags = ?, updated_at = ?
        WHERE id = ?`,
        [
          profileData.name || 'Profile',
          profileData.group_name || '',
          tagsJson,
          profileData.os || 'windows',
          profileData.browser_type || 'chromium',
          profileData.proxy_id || null,
          profileData.user_agent || '',
          profileData.screen_width || 1920,
          profileData.screen_height || 1080,
          profileData.screen_color_depth || 24,
          profileData.device_pixel_ratio || 1.0,
          profileData.canvas_mode || 'noise',
          profileData.canvas_noise_seed || 12345,
          profileData.webgl_mode || 'noise',
          profileData.webgl_vendor || 'Google Inc. (NVIDIA)',
          profileData.webgl_renderer || 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
          profileData.audio_mode || 'noise',
          profileData.audio_noise_seed || 54321,
          profileData.webrtc_mode || 'proxy',
          profileData.webrtc_public_ip || null,
          profileData.timezone_mode || 'auto',
          profileData.timezone_id || 'Europe/Moscow',
          profileData.geolocation_mode || 'auto',
          profileData.latitude ?? null,
          profileData.longitude ?? null,
          profileData.accuracy ?? 50,
          profileData.language || 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          profileData.cpu_cores || 8,
          profileData.memory_gb || 16,
          profileData.notes || '',
          profileData.custom_flags || '',
          now,
          id,
        ]
      );
    } else {
      runQuery(
        `INSERT INTO profiles (
          id, name, group_name, tags, os, browser_type, proxy_id,
          user_agent, screen_width, screen_height, screen_color_depth, device_pixel_ratio,
          canvas_mode, canvas_noise_seed, webgl_mode, webgl_vendor, webgl_renderer,
          audio_mode, audio_noise_seed, webrtc_mode, webrtc_public_ip,
          timezone_mode, timezone_id, geolocation_mode, latitude, longitude, accuracy,
          language, cpu_cores, memory_gb, notes, custom_flags, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?
        )`,
        [
          id,
          profileData.name || 'Новый профиль',
          profileData.group_name || '',
          tagsJson,
          profileData.os || 'windows',
          profileData.browser_type || 'chromium',
          profileData.proxy_id || null,
          profileData.user_agent || '',
          profileData.screen_width || 1920,
          profileData.screen_height || 1080,
          profileData.screen_color_depth || 24,
          profileData.device_pixel_ratio || 1.0,
          profileData.canvas_mode || 'noise',
          profileData.canvas_noise_seed || 12345,
          profileData.webgl_mode || 'noise',
          profileData.webgl_vendor || 'Google Inc. (NVIDIA)',
          profileData.webgl_renderer || 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
          profileData.audio_mode || 'noise',
          profileData.audio_noise_seed || 54321,
          profileData.webrtc_mode || 'proxy',
          profileData.webrtc_public_ip || null,
          profileData.timezone_mode || 'auto',
          profileData.timezone_id || 'Europe/Moscow',
          profileData.geolocation_mode || 'auto',
          profileData.latitude ?? null,
          profileData.longitude ?? null,
          profileData.accuracy ?? 50,
          profileData.language || 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          profileData.cpu_cores || 8,
          profileData.memory_gb || 16,
          profileData.notes || '',
          profileData.custom_flags || '',
          now,
          now,
        ]
      );
    }

    const saved = queryOne<Profile>('SELECT * FROM profiles WHERE id = ?', [id])!;
    return {
      ...saved,
      tags: typeof saved.tags === 'string' ? JSON.parse(saved.tags) : saved.tags,
      status: isProfileRunning(id) ? 'running' : 'stopped',
    };
  });

  ipcMain.handle('profiles:delete', async (_, id: string) => {
    if (isProfileRunning(id)) {
      await stopProfile(id);
    }
    runQuery('DELETE FROM profiles WHERE id = ?', [id]);
    // Optionally clean up profile dir
    const pDir = path.join(paths.profilesDir, id);
    if (fs.existsSync(pDir)) {
      try {
        fs.rmSync(pDir, { recursive: true, force: true });
      } catch (e) {
        console.warn('Could not remove profile folder:', e);
      }
    }
    return true;
  });

  ipcMain.handle('profiles:clone', async (_, id: string) => {
    const original = queryOne<Profile>('SELECT * FROM profiles WHERE id = ?', [id]);
    if (!original) throw new Error('Original profile not found');

    const newId = uuidv4();
    const now = new Date().toISOString();
    const clonedData = {
      ...original,
      id: newId,
      name: `${original.name} (Копия)`,
      canvas_noise_seed: Math.floor(Math.random() * 1000000) + 1,
      audio_noise_seed: Math.floor(Math.random() * 1000000) + 1,
      created_at: now,
      updated_at: now,
    };

    runQuery(
      `INSERT INTO profiles (
        id, name, group_name, tags, os, browser_type, proxy_id,
        user_agent, screen_width, screen_height, screen_color_depth, device_pixel_ratio,
        canvas_mode, canvas_noise_seed, webgl_mode, webgl_vendor, webgl_renderer,
        audio_mode, audio_noise_seed, webrtc_mode, webrtc_public_ip,
        timezone_mode, timezone_id, geolocation_mode, latitude, longitude, accuracy,
        language, cpu_cores, memory_gb, notes, custom_flags, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        clonedData.id,
        clonedData.name,
        clonedData.group_name,
        clonedData.tags,
        clonedData.os,
        clonedData.browser_type,
        clonedData.proxy_id,
        clonedData.user_agent,
        clonedData.screen_width,
        clonedData.screen_height,
        clonedData.screen_color_depth,
        clonedData.device_pixel_ratio,
        clonedData.canvas_mode,
        clonedData.canvas_noise_seed,
        clonedData.webgl_mode,
        clonedData.webgl_vendor,
        clonedData.webgl_renderer,
        clonedData.audio_mode,
        clonedData.audio_noise_seed,
        clonedData.webrtc_mode,
        clonedData.webrtc_public_ip,
        clonedData.timezone_mode,
        clonedData.timezone_id,
        clonedData.geolocation_mode,
        clonedData.latitude,
        clonedData.longitude,
        clonedData.accuracy,
        clonedData.language,
        clonedData.cpu_cores,
        clonedData.memory_gb,
        clonedData.notes,
        clonedData.custom_flags,
        now,
        now,
      ]
    );

    // Also clone cookies and open_tabs if present
    const destDir = path.join(paths.profilesDir, newId);
    const origCookie = path.join(paths.profilesDir, id, 'cookies.json');
    if (fs.existsSync(origCookie)) {
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(origCookie, path.join(destDir, 'cookies.json'));
    }

    const origTabs = path.join(paths.profilesDir, id, 'open_tabs.json');
    if (fs.existsSync(origTabs)) {
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(origTabs, path.join(destDir, 'open_tabs.json'));
    }

    return {
      ...clonedData,
      tags: typeof clonedData.tags === 'string' ? JSON.parse(clonedData.tags) : clonedData.tags,
      status: 'stopped',
    };
  });

  ipcMain.handle('profiles:start', async (_, id: string) => {
    const settings = queryAll<{ key: string; value: string }>('SELECT * FROM settings');
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
    const customChromium = settingsMap.get('chromium_path');

    const instance = await startProfile(id, customChromium);
    return {
      success: true,
      profileId: id,
      cdpPort: instance.cdpPort,
      wsEndpoint: instance.wsEndpoint,
      status: 'running',
    };
  });

  ipcMain.handle('profiles:stop', async (_, id: string) => {
    return await stopProfile(id);
  });

  ipcMain.handle('profiles:getRunning', async () => {
    return getRunningProfiles();
  });

  ipcMain.handle('profiles:generateFingerprint', async (_, os: 'windows' | 'macos' | 'linux') => {
    return generateRandomFingerprint(os);
  });

  // Proxies IPC
  ipcMain.handle('proxies:getAll', async () => {
    return queryAll<ProxyItem>('SELECT * FROM proxies ORDER BY created_at DESC');
  });

  ipcMain.handle('proxies:save', async (_, proxyData: Partial<ProxyItem>) => {
    const id = proxyData.id || uuidv4();
    const now = new Date().toISOString();
    const clean = sanitizeProxy(proxyData);
    const existing = queryOne<ProxyItem>('SELECT id FROM proxies WHERE id = ?', [id]);

    if (existing) {
      runQuery(
        `UPDATE proxies SET
          name = ?, type = ?, host = ?, port = ?, username = ?, password = ?, change_url = ?
        WHERE id = ?`,
        [
          proxyData.name || 'Proxy',
          clean.type,
          clean.host,
          clean.port,
          clean.username,
          clean.password,
          proxyData.change_url || null,
          id,
        ]
      );
    } else {
      runQuery(
        `INSERT INTO proxies (
          id, name, type, host, port, username, password, change_url, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'untested', ?)`,
        [
          id,
          proxyData.name || 'Новый прокси',
          clean.type,
          clean.host,
          clean.port,
          clean.username,
          clean.password,
          proxyData.change_url || null,
          now,
        ]
      );
    }

    return queryOne<ProxyItem>('SELECT * FROM proxies WHERE id = ?', [id])!;
  });

  ipcMain.handle('proxies:delete', async (_, id: string) => {
    runQuery('DELETE FROM proxies WHERE id = ?', [id]);
    runQuery('UPDATE profiles SET proxy_id = NULL WHERE proxy_id = ?', [id]);
    return true;
  });

  ipcMain.handle('proxies:check', async (_, proxy: ProxyItem) => {
    const result = await checkProxy(proxy);
    const now = new Date().toISOString();
    if (result.success) {
      runQuery(
        `UPDATE proxies SET status = 'active', latency = ?, external_ip = ?, country = ?, last_checked = ? WHERE id = ?`,
        [result.latency || 0, result.ip || null, result.country || null, now, proxy.id]
      );
    } else {
      runQuery(
        `UPDATE proxies SET status = 'error', last_checked = ? WHERE id = ?`,
        [now, proxy.id]
      );
    }
    return result;
  });

  // Cookies IPC
  ipcMain.handle('cookies:export', async (_, profileId: string, format: 'json' | 'netscape') => {
    return exportProfileCookies(profileId, format);
  });

  ipcMain.handle('cookies:import', async (_, profileId: string, content: string) => {
    return importProfileCookies(profileId, content);
  });

  // Extensions IPC
  ipcMain.handle('extensions:getAll', async () => {
    const rows = queryAll<any>('SELECT * FROM extensions ORDER BY created_at DESC');
    return rows.map((r) => ({
      ...r,
      enabled: Boolean(r.enabled),
    }));
  });

  ipcMain.handle('extensions:add', async (_, extData: { name: string; path: string; version?: string }) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    runQuery(
      'INSERT INTO extensions (id, name, version, path, enabled, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      [id, extData.name, extData.version || '1.0.0', extData.path, now]
    );
    return {
      id,
      name: extData.name,
      version: extData.version || '1.0.0',
      path: extData.path,
      enabled: true,
      created_at: now,
    };
  });

  ipcMain.handle('extensions:toggle', async (_, id: string, enabled: boolean) => {
    runQuery('UPDATE extensions SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
    return true;
  });

  ipcMain.handle('extensions:delete', async (_, id: string) => {
    runQuery('DELETE FROM extensions WHERE id = ?', [id]);
    return true;
  });

  ipcMain.handle('extensions:openFolder', async () => {
    shell.openPath(paths.extensionsDir);
  });

  // Settings IPC
  ipcMain.handle('settings:get', async () => {
    const rows = queryAll<{ key: string; value: string }>('SELECT * FROM settings');
    const settings: Record<string, any> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    return {
      chromium_path: settings.chromium_path || '',
      api_port: parseInt(settings.api_port || '3001', 10),
      api_enabled: settings.api_enabled !== 'false',
      theme: settings.theme || 'dark',
      language: settings.language || 'ru',
      auto_backup: settings.auto_backup === 'true',
    } as AppSettings;
  });

  ipcMain.handle('settings:save', async (_, newSettings: Partial<AppSettings>) => {
    for (const [k, v] of Object.entries(newSettings)) {
      runQuery(
        `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?`,
        [k, String(v), String(v)]
      );
    }
    return true;
  });

  ipcMain.handle('app:getPaths', async () => {
    return getPortablePaths();
  });

  ipcMain.handle('app:openDataFolder', async () => {
    shell.openPath(paths.dataDir);
  });

  // Backup IPC
  ipcMain.handle('backup:create', async () => {
    return createBackup();
  });

  ipcMain.handle('backup:list', async () => {
    return listBackups();
  });

  ipcMain.handle('backup:restore', async (_, name: string) => {
    return restoreBackup(name);
  });
}

app.whenReady().then(async () => {
  await initDatabase();

  // Auto-clean any malformed proxy hosts in existing database
  try {
    const allProxies = queryAll<ProxyItem>('SELECT * FROM proxies');
    for (const p of allProxies) {
      const clean = sanitizeProxy(p);
      if (
        clean.host !== p.host ||
        clean.port !== p.port ||
        clean.type !== p.type ||
        (clean.username && clean.username !== p.username)
      ) {
        runQuery(
          'UPDATE proxies SET type = ?, host = ?, port = ?, username = ?, password = ? WHERE id = ?',
          [clean.type, clean.host, clean.port, clean.username, clean.password, p.id]
        );
        console.log(`[AntyBrowser] Auto-repaired proxy "${p.name}": "${p.host}" -> "${clean.host}:${clean.port}"`);
      }
    }
  } catch (err) {
    console.error('Proxy auto-repair error:', err);
  }

  registerIpcHandlers();

  // Start local automation REST API server (port 3001)
  try {
    startApiServer(3001);
  } catch (err) {
    console.error('Failed to start local API server:', err);
  }

  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', async () => {
  await stopAllProfiles();
  stopApiServer();
  saveDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await stopAllProfiles();
  stopApiServer();
  saveDatabase();
});
