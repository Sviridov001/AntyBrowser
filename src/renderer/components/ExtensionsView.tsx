import React, { useState, useEffect } from 'react';
import {
  Puzzle,
  FolderOpen,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  Info,
  X,
  Check,
} from 'lucide-react';
import { ExtensionItem } from '../types';

export const ExtensionsView: React.FC = () => {
  const [extensions, setExtensions] = useState<ExtensionItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [extPath, setExtPath] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadExtensions();
  }, []);

  const loadExtensions = async () => {
    try {
      if (window.antyApi && window.antyApi.getExtensions) {
        const list = await window.antyApi.getExtensions();
        setExtensions(list);
      }
    } catch (e) {
      console.error('Error loading extensions:', e);
    }
  };

  const handleToggle = async (ext: ExtensionItem) => {
    try {
      await window.antyApi.toggleExtension(ext.id, !ext.enabled);
      setExtensions((prev) =>
        prev.map((item) => (item.id === ext.id ? { ...item, enabled: !item.enabled } : item))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Удалить расширение из списка?')) {
      try {
        await window.antyApi.deleteExtension(id);
        setExtensions((prev) => prev.filter((item) => item.id !== id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleOpenFolder = async () => {
    try {
      await window.antyApi.openExtensionsFolder();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !extPath.trim()) return;

    setLoading(true);
    try {
      await window.antyApi.addExtension({
        name: name.trim(),
        path: extPath.trim(),
        version: version.trim() || '1.0.0',
      });
      setName('');
      setExtPath('');
      setVersion('1.0.0');
      setIsAddModalOpen(false);
      loadExtensions();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const popularExtensions = [
    {
      name: 'uBlock Origin',
      desc: 'Блокировка навязчивой рекламы, вредоносных скриптов и трекеров отслеживания.',
      link: 'https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm',
    },
    {
      name: 'Cookie-Editor',
      desc: 'Быстрый просмотр, экспорт, импорт и редактирование cookies текущей вкладки.',
      link: 'https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm',
    },
    {
      name: 'MetaMask',
      desc: 'Популярный некастодиальный криптокошелек для Web3 и децентрализованных сетей.',
      link: 'https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
    },
    {
      name: 'Proxy Switcher and Manager',
      desc: 'Удобное ручное переключение прокси-серверов прямо из интерфейса браузера.',
      link: 'https://chromewebstore.google.com/detail/proxy-switcher-and-manage/onnfghpihfgakemlemaaeijlaleobool',
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Puzzle className="text-blue-400" size={20} />
            <span>Менеджер Расширений Chromium</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Подключение расширений (распакованные папки и расширения Chrome Web Store) к профилям
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenFolder}
            className="anty-btn-secondary text-xs px-3.5 py-2"
          >
            <FolderOpen size={14} className="text-blue-400" />
            <span>Открыть папку ./data/extensions</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="anty-btn-primary text-xs px-4 py-2 font-semibold shadow-lg shadow-blue-600/30"
          >
            <Plus size={16} />
            <span>Добавить расширение</span>
          </button>
        </div>
      </div>

      {/* Installed Extensions List */}
      <div className="anty-card p-5 space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider text-gray-400">
          Установленные расширения ({extensions.length})
        </h4>

        {extensions.length === 0 ? (
          <div className="p-8 bg-[#151d30] border border-[#24304f] rounded-lg text-center space-y-2">
            <Puzzle size={36} className="text-gray-600 mx-auto" />
            <p className="text-sm font-medium text-gray-300">Расширения пока не добавлены</p>
            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
              Вы можете добавить любое распакованное расширение или установить его прямо в профиле через Chrome Web Store.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {extensions.map((ext) => (
              <div
                key={ext.id}
                className="flex items-center justify-between p-3.5 bg-[#151d30] border border-[#24304f] rounded-lg text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
                    <Puzzle size={16} />
                  </div>
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span>{ext.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">v{ext.version}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono truncate max-w-[260px] mt-0.5">
                      {ext.path}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(ext)}
                    className={`text-[10px] px-2.5 py-1 rounded font-semibold transition-colors ${
                      ext.enabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}
                  >
                    {ext.enabled ? 'Включено' : 'Выключено'}
                  </button>

                  <button
                    onClick={() => handleDelete(ext.id)}
                    className="p-1.5 rounded bg-[#1b253d] text-gray-400 hover:text-red-400 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Extensions */}
      <div className="anty-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-amber-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider text-gray-400">
            Рекомендуемые расширения для антидетекта
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {popularExtensions.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-[#151d30] border border-[#24304f] rounded-lg space-y-2 flex flex-col justify-between"
            >
              <div>
                <h5 className="font-semibold text-white text-xs flex items-center gap-1.5">
                  <Shield size={13} className="text-blue-400" />
                  <span>{item.name}</span>
                </h5>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{item.desc}</p>
              </div>

              <div className="pt-2 border-t border-[#24304f]/60 flex justify-between items-center text-[10px]">
                <span className="text-gray-500">Chrome Web Store</span>
                <span className="text-blue-400 flex items-center gap-1 font-medium">
                  Доступно в профиле <ExternalLink size={10} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guide Info */}
      <div className="anty-card p-5 space-y-3 bg-[#111827]">
        <div className="flex items-start gap-3 bg-[#1b253d] p-4 rounded-lg border border-[#24304f]">
          <Info size={20} className="text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-2">
            <h4 className="font-semibold text-white">Как работают расширения в AntyBrowser:</h4>
            <p className="text-gray-300 leading-relaxed">
              • <strong>Способ 1 (Самый простой):</strong> Запустите любой профиль браузера кнопкой «Старт», перейдите в <code className="text-blue-400 font-mono">Chrome Web Store</code> и установите любое расширение в 1 клик. Расширение сохранится прямо в контейнер этого профиля в <code className="text-blue-400 font-mono">./data/profiles/&#123;id&#125;</code> и будет сохраняться между перезапусками и при переносе на другой ПК.
            </p>
            <p className="text-gray-300 leading-relaxed">
              • <strong>Способ 2 (Глобальные распакованные расширения):</strong> Поместите распакованное расширение (с файлом <code className="text-blue-400 font-mono">manifest.json</code>) в папку <code className="text-blue-400 font-mono">./data/extensions/</code> и нажмите «Добавить расширение».
            </p>
          </div>
        </div>
      </div>

      {/* Add Extension Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-[#111827] border border-[#24304f] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="h-14 px-6 border-b border-[#24304f] flex items-center justify-between bg-[#0e1526]">
              <h3 className="font-semibold text-white text-base">Добавить расширение</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-md"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Название расширения <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: uBlock Origin"
                  className="anty-input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Путь к распакованной папке (или относительный путь в ./data/extensions) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={extPath}
                  onChange={(e) => setExtPath(e.target.value)}
                  placeholder="./data/extensions/my_extension"
                  className="anty-input w-full text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Версия</label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0.0"
                  className="anty-input w-full text-xs font-mono"
                />
              </div>

              <div className="pt-4 border-t border-[#24304f] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="anty-btn-secondary text-xs px-4 py-2"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="anty-btn-primary text-xs px-6 py-2 shadow-lg shadow-blue-600/30"
                >
                  <Check size={14} />
                  <span>{loading ? 'Добавляю...' : 'Добавить'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
