export async function onRequest(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let dbStatus = "unknown";
  try {
    const env = context.env || {};
    const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      dbStatus = "configured";
    } else {
      dbStatus = "unconfigured";
    }
  } catch (e) {
    dbStatus = "error";
  }

  return new Response(JSON.stringify({
    status: "ok",
    db: dbStatus,
    timestamp: new Date().toISOString(),
    service: "Cloudflare Pages Functions"
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}
