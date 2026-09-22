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

  const fallbackGenres = [
    { id: "comic-id-placeholder", name: "Comic", slug: "comic" },
    { id: "horror-id-placeholder", name: "Horror", slug: "horror" },
    { id: "sci-fi-id-placeholder", name: "Sci-Fi", slug: "sci-fi" },
    { id: "romance-id-placeholder", name: "Romance", slug: "romance" },
    { id: "thriller-id-placeholder", name: "Thriller", slug: "thriller" },
    { id: "drama-id-placeholder", name: "Drama", slug: "drama" },
    { id: "fantasy-id-placeholder", name: "Fantasy", slug: "fantasy" },
    { id: "mystery-id-placeholder", name: "Mystery", slug: "mystery" },
  ];

  try {
    const env = context.env || {};
    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ genres: fallbackGenres, isFallback: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from("genres").select("*").order("name", { ascending: true });

    if (error || !data || data.length === 0) {
      return new Response(JSON.stringify({ genres: fallbackGenres, isFallback: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ genres: data }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
        ...corsHeaders
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ genres: fallbackGenres, isFallback: true, error: err.message }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
