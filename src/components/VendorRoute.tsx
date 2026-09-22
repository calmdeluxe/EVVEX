import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { isVendor, isPlatformAdmin } from '../lib/authorization';

interface VendorRouteProps {
  children: React.ReactNode;
}

/**
 * VendorRoute — EVEX Account-Type Route Guard
 * 
 * Enforces that only registered Vendors (or Platform Admins) can access
 * vendor portals, stall bookings, and supplier operations.
 * 
 * Invariants:
 * - Unauthenticated users are redirected to login.
 * - Non-vendor accounts (Patrons, non-admin Creators) are safely redirected to /dashboard.
 * - Vendors do not gain admin, MPR, or event creation access through this route.
 */
export const VendorRoute: React.FC<VendorRouteProps> = ({ children }) => {
  const { user, profile, isAdmin, isVendor: contextIsVendor, loading } = useAuth();
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

  const isAuthorizedVendor =
    isAdmin ||
    contextIsVendor ||
    isVendor({ ...(profile || {}), email: user.email }) ||
    isPlatformAdmin({ ...(profile || {}), email: user.email, is_admin: isAdmin });

  if (!isAuthorizedVendor) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
