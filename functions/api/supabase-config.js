// Cloudflare Pages serverless function to expose public Supabase configuration to frontend dynamically
export async function onRequest(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };

  // Handle CORS preflight
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const env = context.env || {};
    
    // Extract credentials robustly from environment variables
    const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
    const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";

    return new Response(JSON.stringify({ url, key }), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      }
    });
  }
}
