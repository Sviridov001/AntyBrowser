import React from 'react';
import {
  Layers,
  Globe,
  Puzzle,
  Terminal,
  Settings,
  FolderLock,
  Cpu,
} from 'lucide-react';

export type NavTab = 'profiles' | 'proxies' | 'extensions' | 'api' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  runningCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, runningCount }) => {
  const menuItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'profiles',
      label: 'Профили',
      icon: <Layers size={18} />,
      badge: runningCount > 0 ? runningCount : undefined,
    },
    {
      id: 'proxies',
      label: 'Прокси',
      icon: <Globe size={18} />,
    },
    {
      id: 'extensions',
      label: 'Расширения',
      icon: <Puzzle size={18} />,
    },
    {
      id: 'api',
      label: 'Playwright API',
      icon: <Terminal size={18} />,
    },
    {
      id: 'settings',
      label: 'Настройки & Бэкапы',
      icon: <Settings size={18} />,
    },
  ];

  return (
    <aside className="w-64 bg-[#0e1526] border-r border-[#1f2937] flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-[#1f2937] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Cpu size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-1.5">
              AntyBrowser
              <span className="text-[10px] uppercase font-semibold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">
                PRO
              </span>
            </h1>
            <p className="text-[11px] text-gray-400">Portable Edition</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1.5">
          {menuItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#151d30]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-gray-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="bg-emerald-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-[#1f2937]">
        <div className="bg-[#151d30] border border-[#24304f] rounded-lg p-3 text-xs text-gray-400 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <FolderLock size={14} />
            <span>100% Portable Режим</span>
          </div>
          <p className="text-[11px] leading-relaxed text-gray-400">
            Все данные, сессии и куки хранятся только внутри папки <span className="text-blue-400 font-mono">./data</span>.
          </p>
          <div className="text-[10px] text-gray-500 pt-1 border-t border-gray-800">
            Готово к переносу на USB / другой ПК
          </div>
        </div>
      </div>
    </aside>
  );
};
