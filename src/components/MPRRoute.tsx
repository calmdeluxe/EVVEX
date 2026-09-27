import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { canAccessMpr } from '../lib/authorization';

interface MPRRouteProps {
  children: React.ReactNode;
}

export const MPRRoute: React.FC<MPRRouteProps> = ({ children }) => {
  const { user, profile, accountTier, isAdmin, isMpr: contextIsMpr, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-medium text-slate-400">Loading Marketing Partner Hub...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // Strict role check: Only allow MPR / marketing partner accounts or admins
  const effectiveTier = (user as any)?.account_tier || profile?.account_tier || accountTier;
  const effectiveRole = (user as any)?.role || profile?.role;
  const isAuthorizedMpr = 
    isAdmin ||
    contextIsMpr ||
    effectiveTier === 'mpr' ||
    effectiveTier === 'marketing_partner' ||
    effectiveRole === 'marketing_partner' ||
    canAccessMpr({ ...(profile || {}), email: user?.email, is_admin: isAdmin });

  if (!isAuthorizedMpr) {
    return <Navigate to="/dashboard" replace state={{ accessDenied: true }} />;
  }

  return <>{children}</>;
};

export default MPRRoute;

