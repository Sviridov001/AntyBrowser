import React, { useState, useEffect } from 'react';
import { X, Check, Zap } from 'lucide-react';
import { ProxyItem, ProxyType } from '../types';
import { parseProxyString, cleanHost } from '../../shared/proxyUtils';

interface ProxyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (proxy: Partial<ProxyItem>) => Promise<void>;
  editingProxy?: ProxyItem | null;
}

export const ProxyModal: React.FC<ProxyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProxy,
}) => {
  const [quickInput, setQuickInput] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<ProxyType>('http');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('8080');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [changeUrl, setChangeUrl] = useState('');

  useEffect(() => {
    if (editingProxy) {
      setName(editingProxy.name || '');
      setType(editingProxy.type || 'http');
      const cleaned = cleanHost(editingProxy.host || '');
      setHost(cleaned.host);
      setPort(String(cleaned.port || editingProxy.port || 8080));
      setUsername(editingProxy.username || '');
      setPassword(editingProxy.password || '');
      setChangeUrl(editingProxy.change_url || '');
      setQuickInput('');
    } else {
      setName(`Прокси ${Math.floor(Math.random() * 900) + 100}`);
      setType('http');
      setHost('');
      setPort('8080');
      setUsername('');
      setPassword('');
      setChangeUrl('');
      setQuickInput('');
    }
  }, [editingProxy, isOpen]);

  // Handle quick input parse
  const handleQuickInputChange = (val: string) => {
    setQuickInput(val);
    const parsed = parseProxyString(val, type);
    if (parsed && parsed.host) {
      setType(parsed.type);
      setHost(parsed.host);
      if (parsed.port) setPort(String(parsed.port));
      if (parsed.username !== null) setUsername(parsed.username);
      if (parsed.password !== null) setPassword(parsed.password);
    }
  };

  // Handle host change (auto-clean if user pastes full URL or port)
  const handleHostChange = (val: string) => {
    const parsed = parseProxyString(val, type);
    if (parsed && (parsed.port || parsed.username || parsed.host !== val)) {
      setHost(parsed.host);
      if (parsed.port && parsed.port !== 8080) setPort(String(parsed.port));
      if (parsed.username) setUsername(parsed.username);
      if (parsed.password) setPassword(parsed.password);
      if (parsed.type) setType(parsed.type);
    } else {
      const cleaned = cleanHost(val);
      setHost(cleaned.host);
      if (cleaned.port) setPort(String(cleaned.port));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cleanHost(host);
    const finalHost = cleaned.host;
    const finalPort = cleaned.port || parseInt(port, 10) || 8080;

    await onSave({
      id: editingProxy ? editingProxy.id : undefined,
      name,
      type,
      host: finalHost,
      port: finalPort,
      username: username.trim() || null,
      password: password.trim() || null,
      change_url: changeUrl.trim() || null,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-[#111827] border border-[#24304f] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 px-6 border-b border-[#24304f] flex items-center justify-between bg-[#0e1526]">
          <h3 className="font-semibold text-white text-base">
            {editingProxy ? 'Редактировать прокси' : 'Добавить новый прокси'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-md">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quick paste helper */}
          <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-lg space-y-1.5">
            <label className="text-[11px] font-semibold text-blue-400 flex items-center gap-1.5">
              <Zap size={13} />
              <span>Быстрый ввод прокси (вставьте строку целиком)</span>
            </label>
            <input
              type="text"
              value={quickInput}
              onChange={(e) => handleQuickInputChange(e.target.value)}
              placeholder="ip:port:login:password или http://login:pass@ip:port"
              className="anty-input w-full text-xs font-mono bg-[#0b0f19]"
            />
            <p className="text-[10px] text-gray-400">
              Формат определится автоматически и заполнит поля ниже
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Название прокси</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Мобильный US Прокси"
              className="anty-input w-full text-xs"
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Протокол</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ProxyType)}
                className="anty-input w-full text-xs"
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="socks5">SOCKS5</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Хост / IP <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => handleHostChange(e.target.value)}
                placeholder="134.195.155.129"
                className="anty-input w-full text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Порт <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="9559"
                className="anty-input w-full text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Логин (опционально)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="rPwttd"
                className="anty-input w-full text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Пароль (опционально)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="anty-input w-full text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Ссылка для смены IP (для мобильных прокси)
            </label>
            <input
              type="text"
              value={changeUrl}
              onChange={(e) => setChangeUrl(e.target.value)}
              placeholder="https://changeip.mobileproxy.com/api/..."
              className="anty-input w-full text-xs font-mono"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-[#24304f] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="anty-btn-secondary text-xs px-4 py-2"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="anty-btn-primary text-xs px-6 py-2 shadow-lg shadow-blue-600/30"
            >
              <Check size={14} />
              <span>{editingProxy ? 'Сохранить' : 'Добавить прокси'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
