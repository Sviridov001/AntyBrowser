import React, { useState, useEffect } from 'react';
import {
  Settings,
  FolderOpen,
  HardDrive,
  RefreshCw,
  Check,
  Shield,
  Save,
  RotateCcw,
  Download,
} from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsViewProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onShowToast }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [paths, setPaths] = useState<any>(null);
  const [backups, setBackups] = useState<string[]>([]);
  const [customChromium, setCustomChromium] = useState('');
  const [customFirefox, setCustomFirefox] = useState('');
  const [apiPort, setApiPort] = useState(3001);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const s = await window.antyApi.getSettings();
      setSettings(s);
      setCustomChromium(s.chromium_path || '');
      setCustomFirefox(s.firefox_path || '');
      setApiPort(s.api_port || 3001);

      const p = await window.antyApi.getAppPaths();
      setPaths(p);

      const b = await window.antyApi.listBackups();
      setBackups(b);
    } catch (err: any) {
      console.error('Error loading settings:', err);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await window.antyApi.saveSettings({
        chromium_path: customChromium.trim(),
        firefox_path: customFirefox.trim(),
        api_port: apiPort,
      });
      onShowToast('Настройки успешно сохранены', 'success');
    } catch (err: any) {
      onShowToast('Ошибка сохранения: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await window.antyApi.openDataFolder();
    } catch (e: any) {
      onShowToast('Не удалось открыть папку: ' + e.message, 'error');
    }
  };

  const handleCreateBackup = async () => {
    try {
      const res = await window.antyApi.createBackup();
      if (res.success) {
        onShowToast('Резервная копия создана!', 'success');
        loadAll();
      }
    } catch (e: any) {
      onShowToast('Ошибка создания бэкапа: ' + e.message, 'error');
    }
  };

  const handleRestoreBackup = async (backupName: string) => {
    if (confirm(`Восстановить базу данных и профили из копии "${backupName}"?`)) {
      try {
        const ok = await window.antyApi.restoreBackup(backupName);
        if (ok) {
          onShowToast('Данные успешно восстановлены из резервной копии!', 'success');
        } else {
          onShowToast('Не удалось восстановить бэкап', 'error');
        }
      } catch (e: any) {
        onShowToast('Ошибка восстановления: ' + e.message, 'error');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
      {/* Title */}
      <div>
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Settings className="text-blue-400" size={20} />
          <span>Настройки & Портативность</span>
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Конфигурация движка Chromium, путей хранения и резервного копирования
        </p>
      </div>

      {/* Portable Status Banner */}
      <div className="anty-card p-5 bg-gradient-to-r from-blue-950/40 to-slate-900 border-blue-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Shield size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                100% Автономный Portable-Режим
              </h4>
              <p className="text-[11px] text-gray-300">
                Приложение не требует прав администратора и не пишет в реестр или системный профиль Windows.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenFolder}
            className="anty-btn-secondary text-xs px-3.5 py-1.5"
          >
            <FolderOpen size={14} className="text-blue-400" />
            <span>Открыть папку ./data</span>
          </button>
        </div>

        {paths && (
          <div className="grid grid-cols-2 gap-3 text-[11px] font-mono bg-[#0b0f19]/70 p-3 rounded-lg border border-[#24304f]">
            <div>
              <span className="text-gray-500">Папка приложения:</span>{' '}
              <span className="text-gray-300 break-all">{paths.appDir}</span>
            </div>
            <div>
              <span className="text-gray-500">База данных SQLite:</span>{' '}
              <span className="text-blue-400 break-all">{paths.dbPath}</span>
            </div>
            <div>
              <span className="text-gray-500">Папка профилей:</span>{' '}
              <span className="text-gray-300 break-all">{paths.profilesDir}</span>
            </div>
            <div>
              <span className="text-gray-500">Папка бэкапов:</span>{' '}
              <span className="text-gray-300 break-all">{paths.backupsDir}</span>
            </div>
          </div>
        )}
      </div>

      {/* Chromium Configuration */}
      <div className="anty-card p-5 space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider text-gray-400">
          Настройки движка Chromium
        </h4>

        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            Пользовательский путь к chrome.exe / msedge.exe (опционально)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customChromium}
              onChange={(e) => setCustomChromium(e.target.value)}
              placeholder="Автоопределение (./bin/chromium/chrome.exe -> Google Chrome -> Microsoft Edge)"
              className="anty-input flex-1 text-xs font-mono"
            />
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Если поле пустое, AntyBrowser автоматически использует встроенный portable-Chromium или системный Chrome/Edge.
          </p>
        </div>

        {/* Firefox Configuration */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            Пользовательский путь к firefox.exe (Mozilla Firefox / Nightly)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customFirefox}
              onChange={(e) => setCustomFirefox(e.target.value)}
              placeholder="Автоопределение (./bin/firefox/firefox.exe -> Mozilla Firefox -> Firefox Nightly)"
              className="anty-input flex-1 text-xs font-mono"
            />
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Для работы встроенного Mozilla VPN рекомендуется использовать Firefox версии 135+ или Firefox Nightly 150+.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Порт локального API (Playwright)
            </label>
            <input
              type="number"
              value={apiPort}
              onChange={(e) => setApiPort(parseInt(e.target.value, 10))}
              className="anty-input w-full text-xs font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="anty-btn-primary text-xs px-5 py-2 shadow-lg shadow-blue-600/30"
          >
            <Save size={14} />
            <span>Сохранить настройки</span>
          </button>
        </div>
      </div>

      {/* Backup and Restore */}
      <div className="anty-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider text-gray-400">
              Резервное копирование и Восстановление
            </h4>
            <p className="text-[11px] text-gray-400">
              Сохраняйте все профили, cookies и настройки в изолированные архивы
            </p>
          </div>

          <button
            onClick={handleCreateBackup}
            className="anty-btn-primary text-xs px-4 py-2"
          >
            <HardDrive size={14} />
            <span>Создать бэкап</span>
          </button>
        </div>

        {/* Backups List */}
        <div className="space-y-2">
          {backups.length === 0 ? (
            <div className="p-4 bg-[#151d30] border border-[#24304f] rounded-lg text-xs text-gray-400 text-center">
              Резервных копий пока нет
            </div>
          ) : (
            backups.map((bName) => (
              <div
                key={bName}
                className="flex items-center justify-between p-3 bg-[#151d30] border border-[#24304f] rounded-lg text-xs"
              >
                <div className="flex items-center gap-2">
                  <HardDrive size={15} className="text-blue-400" />
                  <span className="font-mono text-gray-200">{bName}</span>
                </div>

                <button
                  onClick={() => handleRestoreBackup(bName)}
                  className="anty-btn-secondary text-[11px] px-2.5 py-1"
                >
                  <RotateCcw size={12} />
                  <span>Восстановить</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
