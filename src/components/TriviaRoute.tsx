import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { canAccessTrivia } from '../lib/authorization';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#030308] p-4 text-center">
        <div className="bg-white dark:bg-[#0d0d15] border border-gray-200 dark:border-white/10 p-8 rounded-3xl shadow-xl max-w-md w-full">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Access Restricted</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
            The EVVEX Trivia Engine is reserved for Platform Administrators and Marketing Partners (MPR).
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              to="/dashboard"
              className="w-full inline-flex items-center justify-center gap-2 bg-[#EAB308] hover:bg-[#EAB308]/90 text-black font-extrabold text-xs h-11 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
