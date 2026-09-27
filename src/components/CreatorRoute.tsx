import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { canAccessCreatorStudio } from '../lib/authorization';

interface CreatorRouteProps {
  children: React.ReactNode;
}

/**
 * CreatorRoute — EVEX Account-Type Route Guard
 * 
 * Enforces that only verified Event Creators (or Platform Admins) can access
 * event creation, management, and authoring studio workflows.
 * 
 * Invariants:
 * - Unauthenticated users are redirected to login with return path preserved.
 * - Standard Patrons (readers) and Vendors cannot access without upgrade.
 * - VIP Entitlements do NOT confer creator privileges.
 */
export const CreatorRoute: React.FC<CreatorRouteProps> = ({ children }) => {
  const { user, profile, accountTier, isAdmin, isEventCreator, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  const isAuthorizedCreator =
    isAdmin ||
    isEventCreator ||
    canAccessCreatorStudio({ ...(profile || {}), email: user.email, is_admin: isAdmin, accountTier });

  if (!isAuthorizedCreator) {
    return <Navigate to="/dashboard" replace state={{ accessDenied: true }} />;
  }

  return <>{children}</>;
};
