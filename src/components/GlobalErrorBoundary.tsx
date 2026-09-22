import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, LogIn } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  private unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const reasonStr = String(reason?.message || reason?.error || reason || '');
    
    if (reasonStr.includes('401') || reasonStr.includes('403') || reasonStr.toLowerCase().includes('jwt expired') || reasonStr.includes('Unauthorized')) {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      const publicAuthPages = ['/login', '/signup', '/auth', '/forgot-password'];
      const currentPath = window.location.pathname;
      if (!publicAuthPages.some(p => currentPath.startsWith(p))) {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath + window.location.search)}`;
      }
      return;
    }

    console.warn('[GlobalErrorBoundary] Handled promise rejection:', reasonStr);
  };

  public componentDidMount() {
    window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
  }

  public componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GlobalErrorBoundary] React Component Stack Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleGoLogin = () => {
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected application error occurred.';

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
          <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0 border border-red-100">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Something Went Wrong</h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  CalmReader encountered an unexpected error.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs font-mono text-slate-700 break-words leading-relaxed max-h-36 overflow-y-auto">
              {errorMessage}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-11 px-4 rounded-xl transition-all shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                Reload
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs h-11 px-4 rounded-xl transition-all"
              >
                <Home className="w-4 h-4" />
                Home
              </button>

              <button
                onClick={this.handleGoLogin}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white font-bold text-xs h-11 px-4 rounded-xl transition-all"
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
