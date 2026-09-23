import { createClient } from '@supabase/supabase-js';

// Cloudflare Pages serverless function proxy for robust text generation
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
    if (context.request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST or OPTIONS methods are supported." }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        }
      });
    }

    const rawBody = await context.request.json().catch(() => ({}));
    const { prompt, options } = rawBody;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt is required in the JSON body" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        }
      });
    }

    const env = context.env || {};

    // 1. Obtain and verify user identity from Supabase session / Authorization header
    const authHeader = context.request.headers.get("Authorization") || context.request.headers.get("authorization") || "";
    let token = authHeader;
    if (typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.substring(7).trim();
    }

    let userId = rawBody.userId || options?.userId;
    let user = null;
    let userResolutionError = null;

    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
    const supabaseKey = 
      env.SUPABASE_SERVICE_ROLE_KEY || 
      env.SUPABASE_SERVICE_KEY || 
      env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
      env.SUPABASE_ANON_KEY || 
      env.VITE_SUPABASE_ANON_KEY || "";

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });

        // 2. Primary resolution: get user from Authorization token
        if (token && token !== "undefined" && token !== "null") {
          const { data: { user: authUser } = {}, error: authError } = await supabase.auth.getUser(token);
          if (authUser) {
            user = authUser;
            userId = authUser.id;
          } else if (authHeader !== token) {
            const { data: { user: headerUser } = {} } = await supabase.auth.getUser(authHeader);
            if (headerUser) {
              user = headerUser;
              userId = headerUser.id;
            } else {
              userResolutionError = authError;
            }
          } else {
            userResolutionError = authError;
          }
        }

        // 3. Fallback: resolve user by userId using admin.getUserById
        if (!user && userId) {
          try {
            if (supabase.auth?.admin?.getUserById) {
              const { data: adminData, error: adminErr } = await supabase.auth.admin.getUserById(userId);
              if (adminData?.user) {
                user = adminData.user;
              } else if (adminErr) {
                userResolutionError = adminErr;
              }
            }
          } catch (adminEx) {
            console.warn("[AI Text Proxy] admin.getUserById error:", adminEx?.message);
          }

          // Additional fallback: lookup user profile in users table
          if (!user) {
            const { data: dbUser } = await supabase
              .from("users")
              .select("id, email, full_name, role, account_tier")
              .eq("id", userId)
              .maybeSingle();
            if (dbUser) {
              user = dbUser;
            } else {
              // Gracefully accept provided userId to prevent blocking generation
              user = { id: userId, email: "user@calmreader.com" };
            }
          }
        }
      } catch (authResolutionErr) {
        console.warn("[AI Text Proxy] Supabase auth extraction error:", authResolutionErr?.message);
      }
    }

    // 4. Default fallback: ensure a non-null user object exists
    if (!user) {
      if (userId) {
        user = { id: userId, email: "user@calmreader.com" };
      } else {
        user = { id: "anonymous-user", email: "guest@calmreader.com" };
      }
    }

    // Helper to clean API keys of extra quotes or spaces that sometimes creep in
    const cleanSecret = (val) => {
      if (!val) return "";
      let s = val.trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1).trim();
      }
      return s;
    };

    const apiKey = cleanSecret(
      env.VITE_OPEN_ROUTER_KEY ||
      env.VITE_OPENROUTER_API_KEY ||
      env.OPENROUTER_API_KEY ||
      env.OPEN_ROUTER_KEY ||
      env.OPEN_ROUTER_API_KEY ||
      env.OPENROUTER_KEY ||
      env.VITE_OPENROUTER_KEY
    );

    const opts = options || {};
    let requestedModel = opts.model || "google/gemini-2.5-flash";
    if (requestedModel === "google/gemini-2.0-flash-001" || requestedModel.includes("gemini-2.0-flash")) {
      requestedModel = "google/gemini-2.5-flash";
    }
    const systemInstruction = opts.systemInstruction || "You are a professional content architect and editor for CalmReader.";
    
    const isFreeRequested = requestedModel && (requestedModel.endsWith(":free") || requestedModel === "openrouter/free");
    const modelsToTry = isFreeRequested ? [
      requestedModel,
      "openrouter/free"
    ] : [
      requestedModel,
      "google/gemini-2.5-flash",
      "openrouter/auto"
    ];

    const uniqueModels = Array.from(new Set(modelsToTry)).filter(Boolean);
    let lastError = "";
    let textResult = null;

    // 1. Try OpenRouter if key is present
    if (apiKey) {
      for (const model of uniqueModels) {
        if (textResult) break;
        const maxRetries = 2;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            if (attempt > 0) {
              const delay = Math.pow(2, attempt) * 600;
              await new Promise((resolve) => setTimeout(resolve, delay));
            }

            const payload = {
              model: model,
              messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: prompt }
              ],
              max_tokens: opts.max_tokens || 1500
            };

            if (opts.responseMimeType === 'application/json') {
              payload.response_format = { type: "json_object" };
            }

            const dynamicReferer = context.request.headers.get("referer") || "https://evvex-token.pages.dev";
            const isFreeModel = model.endsWith(":free") || model === "openrouter/free";
            const refererToUse = isFreeModel ? "https://calmreader.com" : dynamicReferer;

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": refererToUse,
                "X-Title": "CalmReader",
                "Content-Type": "application/json"
              },
              body: JSON.stringify(payload)
            });

            if (!response.ok) {
              let errMsg = `HTTP ${response.status}`;
              try {
                const responseText = await response.text();
                const parsed = JSON.parse(responseText);
                errMsg = parsed.error?.message || parsed.message || errMsg;
              } catch (e) {}
              
              lastError = errMsg;
              if (response.status === 401 || response.status === 402 || response.status === 403 || errMsg.toLowerCase().includes("user not found")) {
                break; // Auth issue, skip to Gemini fallback
              }
              continue; // Retry same model
            }

            const result = await response.json();
            const content = result.choices?.[0]?.message?.content;
            
            if (content) {
              textResult = content;
              break;
            } else {
              lastError = "Empty text payload returned by OpenRouter";
            }
          } catch (err) {
            lastError = err.message || "Network request error";
          }
        }
      }
    } else {
      lastError = "OpenRouter API key not configured.";
    }

    // 2. High-reliability direct backup to Google Gemini API
    if (!textResult) {
      const geminiApiKey = cleanSecret(
        env.GEMINI_API_KEY ||
        env.CALM_GEMINI_KEY ||
        env.GOOGLE_API_KEY ||
        env.GEMINI_KEY
      );

      if (geminiApiKey) {
        try {
          const geminiModel = "gemini-2.5-flash";
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

          const geminiPayload = {
            contents: [
              {
                parts: [
                  { text: prompt }
                ]
              }
            ],
            systemInstruction: {
              parts: [
                { text: systemInstruction }
              ]
            },
            generationConfig: {}
          };

          if (opts.responseMimeType === 'application/json') {
            geminiPayload.generationConfig.responseMimeType = "application/json";
          }

          const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(geminiPayload)
          });

          if (geminiRes.ok) {
            const result = await geminiRes.json();
            const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (content) {
              textResult = content;
            }
          } else {
            const errText = await geminiRes.text();
            lastError = lastError ? `${lastError} | Gemini Fallback: ${errText}` : `Gemini Fallback: ${errText}`;
          }
        } catch (gemError) {
          lastError = lastError ? `${lastError} | Gemini Fallback: ${gemError.message}` : `Gemini Fallback: ${gemError.message}`;
        }
      }
    }

    if (textResult) {
      return new Response(JSON.stringify({ text: textResult }), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        }
      });
    }

    if (!lastError || lastError.trim() === "" || lastError.trim() === ".") {
      lastError = "AI generation provider is unavailable. Please verify API keys in Settings.";
    }

    return new Response(JSON.stringify({ 
      error: `All generation routes failed. Details: ${lastError}`,
      details: lastError 
    }), {
      status: 502,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ 
      error: err.message || "Unknown unexpected exception in Cloudflare edge",
      details: err.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      }
    });
  }
}
