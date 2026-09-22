import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (context.request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  try {
    const supabaseUrl = context.env.VITE_SUPABASE_URL || context.env.SUPABASE_URL;
    const supabaseKey = context.env.VITE_SUPABASE_ANON_KEY || context.env.SUPABASE_ANON_KEY || context.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Supabase credentials are not configured in environment." }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse auth token
    const authHeader = context.request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    if (!token || token === "undefined" || token === "null") {
      return new Response(JSON.stringify({ error: "Unauthorized. Token missing." }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized. Invalid token." }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Parse body
    const body = await context.request.json().catch(() => ({}));
    const { type, subject, message } = body;

    if (!type || !subject || !message) {
      return new Response(JSON.stringify({ error: "Please fill in all fields." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log(`[CF Support] New request from ${user.email}: [${type}] ${subject}`);

    let supportData;
    let { data, error } = await supabase
      .from("support_requests")
      .insert({
        user_id: user.id,
        type: type || "General",
        subject,
        message,
        status: "pending",
      })
      .select()
      .maybeSingle();

    if (error) {
      const isColumnMissing = error.message?.includes('column "type" does not exist') || error.code === "42703";
      if (isColumnMissing) {
        const { data: fbData, error: fbErr } = await supabase
          .from("support_requests")
          .insert({
            user_id: user.id,
            subject,
            message: `[Type: ${type || "General"}] ${message}`,
            status: "pending",
          })
          .select()
          .maybeSingle();
        if (fbErr) throw fbErr;
        supportData = fbData;
      } else {
        throw error;
      }
    } else {
      supportData = data;
    }

    // Try sending admin notification email if Brevo API keys exist (Optional)
    const brevoApiKey = context.env.BREVO_API_KEY;
    const brevoSender = context.env.BREVO_SENDER || "noreply@calmreader.com";
    if (brevoApiKey) {
      try {
        await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "accept": "application/json",
            "api-key": brevoApiKey,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            sender: { email: brevoSender, name: "CalmReader System" },
            to: [{ email: "samuelchukwuemeke05@gmail.com" }],
            subject: `New Support Request: ${subject}`,
            textContent: `User ${user.email} submitted a ${type || "General"} request.\n\nSubject: ${subject}\nMessage: ${message}`
          })
        });
      } catch (mailErr) {
        console.error("[CF Support] Email notification failed:", mailErr);
      }
    }

    return new Response(JSON.stringify({ success: true, request: supportData }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (err) {
    console.error("[CF Support] Submission failed on overall exception:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to submit request" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
