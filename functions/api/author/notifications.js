import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = context.env.VITE_SUPABASE_URL;
    const supabaseKey = context.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ notifications: [], unreadCount: 0, message: "Supabase credentials are not configured in environment." }), {
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

    const { data, error } = await supabase
      .from("author_notifications")
      .select("*")
      .eq("author_id", authorId)
      .order("created_at", { ascending: false });

    if (error) {
      if (
        error.message &&
        error.message.includes("relation") &&
        error.message.includes("does not exist")
      ) {
        return new Response(JSON.stringify({
          notifications: [],
          unreadCount: 0,
          warning: "Author notifications table does not exist in your database schema yet. Please apply the migration.",
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const unreadCount = (data || []).filter((n) => !n.is_read).length;

    return new Response(JSON.stringify({
      notifications: data || [],
      unreadCount,
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (err) {
    console.error("[CF Function Notifications] Error:", err);
    return new Response(JSON.stringify({ notifications: [], unreadCount: 0, error: err.message || "Failed to fetch notifications" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
