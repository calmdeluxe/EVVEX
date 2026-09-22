export async function onRequest(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(context.request.url);
  const acceptHeader = context.request.headers.get("accept") || "";
  const authHeader = context.request.headers.get("authorization") || "";
  const isAjax = context.request.headers.get("x-requested-with") === "XMLHttpRequest" || acceptHeader.includes("application/json");

  // If accessed directly in a browser accepting text/html without authorization or AJAX headers
  if (acceptHeader.includes("text/html") && !isAjax && !authHeader) {
    return Response.redirect(new URL("/login", context.request.url), 302);
  }

  // Return a clean JSON response for unmapped API endpoints instead of HTML
  return new Response(JSON.stringify({
    status: "ok",
    message: "CalmReader API route active",
    path: url.pathname,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}
