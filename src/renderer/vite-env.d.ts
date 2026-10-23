/// <reference types="vite/client" />

import { Profile, ProxyItem, AppSettings, ProxyCheckResult, ExtensionItem } from './types';

export interface AntyApi {
  getProfiles: () => Promise<Profile[]>;
  saveProfile: (profile: Partial<Profile>) => Promise<Profile>;
  deleteProfile: (id: string) => Promise<boolean>;
  cloneProfile: (id: string) => Promise<Profile>;
  startProfile: (id: string) => Promise<any>;
  stopProfile: (id: string) => Promise<boolean>;
  getRunningProfiles: () => Promise<any[]>;
  generateFingerprint: (os: 'windows' | 'macos' | 'linux') => Promise<Partial<Profile>>;

  getProxies: () => Promise<ProxyItem[]>;
  saveProxy: (proxy: Partial<ProxyItem>) => Promise<ProxyItem>;
  deleteProxy: (id: string) => Promise<boolean>;
  checkProxy: (proxy: ProxyItem) => Promise<ProxyCheckResult>;

  exportCookies: (profileId: string, format: 'json' | 'netscape') => Promise<string>;
  importCookies: (profileId: string, content: string) => Promise<number>;

  // Extensions
  getExtensions: () => Promise<ExtensionItem[]>;
  addExtension: (data: { name: string; path: string; version?: string }) => Promise<ExtensionItem>;
  toggleExtension: (id: string, enabled: boolean) => Promise<boolean>;
  deleteExtension: (id: string) => Promise<boolean>;
  openExtensionsFolder: () => Promise<void>;

  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<boolean>;
  getAppPaths: () => Promise<any>;
  openDataFolder: () => Promise<void>;

  createBackup: () => Promise<any>;
  listBackups: () => Promise<string[]>;
  restoreBackup: (name: string) => Promise<boolean>;
}

declare global {
  interface Window {
    antyApi: AntyApi;
  }
}
