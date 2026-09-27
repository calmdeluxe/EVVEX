// LEGACY: CalmReader file, not part of EVEX product. To be unmounted in a later pass.
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { canAccessTrivia } from '../lib/authorization';

interface TriviaRouteProps {
  children: React.ReactNode;
}

/**
 * TriviaRoute — EVEX Domain Guard (ADMIN + MPR ONLY)
 * 
 * STRICT INVARIANT:
 * Trivia is exclusively accessible to Platform Administrators and Marketing Partners (MPR).
 * Vendors, regular visitors/patrons, event staff/scanners, and VIP entitlements are
 * strictly blocked from accessing trivia routes, forms, and engines.
 */
export const TriviaRoute: React.FC<TriviaRouteProps> = ({ children }) => {
  const { user, profile, isAdmin, isMpr, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#030308]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  const isAuthorized = 
    isAdmin || 
    isMpr || 
    canAccessTrivia({ ...(profile || {}), email: user.email, is_admin: isAdmin });

  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace state={{ accessDenied: true }} />;
  }

  return <>{children}</>;
};
