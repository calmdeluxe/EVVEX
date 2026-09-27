import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

interface BusinessRouteProps {
  children: React.ReactNode;
}

export const BusinessRoute: React.FC<BusinessRouteProps> = ({ children }) => {
  const { user, isAdmin, isMpr, isVendor, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-700" /></div>;
  }
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (!isAdmin && !isMpr && !isVendor) {
    return <Navigate to="/dashboard" replace state={{ accessDenied: true }} />;
  }

  return <>{children}</>;
};