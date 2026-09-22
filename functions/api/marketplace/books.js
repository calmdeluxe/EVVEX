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
    const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!url || !key) {
      return new Response(JSON.stringify({ books: [] }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const supabase = createClient(url, key);

    const { data, error } = await supabase
      .from("books")
      .select("id, title, description, cover_image, price, pdf_price, author_name, genre_id, public_slug, created_at, status, is_published, content_type, video_url, audio_url")
      .or("is_published.eq.1,status.eq.1")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return new Response(JSON.stringify({ books: [], error: error.message }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ books: data || [] }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
        ...corsHeaders
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ books: [], error: err.message }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
