import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (context.request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST or OPTIONS methods are supported." }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const supabaseUrl = context.env.VITE_SUPABASE_URL;
    const supabaseKey = context.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ success: false, message: "Supabase credentials are not configured in environment." }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse auth token to verify user
    const authHeader = context.request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    
    if (!token || token === "undefined" || token === "null") {
      return new Response(JSON.stringify({ error: "No token provided" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const authorId = user.id;
    const rawBody = await context.request.json().catch(() => ({}));
    const { notificationIds, all } = rawBody;

    let query = supabase
      .from("author_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("author_id", authorId);

    if (
      !all &&
      Array.isArray(notificationIds) &&
      notificationIds.length > 0
    ) {
      query = query.in("id", notificationIds);
    } else if (!all) {
      return new Response(JSON.stringify({ error: "Either specify notificationIds or set all=true" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const { error } = await query;

    if (error) {
      if (
        error.message &&
        error.message.includes("relation") &&
        error.message.includes("does not exist")
      ) {
        return new Response(JSON.stringify({
          success: false,
          error: "Notification table not created yet. Please apply migrations in Setup or Admin Panel.",
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (err) {
    console.error("[CF Function Notifications Mark Read] Error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message || "Failed to mark notifications read" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
