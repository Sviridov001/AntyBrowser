import React from 'react';
import { Play, Square, Activity } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  runningCount: number;
  onStartAll?: () => void;
  onStopAll?: () => void;
  apiPort?: number;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  runningCount,
  onStartAll,
  onStopAll,
  apiPort = 3001,
}) => {
  return (
    <header className="h-16 border-b border-[#1f2937] bg-[#0e1526]/80 backdrop-blur px-6 flex items-center justify-between shrink-0">
      <div>
        <h2 className="text-lg font-bold text-white tracking-wide">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Playwright API status badge */}
        <div className="flex items-center gap-2 bg-[#151d30] border border-[#24304f] px-3 py-1.5 rounded-md text-xs">
          <Activity size={14} className="text-emerald-400" />
          <span className="text-gray-400">Playwright API:</span>
          <span className="text-emerald-400 font-mono font-semibold">127.0.0.1:{apiPort}</span>
        </div>

        {/* Global Batch Controls */}
        {onStartAll && onStopAll && (
          <div className="flex items-center gap-2 border-l border-[#24304f] pl-3 ml-2">
            <button
              onClick={onStartAll}
              className="anty-btn-secondary text-xs px-3 py-1.5"
              title="Запустить выбранные или все профили"
            >
              <Play size={13} className="text-emerald-400 fill-emerald-400" />
              <span>Запустить все</span>
            </button>
            <button
              onClick={onStopAll}
              disabled={runningCount === 0}
              className={`anty-btn-secondary text-xs px-3 py-1.5 ${
                runningCount === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:border-red-500'
              }`}
              title="Остановить все работающие профили"
            >
              <Square size={13} className="text-red-400 fill-red-400" />
              <span>Остановить ({runningCount})</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
