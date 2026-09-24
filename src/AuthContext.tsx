import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { User } from '@supabase/supabase-js';
import { supabase, supabaseConfigStatus } from './supabase';
// DISABLED: SchemaGuard validates CalmReader schema; EVEX uses profiles + events tables.
// import { verifyBooksSchema } from './lib/schemaGuard';
import { clearStoredRedirectIntent } from './lib/authUtils';
import { EvexAccountType, EvexPlatformRole, EvexEventAccessRole } from './types/account';
import { resolveEvexUserContext, isPlatformAdminEmail } from './lib/accountMapping';
import { isPlatformAdmin, isMpr as checkIsMpr, canManageEvent as checkCanManageEvent, canScanEventTickets as checkCanScanEventTickets } from './lib/authorization';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  accountTier: 'free' | 'premium' | 'author' | 'admin' | 'marketing_partner' | 'mpr';
  /** EVEX Normalized Identity Persona */
  evexAccountType: EvexAccountType;
  /** EVEX Normalized Platform Privileged Role */
  evexPlatformRole: EvexPlatformRole;
  /** Entitlement: VIP / Premium tier */
  isVip: boolean;
  /** Entitlement: Marketing Partner / MPR */
  isMpr: boolean;
  /** Identity Persona: Event Creator */
  isEventCreator: boolean;
  /** Identity Persona: Patron */
  isPatron: boolean;
  /** Identity Persona: Vendor */
  isVendor: boolean;
  /** Domain Authorization: Can access Trivia (Admin & MPR only) */
  canAccessTrivia: boolean;
  /** Domain Authorization: Can create events (Admin & MPR only) */
  canCreateEvents: boolean;
  /** Domain Authorization: Can create tickets (Admin & MPR only) */
  canCreateTickets: boolean;
  /** Domain Authorization: Can approve events (Admin only) */
  canApproveEvents: boolean;
  /** Domain Authorization: Can create vendor products/posts */
  canCreateProducts: boolean;
  /** Domain Authorization: Can access vendor shop portal */
  canAccessVendorPortal: boolean;
  /** Contextual event management permission */
  canManageEvent: (event?: { id?: string; user_id?: string; creator_id?: string; host_id?: string } | null, staffRole?: EvexEventAccessRole) => boolean;
  /** Contextual ticket scanning permission */
  canScanEventTickets: (event?: { id?: string; user_id?: string; host_id?: string } | null, staffRole?: EvexEventAccessRole) => boolean;
  isAuthReady: boolean;
  schemaProblems: string[];
  recursionDetected: boolean;
  refreshProfile: () => Promise<void>;
  getOrCreateProfile: () => Promise<any>;
  signOut: () => Promise<void>;
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  accountTier: 'free',
  evexAccountType: 'PATRON',
  evexPlatformRole: 'NONE',
  isVip: false,
  isMpr: false,
  isEventCreator: false,
  isPatron: true,
  isVendor: false,
  canAccessTrivia: false,
  canCreateEvents: false,
  canCreateTickets: false,
  canApproveEvents: false,
  canCreateProducts: false,
  canAccessVendorPortal: false,
  canManageEvent: () => false,
  canScanEventTickets: () => false,
  isAuthReady: false,
  schemaProblems: [],
  recursionDetected: false,
  refreshProfile: async () => {},
  getOrCreateProfile: async () => null,
  signOut: async () => {},
  resetInactivityTimer: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [schemaProblems, setSchemaProblems] = useState<string[]>([]);
  const [recursionDetected, setRecursionDetected] = useState(false);

  useEffect(() => {
    let isCleanedUp = false;
    let unsubscribe: (() => void) | null = null;

    const isCapacitor = typeof window !== 'undefined' && Boolean(
      (window as any)?.Capacitor?.isNativePlatform?.() || 
      (window as any)?.Capacitor?.getPlatform?.() === 'android'
    );

    const initializeAuth = async () => {
      if (isCleanedUp) return;

      // In Capacitor native app, restore cache immediately and bypass blocking remote API calls
      if (isCapacitor) {
        console.log("[AuthContext] Capacitor environment detected. Restoring auth from local cache...");
        try {
          const cachedProfileStr = localStorage.getItem('calmreader_cached_profile');
          if (cachedProfileStr) {
            const parsed = JSON.parse(cachedProfileStr);
            setProfile(parsed);
          }
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('-auth-token'))) {
              const raw = localStorage.getItem(key);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.user) {
                  setUser(parsed.user);
                }
              }
            }
          }
        } catch (cacheErr) {
          console.warn("[AuthContext] Local auth cache read warning:", cacheErr);
        }

        // Immediately grant ready state so native app shell renders instantly
        setLoading(false);
        setIsAuthReady(true);

        // Quietly revalidate session in background if network is present (non-blocking with 1.5s timeout)
        try {
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => 
            setTimeout(() => resolve({ data: { session: null } }), 1500)
          );
          const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
          if (session?.user) {
            setUser(session.user);
            fetchProfile(session.user.id).catch(() => {});
          }
        } catch (e) {
          // Expected offline
        }
        return;
      }

      // 2. Check schema on start (Web only)
      // DISABLED: SchemaGuard validates CalmReader schema; EVEX uses profiles + events tables.
      /*
      if (!supabaseConfigStatus.isPlaceholder) {
        const schemaPromise = verifyBooksSchema();
        const timeoutPromise = new Promise<{ ok: boolean, problems: string[] }>((resolve) => 
          setTimeout(() => resolve({ ok: true, problems: [] }), 2000)
        );
        const schemaRes = await Promise.race([schemaPromise, timeoutPromise]);
        if (!schemaRes.ok) {
          console.error("[SchemaGuard] Schema verification failed:", schemaRes.problems);
          setSchemaProblems(schemaRes.problems);
        }
      } else {
        setSchemaProblems(["Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Secrets panel."]);
      }
      */

      // 3. Get initial session with 2s timeout
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => 
          setTimeout(() => resolve({ data: { session: null } }), 2000)
        );
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          console.log("[AuthContext] Active session found at startup:", currentUser.email);
          await fetchProfile(currentUser.id);
        } else {
          console.log("[AuthContext] No active session found at startup.");
          setLoading(false);
          setIsAuthReady(true);
        }
      } catch (authErr) {
        console.error("[AuthContext] Initial session load error:", authErr);
        setLoading(false);
        setIsAuthReady(true);
      }

      if (isCleanedUp) return;

      // 4. Listen for auth changes on the active, configured client
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const currentUser = session?.user ?? null;
        console.log(`[AuthContext] Auth State Change: ${_event}`, currentUser?.email || "No User");
        
        if (_event === 'SIGNED_OUT' || !currentUser) {
          console.log("[AuthContext] User signed out or null session. Clearing all storage.");
          clearStoredRedirectIntent();
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch (e) {
            console.warn("[AuthContext] Storage clear failed on SIGNED_OUT:", e);
          }
          setUser(null);
          setProfile(null);
          setLoading(false);
          setIsAuthReady(true);
          return;
        }

        // ONLY update user state if it actually changed to avoid re-renders
        setUser(prev => {
          if (prev?.id === currentUser?.id) return prev;
          return currentUser;
        });
        
        if (currentUser) {
          // Force a fresh profile fetch from the database directly on any login / auth state change
          fetchProfile(currentUser.id);
        } else {
          setProfile(null);
          setLoading(false);
          setIsAuthReady(true);
        }
      });

      unsubscribe = () => {
        subscription.unsubscribe();
      };
    };

    initializeAuth();

    // Inactivity Logout Logic
    let inactivityTimeout: ReturnType<typeof setTimeout> | undefined;
    const INACTIVITY_LIMIT = 2 * 60 * 60 * 1000; // 2 Hours
 
    const resetInactivityTimer = () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout);
      inactivityTimeout = setTimeout(() => {
        let hasSession = null;
        try {
          hasSession = sessionStorage.getItem('sb-wgdcroglmhzmrvqrixku-auth-token');
        } catch (e) {
          console.warn("[AuthContext] Storage access rejected in inactivity loop:", e);
        }
        if (hasSession) {
          console.log("[AuthContext] Auto-logging out due to inactivity...");
          signOut();
        }
      }, INACTIVITY_LIMIT);
    };
 
    const handleInteraction = () => {
      resetInactivityTimer();
    };
 
    // Listen for interactions
    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('scroll', handleInteraction);
    resetInactivityTimer();
 
    // Fast safety timeout to prevent stuck loading screen (1.5s max)
    const timeout = setTimeout(() => {
      setLoading(false);
      setIsAuthReady(true);
    }, 1500);

    return () => {
      isCleanedUp = true;
      clearTimeout(timeout);
      if (unsubscribe) {
        unsubscribe();
      }
      clearTimeout(timeout);
      if (inactivityTimeout) clearTimeout(inactivityTimeout);
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
    };
  }, []); // Changed to empty dependency array to prevent loops

  // Automatic online pinger & heartbeat
  useEffect(() => {
    if (!user) return;

    const pingUser = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (!token) return;

        // Call client pinger endpoint to keep session live
        await axios.post('/api/tracking/ping', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        // Swallowed to prevent console pollution
      }
    };

    // Trigger initial ping instantly
    pingUser();

    // Heartbeat every 5 minutes
    const interval = setInterval(pingUser, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const fetchProfile = async (userId: string) => {
    try {
      console.log("[AuthContext] Fetching profile for UUID:", userId);
      
      // 1. Primary fetch by UUID
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // 2. Retry logic for new users (handling trigger propagation delay or missing row)
      let attempts = 0;
      while (!profileData && !profileError && attempts < 2) {
        attempts++;
        console.log(`[AuthContext] Profile retry ${attempts}/2 (waiting for trigger)...`);
        await new Promise(resolve => setTimeout(resolve, 1200));
        const { data: retryData, error: retryErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        profileData = retryData;
        profileError = retryErr;
      }

      // 3. Last Resort: Manual Creation if trigger failed
      if (!profileData && !profileError) {
        console.log("[AuthContext] Trigger appears slow or missing, attempting manual fallback insert...");
        const { data: session } = await supabase.auth.getSession();
        const user = session.session?.user;
        if (user) {
          const { data: manualProfile, error: manualError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
              username: user.email?.split('@')[0],
              app_role: 'guest',
              is_vip: false,
              wallet_balance_kobo: 0
            })
            .select()
            .maybeSingle();
          
          if (manualProfile) profileData = manualProfile;
          if (manualError) console.error("[AuthContext] Manual fallback insert failed:", manualError);
        }
      }

      const { data: session } = await supabase.auth.getSession();
      const currentUser = session.session?.user;
      if (currentUser) {
        const isAdminEmail = isPlatformAdminEmail(currentUser.email);
        if (isAdminEmail) {
          if (!profileData || profileData.app_role !== 'admin' || profileData.is_vip !== true) {
            console.log("[AuthContext] Admin profile missing or needs update in DB, performing insert/upsert...");
            const adminProfileObj = {
              id: userId,
              email: currentUser.email,
              full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0],
              app_role: 'admin',
              is_vip: true,
              wallet_balance_kobo: profileData?.wallet_balance_kobo || 0
            };
            const { data: upsertData, error: upsertErr } = await supabase
              .from('profiles')
              .upsert(adminProfileObj)
              .select()
              .maybeSingle();
            if (!upsertErr && upsertData) {
              profileData = upsertData;
              profileError = null;
            } else {
              console.error("[AuthContext] Admin profile insert/upsert failed, falling back locally:", upsertErr);
              profileData = adminProfileObj;
              profileError = null;
            }
          }
        }
      }

      if (profileData) {
        profileData.account_tier = profileData.account_tier || (profileData.app_role === 'admin' ? 'admin' : profileData.app_role === 'mpr' ? 'mpr' : profileData.app_role === 'event_host' ? 'author' : profileData.is_vip ? 'premium' : 'free');
        profileData.is_admin = profileData.app_role === 'admin' || profileData.is_admin === true;
        profileData.is_premium = profileData.is_vip === true || profileData.is_premium === true;
        profileData.role = profileData.app_role || 'guest';
      }

      if (profileError) {
        console.error('[AuthContext] Error fetching profile:', profileError);
        if (profileError.message.toLowerCase().includes('recursion')) {
          setRecursionDetected(true);
        }
        
        // Fallback: check user's email directly
        const { data: session } = await supabase.auth.getSession();
        const curUser = session.session?.user;
        const fallbackEmail = curUser?.email || '';
        const isAdminEmail = isPlatformAdminEmail(fallbackEmail);
        
        const fallbackProfile = {
          id: userId,
          email: fallbackEmail,
          account_tier: isAdminEmail ? 'admin' : 'free',
          app_role: isAdminEmail ? 'admin' : 'guest',
          is_admin: isAdminEmail,
          full_name: curUser?.user_metadata?.full_name || fallbackEmail.split('@')[0]
        };
        setProfile(fallbackProfile);
        return fallbackProfile;
      }
      
      setProfile(profileData);
      try {
        localStorage.setItem('calmreader_cached_profile', JSON.stringify(profileData));
      } catch (e) {}
      return profileData;
    } catch (err) {
      console.error('[AuthContext] Profile fetch exception:', err);
      
      // Fallback: check user's email directly
      try {
        const { data: session } = await supabase.auth.getSession();
        const curUser = session.session?.user;
        const fallbackEmail = curUser?.email || '';
        const isAdminEmail = isPlatformAdminEmail(fallbackEmail);
        
        const fallbackProfile = {
          id: userId,
          email: fallbackEmail,
          account_tier: isAdminEmail ? 'admin' : 'free',
          app_role: isAdminEmail ? 'admin' : 'guest',
          is_admin: isAdminEmail,
          full_name: curUser?.user_metadata?.full_name || fallbackEmail.split('@')[0]
        };
        setProfile(fallbackProfile);
        return fallbackProfile;
      } catch (innerErr) {
        console.error('[AuthContext] Double fault in profile fallback:', innerErr);
      }
      return null;
    } finally {
      setLoading(false);
      setIsAuthReady(true);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const getOrCreateProfile = async () => {
    // 1. Check local state first
    if (profile?.id) return profile;
    
    const maxRetries = 3;
    let attempts = 0;

    while (attempts < maxRetries) {
      attempts++;
      try {
        const { data: session } = await supabase.auth.getSession();
        const authUser = session.session?.user;
        if (!authUser) {
          console.warn("[AuthContext] No auth session found.");
          return null;
        }

        console.log(`[AuthContext] Profile sync attempt ${attempts}/${maxRetries} for UUID:`, authUser.id);
        
        // 2. Direct database fetch
        const { data: dbProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        
        if (dbProfile) {
          dbProfile.account_tier = dbProfile.account_tier || (dbProfile.app_role === 'admin' ? 'admin' : dbProfile.app_role === 'mpr' ? 'mpr' : dbProfile.app_role === 'event_host' ? 'author' : dbProfile.is_vip ? 'premium' : 'free');
          dbProfile.is_admin = dbProfile.app_role === 'admin' || dbProfile.is_admin === true;
          dbProfile.is_premium = dbProfile.is_vip === true || dbProfile.is_premium === true;
          dbProfile.role = dbProfile.app_role || 'guest';
          setProfile(dbProfile);
          return dbProfile;
        }

        if (fetchError) {
          console.error("[AuthContext] Fetch error:", fetchError);
        }

        // 3. Create it manually if it's missing (Trigger might have failed)
        console.log("[AuthContext] Row missing, creating profile row manually...");
        
        const baseUsername = authUser.email?.split('@')[0] || 'user';
        const uniqueUsername = `${baseUsername}_${Math.floor(Math.random() * 10000)}`;

        const newProfile: any = {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
          username: uniqueUsername,
          app_role: 'guest',
          is_vip: false,
          wallet_balance_kobo: 0
        };

        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .maybeSingle();
        
        if (created) {
          console.log("[AuthContext] Profile created successfully.");
          created.account_tier = created.account_tier || 'free';
          created.is_admin = created.app_role === 'admin';
          created.is_premium = created.is_vip === true;
          created.role = created.app_role || 'guest';
          setProfile(created);
          return created;
        }

        if (createError) {
          console.error("[AuthContext] Profile insert failed:", createError.message);
          // If it's a conflict on ID, it might have been created by trigger while we were trying
          if (createError.code === '23505') {
             // Continue to next loop iteration to fetch
             continue;
          }
        }
      } catch (err) {
        console.error("[AuthContext] Loop exception:", err);
      }

      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.error("[AuthContext] Failed to sync profile after all attempts.");
    return null;
  };

  const signOut = async () => {
    try {
      console.log("[AuthContext] Manual Sign Out requested...");
      setUser(null);
      setProfile(null);
      clearStoredRedirectIntent();
      await supabase.auth.signOut();
      // Explicitly clear all tokens to prevent stale restoration
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn("[AuthContext] Could not clear storage in signOut:", e);
      }
      console.log("[AuthContext] Logged out successfully.");
    } catch (err) {
      console.error("[AuthContext] Logout error:", err);
    }
  };

  // ⚠️ CRITICAL SECURITY: ADMIN VERIFICATION VIA CENTRALIZED MAPPING
  const isAdmin = !!(
    isPlatformAdminEmail(user?.email) ||
    profile?.is_admin === true ||
    profile?.app_role === 'admin' ||
    profile?.account_tier === 'admin'
  );

  const resetInactivityTimer = () => {
    // This is just a placeholder to satisfy the context type
    // The actual logic is in the useEffect
  };

  const accountTier = isAdmin ? 'admin' : (profile?.account_tier || 'free');

  // EVEX Normalized Resolution (non-destructive mapping layer)
  const resolved = resolveEvexUserContext({
    ...(profile || {}),
    email: user?.email || profile?.email,
    is_admin: isAdmin || profile?.is_admin
  });
  const evexAccountType = resolved.accountType;
  const evexPlatformRole = isAdmin ? 'ADMIN' : resolved.platformRole;
  const isVip = resolved.isVip;
  const isMpr = isAdmin || evexPlatformRole === 'MPR' || accountTier === 'marketing_partner' || accountTier === 'mpr';
  const isEventCreator = resolved.isEventCreator;
  const isPatron = resolved.isPatron;
  const isVendor = resolved.isVendor;

  // Domain Boundaries
  const canAccessTrivia = isAdmin || isMpr;
  const canCreateEvents = isAdmin || isMpr;
  const canCreateTickets = isAdmin || isMpr;
  const canApproveEvents = isAdmin;
  const canCreateProducts = isVendor || isAdmin;
  const canAccessVendorPortal = isVendor || isAdmin;

  const canManageEvent = (event?: { id?: string; user_id?: string; creator_id?: string; host_id?: string } | null, staffRole?: EvexEventAccessRole) => {
    return checkCanManageEvent({ ...(profile || {}), id: user?.id, email: user?.email, is_admin: isAdmin }, event, staffRole);
  };

  const canScanEventTickets = (event?: { id?: string; user_id?: string; host_id?: string } | null, staffRole?: EvexEventAccessRole) => {
    return checkCanScanEventTickets({ ...(profile || {}), id: user?.id, email: user?.email, is_admin: isAdmin }, event, staffRole);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin, 
      accountTier,
      evexAccountType,
      evexPlatformRole,
      isVip,
      isMpr,
      isEventCreator,
      isPatron,
      isVendor,
      canAccessTrivia,
      canCreateEvents,
      canCreateTickets,
      canApproveEvents,
      canCreateProducts,
      canAccessVendorPortal,
      canManageEvent,
      canScanEventTickets,
      isAuthReady, 
      schemaProblems, 
      recursionDetected, 
      refreshProfile, 
      getOrCreateProfile,
      signOut,
      resetInactivityTimer
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
