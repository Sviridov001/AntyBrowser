import express from 'express';
import cors from 'cors';
import http from 'http';
import { queryAll, queryOne } from './db';
import { Profile } from '../renderer/types';
import {
  startProfile,
  stopProfile,
  getRunningProfiles,
  isProfileRunning,
  exportProfileCookies,
  importProfileCookies,
} from './browserManager';

let server: http.Server | null = null;

export function startApiServer(port = 3001): http.Server {
  if (server) return server;

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.text({ limit: '10mb' }));

  // Status check
  app.get('/api/v1/status', (req, res) => {
    res.json({
      status: 'ok',
      version: '1.0.0',
      app: 'AntyBrowser Portable',
      runningProfiles: getRunningProfiles(),
    });
  });

  // List all profiles
  app.get('/api/v1/profiles', (req, res) => {
    try {
      const profiles = queryAll<Profile>('SELECT * FROM profiles ORDER BY created_at DESC');
      const running = new Map(getRunningProfiles().map((r) => [r.profileId, r]));

      const enriched = profiles.map((p) => {
        const r = running.get(p.id);
        return {
          ...p,
          mozilla_vpn: Boolean(p.mozilla_vpn),
          tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : p.tags,
          status: r ? 'running' : 'stopped',
          cdp_port: r ? r.cdpPort : undefined,
          ws_endpoint: r ? r.wsEndpoint : undefined,
        };
      });

      res.json({ success: true, profiles: enriched });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get active profiles
  app.get('/api/v1/profiles/active', (req, res) => {
    res.json({ success: true, active: getRunningProfiles() });
  });

  // Get single profile
  app.get('/api/v1/profiles/:id', (req, res) => {
    try {
      const profile = queryOne<Profile>('SELECT * FROM profiles WHERE id = ?', [req.params.id]);
      if (!profile) {
        return res.status(404).json({ success: false, error: 'Profile not found' });
      }
      const running = getRunningProfiles().find((r) => r.profileId === profile.id);
      res.json({
        success: true,
        profile: {
          ...profile,
          mozilla_vpn: Boolean(profile.mozilla_vpn),
          tags: typeof profile.tags === 'string' ? JSON.parse(profile.tags) : profile.tags,
          status: running ? 'running' : 'stopped',
          cdp_port: running ? running.cdpPort : undefined,
          ws_endpoint: running ? running.wsEndpoint : undefined,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Start profile for Playwright / Puppeteer
  app.post('/api/v1/profiles/:id/start', async (req, res) => {
    try {
      const profileId = req.params.id;
      const customPath = req.body?.chromiumPath;
      const instance = await startProfile(profileId, customPath);
      res.json({
        success: true,
        profileId,
        cdpPort: instance.cdpPort,
        wsEndpoint: instance.wsEndpoint,
        status: 'running',
        playwrightExample: {
          code: `const { chromium } = require('playwright');
const browser = await chromium.connectOverCDP('${instance.wsEndpoint}');
const context = browser.contexts()[0];
const page = await context.newPage();
await page.goto('https://browserleaks.com/canvas');`,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Stop profile
  app.post('/api/v1/profiles/:id/stop', async (req, res) => {
    try {
      const profileId = req.params.id;
      const stopped = await stopProfile(profileId);
      res.json({ success: true, profileId, stopped, status: 'stopped' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Export cookies
  app.get('/api/v1/profiles/:id/cookies', (req, res) => {
    try {
      const format = (req.query.format as string) === 'netscape' ? 'netscape' : 'json';
      const cookies = exportProfileCookies(req.params.id, format);
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
      } else {
        res.setHeader('Content-Type', 'text/plain');
      }
      res.send(cookies);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Import cookies
  app.post('/api/v1/profiles/:id/cookies', (req, res) => {
    try {
      const content = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const count = importProfileCookies(req.params.id, content);
      res.json({ success: true, count, message: `Successfully imported ${count} cookies` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  server = app.listen(port, '127.0.0.1', () => {
    console.log(`[AntyBrowser] Local Automation API server listening on http://127.0.0.1:${port}`);
  });

  return server;
}

export function stopApiServer(): void {
  if (server) {
    server.close();
    server = null;
  }
}
