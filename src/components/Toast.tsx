import React from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export default function Toast({ toasts, removeToast }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-100 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let iconColor = 'text-blue-500';
        let bgClass = 'bg-white border-blue-100';
        
        switch (toast.type) {
          case 'success':
            Icon = CheckCircle2;
            iconColor = 'text-green-500';
            bgClass = 'bg-white border-green-100 dark:border-green-800';
            break;
          case 'error':
            Icon = AlertCircle;
            iconColor = 'text-red-500';
            bgClass = 'bg-white border-red-100 dark:border-red-800';
            break;
          case 'warning':
            Icon = AlertTriangle;
            iconColor = 'text-amber-500';
            bgClass = 'bg-white border-amber-100 dark:border-amber-800';
            break;
        }

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl border shadow-lg-custom transition-all duration-300 animate-slide-up ${bgClass}`}
            style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 ${iconColor} shrink-0`} />
              <p className="text-sm font-medium text-slate-800">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
