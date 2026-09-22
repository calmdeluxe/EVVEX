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
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";

    if (!url || !serviceKey) {
      return new Response(JSON.stringify({ error: "Supabase credentials missing." }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const supabase = createClient(url, serviceKey);

    const bookId = context.params.id;
    if (!bookId || bookId === "pending" || bookId === "submitted") {
      return new Response(JSON.stringify({ error: "Invalid book ID parameter." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const { data: book, error } = await supabase
      .from("books")
      .select("*")
      .eq("id", bookId)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (!book) {
      return new Response(JSON.stringify({ error: "Book not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (book.user_id) {
      const { data: user } = await supabase
        .from("users")
        .select("id, email, full_name")
        .eq("id", book.user_id)
        .maybeSingle();
      if (user) {
        book.users = user;
      }
    }

    return new Response(JSON.stringify({ book }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Failed to fetch book details" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
