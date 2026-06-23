import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Database } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  declare props: Props;
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled runtime error:', error, errorInfo);
  }

  private handleClearAndReload = () => {
    try {
      if (typeof window !== 'undefined') {
        if (window.localStorage) window.localStorage.clear();
        if (window.sessionStorage) window.sessionStorage.clear();
      }
    } catch (e) {
      console.warn('Could not clear storage safely:', e);
    }
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F2ED] text-[#2D2D2D] flex items-center justify-center p-6 antialiased font-sans" id="error-boundary">
          <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-8 max-w-lg w-full shadow-xl space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-[#8C6A5D]/10 rounded-full flex items-center justify-center text-[#8C6A5D]">
              <ShieldAlert className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-serif font-bold italic text-[#2D2D2D]">Workspace Security Intercepted</h1>
              <p className="text-xs text-[#7A7A7A] leading-relaxed">
                The application encountered an unexpected runtime sandbox constraint or device storage exception. This often occurs when third-party database / IndexedDB access is restricted inside iframe browsers.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#F5F2ED]/60 border border-[#E5E0D8] rounded-xl p-4 text-left">
                <span className="text-[10px] font-bold text-[#8C6A5D] uppercase tracking-wider block mb-1">Diagnostic Log</span>
                <span className="font-mono text-[11px] text-[#5A5A40] block break-all leading-normal">
                  {this.state.error.toString()}
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 px-4 bg-[#5A5A40] hover:bg-opacity-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2 border-0 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Registry
              </button>
              
              <button
                onClick={this.handleClearAndReload}
                className="flex-1 py-3 px-4 bg-[#F5F2ED] hover:bg-[#E5E0D8]/40 border border-[#E5E0D8] text-[#5A5A40] text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Database className="w-3.5 h-3.5" />
                Reset Device Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
