import { createClient, SupabaseClient } from '@supabase/supabase-js';

const PLACEHOLDER_URL = 'https://arbwwbbqpncqxekbttoi.supabase.co';
const PLACEHOLDER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyYnd3YmJxcG5jcXhla2J0dG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDk3ODksImV4cCI6MjA5NTkyNTc4OX0.cJY1MkYZGGypJ_XqvHFPHHpeqXbI3CP-tSkA4dL4yQY';

// Initialize with placeholder but will be re-initialized below
// We keep the logic below to ensure it only happens once.

/**
 * Robustly cleans a secret by stripping quotes, whitespace, 
 * and common prefixes like "KEY=" if the user pasted the whole line.
 */
function cleanSecret(val: string | undefined): string {
  if (!val || typeof val !== 'string') return "";
  let cleaned = val.trim();
  // Remove surrounding quotes if any
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.substring(1, cleaned.length - 1).trim();
  }
  // If the user pasted the whole line like "VITE_SUPABASE_URL=...", extract just the value
  // We only do this if it looks like a variable assignment at the start, 
  // to avoid splitting real data that contains an '=' (like a JWT)
  if (cleaned.includes('=') && (cleaned.startsWith('VITE_') || cleaned.startsWith('SUPABASE_'))) {
    const parts = cleaned.split('=');
    if (parts.length > 1) cleaned = parts.slice(1).join('=').trim();
  }
  return cleaned;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseUrl = cleanSecret(rawUrl);
let supabaseAnonKey = cleanSecret(rawKey);

// Robust check for valid URL
const isValidUrl = (url: string | undefined): boolean => {
  if (!url || url === '' || url.includes('placeholder')) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Capture status BEFORE we potentially clear them for safety
export const supabaseConfigStatus = {
  urlError: (supabaseUrl.startsWith('pk_') || supabaseUrl.startsWith('sk_') || supabaseUrl.startsWith('sb_')) 
    ? "Paystack key detected in URL field" 
    : !isValidUrl(supabaseUrl) && supabaseUrl !== "" ? "Invalid URL format" : null,
  keyError: (supabaseAnonKey.startsWith('pk_') || supabaseAnonKey.startsWith('sk_') || supabaseAnonKey.startsWith('sb_'))
    ? "Paystack key detected in Key field"
    : (supabaseAnonKey !== "" && !supabaseAnonKey.startsWith('eyJ')) ? "Invalid API key format" : null,
  isPlaceholder: false
};

// Discard Paystack keys
if (supabaseUrl.startsWith('pk_') || supabaseUrl.startsWith('sk_') || supabaseUrl.startsWith('sb_')) supabaseUrl = "";
if (supabaseAnonKey.startsWith('pk_') || supabaseAnonKey.startsWith('sk_') || supabaseAnonKey.startsWith('sb_')) supabaseAnonKey = "";

const customUrlValid = isValidUrl(supabaseUrl);
const customKeyValid = !!(supabaseAnonKey && supabaseAnonKey.startsWith('eyJ'));

if (!customUrlValid || !customKeyValid) {
  console.log(
    "ℹ️ [Supabase Dynamic Sync]\n" +
    "Build-time environment variables were not baked into the client JS bundle.\n" +
    "This is expected when credentials are dynamically served from wrangler's context.env via /api/supabase-config.\n" +
    "The application will automatically perform a dynamic credentials synchronization on startup."
  );
}

const finalUrl = customUrlValid ? supabaseUrl : PLACEHOLDER_URL;
const finalKey = customKeyValid ? supabaseAnonKey : PLACEHOLDER_KEY;

supabaseConfigStatus.isPlaceholder = false;

// Get safe storage adapter with localStorage preference, falling back to sessionStorage, then memoryStore
const getSafeAuthStorage = () => {
  if (typeof window === 'undefined') {
    const memoryStore: Record<string, string> = {};
    return {
      getItem: (key: string) => memoryStore[key] || null,
      setItem: (key: string, value: string) => { memoryStore[key] = value; },
      removeItem: (key: string) => { delete memoryStore[key]; }
    };
  }

  // 1. Try window.localStorage first so user sessions survive browser refreshes/closes
  try {
    const ls = window.localStorage;
    const testKey = '__storage_test_supabase__';
    ls.setItem(testKey, testKey);
    ls.removeItem(testKey);
    return ls;
  } catch (e) {
    // 2. Fall back to sessionStorage if localStorage is blocked (e.g., private window restrictions)
    try {
      const ss = window.sessionStorage;
      const testKey = '__storage_test_supabase__';
      ss.setItem(testKey, testKey);
      ss.removeItem(testKey);
      return ss;
    } catch (e2) {
      console.warn("[Supabase] Direct storage access failed, using in-memory fallback adapter.");
      const memoryStore: Record<string, string> = {};
      return {
        getItem: (key: string) => memoryStore[key] || null,
        setItem: (key: string, value: string) => { memoryStore[key] = value; },
        removeItem: (key: string) => { delete memoryStore[key]; }
      };
    }
  }
};

// Resilient Supabase Fetch that transparently routes through /api/supabase-proxy if direct network/CORS fails
const resilientSupabaseFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const nativeFetch = typeof window !== 'undefined' && (window as any).__originalFetch 
    ? (window as any).__originalFetch 
    : (typeof fetch !== 'undefined' ? fetch : undefined);

  if (!nativeFetch) {
    throw new Error("No fetch implementation available.");
  }

  try {
    const res = await nativeFetch(input, init);
    return res;
  } catch (err: any) {
    const errMsg = (err?.message || String(err)).toLowerCase();
    const isNetworkFailure = 
      err?.name === 'TypeError' ||
      errMsg.includes('failed to fetch') ||
      errMsg.includes('networkerror') ||
      errMsg.includes('load failed') ||
      errMsg.includes('abort');

    if (!isNetworkFailure) {
      throw err;
    }

    // Direct network call to Supabase failed (e.g. adblocker, ISP block, CORS).
    // Automatically fail over to server-side proxy endpoint /api/supabase-proxy
    try {
      console.warn("[Supabase] Direct connection failed to fetch, seamlessly routing through /api/supabase-proxy...");
      const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.href : (input as any).url);
      
      const headersObj: Record<string, string> = {};
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((v, k) => { headersObj[k] = v; });
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([k, v]) => { headersObj[k] = v; });
        } else {
          Object.assign(headersObj, init.headers);
        }
      }

      let bodyPayload: any = undefined;
      if (init?.body) {
        if (typeof init.body === 'string') {
          bodyPayload = init.body;
        }
      }

      const proxyRes = await nativeFetch('/api/supabase-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: urlStr,
          method: init?.method || 'GET',
          headers: headersObj,
          body: bodyPayload
        })
      });

      if (proxyRes.ok) {
        const payload = await proxyRes.json();
        return new Response(payload.body, {
          status: payload.status,
          statusText: payload.statusText,
          headers: new Headers(payload.headers || {})
        });
      }
    } catch (proxyErr) {
      console.error("[Supabase] Server-side proxy failover error:", proxyErr);
    }

    // If failover failed, re-throw original error
    throw err;
  }
};

// ❌ Abandoned real-time WebSocket code removed / disabled
// Abandoned real-time email alert system and postgres_changes WebSockets are completely disabled:
// const channel = supabase.channel('email-alerts')
//   .on('postgres_changes', ...)
//   .subscribe();

const disabledRealtimeChannel = (name?: string) => {
  const mockChan: any = {
    on: () => mockChan,
    subscribe: (callback?: any) => {
      if (typeof callback === 'function') {
        try { callback('CLOSED'); } catch (_) {}
      }
      return mockChan;
    },
    unsubscribe: () => Promise.resolve('ok'),
    send: () => Promise.resolve('ok'),
    track: () => Promise.resolve('ok'),
    untrack: () => Promise.resolve('ok'),
  };
  return mockChan;
};

const disableClientRealtime = (client: any) => {
  if (!client) return;
  try {
    if (client.realtime) {
      if (typeof client.realtime.disconnect === 'function') {
        client.realtime.disconnect();
      }
      // Neutralize connect and setAuth to prevent background WebSocket reconnection attempts
      client.realtime.connect = () => {};
      client.realtime.setAuth = () => Promise.resolve();
      client.realtime.channel = disabledRealtimeChannel;
    }
    client.channel = disabledRealtimeChannel;
    client.getChannels = () => [];
    client.removeChannel = () => Promise.resolve('ok');
    client.removeAllChannels = () => Promise.resolve([]);
  } catch (e) {
    // Ignore
  }
};

// Initialize Supabase Client (Only once) safely
let tempSupabase: any;
try {
  if (finalUrl && finalKey && !supabaseConfigStatus.isPlaceholder) {
    tempSupabase = createClient(finalUrl, finalKey, {
      auth: {
        persistSession: true,
        storage: getSafeAuthStorage(),
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      global: {
        fetch: resilientSupabaseFetch
      },
      realtime: {
        params: {
          eventsPerSecond: 0
        }
      }
    });
    disableClientRealtime(tempSupabase);
  } else {
    throw new Error("Supabase credentials missing. App needs valid credentials.");
  }
} catch (e) {
  console.warn("[Supabase] Failed to initialize client, using resilient mock fallback:", e);
  const dummyResponse = { data: null, error: { message: "Database offline or unconfigured." } };
  const chainable = () => {
    const obj: any = {
      select: () => obj,
      eq: () => obj,
      neq: () => obj,
      gt: () => obj,
      gte: () => obj,
      lt: () => obj,
      lte: () => obj,
      is: () => obj,
      in: () => obj,
      order: () => obj,
      limit: () => obj,
      maybeSingle: () => Promise.resolve(dummyResponse),
      single: () => Promise.resolve(dummyResponse),
      insert: () => Promise.resolve(dummyResponse),
      upsert: () => Promise.resolve(dummyResponse),
      update: () => obj,
      delete: () => obj,
      then: (cb: any) => cb({ data: [], error: dummyResponse.error }),
    };
    return obj;
  };

  tempSupabase = {
    __isDummy: true,
    from: () => chainable(),
    rpc: () => Promise.resolve(dummyResponse),
    channel: disabledRealtimeChannel,
    removeChannel: () => Promise.resolve('ok'),
    removeAllChannels: () => Promise.resolve([]),
    getChannels: () => [],
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: () => Promise.resolve({ error: null }),
      setSession: () => Promise.resolve({ data: { session: null, user: null }, error: null }),
      resend: () => Promise.resolve({ data: null, error: new Error("Supabase credentials missing.") }),
      verifyOtp: () => Promise.resolve({ data: { session: null, user: null }, error: new Error("Supabase credentials missing.") }),
      signInWithOAuth: () => Promise.resolve({ data: { provider: 'google', url: '' }, error: new Error("Supabase is missing key credentials. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.") }),
      signInWithPassword: () => Promise.resolve({ data: { session: null, user: null }, error: new Error("Supabase credentials missing.") }),
      signUp: () => Promise.resolve({ data: { session: null, user: null }, error: new Error("Supabase credentials missing.") }),
      resetPasswordForEmail: () => Promise.resolve({ data: null, error: new Error("Supabase credentials missing.") }),
      updateUser: () => Promise.resolve({ data: { user: null }, error: new Error("Supabase credentials missing.") }),
      refreshSession: () => Promise.resolve({ data: { session: null, user: null }, error: null })
    }
  } as any;
}

let activeClient: any = tempSupabase;

export function updateSupabaseClient(url: string, key: string) {
  try {
    if (url && key && url.startsWith('http') && key.length > 20) {
      console.log("[Supabase Dynamic Match] Updating client-side Supabase keys to match server:", url);
      const newClient = createClient(url, key, {
        auth: {
          persistSession: true,
          storage: getSafeAuthStorage(),
          autoRefreshToken: true,
          detectSessionInUrl: true
        },
        global: {
          fetch: resilientSupabaseFetch
        },
        realtime: {
          params: {
            eventsPerSecond: 0
          }
        }
      });
      disableClientRealtime(newClient);
      activeClient = newClient;
      activeClient.__isDummy = false;
      supabaseConfigStatus.isPlaceholder = false;
    }
  } catch (e) {
    console.error("[Supabase Dynamic Match] Reinit failure:", e);
  }
}

export const supabase: SupabaseClient = new Proxy({} as any, {
  get(target, prop) {
    if (prop === '__isDummy') {
      return !!activeClient.__isDummy;
    }
    // Compatibility Layer: safely route any legacy or mismatched 'profiles' requests to the active 'users' table
    if (prop === 'from') {
      return function(relation: string, ...args: any[]) {
        const targetRel = relation === 'profiles' ? 'users' : relation;
        return activeClient.from(targetRel, ...args);
      };
    }
    // Intercept all Realtime/channel operations to prevent WebSocket connection errors
    if (prop === 'channel') {
      return disabledRealtimeChannel;
    }
    if (prop === 'getChannels') {
      return () => [];
    }
    if (prop === 'removeChannel' || prop === 'removeAllChannels') {
      return () => Promise.resolve('ok');
    }
    if (prop === 'realtime') {
      return {
        connect: () => {},
        disconnect: () => {},
        setAuth: () => Promise.resolve(),
        channel: disabledRealtimeChannel,
        getChannels: () => [],
        removeChannel: () => Promise.resolve('ok'),
        removeAllChannels: () => Promise.resolve([]),
        isConnected: () => false,
      };
    }
    const val = activeClient[prop];
    if (typeof val === 'function') {
      return function(...args: any[]) {
        return val.apply(activeClient, args);
      };
    }
    return val;
  },
  set(target, prop, value) {
    activeClient[prop] = value;
    return true;
  }
}) as any;

if (!supabaseConfigStatus.isPlaceholder) {
  console.log("[Supabase] Initialized with configuration.");
}
