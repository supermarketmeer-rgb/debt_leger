import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6" dir="rtl">
          <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-md">
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-white">حدث استثناء أثناء تحميل الشاشة</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              تم رصد خطأ تشغيلي، اضغط على الزر أدناه لتحديث التطبيق واستئناف العمل فوراً.
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-amber-600/20 cursor-pointer active:scale-98"
            >
              <RefreshCw className="w-5 h-5" />
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
