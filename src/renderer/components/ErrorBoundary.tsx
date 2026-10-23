import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AntyBrowser UI Error]:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-[#0b0f19] text-[#f1f5f9] p-6">
          <div className="max-w-md w-full bg-[#111827] border border-red-500/40 rounded-xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Произошла ошибка интерфейса</h3>
              <p className="text-xs text-gray-400 mt-1">
                Интерфейс перехвачен системой безопасности. Ваши данные и запущенные профили в безопасности.
              </p>
            </div>
            {this.state.error && (
              <pre className="text-[11px] bg-[#0b0f19] p-3 rounded text-red-300 font-mono text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              className="anty-btn-primary text-xs px-5 py-2 w-full justify-center"
            >
              <RefreshCw size={14} />
              <span>Перезагрузить интерфейс</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
