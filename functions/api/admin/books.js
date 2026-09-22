import { createClient } from '@supabase/supabase-js';

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
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";

    if (!url || !serviceKey) {
      return new Response(JSON.stringify({ books: [], error: "Supabase credentials missing in CF context." }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const supabase = createClient(url, serviceKey);

    // Verify token & Admin privileges
    const authHeader = context.request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    if (!token || token === "undefined" || token === "null") {
      return new Response(JSON.stringify({ error: "Unauthorized: No valid token provided." }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token." }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Check admin status
    const ADMIN_EMAILS = [
      "samuelchukwuemeke05@gmail.com",
      "chukwuemekedaniella@gmail.com"
    ];
    const isEmailAdmin = user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

    const { data: profile } = await supabase
      .from("users")
      .select("is_admin, account_tier")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = isEmailAdmin || profile?.is_admin === true || profile?.account_tier === "admin";

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required." }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (context.request.method === "GET") {
      // Fetch books
      let allBooks = [];
      const { data: booksData, error: booksErr } = await supabase
        .from("books")
        .select("id, title, user_id, price, pdf_price, public_slug, is_published, status, cover_image, admin_note, report_count, created_at")
        .order("created_at", { ascending: false })
        .limit(350);

      if (booksErr) {
        return new Response(JSON.stringify({ books: [], error: booksErr.message }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      allBooks = booksData || [];

      // Fetch user email/full_name for author details
      const userIds = [...new Set(allBooks.map((b) => b.user_id))].filter(Boolean);
      let userMap = {};

      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, email, full_name")
          .in("id", userIds);

        if (usersData) {
          userMap = usersData.reduce((acc, u) => {
            acc[u.id] = u;
            return acc;
          }, {});
        }
      }

      const booksWithUsers = allBooks.map((book) => ({
        ...book,
        is_suspended: book.status === -2 || book.status === "-2" || book.is_suspended === true,
        users: userMap[book.user_id] || { email: "Unknown Author", full_name: "Unknown Author" }
      }));

      return new Response(JSON.stringify({ books: booksWithUsers }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (context.request.method === "POST") {
      const body = await context.request.json().catch(() => ({}));
      const { bookId, action, admin_note } = body;

      if (!bookId || !action) {
        return new Response(JSON.stringify({ error: "Missing bookId or action" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const statusValue = action === "approve" ? 1 : -1;
      const { error: updateErr } = await supabase
        .from("books")
        .update({
          status: statusValue,
          admin_note: admin_note || null,
          is_published: action === "approve" ? 1 : 0,
        })
        .eq("id", bookId);

      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
