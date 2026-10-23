import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { getPortablePaths } from './paths';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const paths = getPortablePaths();
  SQL = await initSqlJs();

  if (fs.existsSync(paths.dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(paths.dbPath);
      db = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('Error reading existing database, initializing new one:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Create tables if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      group_name TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      os TEXT DEFAULT 'windows',
      browser_type TEXT DEFAULT 'chromium',
      proxy_id TEXT,
      user_agent TEXT NOT NULL,
      screen_width INTEGER DEFAULT 1920,
      screen_height INTEGER DEFAULT 1080,
      screen_color_depth INTEGER DEFAULT 24,
      device_pixel_ratio REAL DEFAULT 1.0,
      canvas_mode TEXT DEFAULT 'noise',
      canvas_noise_seed INTEGER DEFAULT 12345,
      webgl_mode TEXT DEFAULT 'noise',
      webgl_vendor TEXT DEFAULT 'Google Inc. (NVIDIA)',
      webgl_renderer TEXT DEFAULT 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      audio_mode TEXT DEFAULT 'noise',
      audio_noise_seed INTEGER DEFAULT 54321,
      webrtc_mode TEXT DEFAULT 'proxy',
      webrtc_public_ip TEXT,
      timezone_mode TEXT DEFAULT 'auto',
      timezone_id TEXT DEFAULT 'Europe/Moscow',
      geolocation_mode TEXT DEFAULT 'auto',
      latitude REAL,
      longitude REAL,
      accuracy REAL DEFAULT 50,
      language TEXT DEFAULT 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      cpu_cores INTEGER DEFAULT 8,
      memory_gb INTEGER DEFAULT 16,
      notes TEXT DEFAULT '',
      custom_flags TEXT DEFAULT '',
      mozilla_vpn INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS proxies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      username TEXT,
      password TEXT,
      change_url TEXT,
      status TEXT DEFAULT 'untested',
      last_checked TEXT,
      latency INTEGER,
      external_ip TEXT,
      country TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS extensions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT DEFAULT '1.0.0',
      path TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Safe migration for existing databases
  try {
    db.run('ALTER TABLE profiles ADD COLUMN mozilla_vpn INTEGER DEFAULT 0');
  } catch (e) {
    // Column already exists
  }

  saveDatabase();
  return db;
}

export function saveDatabase(): void {
  if (!db) return;
  const paths = getPortablePaths();
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(paths.dbPath, buffer);
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized! Call initDatabase() first.');
  }
  return db;
}

// Helper query wrappers
export function queryAll<T>(sql: string, params: any[] = []): T[] {
  const database = getDb();
  const stmt = database.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T>(sql: string, params: any[] = []): T | null {
  const items = queryAll<T>(sql, params);
  return items.length > 0 ? items[0] : null;
}

export function runQuery(sql: string, params: any[] = []): void {
  const database = getDb();
  database.run(sql, params);
  saveDatabase();
}
