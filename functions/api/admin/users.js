import { createClient } from '@supabase/supabase-js';
import { verifyAdminAccess } from '../_adminAuth.js';

export async function onRequest(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const env = context.env || {};
    const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";

    console.log(`[CF Admin Users] Supabase URL being used: ${url}`);

    if (serviceKey) {
      console.log(`[CF Admin Users] SUCCESS: SUPABASE_SERVICE_ROLE_KEY is loaded successfully.`);
    } else {
      console.error(`[CF Admin Users] CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY is missing! Bypassing RLS will not be possible.`);
    }

    if (!url || !serviceKey) {
      return new Response(JSON.stringify({ error: "Supabase credentials are not fully configured in CF Worker context." }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Initialize Supabase Admin client using the service role key to bypass RLS
    const supabase = createClient(url, serviceKey);

    // Verify Admin authentication
    const authHeader = context.request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    if (!token || token === "undefined" || token === "null") {
      return new Response(JSON.stringify({ error: "No valid token provided." }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token.", details: authError?.message }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Check database profile for admin permission
    const { data: profile } = await supabase
       .from("users")
       .select("is_admin, account_tier, role, app_role")
       .eq("id", user.id)
       .maybeSingle();

    const isAdmin = verifyAdminAccess(user, profile);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Access denied. Admins only." }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Query users using the service role client (bypasses RLS)
    let { data: users, error: selectError } = await supabase
      .from("users")
      .select("id, email, full_name, username, account_tier, is_admin, is_premium, wallet_balance, t_points, created_at")
      .order("created_at", { ascending: false });

    if (selectError) {
      console.warn("[CF Admin Users] Querying users table failed, falling back to user_profiles_public:", selectError.message);
      const fallbackRes = await supabase
        .from("user_profiles_public")
        .select("id, full_name, username, account_tier, is_admin, is_premium, wallet_balance, t_points, created_at")
        .order("created_at", { ascending: false });
      
      if (fallbackRes.error) {
        return new Response(JSON.stringify({ error: fallbackRes.error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      users = fallbackRes.data;
    }

    // Fetch active session tracking records to determine who is online
    let sessionsMap = {};
    try {
      const { data: sessions } = await supabase
        .from("user_sessions")
        .select("user_id, last_active_at");
      if (sessions) {
        sessions.forEach((s) => {
          if (s.user_id && s.last_active_at) {
            sessionsMap[s.user_id] = s.last_active_at;
          }
        });
      }
    } catch (sessErr) {
      console.warn("[CF Admin Users] Could not fetch user_sessions:", sessErr.message);
    }

    const usersWithSessions = (users || []).map((u) => ({
      ...u,
      last_active_at: sessionsMap[u.id] || null
    }));

    return new Response(JSON.stringify({ users: usersWithSessions }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (err) {
    console.error("[CF Admin Users] Critical Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
