import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { sessionManager } from '../utils/sessionManager';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedTiers?: string[]; // e.g., ['admin', 'author', 'premium', 'free']
  redirectTo?: string;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  allowedTiers = ['free', 'premium', 'author', 'admin'],
  redirectTo = '/login',
}) => {
  const { user, profile, loading, accountTier, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      // Save current route for redirect after login
      sessionManager.setRedirectAfterLogin(location.pathname + location.search);
      navigate(redirectTo, { replace: true });
      return;
    }

    if (!loading && user) {
      const userTier = isAdmin ? 'admin' : (accountTier || profile?.account_tier || 'free');

      // Check if user tier is allowed
      if (allowedTiers && allowedTiers.length > 0 && !allowedTiers.includes(userTier) && !isAdmin) {
        navigate('/dashboard', { replace: true });
        return;
      }

      // Store tier in session
      sessionManager.setUserTier(userTier);
    }
  }, [user, profile, loading, navigate, location, allowedTiers, redirectTo, accountTier, isAdmin]);

  if (loading || (user && !profile && !isAdmin)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-medium text-slate-400">Verifying session security...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
