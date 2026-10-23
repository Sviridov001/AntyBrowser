import React, { useState } from 'react';
import {
  Play,
  Square,
  Plus,
  Search,
  Copy,
  Trash2,
  Edit,
  Cookie,
  Globe,
  Monitor,
  Activity,
  Layers,
  Tag,
} from 'lucide-react';
import { Profile, ProxyItem } from '../types';

interface ProfilesViewProps {
  profiles: Profile[];
  proxies: ProxyItem[];
  onStartProfile: (id: string) => Promise<void>;
  onStopProfile: (id: string) => Promise<void>;
  onCreateProfile: () => void;
  onEditProfile: (profile: Profile) => void;
  onCloneProfile: (id: string) => void;
  onDeleteProfile: (id: string) => void;
  onOpenCookies: (profile: Profile) => void;
}

export const ProfilesView: React.FC<ProfilesViewProps> = ({
  profiles,
  proxies,
  onStartProfile,
  onStopProfile,
  onCreateProfile,
  onEditProfile,
  onCloneProfile,
  onDeleteProfile,
  onOpenCookies,
}) => {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'running' | 'stopped'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Unique groups and tags for filters
  const groups = Array.from(new Set(profiles.map((p) => p.group_name).filter(Boolean)));
  const allTags = Array.from(
    new Set(
      profiles.flatMap((p) => (Array.isArray(p.tags) ? p.tags : []))
    )
  );

  const proxyMap = new Map(proxies.map((pr) => [pr.id, pr]));

  // Filtering
  const filteredProfiles = profiles.filter((p) => {
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      p.name.toLowerCase().includes(s) ||
      p.notes?.toLowerCase().includes(s) ||
      (Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(s))) ||
      p.group_name?.toLowerCase().includes(s);

    const matchesGroup = selectedGroup === 'all' || p.group_name === selectedGroup;
    const matchesTag =
      selectedTag === 'all' || (Array.isArray(p.tags) && p.tags.includes(selectedTag));
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'running' && p.status === 'running') ||
      (selectedStatus === 'stopped' && p.status !== 'running');

    return matchesSearch && matchesGroup && matchesTag && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProfiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProfiles.map((p) => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени, тегу, группе..."
              className="anty-input w-full pl-9 text-xs"
            />
          </div>

          {/* Group filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="anty-input text-xs py-2 bg-[#151d30]"
            >
              <option value="all">Все группы</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="anty-input text-xs py-2 bg-[#151d30]"
              >
                <option value="all">Все теги</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="anty-input text-xs py-2 bg-[#151d30]"
            >
              <option value="all">Все статусы</option>
              <option value="running">Только работающие</option>
              <option value="stopped">Только остановленные</option>
            </select>
          </div>
        </div>

        {/* Create Profile Button */}
        <button
          onClick={onCreateProfile}
          className="anty-btn-primary text-xs px-4 py-2.5 shadow-lg shadow-blue-600/30 font-semibold"
        >
          <Plus size={16} />
          <span>Создать профиль</span>
        </button>
      </div>

      {/* Profiles Table */}
      <div className="flex-1 bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden flex flex-col shadow-xl">
        <div className="overflow-x-auto flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            {/* Table Header */}
            <thead className="bg-[#0e1526] sticky top-0 z-10 border-b border-[#1f2937] text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredProfiles.length > 0 && selectedIds.size === filteredProfiles.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded bg-[#1b253d] border-gray-700 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="p-3.5 w-32">Статус</th>
                <th className="p-3.5">Название профиля</th>
                <th className="p-3.5">Прокси</th>
                <th className="p-3.5">Отпечаток & ОС</th>
                <th className="p-3.5">Теги & Заметки</th>
                <th className="p-3.5 text-right pr-6">Действия</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#1f2937]">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Layers size={36} className="text-gray-600" />
                      <p className="text-sm font-medium">Профили не найдены</p>
                      <p className="text-xs text-gray-400">
                        {profiles.length === 0
                          ? 'Создайте свой первый антидетект-профиль'
                          : 'Измените параметры поиска или фильтров'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p) => {
                  const isRunning = p.status === 'running';
                  const proxy = p.proxy_id ? proxyMap.get(p.proxy_id) : null;
                  const isSelected = selectedIds.has(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-[#151d30]/60 transition-colors ${
                        isSelected ? 'bg-blue-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(p.id)}
                          className="rounded bg-[#1b253d] border-gray-700 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {isRunning ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Работает</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800/50 border border-gray-700 text-gray-400 font-medium text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-gray-500" />
                            <span>Остановлен</span>
                          </div>
                        )}
                      </td>

                      {/* Profile Name & Group */}
                      <td className="p-3.5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm hover:text-blue-400 cursor-pointer transition-colors" onClick={() => onEditProfile(p)}>
                              {p.name}
                            </span>
                            {p.browser_type === 'firefox' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                🦊 Firefox
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                🌐 Chrome
                              </span>
                            )}
                            {p.mozilla_vpn && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                🛡️ Mozilla VPN
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                            {p.group_name && (
                              <span className="text-blue-400 font-medium">{p.group_name}</span>
                            )}
                            <span className="font-mono text-gray-400 text-[10px]">ID: {p.id.slice(0, 8)}</span>
                            {p.cdp_port && (
                              <span className="text-emerald-400 font-mono text-[10px]">
                                CDP: {p.cdp_port}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Proxy */}
                      <td className="p-3.5">
                        {proxy ? (
                          <div className="flex flex-col text-xs">
                            <div className="flex items-center gap-1.5 text-gray-300 font-mono">
                              <Globe size={13} className="text-blue-400 shrink-0" />
                              <span>{proxy.host}:{proxy.port}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                              <span className="uppercase text-blue-400 font-semibold">{proxy.type}</span>
                              {proxy.country && <span>{proxy.country}</span>}
                              {proxy.latency && <span className="text-emerald-400 font-mono">{proxy.latency}ms</span>}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Без прокси</span>
                        )}
                      </td>

                      {/* Fingerprint details */}
                      <td className="p-3.5">
                        <div className="flex flex-col text-xs space-y-0.5">
                          <div className="flex items-center gap-1.5 text-gray-300">
                            <Monitor size={12} className="text-gray-400" />
                            <span className="font-mono">{p.screen_width}×{p.screen_height}</span>
                            <span className="text-gray-400 uppercase text-[10px] font-bold px-1.5 py-0.2 bg-gray-800 rounded">
                              {p.os}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400">
                            <span>Canvas: <strong className="text-blue-400 uppercase">{p.canvas_mode}</strong></span>
                            <span>WebGL: <strong className="text-blue-400 uppercase">{p.webgl_mode}</strong></span>
                            <span>{p.cpu_cores}C/{p.memory_gb}GB</span>
                          </div>
                        </div>
                      </td>

                      {/* Tags & Notes */}
                      <td className="p-3.5">
                        <div className="flex flex-col space-y-1">
                          {Array.isArray(p.tags) && p.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {p.tags.map((t) => (
                                <span
                                  key={t}
                                  className="text-[10px] bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                          {p.notes && (
                            <p className="text-[11px] text-gray-400 truncate max-w-[180px]">
                              {p.notes}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="p-3.5 text-right pr-6">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Launch / Stop button */}
                          {isRunning ? (
                            <button
                              onClick={() => onStopProfile(p.id)}
                              className="anty-btn-danger text-xs py-1.5 px-3"
                              title="Остановить профиль"
                            >
                              <Square size={13} className="fill-red-400" />
                              <span>Стоп</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onStartProfile(p.id)}
                              className="anty-btn-success text-xs py-1.5 px-3"
                              title="Запустить профиль"
                            >
                              <Play size={13} className="fill-emerald-400" />
                              <span>Старт</span>
                            </button>
                          )}

                          {/* Edit button */}
                          <button
                            onClick={() => onEditProfile(p)}
                            className="p-1.5 rounded bg-[#1b253d] text-gray-400 hover:text-white hover:bg-[#24304f] transition-colors"
                            title="Редактировать профиль"
                          >
                            <Edit size={14} />
                          </button>

                          {/* Clone button */}
                          <button
                            onClick={() => onCloneProfile(p.id)}
                            className="p-1.5 rounded bg-[#1b253d] text-gray-400 hover:text-white hover:bg-[#24304f] transition-colors"
                            title="Клонировать профиль"
                          >
                            <Copy size={14} />
                          </button>

                          {/* Cookies button */}
                          <button
                            onClick={() => onOpenCookies(p)}
                            className="p-1.5 rounded bg-[#1b253d] text-gray-400 hover:text-amber-400 hover:bg-[#24304f] transition-colors"
                            title="Импорт / Экспорт Cookies"
                          >
                            <Cookie size={14} />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => onDeleteProfile(p.id)}
                            className="p-1.5 rounded bg-[#1b253d] text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Удалить профиль"
                          >
                            <Trash2 size={14} />
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

        {/* Table Footer */}
        <div className="h-12 border-t border-[#1f2937] bg-[#0e1526] px-6 flex items-center justify-between text-xs text-gray-400">
          <div>
            Показано <strong>{filteredProfiles.length}</strong> из <strong>{profiles.length}</strong> профилей
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>
                Работает:{' '}
                <strong className="text-emerald-400">
                  {profiles.filter((p) => p.status === 'running').length}
                </strong>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
