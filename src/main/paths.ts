import path from 'path';
import fs from 'fs';

export interface PortablePaths {
  appDir: string;
  dataDir: string;
  profilesDir: string;
  dbPath: string;
  extensionsDir: string;
  backupsDir: string;
  tempDir: string;
  binDir: string;
  chromiumBinDir: string;
  electronUserDataDir: string;
}

export function getPortablePaths(): PortablePaths {
  let appDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (!appDir) {
    try {
      const { app } = require('electron');
      if (app && app.isPackaged) {
        appDir = path.dirname(process.execPath);
      } else {
        appDir = process.cwd();
      }
    } catch {
      appDir = process.cwd();
    }
  }

  const dataDir = path.join(appDir, 'data');
  const profilesDir = path.join(dataDir, 'profiles');
  const dbPath = path.join(dataDir, 'database.sqlite');
  const extensionsDir = path.join(dataDir, 'extensions');
  const backupsDir = path.join(dataDir, 'backups');
  const tempDir = path.join(dataDir, 'temp');
  const binDir = path.join(appDir, 'bin');
  const chromiumBinDir = path.join(binDir, 'chromium');
  const electronUserDataDir = path.join(dataDir, 'electron_user_data');

  for (const dir of [dataDir, profilesDir, extensionsDir, backupsDir, tempDir, binDir, electronUserDataDir]) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.error(`Failed to create directory ${dir}:`, err);
      }
    }
  }

  return {
    appDir,
    dataDir,
    profilesDir,
    dbPath,
    extensionsDir,
    backupsDir,
    tempDir,
    binDir,
    chromiumBinDir,
    electronUserDataDir,
  };
}
