import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Clock, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';

interface AdminConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  actionName: string; // e.g., "Suspend User Account", "Delete eBook", etc.
  requiredWord: string; // "suspend" or "delete"
  loading?: boolean;
  targetId?: string;
  targetType?: string;
  details?: any;
}

export const AdminConfirmModal: React.FC<AdminConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionName,
  requiredWord,
  loading = false,
  targetId,
  targetType,
  details
}) => {
  const { user } = useAuth();
  const [confirmInput, setConfirmInput] = useState('');
  const [countdown, setCountdown] = useState(5);

  // Timer countdown on open
  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isWordValid = confirmInput.trim() === requiredWord;
  const isButtonEnabled = isWordValid && countdown === 0 && !loading;

  const handleExecute = async () => {
    if (!isButtonEnabled) return;

    // Log admin action to admin_logs for accountability
    try {
      if (user?.id) {
        await supabase.from('admin_logs').insert({
          admin_id: user.id,
          admin_email: user.email,
          action: actionName,
          target_id: targetId || null,
          target_type: targetType || null,
          details: details || {}
        });
      }
    } catch (err) {
      console.warn('[AdminConfirmModal] Audit log write warning:', err);
    }

    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0f111a] border border-red-200 dark:border-red-900/40 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative space-y-6">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon & Header */}
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800/50 rounded-2xl text-red-600 dark:text-red-400 shrink-0">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-[10px] font-black uppercase tracking-wider mb-1">
              <AlertTriangle className="w-3 h-3" /> Critical Action Required
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{title}</h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          {description}
        </p>

        {/* Confirmation Requirement */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            To proceed with <span className="font-black text-red-600 dark:text-red-400">{actionName}</span>, type <code className="bg-red-100 dark:bg-red-950 px-2 py-0.5 rounded text-red-700 dark:text-red-300 font-mono text-xs font-black">{requiredWord}</code> below:
          </label>

          <Input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={`Type "${requiredWord}" to confirm...`}
            className={`h-12 rounded-xl text-sm font-semibold transition-all ${
              isWordValid 
                ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20' 
                : 'border-slate-300 dark:border-slate-700 focus:border-red-500'
            }`}
          />
        </div>

        {/* Timer status notice if countdown > 0 */}
        {countdown > 0 && (
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-800/40">
            <Clock className="w-4 h-4 animate-spin shrink-0" />
            <span>Safety timer active: Wait {countdown}s before confirming</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-12 rounded-xl font-bold text-xs uppercase tracking-wider"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleExecute}
            disabled={!isButtonEnabled}
            className={`flex-1 h-12 rounded-xl font-black text-xs uppercase tracking-wider text-white transition-all shadow-lg ${
              isButtonEnabled 
                ? 'bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-none' 
                : 'bg-slate-300 dark:bg-slate-800 opacity-60 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Processing...
              </span>
            ) : countdown > 0 ? (
              `Wait ${countdown}s...`
            ) : (
              `Confirm ${requiredWord}`
            )}
          </Button>
        </div>

      </div>
    </div>
  );
};
