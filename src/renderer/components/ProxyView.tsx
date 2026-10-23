import React, { useState } from 'react';
import { Plus, Globe, Trash2, Edit, RefreshCw, CheckCircle2, XCircle, Clock, Upload, X } from 'lucide-react';
import { ProxyItem } from '../types';
import { cleanHost, parseProxyString } from '../../shared/proxyUtils';

interface ProxyViewProps {
  proxies: ProxyItem[];
  onAddProxy: () => void;
  onEditProxy: (proxy: ProxyItem) => void;
  onDeleteProxy: (id: string) => void;
  onCheckProxy: (proxy: ProxyItem) => Promise<any>;
}

export const ProxyView: React.FC<ProxyViewProps> = ({
  proxies,
  onAddProxy,
  onEditProxy,
  onDeleteProxy,
  onCheckProxy,
}) => {
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);

  const handleCheck = async (proxy: ProxyItem) => {
    setCheckingIds((prev) => new Set(prev).add(proxy.id));
    try {
      await onCheckProxy(proxy);
    } finally {
      setCheckingIds((prev) => {
        const next = new Set(prev);
        next.delete(proxy.id);
        return next;
      });
    }
  };

  const handleCheckAll = async () => {
    for (const p of proxies) {
      handleCheck(p);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    setBulkImporting(true);

    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    let count = 0;

    for (const line of lines) {
      const parsed = parseProxyString(line, 'http');
      if (parsed && parsed.host) {
        count++;
        await window.antyApi.saveProxy({
          name: `Прокси ${parsed.host}`,
          type: parsed.type,
          host: parsed.host,
          port: parsed.port,
          username: parsed.username,
          password: parsed.password,
        });
      }
    }

    setBulkImporting(false);
    setIsBulkModalOpen(false);
    setBulkText('');
    window.location.reload(); // Refresh view
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white">Менеджер Прокси</h3>
          <p className="text-xs text-gray-400">
            Поддержка HTTP, HTTPS и SOCKS5 с автоматической авторизацией
          </p>
        </div>

        <div className="flex items-center gap-3">
          {proxies.length > 0 && (
            <button
              onClick={handleCheckAll}
              className="anty-btn-secondary text-xs px-3.5 py-2"
            >
              <RefreshCw size={14} className={checkingIds.size > 0 ? 'animate-spin' : ''} />
              <span>Проверить все ({proxies.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="anty-btn-secondary text-xs px-3.5 py-2"
          >
            <Upload size={14} />
            <span>Массовый импорт</span>
          </button>

          <button
            onClick={onAddProxy}
            className="anty-btn-primary text-xs px-4 py-2 font-semibold shadow-lg shadow-blue-600/30"
          >
            <Plus size={16} />
            <span>Добавить прокси</span>
          </button>
        </div>
      </div>

      {/* Proxies Table */}
      <div className="flex-1 bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden flex flex-col shadow-xl">
        <div className="overflow-x-auto flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#0e1526] sticky top-0 z-10 border-b border-[#1f2937] text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5 w-32">Статус</th>
                <th className="p-3.5">Название</th>
                <th className="p-3.5">Протокол</th>
                <th className="p-3.5">Хост : Порт</th>
                <th className="p-3.5">Внешний IP / Гео</th>
                <th className="p-3.5">Пинг (Latency)</th>
                <th className="p-3.5 text-right pr-6">Действия</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#1f2937]">
              {proxies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Globe size={36} className="text-gray-600" />
                      <p className="text-sm font-medium">Нет добавленных прокси</p>
                      <p className="text-xs text-gray-400">
                        Нажмите кнопку «Добавить прокси», чтобы подключить HTTP или SOCKS5 прокси
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                proxies.map((p) => {
                  const isChecking = checkingIds.has(p.id);
                  const clean = cleanHost(p.host);
                  const displayHost = clean.host || p.host;
                  const displayPort = clean.port || p.port;

                  return (
                    <tr key={p.id} className="hover:bg-[#151d30]/60 transition-colors">
                      {/* Status */}
                      <td className="p-3.5">
                        {p.status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-[11px]">
                            <CheckCircle2 size={12} />
                            <span>Активен</span>
                          </span>
                        ) : p.status === 'error' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-medium text-[11px]">
                            <XCircle size={12} />
                            <span>Ошибка</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400 font-medium text-[11px]">
                            <Clock size={12} />
                            <span>Не проверен</span>
                          </span>
                        )}
                      </td>

                      {/* Name */}
                      <td className="p-3.5 font-semibold text-white">
                        {p.name}
                      </td>

                      {/* Type */}
                      <td className="p-3.5">
                        <span className="uppercase text-[11px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                          {p.type}
                        </span>
                      </td>

                      {/* Host & Port */}
                      <td className="p-3.5 font-mono text-gray-300">
                        {displayHost}:{displayPort}
                        {p.username && (
                          <span className="block text-[10px] text-gray-500 font-sans">
                            Auth: {p.username}
                          </span>
                        )}
                      </td>

                      {/* External IP & Country */}
                      <td className="p-3.5">
                        {p.external_ip ? (
                          <div className="flex flex-col">
                            <span className="font-mono text-gray-200">{p.external_ip}</span>
                            {p.country && (
                              <span className="text-[10px] text-gray-400">{p.country}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Latency */}
                      <td className="p-3.5">
                        {p.latency ? (
                          <span
                            className={`font-mono font-semibold ${
                              p.latency < 500
                                ? 'text-emerald-400'
                                : p.latency < 1200
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }`}
                          >
                            {p.latency} ms
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right pr-6">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Test connection */}
                          <button
                            onClick={() => handleCheck(p)}
                            disabled={isChecking}
                            className="p-1.5 rounded bg-[#1b253d] text-gray-300 hover:text-white hover:bg-[#24304f] transition-colors"
                            title="Проверить соединение"
                          >
                            <RefreshCw size={13} className={isChecking ? 'animate-spin text-blue-400' : ''} />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => onEditProxy(p)}
                            className="p-1.5 rounded bg-[#1b253d] text-gray-400 hover:text-white hover:bg-[#24304f] transition-colors"
                            title="Редактировать"
                          >
                            <Edit size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => onDeleteProxy(p.id)}
                            className="p-1.5 rounded bg-[#1b253d] text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-[#111827] border border-[#24304f] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="h-14 px-6 border-b border-[#24304f] flex items-center justify-between bg-[#0e1526]">
              <h3 className="font-semibold text-white text-base">
                Массовый импорт прокси
              </h3>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-md"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-400">
                Вставьте список прокси (по одному в строке). Поддерживаются любые форматы:
                <br />
                <code className="text-blue-400 font-mono">ip:port:login:password</code>
                <br />
                <code className="text-blue-400 font-mono">http://login:password@ip:port</code>
                <br />
                <code className="text-blue-400 font-mono">ip:port</code>
              </p>

              <textarea
                rows={8}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="134.195.155.129:9559:rPwttd:pass&#10;95.164.111.109:9055:WJeamJ:pass"
                className="anty-input w-full text-xs font-mono resize-none leading-relaxed"
              />

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="anty-btn-secondary text-xs px-4 py-2"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={bulkImporting || !bulkText.trim()}
                  className="anty-btn-primary text-xs px-5 py-2"
                >
                  <Upload size={14} />
                  <span>{bulkImporting ? 'Импортирую...' : 'Импортировать'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
