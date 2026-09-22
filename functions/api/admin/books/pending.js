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

  if (context.request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  try {
    const env = context.env || {};
    const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "https://wgdcroglmhzmrvqrixku.supabase.co";
    // Ensure the query uses the SUPABASE_SERVICE_ROLE_KEY to bypass RLS
    const serviceKey = 
      env.SUPABASE_SERVICE_ROLE_KEY || 
      env.SUPABASE_SERVICE_KEY || 
      env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
      env.SUPABASE_ANON_KEY || 
      env.VITE_SUPABASE_ANON_KEY || 
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZGNyb2dsbWh6bXJ2cXJpeGt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTMxMjIsImV4cCI6MjA5MTc2OTEyMn0.zmWG2K3OpU25wSDBOSmKnpFHUABNtRklAzCg-f5VYic";

    if (!url || !serviceKey) {
      return new Response(JSON.stringify({ books: [], error: "Supabase credentials missing in server environment." }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const supabase = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify token & Admin privileges
    const authHeader = context.request.headers.get("Authorization") || context.request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;

    if (!token || token === "undefined" || token === "null") {
      return new Response(JSON.stringify({ books: [], error: "Unauthorized: No valid authentication token provided." }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ books: [], error: "Unauthorized: Invalid or expired token." }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Check admin status by email list or users table role
    const ADMIN_EMAILS = [
      "samuelchukwuemeke05@gmail.com",
      "chukwuemekedaniella@gmail.com"
    ];
    const isEmailAdmin = user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

    const { data: profile } = await supabase
      .from("users")
      .select("is_admin, account_tier, role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = isEmailAdmin || profile?.is_admin === true || profile?.account_tier === "admin" || profile?.role === "admin";

    if (!isAdmin) {
      return new Response(JSON.stringify({ books: [], error: "Forbidden: Admin access required." }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Query pending/submitted books using status IN (1, 2)
    let books = [];
    let queryError = null;

    // Primary query selecting standard book columns
    const { data: booksData, error: primaryErr } = await supabase
      .from("books")
      .select("id, title, user_id, price, pdf_price, public_slug, is_published, status, cover_image, admin_note, report_count, created_at")
      .in("status", [1, 2])
      .order("created_at", { ascending: false });

    if (primaryErr) {
      queryError = primaryErr;
      // Fallback query with minimal core columns if optional columns do not exist
      const { data: fallbackData, error: fallbackErr } = await supabase
        .from("books")
        .select("id, title, user_id, price, status, is_published, created_at")
        .in("status", [1, 2])
        .order("created_at", { ascending: false });

      if (fallbackErr) {
        return new Response(JSON.stringify({ 
          books: [], 
          error: `Failed to query pending books: ${fallbackErr.message || primaryErr.message}` 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      books = fallbackData || [];
    } else {
      books = booksData || [];
    }

    // Fetch user details for the author of each book
    const userIds = Array.from(new Set(books.map((b) => b.user_id).filter(Boolean)));
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

    const booksWithUsers = books.map((book) => ({
      ...book,
      users: userMap[book.user_id] || { email: "Unknown Author", full_name: "Unknown Author" }
    }));

    return new Response(JSON.stringify({ books: booksWithUsers }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (err) {
    console.error("[CF Pending Books Endpoint] Unhandled error:", err);
    return new Response(JSON.stringify({ 
      books: [], 
      error: err.message || "Internal server error fetching pending books." 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
