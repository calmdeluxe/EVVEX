// Cloudflare Pages serverless function to proxy requests to Supabase
export async function onRequest(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, apikey",
    "Access-Control-Max-Age": "86400",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const env = context.env || {};
    const configuredUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "https://wgdcroglmhzmrvqrixku.supabase.co";
    const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";

    const { url, method = "GET", headers = {}, body } = await context.request.json().catch(() => ({}));
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Target URL is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const targetHost = new URL(url).hostname;
    const configuredHost = new URL(configuredUrl).hostname;
    if (targetHost !== configuredHost) {
      return new Response(JSON.stringify({ error: "Access to non-configured Supabase project forbidden." }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const cleanHeaders = {};
    for (const [k, v] of Object.entries(headers)) {
      const lower = k.toLowerCase();
      if (lower !== "host" && lower !== "connection" && lower !== "content-length") {
        cleanHeaders[k] = String(v);
      }
    }

    if (!cleanHeaders["apikey"] && anonKey) {
      cleanHeaders["apikey"] = anonKey;
    }

    const fetchOptions = {
      method,
      headers: cleanHeaders
    };

    if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const responseText = await response.text();

    const responseHeaders = {};
    response.headers.forEach((val, key) => {
      responseHeaders[key] = val;
    });

    return new Response(JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseText
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Proxy request failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
