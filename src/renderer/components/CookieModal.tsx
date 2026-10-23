import React, { useState, useEffect } from 'react';
import { X, Copy, Download, Upload, Check } from 'lucide-react';
import { Profile } from '../types';

interface CookieModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onCookiesUpdated?: () => void;
}

export const CookieModal: React.FC<CookieModalProps> = ({
  isOpen,
  onClose,
  profile,
  onCookiesUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [format, setFormat] = useState<'json' | 'netscape'>('json');
  const [exportData, setExportData] = useState('');
  const [importData, setImportData] = useState('');
  const [copied, setCopied] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && profile) {
      loadExportCookies(format);
      setImportData('');
      setImportResult(null);
    }
  }, [isOpen, profile, format]);

  const loadExportCookies = async (fmt: 'json' | 'netscape') => {
    if (!profile) return;
    try {
      const data = await window.antyApi.exportCookies(profile.id, fmt);
      setExportData(data);
    } catch (e: any) {
      setExportData('Ошибка при экспорте куки: ' + e.message);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = format === 'json' ? 'json' : 'txt';
    const blob = new Blob([exportData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cookies_${profile?.name.replace(/\s+/g, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!profile || !importData.trim()) return;
    try {
      const count = await window.antyApi.importCookies(profile.id, importData);
      setImportResult(`Успешно импортировано ${count} куки!`);
      if (onCookiesUpdated) onCookiesUpdated();
    } catch (err: any) {
      setImportResult(`Ошибка импорта: ${err.message}`);
    }
  };

  if (!isOpen || !profile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#111827] border border-[#24304f] rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="h-14 px-6 border-b border-[#24304f] flex items-center justify-between bg-[#0e1526]">
          <h3 className="font-semibold text-white text-base">
            Управление Cookies: <span className="text-blue-400">{profile.name}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-md">
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center justify-between border-b border-[#24304f] px-6 bg-[#0e1526]/50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('export')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'export'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Экспорт Cookies
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'import'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Импорт Cookies
            </button>
          </div>

          {activeTab === 'export' && (
            <div className="flex items-center gap-1.5 bg-[#151d30] p-1 rounded-md border border-[#24304f]">
              <button
                onClick={() => setFormat('json')}
                className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                  format === 'json' ? 'bg-blue-600 text-white' : 'text-gray-400'
                }`}
              >
                JSON
              </button>
              <button
                onClick={() => setFormat('netscape')}
                className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                  format === 'netscape' ? 'bg-blue-600 text-white' : 'text-gray-400'
                }`}
              >
                Netscape
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'export' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Текущие куки профиля (формат {format.toUpperCase()}):</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="anty-btn-secondary text-xs px-2.5 py-1"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="anty-btn-secondary text-xs px-2.5 py-1"
                  >
                    <Download size={12} />
                    <span>Скачать .{format === 'json' ? 'json' : 'txt'}</span>
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                rows={12}
                value={exportData}
                className="anty-input w-full text-xs font-mono resize-none leading-relaxed"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-gray-400">
                Вставьте куки в текстовое поле (поддерживаются форматы JSON и Netscape):
              </div>
              <textarea
                rows={10}
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="[ { name: '...', value: '...' } ] или формат Netscape"
                className="anty-input w-full text-xs font-mono resize-none leading-relaxed"
              />
              {importResult && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium ${
                    importResult.startsWith('Успешно')
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {importResult}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={handleImport}
                  className="anty-btn-primary text-xs px-5 py-2"
                >
                  <Upload size={14} />
                  <span>Импортировать в профиль</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
