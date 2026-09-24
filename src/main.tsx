import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import './index.css';
import axios from 'axios';
import { supabase } from './supabase';

console.log("[Main] Entry point starting...");

// Detect Capacitor native platform
export const isCapacitor = typeof window !== 'undefined' && Boolean(
  (window as any)?.Capacitor?.isNativePlatform?.() || 
  (window as any)?.Capacitor?.getPlatform?.() === 'android'
);

// Offline cache priming for Capacitor runtime
const primeCapacitorCache = () => {
  try {
    const CACHE_KEY = "calmreader_landing_data_cache_local";
    const existing = localStorage.getItem(CACHE_KEY);
    if (!existing) {
      console.log("[Main] Seeding initial offline catalog for native Capacitor app...");
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        featuredBooks: [
          {
            id: "offline-book-1",
            title: "The Art of Mindful Reading",
            author_name: "Dr. Elena Vance",
            description: "Discover the transformative power of slowing down and immersing yourself deeply into literature.",
            cover_image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800&auto=format&fit=crop",
            thumbnail_url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400&auto=format&fit=crop",
            price: 0,
            is_published: 1,
            admin_note: "author:Dr. Elena Vance, genre:Mindfulness",
            created_at: new Date().toISOString()
          },
          {
            id: "offline-book-2",
            title: "Focus and Flow in the Modern Era",
            author_name: "Marcus Aurel",
            description: "Practical philosophies and cognitive frameworks for shielding your creative attention.",
            cover_image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800&auto=format&fit=crop",
            thumbnail_url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=400&auto=format&fit=crop",
            price: 0,
            is_published: 1,
            admin_note: "author:Marcus Aurel, genre:Philosophy",
            created_at: new Date().toISOString()
          }
        ],
        blogs: [],
        videos: [],
        featuredTrivias: [],
        activePromo: null
      }));
      localStorage.setItem("calmreader_landing_data_cache_time_local", String(Date.now()));
    }
  } catch (e) {
    console.warn("[Main] Failed to initialize Capacitor cache:", e);
  }
};

if (isCapacitor) {
  console.log("[Main] Running inside Capacitor native platform. Bypassing remote API wait.");
  primeCapacitorCache();
}

// Setup global Axios request interceptor for auto-session renewal and header injection
axios.interceptors.request.use(async (config) => {
  let token = "";
  const authHeader = (config.headers?.Authorization || config.headers?.authorization) as string | undefined;

  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const rawVal = authHeader.substring(7).trim();
    if (rawVal && rawVal !== "undefined" && rawVal !== "null") {
      token = rawVal;
    }
  } else {
    // If no header present, safely query user session with timeout to prevent offline stalls
    try {
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => 
        setTimeout(() => resolve({ data: { session: null } }), 1000)
      );
      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
      if (session?.access_token) {
        token = session.access_token;
        if (config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (e) {
      console.warn("[Axios Interceptor] Could not fetch session token:", e);
    }
  }

  if (token && token !== "undefined" && token !== "null") {
    const isExpired = (() => {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return false; // Not a valid JWT, do not attempt to refresh
        const rawPayload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(rawPayload));
        return (payload.exp - 10) * 1000 < Date.now();
      } catch (e) {
        return false; // Base64 or parsing error, do not attempt to refresh
      }
    })();

    if (isExpired) {
      console.log("[Axios Interceptor] Access token has expired. Automatically refreshing session...");
      try {
        const { data: { session }, error } = await supabase.auth.refreshSession();
        if (error || !session) {
          throw error || new Error("Failed to fetch fresh session keys.");
        }
        console.log("[Axios Interceptor] Session refreshed successfully!");
        if (config.headers) {
          config.headers.Authorization = `Bearer ${session.access_token}`;
        }
      } catch (refreshErr) {
        console.error("[Axios Interceptor] Session renewal failed. Clearing session:", refreshErr);
        try {
          await supabase.auth.signOut();
          sessionStorage.clear();
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('-auth-token'))) {
              localStorage.removeItem(key);
            }
          }
        } catch (logoutErr) {
          console.warn("[Axios Interceptor] Storage wipe skipped:", logoutErr);
        }
        
        // Define paths that strictly require user authentications
        const protectedPaths = [
          '/dashboard', '/admin', '/promo-studio', '/apply/author', '/payment', 
          '/create-book', '/read', '/edit', '/sell', '/my-books', '/earnings', 
          '/settings', '/security', '/trivia', '/ai-magic', '/request', '/history'
        ];
        const isProtected = protectedPaths.some(path => window.location.pathname.startsWith(path));
        
        if (isProtected) {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }
        return Promise.reject(new Error("Unauthorized session expired and refresh failed."));
      }
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Setup global Axios response interceptor for 401 authentication failures
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    if (status === 401) {
      const publicAuthPages = ['/login', '/signup', '/auth', '/forgot-password', '/book', '/ebook', '/direct-checkout'];
      const currentPath = window.location.pathname;
      if (!publicAuthPages.some(p => currentPath.startsWith(p))) {
        console.warn(`[Axios Interceptor] 401 Auth error on ${error.config?.url}. Redirecting to /login...`);
        try {
          await supabase.auth.signOut();
          sessionStorage.clear();
        } catch (e) {}
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath + window.location.search)}`;
      }
    } else if (status === 403) {
      // 403 means Forbidden / insufficient permissions, NOT unauthenticated session expiration.
      // Do NOT sign out the user, clear session, or destroy auth state.
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/mpr') || currentPath.startsWith('/admin')) {
        console.warn(`[Axios Interceptor] 403 Forbidden access on ${error.config?.url}. Redirecting to /unauthorized.`);
        window.location.href = '/unauthorized';
      }
    }
    return Promise.reject(error);
  }
);


// Fast intercept for Supabase OAuth / Google auth popup flow
(function() {
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  
  if (window.opener && window.opener !== window) {
    let accessToken = null;
    let refreshToken = null;

    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      accessToken = params.get('access_token');
      refreshToken = params.get('refresh_token');
    }
    
    if (!accessToken && search) {
      const params = new URLSearchParams(search);
      accessToken = params.get('access_token');
      refreshToken = params.get('refresh_token');
    }

    if (accessToken && refreshToken) {
      try {
        console.log("[GooglePopup] Found credentials. Posting to opener...");
        window.opener.postMessage({
          type: 'SUPABASE_AUTH_SUCCESS',
          accessToken,
          refreshToken
        }, '*');
        
        // Wait briefly to allow message dispatch before closing
        setTimeout(() => {
          window.close();
        }, 300);
      } catch (e) {
        console.error("[GooglePopup] Error alerting opener:", e);
      }
    }
  }
})();

// Detect if we are running on an external static host where we should route /api to the real deployment backend
const getBackendUrl = (): string => {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isNative = typeof window !== 'undefined' && ((window as any).Capacitor?.isNativePlatform?.() || window.location.protocol === 'capacitor:');
  const isStaticHost = host.includes('vercel.app') || host.includes('pages.dev') || host.includes('github.io') || host.includes('netlify.app') || host.includes('amplifyapp.com');
  const isLocalStatic = host === 'localhost' && typeof window !== 'undefined' && window.location.port !== '3000' && window.location.port !== '';
  
  if (isNative || isStaticHost || isLocalStatic) {
    const localOverride = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('CALM_READER_BACKEND_URL') : null;
    if (localOverride && localOverride.startsWith('http')) {
      return localOverride.endsWith('/') ? localOverride.slice(0, -1) : localOverride;
    }
    // If VITE_API_BASE_URL is explicitly set to empty, "relative", or "none", honor relative routing
    const baseVar = import.meta.env.VITE_API_BASE_URL;
    if (baseVar === "" || baseVar === "relative" || baseVar === "none") {
      return "";
    }
    if (baseVar && baseVar.startsWith("http")) return baseVar.endsWith('/') ? baseVar.slice(0, -1) : baseVar;

    // In native Capacitor Android without configured base URL, route to the live cloud backend
    if (isNative) {
      return "https://ais-dev-kbvjlfcr6gl3rfp33vbgr5-360564558721.europe-west1.run.app";
    }
    return baseVar || "";
  }
  
  // When running on Cloud Run, localhost:3000, or any host serving both frontend & backend,
  // API calls are relative to the current origin.
  return '';
};

const backendUrl = getBackendUrl();

// Unified, robust global window.fetch Interceptor for Token Injection and URL Routing
const originalFetch = window.fetch;
if (typeof window !== 'undefined') {
  (window as any).__originalFetch = originalFetch;
}

if (backendUrl) {
  console.log("[Main] External static client environment detected. Routing API calls to:", backendUrl);
  axios.defaults.baseURL = backendUrl;
} else {
  axios.defaults.baseURL = '';
}

try {
  Object.defineProperty(window, 'fetch', {
    value: async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      let urlStr = "";
      if (typeof input === 'string') {
        urlStr = input;
      } else if (input instanceof URL) {
        urlStr = input.href;
      } else if (input && (input as any).url) {
        urlStr = (input as any).url;
      }

      // Check if this is an API call we want to authorize/route
      const isRelativeApi = urlStr.startsWith('/api/');
      const isAbsoluteLocalApi = urlStr.startsWith(window.location.origin + '/api/');
      const isAbsoluteBackendApi = !!(backendUrl && urlStr.startsWith(backendUrl + '/api/'));

      const isApiCall = isRelativeApi || isAbsoluteLocalApi || isAbsoluteBackendApi;

      if (isApiCall) {
        init = init || {};
        
        // 1. Setup Headers safely
        let headers: Headers;
        if (init.headers instanceof Headers) {
          headers = init.headers;
        } else if (Array.isArray(init.headers)) {
          headers = new Headers(init.headers);
          init.headers = headers;
        } else {
          headers = new Headers(init.headers as Record<string, string> || {});
          init.headers = headers;
        }

        // 2. Inject Supabase bearer token silently if not already present
        if (!headers.has('Authorization')) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              headers.set('Authorization', `Bearer ${session.access_token}`);
            }
          } catch (tokenErr) {
            console.warn("[Fetch Interceptor] Token injection failed:", tokenErr);
          }
        }

        // 3. Route URL if needed
        if (backendUrl) {
          if (typeof input === 'string') {
            if (input.startsWith('/api/')) {
              input = backendUrl + input;
            } else if (input.startsWith(window.location.origin + '/api/')) {
              input = input.replace(window.location.origin, backendUrl);
            }
          } else if (input instanceof URL) {
            if (input.pathname.startsWith('/api/')) {
              input = new URL(backendUrl + input.pathname + input.search);
            }
          }
        }
      }

      const response = await originalFetch(input, init);
      if (isApiCall) {
        if (response.status === 401) {
          const publicAuthPages = ['/login', '/signup', '/auth', '/forgot-password', '/book', '/ebook', '/direct-checkout'];
          const currentPath = window.location.pathname;
          if (!publicAuthPages.some(p => currentPath.startsWith(p))) {
            console.warn(`[Fetch Interceptor] 401 Auth error on ${urlStr}. Redirecting to /login...`);
            try {
              await supabase.auth.signOut();
              sessionStorage.clear();
            } catch (e) {}
            window.location.href = `/login?redirect=${encodeURIComponent(currentPath + window.location.search)}`;
          }
        } else if (response.status === 403) {
          // 403 Forbidden: Authenticated user lacks permission. Never sign out or clear session.
          console.warn(`[Fetch Interceptor] 403 Forbidden access on ${urlStr}. Preserving authentication state.`);
          const currentPath = window.location.pathname;
          if (currentPath.startsWith('/mpr') || currentPath.startsWith('/admin')) {
            window.location.href = '/unauthorized';
          }
        }
      }
      return response;
    },
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (err) {
  console.warn("[Main] Failed to define custom shadow window.fetch. Using fallback function assignment:", err);
  // Fallback simple fetch override
  (window as any).fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.href : '');
    const isApiCall = urlStr.startsWith('/api/') || urlStr.startsWith(window.location.origin + '/api/');
    
    if (isApiCall) {
      init = init || {};
      init.headers = init.headers || {};
      const headers = init.headers as Record<string, string>;
      const hasAuth = Object.keys(headers).some(k => k.toLowerCase() === 'authorization');
      if (!hasAuth) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }
        } catch (e) {}
      }
      if (backendUrl && typeof input === 'string' && input.startsWith('/api/')) {
        input = backendUrl + input;
      }
    }
    const response = await originalFetch(input, init);
    if (isApiCall) {
      if (response.status === 401) {
        const publicAuthPages = ['/login', '/signup', '/auth', '/forgot-password', '/book', '/ebook', '/direct-checkout'];
        const currentPath = window.location.pathname;
        if (!publicAuthPages.some(p => currentPath.startsWith(p))) {
          console.warn(`[Fallback Fetch Interceptor] 401 Auth error on ${urlStr}. Redirecting to /login...`);
          try {
            await supabase.auth.signOut();
            sessionStorage.clear();
          } catch (e) {}
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath + window.location.search)}`;
        }
      } else if (response.status === 403) {
        // 403 Forbidden: Authenticated user lacks permission. Never sign out or clear session.
        console.warn(`[Fallback Fetch Interceptor] 403 Forbidden access on ${urlStr}. Preserving authentication state.`);
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/mpr') || currentPath.startsWith('/admin')) {
          window.location.href = '/unauthorized';
        }
      }
    }
    return response;
  };
}

const rootElement = document.getElementById('root');
console.log("[Main] Root element found:", !!rootElement);

if (rootElement) {
  (window as any).__REACT_STARTED__ = true;
  console.log("[Main] Rendering application...");
  createRoot(rootElement).render(
    <StrictMode>
      <GlobalErrorBoundary>
        <App />
      </GlobalErrorBoundary>
    </StrictMode>,
  );
} else {
  console.error("[Main] FATAL: Root element NOT found!");
  document.body.innerHTML = '<div style="color:red; padding:20px; font-weight:bold;">FATAL ERROR: #root element missing in HTML.</div>';
}

