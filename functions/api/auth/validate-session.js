import { createClient } from '@supabase/supabase-js';
import { verifyAdminAccess } from '../_adminAuth.js';

export async function onRequest(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const env = context.env || {};
    const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
    const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!url || !key) {
      return new Response(JSON.stringify({ error: "Supabase credentials not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const authHeader = context.request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const supabase = createClient(url, key);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('account_tier, is_admin, is_premium, role, app_role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = verifyAdminAccess(user, profile);
    const accountTier = isAdmin ? 'admin' : (profile?.account_tier || 'free');

    return new Response(JSON.stringify({
      userId: user.id,
      email: user.email,
      accountTier: accountTier,
      isAdmin: isAdmin
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Failed to validate session" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
