import React, { useState, useEffect } from 'react';
import {
  X,
  Dices,
  Monitor,
  Cpu,
  Globe,
  Sliders,
  Cookie,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { Profile, ProxyItem } from '../types';
import { WEBGL_PRESETS, SCREEN_RESOLUTIONS, USER_AGENT_PRESETS } from '../../shared/presets';
import { parseProxyString, cleanHost } from '../../shared/proxyUtils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: Partial<Profile>, initialCookies?: string) => Promise<void>;
  editingProfile?: Profile | null;
  proxies: ProxyItem[];
}

type TabType = 'general' | 'proxy' | 'fingerprint' | 'cookies';

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProfile,
  proxies,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  // Form State
  const [name, setName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [os, setOs] = useState<'windows' | 'macos' | 'linux'>('windows');
  const [notes, setNotes] = useState('');
  const [customFlags, setCustomFlags] = useState('');

  // Proxy State
  const [proxyMode, setProxyMode] = useState<'none' | 'saved' | 'new'>('none');
  const [selectedProxyId, setSelectedProxyId] = useState<string>('');
  const [newProxyType, setNewProxyType] = useState<'http' | 'socks5'>('http');
  const [newProxyHost, setNewProxyHost] = useState('');
  const [newProxyPort, setNewProxyPort] = useState('8080');
  const [newProxyUser, setNewProxyUser] = useState('');
  const [newProxyPass, setNewProxyPass] = useState('');

  // Fingerprint State
  const [userAgent, setUserAgent] = useState('');
  const [screenWidth, setScreenWidth] = useState(1920);
  const [screenHeight, setScreenHeight] = useState(1080);
  const [canvasMode, setCanvasMode] = useState<'noise' | 'real' | 'block'>('noise');
  const [canvasSeed, setCanvasSeed] = useState(12345);
  const [webglMode, setWebglMode] = useState<'noise' | 'real' | 'block'>('noise');
  const [webglVendor, setWebglVendor] = useState('Google Inc. (NVIDIA)');
  const [webglRenderer, setWebglRenderer] = useState(
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)'
  );
  const [audioMode, setAudioMode] = useState<'noise' | 'real'>('noise');
  const [audioSeed, setAudioSeed] = useState(54321);
  const [webrtcMode, setWebrtcMode] = useState<'proxy' | 'disable' | 'real'>('proxy');
  const [language, setLanguage] = useState('ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7');
  const [timezoneMode, setTimezoneMode] = useState<'auto' | 'manual'>('auto');
  const [timezoneId, setTimezoneId] = useState('Europe/Moscow');
  const [geolocationMode, setGeolocationMode] = useState<'auto' | 'manual' | 'block'>('auto');
  const [latitude, setLatitude] = useState<string>('55.7558');
  const [longitude, setLongitude] = useState<string>('37.6173');
  const [cpuCores, setCpuCores] = useState(8);
  const [memoryGb, setMemoryGb] = useState(16);

  // Cookies State
  const [initialCookies, setInitialCookies] = useState('');

  // Populate state on open / edit
  useEffect(() => {
    if (editingProfile) {
      setName(editingProfile.name || '');
      setGroupName(editingProfile.group_name || '');
      setTags(editingProfile.tags || []);
      setOs(editingProfile.os || 'windows');
      setNotes(editingProfile.notes || '');
      setCustomFlags(editingProfile.custom_flags || '');

      if (editingProfile.proxy_id) {
        setProxyMode('saved');
        setSelectedProxyId(editingProfile.proxy_id);
      } else {
        setProxyMode('none');
      }

      setUserAgent(editingProfile.user_agent || '');
      setScreenWidth(editingProfile.screen_width || 1920);
      setScreenHeight(editingProfile.screen_height || 1080);
      setCanvasMode(editingProfile.canvas_mode || 'noise');
      setCanvasSeed(editingProfile.canvas_noise_seed || 12345);
      setWebglMode(editingProfile.webgl_mode || 'noise');
      setWebglVendor(editingProfile.webgl_vendor || 'Google Inc. (NVIDIA)');
      setWebglRenderer(editingProfile.webgl_renderer || '');
      setAudioMode(editingProfile.audio_mode || 'noise');
      setAudioSeed(editingProfile.audio_noise_seed || 54321);
      setWebrtcMode(editingProfile.webrtc_mode || 'proxy');
      setLanguage(editingProfile.language || 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7');
      setTimezoneMode(editingProfile.timezone_mode || 'auto');
      setTimezoneId(editingProfile.timezone_id || 'Europe/Moscow');
      setGeolocationMode(editingProfile.geolocation_mode || 'auto');
      setLatitude(editingProfile.latitude ? String(editingProfile.latitude) : '55.7558');
      setLongitude(editingProfile.longitude ? String(editingProfile.longitude) : '37.6173');
      setCpuCores(editingProfile.cpu_cores || 8);
      setMemoryGb(editingProfile.memory_gb || 16);
      setInitialCookies('');
    } else {
      // New profile defaults
      resetToNewProfile();
    }
  }, [editingProfile, isOpen]);

  const resetToNewProfile = async () => {
    setName(`Профиль ${Math.floor(Math.random() * 900) + 100}`);
    setGroupName('');
    setTags(['Default']);
    setOs('windows');
    setNotes('');
    setCustomFlags('');
    setProxyMode('none');
    setSelectedProxyId('');
    setInitialCookies('');
    await handleRandomizeFingerprint('windows');
  };

  const handleRandomizeFingerprint = async (selectedOs = os) => {
    try {
      const fp = await window.antyApi.generateFingerprint(selectedOs);
      if (fp.user_agent) setUserAgent(fp.user_agent);
      if (fp.screen_width) setScreenWidth(fp.screen_width);
      if (fp.screen_height) setScreenHeight(fp.screen_height);
      if (fp.canvas_noise_seed) setCanvasSeed(fp.canvas_noise_seed);
      if (fp.audio_noise_seed) setAudioSeed(fp.audio_noise_seed);
      if (fp.webgl_vendor) setWebglVendor(fp.webgl_vendor);
      if (fp.webgl_renderer) setWebglRenderer(fp.webgl_renderer);
      if (fp.cpu_cores) setCpuCores(fp.cpu_cores);
      if (fp.memory_gb) setMemoryGb(fp.memory_gb);
    } catch (e) {
      console.error('Error generating fingerprint:', e);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let proxyIdToUse: string | null = null;
    if (proxyMode === 'saved') {
      proxyIdToUse = selectedProxyId || null;
    } else if (proxyMode === 'new' && newProxyHost) {
      // Clean / parse new proxy first
      const parsed = parseProxyString(newProxyHost, newProxyType);
      const hostToSave = parsed?.host || cleanHost(newProxyHost).host;
      const portToSave = parsed?.port || parseInt(newProxyPort, 10) || 8080;
      const userToSave = parsed?.username || newProxyUser.trim() || null;
      const passToSave = parsed?.password || newProxyPass.trim() || null;
      const typeToSave = parsed?.type || newProxyType;

      const savedProxy = await window.antyApi.saveProxy({
        name: `Proxy for ${name}`,
        type: typeToSave,
        host: hostToSave,
        port: portToSave,
        username: userToSave,
        password: passToSave,
      });
      proxyIdToUse = savedProxy.id;
    }

    const profileData: Partial<Profile> = {
      id: editingProfile ? editingProfile.id : undefined,
      name,
      group_name: groupName,
      tags,
      os,
      browser_type: 'chromium',
      proxy_id: proxyIdToUse,
      user_agent: userAgent,
      screen_width: screenWidth,
      screen_height: screenHeight,
      screen_color_depth: 24,
      device_pixel_ratio: screenWidth > 2000 ? 1.25 : 1.0,
      canvas_mode: canvasMode,
      canvas_noise_seed: canvasSeed,
      webgl_mode: webglMode,
      webgl_vendor: webglVendor,
      webgl_renderer: webglRenderer,
      audio_mode: audioMode,
      audio_noise_seed: audioSeed,
      webrtc_mode: webrtcMode,
      language,
      timezone_mode: timezoneMode,
      timezone_id: timezoneId,
      geolocation_mode: geolocationMode,
      latitude: geolocationMode === 'manual' ? parseFloat(latitude) : null,
      longitude: geolocationMode === 'manual' ? parseFloat(longitude) : null,
      accuracy: 50,
      cpu_cores: cpuCores,
      memory_gb: memoryGb,
      notes,
      custom_flags: customFlags,
    };

    await onSave(profileData, initialCookies.trim() || undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-4xl bg-[#111827] border border-[#24304f] rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="h-14 px-6 border-b border-[#24304f] flex items-center justify-between bg-[#0e1526]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
              {editingProfile ? '✎' : '+'}
            </div>
            <h3 className="font-semibold text-white text-base">
              {editingProfile ? `Редактирование профиля: ${editingProfile.name}` : 'Создание нового профиля'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center border-b border-[#24304f] px-6 bg-[#0e1526]/50">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Monitor size={14} />
            <span>Основные</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('proxy')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'proxy'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Globe size={14} />
            <span>Прокси</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fingerprint')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'fingerprint'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders size={14} />
            <span>Отпечаток (Fingerprint)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cookies')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'cookies'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Cookie size={14} />
            <span>Куки (Импорт)</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Название профиля <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Например: FB Account #1"
                    className="anty-input w-full text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Группа
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Например: Facebook / Crypto"
                    className="anty-input w-full text-sm"
                  />
                </div>
              </div>

              {/* OS Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Операционная система
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['windows', 'macos', 'linux'] as const).map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => {
                        setOs(platform);
                        handleRandomizeFingerprint(platform);
                      }}
                      className={`p-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 capitalize transition-all ${
                        os === platform
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                          : 'bg-[#151d30] border-[#24304f] text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <span>{platform === 'windows' ? 'Windows' : platform === 'macos' ? 'macOS' : 'Linux'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Теги (нажмите Enter для добавления)
                </label>
                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-[#151d30] border border-[#24304f] rounded-lg min-h-[42px]">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder={tags.length === 0 ? 'Введите тег и нажмите Enter' : ''}
                    className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-500 flex-1 min-w-[120px]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Заметки
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Дополнительные заметки к профилю..."
                  className="anty-input w-full text-xs resize-none"
                />
              </div>

              {/* Custom Chrome Flags */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Дополнительные флаги Chromium (опционально)
                </label>
                <input
                  type="text"
                  value={customFlags}
                  onChange={(e) => setCustomFlags(e.target.value)}
                  placeholder="--disable-gpu --disable-extensions"
                  className="anty-input w-full text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* TAB 2: PROXY */}
          {activeTab === 'proxy' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setProxyMode('none')}
                  className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                    proxyMode === 'none'
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-[#151d30] border-[#24304f] text-gray-400'
                  }`}
                >
                  Без прокси (Прямое подключение)
                </button>

                <button
                  type="button"
                  onClick={() => setProxyMode('saved')}
                  className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                    proxyMode === 'saved'
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-[#151d30] border-[#24304f] text-gray-400'
                  }`}
                >
                  Выбрать сохранённый прокси
                </button>

                <button
                  type="button"
                  onClick={() => setProxyMode('new')}
                  className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                    proxyMode === 'new'
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-[#151d30] border-[#24304f] text-gray-400'
                  }`}
                >
                  Добавить новый прокси
                </button>
              </div>

              {proxyMode === 'saved' && (
                <div className="p-4 bg-[#151d30] border border-[#24304f] rounded-lg">
                  <label className="block text-xs font-medium text-gray-300 mb-2">
                    Выберите прокси из списка ({proxies.length} доступно)
                  </label>
                  {proxies.length === 0 ? (
                    <p className="text-xs text-gray-400">
                      Нет сохранённых прокси. Добавьте прокси во вкладке "Прокси" или выберите "Добавить новый прокси".
                    </p>
                  ) : (
                    <select
                      value={selectedProxyId}
                      onChange={(e) => setSelectedProxyId(e.target.value)}
                      className="anty-input w-full text-xs"
                    >
                      <option value="">-- Выберите прокси --</option>
                      {proxies.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} [{p.type.toUpperCase()}] {p.host}:{p.port} {p.country ? `(${p.country})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {proxyMode === 'new' && (
                <div className="p-4 bg-[#151d30] border border-[#24304f] rounded-lg space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Тип</label>
                      <select
                        value={newProxyType}
                        onChange={(e) => setNewProxyType(e.target.value as any)}
                        className="anty-input w-full text-xs"
                      >
                        <option value="http">HTTP</option>
                        <option value="socks5">SOCKS5</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-300 mb-1">Хост / IP</label>
                      <input
                        type="text"
                        value={newProxyHost}
                        onChange={(e) => setNewProxyHost(e.target.value)}
                        placeholder="192.168.1.1"
                        className="anty-input w-full text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Порт</label>
                      <input
                        type="text"
                        value={newProxyPort}
                        onChange={(e) => setNewProxyPort(e.target.value)}
                        placeholder="8080"
                        className="anty-input w-full text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Логин (опционально)</label>
                      <input
                        type="text"
                        value={newProxyUser}
                        onChange={(e) => setNewProxyUser(e.target.value)}
                        placeholder="user"
                        className="anty-input w-full text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Пароль (опционально)</label>
                      <input
                        type="password"
                        value={newProxyPass}
                        onChange={(e) => setNewProxyPass(e.target.value)}
                        placeholder="••••••••"
                        className="anty-input w-full text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FINGERPRINT */}
          {activeTab === 'fingerprint' && (
            <div className="space-y-5">
              {/* Randomize Action Banner */}
              <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={20} className="text-blue-400" />
                  <div>
                    <h4 className="text-xs font-semibold text-white">Генератор согласованного отпечатка</h4>
                    <p className="text-[11px] text-gray-400">
                      Сгенерируйте реалистичный цифровой отпечаток устройства в 1 клик
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRandomizeFingerprint(os)}
                  className="anty-btn-primary text-xs px-3 py-1.5"
                >
                  <Dices size={14} />
                  <span>Случайный отпечаток</span>
                </button>
              </div>

              {/* User Agent */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">User-Agent</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={userAgent}
                    onChange={(e) => setUserAgent(e.target.value)}
                    className="anty-input flex-1 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const list = USER_AGENT_PRESETS[os] || USER_AGENT_PRESETS.windows;
                      setUserAgent(list[Math.floor(Math.random() * list.length)]);
                    }}
                    className="anty-btn-secondary text-xs px-3"
                    title="Новый UA"
                  >
                    <Dices size={14} />
                  </button>
                </div>
              </div>

              {/* Screen Resolution */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Разрешение экрана</label>
                  <select
                    value={`${screenWidth}x${screenHeight}`}
                    onChange={(e) => {
                      const [w, h] = e.target.value.split('x').map(Number);
                      setScreenWidth(w);
                      setScreenHeight(h);
                    }}
                    className="anty-input w-full text-xs font-mono"
                  >
                    {SCREEN_RESOLUTIONS.map((res) => (
                      <option key={`${res.width}x${res.height}`} value={`${res.width}x${res.height}`}>
                        {res.width} × {res.height} (16:9)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Язык браузера</label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="anty-input w-full text-xs font-mono"
                  />
                </div>
              </div>

              {/* Canvas & WebGL & Audio Protections */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#151d30] border border-[#24304f] rounded-lg">
                  <label className="block text-xs font-semibold text-gray-300 mb-2">Canvas</label>
                  <div className="flex gap-1">
                    {(['noise', 'real', 'block'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCanvasMode(mode)}
                        className={`flex-1 py-1.5 text-[11px] rounded capitalize font-medium ${
                          canvasMode === mode ? 'bg-blue-600 text-white' : 'bg-[#1b253d] text-gray-400'
                        }`}
                      >
                        {mode === 'noise' ? 'Шум' : mode === 'real' ? 'Реал' : 'Блок'}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-2 font-mono">
                    Seed: {canvasSeed}
                  </div>
                </div>

                <div className="p-3 bg-[#151d30] border border-[#24304f] rounded-lg">
                  <label className="block text-xs font-semibold text-gray-300 mb-2">WebGL</label>
                  <div className="flex gap-1">
                    {(['noise', 'real', 'block'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setWebglMode(mode)}
                        className={`flex-1 py-1.5 text-[11px] rounded capitalize font-medium ${
                          webglMode === mode ? 'bg-blue-600 text-white' : 'bg-[#1b253d] text-gray-400'
                        }`}
                      >
                        {mode === 'noise' ? 'Шум' : mode === 'real' ? 'Реал' : 'Блок'}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-2 truncate font-mono">
                    {webglVendor}
                  </div>
                </div>

                <div className="p-3 bg-[#151d30] border border-[#24304f] rounded-lg">
                  <label className="block text-xs font-semibold text-gray-300 mb-2">AudioContext</label>
                  <div className="flex gap-1">
                    {(['noise', 'real'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setAudioMode(mode)}
                        className={`flex-1 py-1.5 text-[11px] rounded capitalize font-medium ${
                          audioMode === mode ? 'bg-blue-600 text-white' : 'bg-[#1b253d] text-gray-400'
                        }`}
                      >
                        {mode === 'noise' ? 'Шум' : 'Реал'}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-2 font-mono">
                    Seed: {audioSeed}
                  </div>
                </div>
              </div>

              {/* WebGL GPU Preset Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Модель видеокарты (WebGL Renderer)
                </label>
                <select
                  value={webglRenderer}
                  onChange={(e) => {
                    setWebglRenderer(e.target.value);
                    const match = WEBGL_PRESETS.find((p) => p.renderer === e.target.value);
                    if (match) setWebglVendor(match.vendor);
                  }}
                  className="anty-input w-full text-xs font-mono"
                >
                  {WEBGL_PRESETS.map((p, idx) => (
                    <option key={idx} value={p.renderer}>
                      {p.vendor} — {p.renderer}
                    </option>
                  ))}
                </select>
              </div>

              {/* WebRTC & Timezone & Geolocation */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">WebRTC</label>
                  <select
                    value={webrtcMode}
                    onChange={(e) => setWebrtcMode(e.target.value as any)}
                    className="anty-input w-full text-xs"
                  >
                    <option value="proxy">Через прокси</option>
                    <option value="disable">Отключить</option>
                    <option value="real">Реальный</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Часовой пояс</label>
                  <select
                    value={timezoneId}
                    onChange={(e) => setTimezoneId(e.target.value)}
                    className="anty-input w-full text-xs"
                  >
                    <option value="Europe/Moscow">Europe/Moscow (UTC+3)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                    <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Геолокация</label>
                  <select
                    value={geolocationMode}
                    onChange={(e) => setGeolocationMode(e.target.value as any)}
                    className="anty-input w-full text-xs"
                  >
                    <option value="auto">Авто по IP</option>
                    <option value="manual">Вручную</option>
                    <option value="block">Блокировать</option>
                  </select>
                </div>
              </div>

              {/* Hardware: CPU & RAM */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Процессор (Ядра)
                  </label>
                  <select
                    value={cpuCores}
                    onChange={(e) => setCpuCores(parseInt(e.target.value, 10))}
                    className="anty-input w-full text-xs"
                  >
                    <option value={2}>2 ядра</option>
                    <option value={4}>4 ядра</option>
                    <option value={6}>6 ядер</option>
                    <option value={8}>8 ядер</option>
                    <option value={12}>12 ядер</option>
                    <option value={16}>16 ядер</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Оперативная память (RAM)
                  </label>
                  <select
                    value={memoryGb}
                    onChange={(e) => setMemoryGb(parseInt(e.target.value, 10))}
                    className="anty-input w-full text-xs"
                  >
                    <option value={4}>4 GB</option>
                    <option value={8}>8 GB</option>
                    <option value={16}>16 GB</option>
                    <option value={32}>32 GB</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COOKIES */}
          {activeTab === 'cookies' && (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-gray-300">
                Вставьте куки в формате JSON или Netscape (опционально)
              </label>
              <textarea
                rows={10}
                value={initialCookies}
                onChange={(e) => setInitialCookies(e.target.value)}
                placeholder={`[{"name":"session_id","value":"xyz","domain":".example.com","path":"/"}] \nили\n.example.com TRUE / FALSE 1750000000 session_id xyz`}
                className="anty-input w-full text-xs font-mono resize-none leading-relaxed"
              />
              <p className="text-[11px] text-gray-400">
                Куки будут автоматически загружены в портативный контейнер профиля и внедрены в браузер при старте.
              </p>
            </div>
          )}

          {/* Modal Footer Controls */}
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
              <span>{editingProfile ? 'Сохранить изменения' : 'Создать профиль'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
