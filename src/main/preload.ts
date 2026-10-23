import { contextBridge, ipcRenderer } from 'electron';
import { Profile, ProxyItem, AppSettings, ProxyCheckResult, ExtensionItem } from '../renderer/types';

contextBridge.exposeInMainWorld('antyApi', {
  // Profiles
  getProfiles: (): Promise<Profile[]> => ipcRenderer.invoke('profiles:getAll'),
  saveProfile: (profile: Partial<Profile>): Promise<Profile> => ipcRenderer.invoke('profiles:save', profile),
  deleteProfile: (id: string): Promise<boolean> => ipcRenderer.invoke('profiles:delete', id),
  cloneProfile: (id: string): Promise<Profile> => ipcRenderer.invoke('profiles:clone', id),
  startProfile: (id: string): Promise<any> => ipcRenderer.invoke('profiles:start', id),
  stopProfile: (id: string): Promise<boolean> => ipcRenderer.invoke('profiles:stop', id),
  getRunningProfiles: (): Promise<any[]> => ipcRenderer.invoke('profiles:getRunning'),
  generateFingerprint: (os: 'windows' | 'macos' | 'linux'): Promise<Partial<Profile>> =>
    ipcRenderer.invoke('profiles:generateFingerprint', os),

  // Proxies
  getProxies: (): Promise<ProxyItem[]> => ipcRenderer.invoke('proxies:getAll'),
  saveProxy: (proxy: Partial<ProxyItem>): Promise<ProxyItem> => ipcRenderer.invoke('proxies:save', proxy),
  deleteProxy: (id: string): Promise<boolean> => ipcRenderer.invoke('proxies:delete', id),
  checkProxy: (proxy: ProxyItem): Promise<ProxyCheckResult> => ipcRenderer.invoke('proxies:check', proxy),

  // Cookies
  exportCookies: (profileId: string, format: 'json' | 'netscape'): Promise<string> =>
    ipcRenderer.invoke('cookies:export', profileId, format),
  importCookies: (profileId: string, content: string): Promise<number> =>
    ipcRenderer.invoke('cookies:import', profileId, content),

  // Extensions
  getExtensions: (): Promise<ExtensionItem[]> => ipcRenderer.invoke('extensions:getAll'),
  addExtension: (data: { name: string; path: string; version?: string }): Promise<ExtensionItem> =>
    ipcRenderer.invoke('extensions:add', data),
  toggleExtension: (id: string, enabled: boolean): Promise<boolean> =>
    ipcRenderer.invoke('extensions:toggle', id, enabled),
  deleteExtension: (id: string): Promise<boolean> => ipcRenderer.invoke('extensions:delete', id),
  openExtensionsFolder: (): Promise<void> => ipcRenderer.invoke('extensions:openFolder'),

  // Settings & App Info
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:save', settings),
  getAppPaths: (): Promise<any> => ipcRenderer.invoke('app:getPaths'),

  // Backups
  createBackup: (): Promise<any> => ipcRenderer.invoke('backup:create'),
  listBackups: (): Promise<string[]> => ipcRenderer.invoke('backup:list'),
  restoreBackup: (name: string): Promise<boolean> => ipcRenderer.invoke('backup:restore', name),

  // Directory utilities
  openDataFolder: (): Promise<void> => ipcRenderer.invoke('app:openDataFolder'),
});
