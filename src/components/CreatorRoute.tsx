import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-amber-600">Creator Access Required</h2>
          <p className="text-gray-500 mt-2">
            To create and manage events or published content, you need an Event Creator account.
          </p>
          <div className="flex flex-col gap-3 mt-6">
            <Link to="/apply/author" className="bg-green-700 text-white px-6 py-2 rounded-lg font-bold text-center">
              Become an Event Creator
            </Link>
            <Link to="/dashboard" className="text-gray-500 underline text-sm">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
