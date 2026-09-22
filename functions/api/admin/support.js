import { createClient } from '@supabase/supabase-js';

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

    console.log(`[CF Admin Support] Supabase URL being used: ${url}`);

    if (serviceKey) {
      console.log(`[CF Admin Support] SUCCESS: SUPABASE_SERVICE_ROLE_KEY is loaded successfully.`);
    } else {
      console.error(`[CF Admin Support] CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY is missing! Bypassing RLS will not be possible.`);
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
    let profile = null;
    const { data: profileData } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    profile = profileData;

    const ADMIN_EMAILS = ["samuelchukwuemeke05@gmail.com"];

    if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      if (!profile) {
        profile = {
          id: user.id,
          email: user.email,
          is_admin: true,
          account_tier: "admin",
        };
      } else {
        profile.is_admin = true;
        profile.account_tier = "admin";
      }
    }

    const isAdmin = !!profile?.is_admin && ADMIN_EMAILS.includes(user.email?.toLowerCase());
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Access denied. Admins only." }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Query support requests using the service role client (bypasses RLS)
    console.log("[CF Admin Support] Fetching support requests...");
    const { data: requests, error: selectError } = await supabase
      .from("support_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (selectError) {
      console.error("[CF Admin Support] Fetch support requests error:", JSON.stringify(selectError, null, 2));
      if (selectError.code === "42P01") {
        return new Response(JSON.stringify({ requests: [], warning: "Table support_requests is missing." }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      return new Response(JSON.stringify({ error: selectError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (!requests || requests.length === 0) {
      return new Response(JSON.stringify({ requests: [] }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Manual join users
    const userIds = [...new Set(requests.map((r) => r.user_id))].filter(Boolean);
    let userMap = {};

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, email, full_name")
        .in("id", userIds);

      if (usersError) {
        console.error("[CF Admin Support] Fetch users for support error:", usersError);
      } else {
        userMap = (users || []).reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {});
      }
    }

    const requestsWithUsers = requests.map((r) => ({
      ...r,
      users: userMap[r.user_id] || {
        email: "Unknown",
        full_name: "Deleted User",
      },
    }));

    return new Response(JSON.stringify({ requests: requestsWithUsers }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (err) {
    console.error("[CF Admin Support] Critical Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
