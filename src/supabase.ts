import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const rawKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

const isPlaceholder = !rawUrl || rawUrl.includes('your-supabase-url') || !rawKey || rawKey.includes('your-anon-key');
const urlError = !rawUrl || (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://'));
const keyError = !rawKey || rawKey.length < 20;

export const supabaseConfigStatus = {
  isPlaceholder,
  urlError: !isPlaceholder && urlError,
  keyError: !isPlaceholder && keyError,
  configured: !isPlaceholder && !urlError && !keyError
};

// Fallback dummy URL to prevent createClient crashes when env is unconfigured in development
const effectiveUrl = (rawUrl && !urlError) ? rawUrl : 'https://placeholder.supabase.co';
const effectiveKey = (rawKey && !keyError) ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase = createClient(effectiveUrl, effectiveKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export default supabase;
