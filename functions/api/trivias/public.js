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
      return new Response(JSON.stringify({ trivias: [], message: "Supabase credentials are not configured in environment." }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    // Fetch active trivias
    const { data: rawTrivias, error } = await supabase
      .from("trivias")
      .select("*, books(is_published, status)")
      .eq("status", "active")
      .gt("created_at", twelveHoursAgo)
      .or(`expiry_at.is.null,expiry_at.gt.${nowIso}`);

    if (error) {
      // Try simple fetch if relation is missing or fails
      const { data: simpleTrivias, error: simpleError } = await supabase
        .from("trivias")
        .select("*")
        .eq("status", "active")
        .gt("created_at", twelveHoursAgo)
        .or(`expiry_at.is.null,expiry_at.gt.${nowIso}`);

      if (simpleError) {
        throw simpleError;
      }
      return new Response(JSON.stringify({ trivias: simpleTrivias || [] }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ trivias: rawTrivias || [] }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (err) {
    console.error("[CF Function Trivia Public] Graceful fallback error:", err);
    return new Response(JSON.stringify({ trivias: [], error: err.message || "Failed to fetch trivias safely" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
