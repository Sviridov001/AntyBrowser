import fs from 'fs';
import path from 'path';
import { getPortablePaths } from './paths';

function copyDirRecursive(src: string, dest: string): void {
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

export function createBackup(): { success: boolean; backupPath: string } {
  const paths = getPortablePaths();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFolder = path.join(paths.backupsDir, `backup_${timestamp}`);

  fs.mkdirSync(backupFolder, { recursive: true });

  // Backup SQLite database
  if (fs.existsSync(paths.dbPath)) {
    fs.copyFileSync(paths.dbPath, path.join(backupFolder, 'database.sqlite'));
  }

  // Backup profiles metadata and cookies
  const backupProfiles = path.join(backupFolder, 'profiles');
  if (fs.existsSync(paths.profilesDir)) {
    const profiles = fs.readdirSync(paths.profilesDir, { withFileTypes: true });
    for (const p of profiles) {
      if (p.isDirectory()) {
        const pSrc = path.join(paths.profilesDir, p.name);
        const pDest = path.join(backupProfiles, p.name);
        fs.mkdirSync(pDest, { recursive: true });

        // Save cookies.json and open_tabs.json for 100% portable state
        const cookieFile = path.join(pSrc, 'cookies.json');
        if (fs.existsSync(cookieFile)) {
          fs.copyFileSync(cookieFile, path.join(pDest, 'cookies.json'));
        }
        const tabsFile = path.join(pSrc, 'open_tabs.json');
        if (fs.existsSync(tabsFile)) {
          fs.copyFileSync(tabsFile, path.join(pDest, 'open_tabs.json'));
        }
      }
    }
  }

  return { success: true, backupPath: backupFolder };
}

export function listBackups(): string[] {
  const paths = getPortablePaths();
  if (!fs.existsSync(paths.backupsDir)) return [];
  return fs
    .readdirSync(paths.backupsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .reverse();
}

export function restoreBackup(backupName: string): boolean {
  const paths = getPortablePaths();
  const backupFolder = path.join(paths.backupsDir, backupName);
  if (!fs.existsSync(backupFolder)) return false;

  const backupDb = path.join(backupFolder, 'database.sqlite');
  if (fs.existsSync(backupDb)) {
    fs.copyFileSync(backupDb, paths.dbPath);
  }

  const backupProfiles = path.join(backupFolder, 'profiles');
  if (fs.existsSync(backupProfiles)) {
    const profiles = fs.readdirSync(backupProfiles, { withFileTypes: true });
    for (const p of profiles) {
      if (p.isDirectory()) {
        const destDir = path.join(paths.profilesDir, p.name);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        const cookieFile = path.join(backupProfiles, p.name, 'cookies.json');
        if (fs.existsSync(cookieFile)) {
          fs.copyFileSync(cookieFile, path.join(destDir, 'cookies.json'));
        }
        const tabsFile = path.join(backupProfiles, p.name, 'open_tabs.json');
        if (fs.existsSync(tabsFile)) {
          fs.copyFileSync(tabsFile, path.join(destDir, 'open_tabs.json'));
        }
      }
    }
  }

  return true;
}
