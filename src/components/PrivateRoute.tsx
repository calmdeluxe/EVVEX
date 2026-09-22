import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import { sessionManager } from '../utils/sessionManager';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedTiers?: string[]; // e.g., ['admin', 'author', 'premium', 'free']
  redirectTo?: string;
}

/**
 * PrivateRoute — EVEX Authenticated Route Guard
 * 
 * Enforces baseline user authentication and account non-suspension.
 * Acts as the foundational authenticated layer for all protected routes.
 */
export const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  allowedTiers,
  redirectTo = '/login',
}) => {
  const { user, profile, loading, accountTier, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-medium text-slate-400">Verifying session security...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    sessionManager.setRedirectAfterLogin(location.pathname + location.search);
    return <Navigate to={`${redirectTo}?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (profile?.is_suspended && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4 text-center">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg max-w-md border border-red-100 dark:border-red-950">
          <h2 className="text-2xl font-bold text-red-600">Account Suspended</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Your account has been suspended by an administrator. Please contact support.
          </p>
          <button
            onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
            className="mt-6 text-green-700 dark:text-emerald-400 font-bold hover:underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (allowedTiers && allowedTiers.length > 0 && !isAdmin) {
    const userTier = accountTier || profile?.account_tier || 'free';
    if (!allowedTiers.includes(userTier)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

