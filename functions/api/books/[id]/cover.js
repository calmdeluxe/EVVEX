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
    const env = context.env || {};
    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || 
                        env.SUPABASE_SERVICE_KEY || 
                        env.SUPABASE_SERVICE_ROLE ||
                        env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                        env.SUPABASE_ANON_KEY ||
                        env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Supabase credentials are not configured in environment." }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const { id } = context.params;
    if (!id) {
      return new Response(JSON.stringify({ error: "Book ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("books")
      .select("id, cover_image")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`[CF Function GetBookCover] Failed to fetch cover for book ${id}:`, error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    let coverUrl = data && data.cover_image ? data.cover_image : null;
    if (coverUrl && !coverUrl.startsWith("http") && !coverUrl.startsWith("data:")) {
      try {
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(coverUrl);
        coverUrl = urlData?.publicUrl || coverUrl;
      } catch (storageErr) {
        console.warn("[CF Function GetBookCover] Error getting media bucket URL:", storageErr);
      }
    }

    const responseData = {
      cover_image: coverUrl
    };

    return new Response(JSON.stringify(responseData), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (err) {
    console.error("[CF Function GetBookCover] Exception:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to fetch book cover image" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
