import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg border shadow-xl text-xs font-medium animate-slideUp ${
            t.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : t.type === 'error'
              ? 'bg-red-950/90 border-red-500/40 text-red-200'
              : 'bg-blue-950/90 border-blue-500/40 text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {t.type === 'success' && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
            {t.type === 'error' && <AlertCircle size={16} className="text-red-400 shrink-0" />}
            {t.type === 'info' && <Info size={16} className="text-blue-400 shrink-0" />}
            <span>{t.text}</span>
          </div>
          <button onClick={() => onDismiss(t.id)} className="opacity-60 hover:opacity-100 p-0.5">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
