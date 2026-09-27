import React, { useState, useEffect, ReactNode } from 'react';
import * as ReactNamespace from 'react';
import axios from 'axios';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { CapacitorProvider } from './components/CapacitorProvider';
import { supabase, supabaseConfigStatus } from './supabase';
import { clearStoredRedirectIntent, isPlatformAdminEmail, isMpr } from './lib/authUtils';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { CreateBook } from './pages/CreateBook';
import { ReadBook } from './pages/ReadBook';
import { SellBook } from './pages/SellBook';
import { PublicPurchase } from './pages/PublicPurchase';
import { LandingCheckout } from './pages/LandingCheckout';
import { PublicRead } from './pages/PublicRead';
import { AdminPanel } from './pages/AdminPanel';
import { Earnings } from './pages/Earnings';
import { Settings } from './pages/Settings';
import { Security } from './pages/Security';
import { RequestPage } from './pages/RequestPage';
import { Setup } from './pages/Setup';
import { EventLandingPage } from './pages/EventLandingPage';
import { AiMagic } from './pages/AiMagic';
import { TriviaHub } from './pages/TriviaHub';
import { TriviaPlayer } from './pages/TriviaPlayer';
import { TriviaAdmin } from './pages/TriviaAdmin';
import { MyBooks } from './pages/MyBooks';
import { PromoStudio } from './pages/PromoStudio';
import { Bookshelf } from './pages/Bookshelf';
import { BrowseBooks } from './pages/BrowseBooks';
import { BrowseBlogs } from './pages/BrowseBlogs';
import { BlogPost } from './pages/BlogPost';
import { BrowseVideos } from './pages/BrowseVideos';
import { BrowseAuthors } from './pages/BrowseAuthors';
import { AuthorProfile } from './pages/AuthorProfile';
import { AuthorApplication } from './pages/AuthorApplication';
import { AnonymousConfessions } from './pages/AnonymousConfessions';
import { AdminConfessions } from './pages/AdminConfessions';
import { ResetPassword } from './pages/ResetPassword';
import { AdminPayments } from './pages/AdminPayments';
import { AdminPaymentVerifications } from './pages/AdminPaymentVerifications';
import { AdminPaymentHistory } from './pages/AdminPaymentHistory';
import { AdminSupport } from './pages/AdminSupport';
import { AdminSupportHistory } from './pages/AdminSupportHistory';
import { AdminAnalytics } from './pages/AdminAnalytics';
import { AdminAnnouncements } from './pages/AdminAnnouncements';
import { AdminActivityLog } from './pages/AdminActivityLog';
import { AdminUsers } from './pages/AdminUsers';
import { UserProfile } from './pages/UserProfile';
import { SystemHealth } from './pages/SystemHealth';
import { SupportHistory } from './pages/SupportHistory';
import { AdminContentUnlock } from './pages/AdminContentUnlock';
import { AdminReviews } from './pages/AdminReviews';
import { AdminMprHub } from './pages/AdminMprHub';
import { AdminMprAnalytics } from './pages/AdminMprAnalytics';
import { AdminMprAudit } from './pages/AdminMprAudit';
import { MprDashboard } from './pages/MprDashboard';
import { MPRRoute } from './components/MPRRoute';
import { PrivateRoute } from './components/PrivateRoute';
import { AdminRoute } from './components/AdminRoute';
import { CreatorRoute } from './components/CreatorRoute';
import { VendorRoute } from './components/VendorRoute';
import { TriviaRoute } from './components/TriviaRoute';
import { BusinessRoute } from './components/BusinessRoute';
import { EbookPage } from './pages/EbookPage';
import { AuthorAnalytics } from './pages/AuthorAnalytics';
import { TriviaSharedPage } from './pages/TriviaSharedPage';
import EnvDebug from './pages/EnvDebug';
import { RedeemToken } from './pages/RedeemToken';
import { UnauthorizedPage } from './pages/Unauthorized';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { SupportPage } from './pages/SupportPage';
import { DownloadAppPage } from './pages/DownloadAppPage';
import { EventMarketplace } from './pages/EventMarketplace';
import { EventApplication } from './pages/EventApplication';
import { MyApplications } from './pages/MyApplications';
import { ApplicationReview } from './pages/ApplicationReview';
import { EventManager } from './pages/EventManager';
import { MyTickets } from './pages/MyTickets';
import { EventCheckIn } from './pages/EventCheckIn';
import { TriviaBanner } from './components/TriviaBanner';
import { PaystackSetup } from './components/PaystackSetup';
import { EvvexLoader } from './components/EvvexLoader';
import { Button } from '@/components/ui/button';
import { FULL_SUPABASE_SQL, RECURSION_FIX_SQL } from './lib/migrations';
import { AlertTriangle, Copy, ExternalLink, RefreshCw, ShieldAlert, XCircle, ShieldCheck, FileText } from 'lucide-react';

const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
const AppRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return isFileProtocol ? <HashRouter>{children}</HashRouter> : <BrowserRouter>{children}</BrowserRouter>;
};

// EVEX Architecture Aliases
const AuthorRoute = CreatorRoute;
const AdminOrPartnerRoute = AdminRoute;

const AccessDeniedToast: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!(location.state as any)?.accessDenied) return;
    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      navigate(location.pathname + location.search, { replace: true, state: null });
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [location.key, location.pathname, location.search, location.state, navigate]);

  if (!visible) return null;
  return (
    <div role="alert" aria-live="assertive" className="fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded-lg border border-red-200 bg-red-800 px-4 py-3 text-sm font-bold text-white shadow-xl">
      Access Denied: Unauthorized Role.
    </div>
  );
};

const CreateBookAccessRoute: React.FC = () => {
  const { search } = useLocation();
  const createType = new URLSearchParams(search).get('type');
  if (createType === 'event' || createType === 'ticket') {
    return <MPRRoute><CreateBook /></MPRRoute>;
  }
  return <CreatorRoute><CreateBook /></CreatorRoute>;
};

const HomeRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? "/dashboard" : "/"} replace />;
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends ReactNamespace.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', margin: '20px' }}>
          <h1 style={{ color: '#991b1b', fontSize: '18px', fontWeight: 'bold' }}>Application Rendering Error</h1>
          <pre style={{ fontSize: '12px', marginTop: '10px', whiteSpace: 'pre-wrap' }}>{error?.toString()}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '10px', padding: '8px 16px', backgroundColor: '#991b1b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Reload App
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

const AppContent = () => {
  const { isAuthReady } = useAuth();

  // AFFILIATE REWARD: Capture affiliate referrer ref code globally from URL query string
  useEffect(() => {
    const handleUrlRef = () => {
      try {
        if (typeof window === 'undefined' || !window.location.search) return;
        const params = new URLSearchParams(window.location.search);
        const ref = (params.get('ref') || params.get('aff') || '').trim();
        if (ref) {
          try {
            localStorage.setItem('affiliate_referrer', ref);
            localStorage.setItem('referralCode', ref);
          } catch (storageErr) {
            console.warn('[Affiliate Tracker] LocalStorage not accessible:', storageErr);
          }
          console.log('[Affiliate Tracker] Stored affiliate referrer:', ref);
        }
      } catch (e) {
        console.warn('[Affiliate Tracker] URL param parse notice:', e);
      }
    };
    handleUrlRef();
    window.addEventListener('popstate', handleUrlRef);
    return () => window.removeEventListener('popstate', handleUrlRef);
  }, []);

  // Clear all trivia-related cache on page load to prevent stale data
  useEffect(() => {
    try {
      console.log("[CacheAudit] Purging old trivia-related cache on page load...");
      const keysToClear: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.toLowerCase().includes('trivia') || key.toLowerCase().includes('player') || key.toLowerCase().includes('attempt'))) {
          if (!key.startsWith('sb-')) {
            keysToClear.push(key);
          }
        }
      }
      keysToClear.forEach(key => {
        localStorage.removeItem(key);
        console.log(`- Cleared localStorage key: ${key}`);
      });

      const sessionKeysToClear: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.toLowerCase().includes('trivia') || key.toLowerCase().includes('player') || key.toLowerCase().includes('attempt'))) {
          if (!key.startsWith('sb-')) {
            sessionKeysToClear.push(key);
          }
        }
      }
      sessionKeysToClear.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`- Cleared sessionStorage key: ${key}`);
      });
    } catch (err) {
      console.warn("[CacheAudit] Error clearing trivia cache:", err);
    }
  }, []);

  // Capacitor platform detection
  const isCapacitor = typeof window !== 'undefined' && Boolean(
    (window as any)?.Capacitor?.isNativePlatform?.() || 
    (window as any)?.Capacitor?.getPlatform?.() === 'android'
  );

  // In Capacitor, render immediately without blocking on remote auth
  const [allowRender, setAllowRender] = useState(isCapacitor);

  useEffect(() => {
    if (isCapacitor) {
      setAllowRender(true);
      return;
    }
    // Web fallback timeout: never block on loader for more than 1.5 seconds
    const timer = setTimeout(() => {
      setAllowRender(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isCapacitor]);

  // If not ready and render not yet allowed, show EVVEX framework loader
  if (!isAuthReady && !allowRender) {
    return <EvvexLoader message="Opening EVVEX Experiences" />;
  }

  return (
    <AppRouter>
      <CapacitorProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<EventLandingPage />} />
          <Route path="/bookshelf" element={<Bookshelf />} />
            <Route path="/events" element={<EventMarketplace />} />
            <Route path="/events/:id" element={<EventMarketplace />} />
            <Route path="/events/:id/apply" element={<PrivateRoute><EventApplication /></PrivateRoute>} />
          <Route path="/ebooks" element={<BrowseBooks />} />
          <Route path="/blog" element={<BrowseBlogs />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/videos" element={<BrowseVideos />} />
          <Route path="/authors" element={<BrowseAuthors />} />
          <Route path="/author/:id" element={<AuthorProfile />} />
          <Route path="/discovery" element={<Bookshelf />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/book/:slug" element={<EbookPage />} />
          <Route path="/book/:slug/buy" element={<LandingCheckout />} />
          <Route path="/ebook/:idOrSlug" element={<EbookPage />} />
          <Route path="/direct-checkout" element={<LandingCheckout />} />
          <Route path="/purchase/:id" element={<Navigate to="/payment" />} />
          {/* Public Read is allowed for previews or if configured */}
          <Route path="/book/:slug/read" element={<PrivateRoute><PublicRead /></PrivateRoute>} />
          <Route path="/explore/trivia" element={<TriviaRoute><TriviaHub /></TriviaRoute>} />
          <Route path="/anonymous" element={<AnonymousConfessions />} />
          <Route path="/env-debug" element={<EnvDebug />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/download" element={<DownloadAppPage />} />
          <Route path="/android-app" element={<DownloadAppPage />} />
          <Route path="/android" element={<DownloadAppPage />} />
          <Route path="/download-app" element={<DownloadAppPage />} />

          {/* Protected Routes */}
          <Route path="/upgrade/premium" element={<Navigate to="/events" replace />} />
          <Route path="/apply/author" element={<PrivateRoute><AuthorApplication /></PrivateRoute>} />
          <Route path="/payment" element={<PrivateRoute><PublicPurchase /></PrivateRoute>} />
            <Route path="/my-tickets" element={<PrivateRoute><MyTickets /></PrivateRoute>} />
            <Route path="/my-applications" element={<PrivateRoute><MyApplications /></PrivateRoute>} />
            <Route path="/manage-events" element={<MPRRoute><EventManager /></MPRRoute>} />
            <Route path="/manage-applications" element={<MPRRoute><ApplicationReview /></MPRRoute>} />
            <Route path="/check-in/:eventId" element={<PrivateRoute><EventCheckIn /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/dashboard/:tab" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/create-book" element={<CreateBookAccessRoute />} />
          <Route path="/create-event" element={<MPRRoute><CreateBook /></MPRRoute>} />
          <Route path="/create-ticket" element={<MPRRoute><CreateBook /></MPRRoute>} />
          <Route path="/create-product" element={<VendorRoute><CreateBook /></VendorRoute>} />
          <Route path="/read/:id" element={<PrivateRoute><ReadBook /></PrivateRoute>} />
          <Route path="/book/:id/preview" element={<PrivateRoute><ReadBook /></PrivateRoute>} />
          <Route path="/redeem" element={<RedeemToken />} />
          <Route path="/edit/:id" element={<CreatorRoute><CreateBook /></CreatorRoute>} />
          <Route path="/promo-studio" element={<MPRRoute><PromoStudio /></MPRRoute>} />
          <Route path="/sell/:id" element={<CreatorRoute><SellBook /></CreatorRoute>} />
          <Route path="/my-books" element={<CreatorRoute><MyBooks /></CreatorRoute>} />
          <Route path="/analytics" element={<MPRRoute><AuthorAnalytics /></MPRRoute>} />
          <Route path="/earnings" element={<BusinessRoute><Earnings /></BusinessRoute>} />
          <Route path="/mpr" element={<MPRRoute><MprDashboard /></MPRRoute>} />
          <Route path="/mpr/*" element={<MPRRoute><MprDashboard /></MPRRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/security" element={<PrivateRoute><Security /></PrivateRoute>} />

          {/* EVEX Account-Type Architectural Aliases */}
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          <Route path="/creator" element={<Navigate to="/my-books" replace />} />
          <Route path="/creator/*" element={<CreatorRoute><MyBooks /></CreatorRoute>} />
          <Route path="/vendor" element={<VendorRoute><Dashboard /></VendorRoute>} />
          <Route path="/vendor/products" element={<VendorRoute><MyBooks /></VendorRoute>} />
          <Route path="/vendor/*" element={<VendorRoute><Dashboard /></VendorRoute>} />
          
          {/* Trivia Routes — STRICTLY RESERVED FOR ADMIN AND MPR */}
          <Route path="/trivia" element={<TriviaRoute><TriviaHub /></TriviaRoute>} />
          <Route path="/trivia/ebook/:id" element={<TriviaRoute><TriviaPlayer /></TriviaRoute>} />
          <Route path="/trivia/:id" element={<TriviaRoute><TriviaPlayer /></TriviaRoute>} />
          <Route path="/trivia/share/:id" element={<TriviaRoute><TriviaSharedPage /></TriviaRoute>} />
          <Route path="/admin/trivia" element={<AdminRoute><TriviaAdmin /></AdminRoute>} />
          
          <Route path="/ai-magic" element={<PrivateRoute><AiMagic /></PrivateRoute>} />
          <Route path="/request" element={<PrivateRoute><RequestPage /></PrivateRoute>} />
          <Route path="/setup" element={
            (supabaseConfigStatus.isPlaceholder || supabaseConfigStatus.urlError || supabaseConfigStatus.keyError)
              ? <Setup />
              : <AdminRoute><Setup /></AdminRoute>
          } />
          <Route path="/history" element={<PrivateRoute><SupportHistory /></PrivateRoute>} />

          {/* Admin Routes — Strictly Guarded by Platform Admin Engine */}
          <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
          <Route path="/admin/announcements" element={<AdminRoute><AdminAnnouncements /></AdminRoute>} />
          <Route path="/admin/activity-log" element={<AdminRoute><AdminActivityLog /></AdminRoute>} />
          <Route path="/admin/users" element={<Navigate to="/admin#users" replace />} />
          <Route path="/admin/users/:id" element={<AdminRoute><UserProfile /></AdminRoute>} />
          <Route path="/admin/user-profile/:id" element={<AdminRoute><UserProfile /></AdminRoute>} />
          <Route path="/admin/system-health" element={<AdminRoute><SystemHealth /></AdminRoute>} />
          <Route path="/admin/requests" element={<AdminRoute><AdminSupport /></AdminRoute>} />
          <Route path="/admin/requests/history" element={<AdminRoute><AdminSupportHistory /></AdminRoute>} />
          <Route path="/admin/payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />
          <Route path="/admin/payment-verifications" element={<AdminRoute><AdminPaymentVerifications /></AdminRoute>} />
          <Route path="/admin/payments/history" element={<AdminRoute><AdminPaymentHistory /></AdminRoute>} />
          <Route path="/admin/confessions" element={<AdminRoute><AdminConfessions /></AdminRoute>} />
          <Route path="/admin/content-unlock" element={<AdminRoute><AdminContentUnlock /></AdminRoute>} />
          <Route path="/admin/reviews" element={<AdminRoute><AdminReviews /></AdminRoute>} />
          <Route path="/admin/mpr-hub" element={<AdminRoute><AdminMprHub /></AdminRoute>} />
          <Route path="/admin/mpr-analytics" element={<AdminRoute><AdminMprAnalytics /></AdminRoute>} />
          <Route path="/admin/mpr/analytics" element={<Navigate to="/admin/mpr-analytics" replace />} />
          <Route path="/admin/mpr-audit" element={<AdminRoute><AdminMprAudit /></AdminRoute>} />
          <Route path="/admin/*" element={<AdminRoute><Navigate to="/admin" replace /></AdminRoute>} />
          <Route path="/admin/mpr/audit" element={<Navigate to="/admin/mpr-audit" replace />} />
          <Route path="/admin/audit-trail" element={<Navigate to="/admin/mpr-audit" replace />} />
          <Route path="/admin/mpr" element={<Navigate to="/admin/mpr-hub" replace />} />
          
          <Route path="*" element={<HomeRedirect />} />
        </Routes>

        <AccessDeniedToast />
        
        {/* Global Components */}
        <PaystackSetupWrapper />
        <SupabaseConfigWarning />
        <EmergencyConfigOverlay />
      </CapacitorProvider>
    </AppRouter>
  );
};

const EmergencyConfigOverlay = () => {
  const { isAdmin, recursionDetected } = useAuth();
  const navigate = useNavigate();
  const isBroken = !!(supabaseConfigStatus.urlError || supabaseConfigStatus.keyError || recursionDetected);
  const [show, setShow] = useState(isBroken);

  useEffect(() => {
    if (isBroken) setShow(true);
  }, [isBroken]);

  // If already dismissed in this session, don't show
  useEffect(() => {
    const dismissed = sessionStorage.getItem('emergency_overlay_dismissed');
    if (dismissed === 'true' && !recursionDetected) {
      setShow(false);
    }
  }, [recursionDetected]);

  // Show MUCH simpler overlay to regular users if broken, full diagnostic only to admins
  const isMaintenanceMode = isBroken && !isAdmin;

  const handleSignOut = () => {
    supabase.auth.signOut().then(() => {
      window.localStorage.clear();
      window.location.reload();
    });
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem('emergency_overlay_dismissed', 'true');
  };

  const copyRecursionFix = () => {
    const sql = RECURSION_FIX_SQL || FULL_SUPABASE_SQL;
    const textarea = document.createElement('textarea');
    textarea.value = sql;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      alert('✅ RECURSION FIX COPIED!\n\n1. Go to Supabase SQL Editor\n2. Paste and click RUN.');
    } catch (err) {
      alert('Copy failed. Please manually copy from COMPLETE_REPAIR_SQL.sql');
    }
    document.body.removeChild(textarea);
  };

  if (!show || (!isBroken && !recursionDetected)) return null;

  // Regular users only see "System Maintenance"
  if (isMaintenanceMode) {
    return (
      <div className="fixed inset-0 z-[99999] bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-12 text-center space-y-6">
           <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-amber-600" />
           </div>
           <div className="space-y-2">
              <h3 className="text-2xl font-black text-gray-900 uppercase">System Maintenance</h3>
              <p className="text-gray-500 font-medium">
                We are currently performing essential service updates. 
                Please check back in a few minutes. 
              </p>
           </div>
           <Button 
            onClick={() => window.location.reload()} 
            className="w-full h-14 bg-slate-900 border-none rounded-2xl font-black uppercase tracking-widest text-white shadow-xl"
           >
             Refresh Now
           </Button>
        </div>
      </div>
    );
  }

  // Admins see full diagnostic tools
  return (
    <div className="fixed inset-0 z-[99999] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
        <div className={`p-6 ${recursionDetected ? 'bg-red-600' : 'bg-blue-600'} text-white`}>
           <div className="flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <div>
                 <h2 className="text-xl font-black uppercase">
                   {recursionDetected ? 'RECURSION ERROR DETECTED' : 'CONFIGURATION REQUIRED'}
                 </h2>
                 <p className="text-xs font-bold opacity-90">
                   {recursionDetected 
                     ? 'Your Supabase policies are in an infinite loop. This prevents the app from working.' 
                     : 'Your Supabase credentials are not correctly set.'}
                 </p>
              </div>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pt-4 pb-8 px-6">
           {recursionDetected ? (
             <div className="space-y-6 py-4">
                <div className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl space-y-4">
                   <h3 className="text-lg font-black text-red-900 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" /> REPAIR INSTRUCTIONS
                   </h3>
                   <ol className="list-decimal list-inside space-y-3 text-sm text-red-800 font-medium">
                      <li>Go to your <a href="https://supabase.com/dashboard/project/_/sql" target="_blank" rel="noopener noreferrer" className="underline font-black">Supabase SQL Editor</a></li>
                      <li>Create a <strong>New Query</strong></li>
                      <li>Click the button below to copy the repair code</li>
                      <li>Paste the code and click <strong>RUN</strong></li>
                      <li>Refresh this page</li>
                   </ol>
                   
                   <div className="space-y-4">
                     <div className="bg-black/90 p-3 rounded-xl border border-white/20">
                        <p className="text-[10px] font-black text-green-400 mb-2 uppercase tracking-widest">Copy this Code:</p>
                        <textarea 
                           readOnly 
                           className="w-full bg-transparent text-green-400 font-mono text-[10px] h-32 resize-none outline-none"
                           value={RECURSION_FIX_SQL}
                           onFocus={(e) => e.target.select()}
                        />
                     </div>
                     
                     <Button 
                       onClick={copyRecursionFix}
                       className="w-full bg-red-600 hover:bg-red-700 text-white h-14 rounded-2xl font-black text-sm shadow-xl"
                     >
                       <Copy className="mr-2 h-4 w-4" /> CLICK TO COPY AUTOMATICALLY
                     </Button>
                   </div>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 italic text-xs text-gray-500 text-center">
                   * This error happens when a database policy refers to itself. 
                   The fix uses specialized JWT claims to safely bypass the loop.
                </div>
             </div>
           ) : (
             <div className="py-20 text-center space-y-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                   <AlertTriangle className="w-10 h-10 text-blue-600" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-black text-gray-900">Admin Diagnostic Needed</h3>
                   <p className="text-gray-500 max-w-sm mx-auto font-medium">
                     The application is either using placeholder keys or is broken. 
                     As an administrator, please fix this now.
                   </p>
                </div>
                <div className="flex justify-center gap-4">
                  <Button onClick={() => navigate('/setup')} className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black">
                    Launch Setup Wizard
                  </Button>
                  <Button variant="outline" onClick={() => window.open('https://supabase.com', '_blank')} className="h-14 px-8 rounded-2xl border-slate-200 font-black">
                    Open Supabase
                  </Button>
                </div>
             </div>
           )}
        </div>

        <div className="p-6 bg-gray-50 border-t flex flex-wrap gap-3 justify-center">
          <button 
            onClick={handleSignOut} 
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-red-200"
          >
            Sign Out & Reset
          </button>
          <button 
            onClick={handleDismiss} 
            className="bg-white hover:bg-gray-100 text-gray-900 border-2 border-gray-200 px-6 py-3 rounded-2xl text-sm font-bold transition-all"
          >
            Close Overlay
          </button>
        </div>
        
        <button 
          onClick={handleDismiss}
          className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all"
        >
          <XCircle className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

"use strict";
// DISABLED: SchemaGuard validates CalmReader schema; EVEX uses profiles + events tables.
const SchemaGuardWarning = () => null;

const SupabaseConfigWarning = () => {
  return <SchemaGuardWarning />;
};

const PaystackSetupWrapper = () => {
  return null;
};

export default App;
