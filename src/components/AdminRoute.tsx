import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { canAccessAdmin } from '../lib/authorization';
import { clearStoredRedirectIntent } from '../lib/authUtils';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute — EVEX Platform-Role Route Guard
 * 
 * Enforces that only verified Platform Administrators can access /admin/* routes.
 * 
 * Invariants:
 * - Unauthenticated users are redirected to login with redirect parameters.
 * - Non-admin users (Patrons, Vendors, Creators, and MPRs) are safely redirected to /dashboard.
 * - Prevents any privilege escalation or flash of administrative UI.
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, profile, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        <p className="text-gray-500 font-medium">Verifying Admin Access...</p>
        <button onClick={() => window.location.href = '/dashboard'} className="text-sm text-green-700 underline">
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  const isAuthorizedAdmin =
    isAdmin ||
    canAccessAdmin({ ...(profile || {}), email: user.email, is_admin: isAdmin });

  if (!isAuthorizedAdmin) {
    clearStoredRedirectIntent();
    return <Navigate to="/dashboard" replace state={{ accessDenied: true }} />;
  }

  return <>{children}</>;
};


