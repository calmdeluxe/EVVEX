import { createClient } from '@supabase/supabase-js';

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
    }
  });
}

// Support both onRequestPost and generic onRequest for maximum compatibility
export async function onRequestPost(context) {
  return handleGenerate(context);
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return onRequestOptions();
  }
  if (context.request.method === "POST") {
    return handleGenerate(context);
  }
  return new Response(JSON.stringify({ error: "Only POST or OPTIONS methods are supported." }), {
    status: 405,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    }
  });
}

async function handleGenerate(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  };

  try {
    const env = context.env || {};
    
    // Helper to clean API keys of extra quotes or spaces
    const cleanSecret = (val) => {
      if (!val) return "";
      let s = val.trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1).trim();
      }
      return s;
    };

    const apiKey = cleanSecret(
      env.OPENROUTER_API_KEY ||
      env.VITE_OPEN_ROUTER_KEY ||
      env.VITE_OPENROUTER_API_KEY ||
      env.OPEN_ROUTER_KEY ||
      env.OPEN_ROUTER_API_KEY ||
      env.OPENROUTER_KEY ||
      env.VITE_OPENROUTER_KEY
    );

    const geminiApiKey = cleanSecret(
      env.GEMINI_API_KEY ||
      env.CALM_GEMINI_KEY ||
      env.GOOGLE_API_KEY ||
      env.GEMINI_KEY
    );

    if (!apiKey && !geminiApiKey) {
      return new Response(JSON.stringify({ 
        error: "No AI provider key (Gemini or OpenRouter) configured in Cloudflare environment.",
        details: "Missing API keys in environment secrets."
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const body = await context.request.json().catch(() => ({}));

    // 1. Obtain and verify user identity from Supabase session / Authorization header
    const authHeader = context.request.headers.get("Authorization") || context.request.headers.get("authorization") || "";
    let token = authHeader;
    if (typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.substring(7).trim();
    }

    let userId = body.userId || body.options?.userId;
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
            // Also try passing full authorization header
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

        // 3. Fallback: If that fails, resolve user by userId using admin.getUserById
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
            console.warn("[AI Proxy] admin.getUserById error:", adminEx?.message);
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
        console.warn("[AI Proxy] Supabase auth extraction error:", authResolutionErr?.message);
      }
    }

    // 4. Default fallback: if still not resolved, ensure a non-null user object exists
    if (!user) {
      if (userId) {
        user = { id: userId, email: "user@calmreader.com" };
      } else {
        user = { id: "anonymous-user", email: "guest@calmreader.com" };
      }
    }
    
    // Check if the input is a direct chat completions message payload or a custom prompt payload
    const isDirectChat = body.messages !== undefined;

    let payload;
    let isJsonFormatRequested = false;

    if (isDirectChat) {
      payload = {
        model: body.model || "google/gemini-2.5-flash",
        messages: body.messages,
        temperature: body.temperature !== undefined ? body.temperature : 0.7,
        max_tokens: body.max_tokens || 1500
      };
      if (body.responseMimeType === 'application/json' || body.response_format?.type === 'json_object') {
        payload.response_format = { type: "json_object", heal: true };
        isJsonFormatRequested = true;
      }
    } else {
      // Custom prompt format (e.g. prompt, options)
      const prompt = body.prompt;
      if (!prompt) {
        return new Response(JSON.stringify({ error: "prompt or messages is required in the JSON body" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const opts = body.options || {};
      let model = opts.model || "google/gemini-2.5-flash";
      if (model === "google/gemini-2.0-flash-001" || model.includes("gemini-2.0-flash")) {
        model = "google/gemini-2.5-flash";
      }
      const systemInstruction = opts.systemInstruction || "You are a professional content architect and editor for CalmReader.";
      
      payload = {
        model: model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        max_tokens: opts.max_tokens || 1500,
        temperature: opts.temperature !== undefined ? opts.temperature : 0.7
      };

      if (opts.responseMimeType === 'application/json') {
        payload.response_format = { type: "json_object", heal: true };
        isJsonFormatRequested = true;
      }
    }

    // Attempt calling OpenRouter with retries
    const dynamicReferer = context.request.headers.get("referer") || "https://evvex-token.pages.dev";
    let textResult = null;
    let fullResponseData = null;
    let lastError = "";

    const isFreeRequested = payload.model && (payload.model.endsWith(":free") || payload.model === "openrouter/free");
    const modelsToTry = isFreeRequested ? [
      payload.model,
      "openrouter/free"
    ].filter(Boolean) : [
      payload.model,
      "google/gemini-2.5-flash",
      "openrouter/auto"
    ].filter(Boolean);
    const uniqueModels = Array.from(new Set(modelsToTry));

    let hasFatalOpenRouterError = false;
    if (apiKey) {
      for (const currentModel of uniqueModels) {
        if (textResult || fullResponseData || hasFatalOpenRouterError) break;
        const maxRetries = 2;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            if (attempt > 0) {
              await new Promise((resolve) => setTimeout(resolve, attempt * 500));
            }

            const currentPayload = { ...payload, model: currentModel };
            const isFreeModel = currentModel.endsWith(":free") || currentModel === "openrouter/free";
            const refererToUse = isFreeModel ? "https://calmreader.com" : dynamicReferer;

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": refererToUse,
                "X-Title": "CalmReader",
                "Content-Type": "application/json"
              },
              body: JSON.stringify(currentPayload)
            });

            if (!response.ok) {
              let errMsg = `HTTP ${response.status}`;
              try {
                const text = await response.text();
                const parsed = JSON.parse(text);
                errMsg = parsed.error?.message || parsed.message || errMsg;
              } catch (e) {}

              lastError = errMsg;

              if (response.status === 401 || response.status === 402 || response.status === 403 || errMsg.toLowerCase().includes("user not found")) {
                hasFatalOpenRouterError = true;
                break;
              }

              continue;
            }

            const data = await response.json();
            if (isDirectChat) {
              // Return full standard OpenRouter response for direct calls
              fullResponseData = data;
              break;
            } else {
              const content = data.choices?.[0]?.message?.content;
              if (content) {
                textResult = content;
                break;
              } else {
                lastError = "Empty text payload returned by OpenRouter";
              }
            }
          } catch (err) {
            lastError = err.message || "Network request error";
          }
        }
      }
    } else {
      lastError = "OpenRouter API key not configured.";
    }

    if (fullResponseData) {
      return new Response(JSON.stringify(fullResponseData), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (textResult) {
      return new Response(JSON.stringify({ text: textResult }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Direct resilient backup to Google Gemini API
    if (geminiApiKey) {
      try {
        const geminiModel = "gemini-2.5-flash";
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

        // Prepare context
        let systemText = "You are a professional content architect and editor for CalmReader.";
        let userPromptText = "";

        if (isDirectChat) {
          userPromptText = payload.messages.map(m => `[${m.role}]: ${m.content}`).join("\n");
        } else {
          systemText = payload.messages[0].content;
          userPromptText = payload.messages[1].content;
        }

        const geminiPayload = {
          contents: [
            {
              parts: [
                { text: userPromptText }
              ]
            }
          ],
          systemInstruction: {
            parts: [
              { text: systemText }
            ]
          },
          generationConfig: {}
        };

        if (isJsonFormatRequested) {
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
            if (isDirectChat) {
              return new Response(JSON.stringify({
                id: `gemini-${Date.now()}`,
                object: "chat.completion",
                created: Math.floor(Date.now() / 1000),
                model: "google/gemini-2.5-flash",
                choices: [
                  {
                    message: {
                      role: "assistant",
                      content: content
                    },
                    finish_reason: "stop",
                    index: 0
                  }
                ]
              }), {
                headers: { "Content-Type": "application/json", ...corsHeaders }
              });
            } else {
              return new Response(JSON.stringify({ text: content }), {
                headers: { "Content-Type": "application/json", ...corsHeaders }
              });
            }
          }
        } else {
          const errText = await geminiRes.text();
          lastError += ` | Gemini Fallback error: ${errText}`;
        }
      } catch (gemError) {
        lastError += ` | Gemini Fallback exception: ${gemError.message}`;
      }
    }

    if (!lastError || lastError.trim() === "" || lastError.trim() === ".") {
      lastError = "AI generation provider is unavailable. Please verify your API keys in Settings.";
    }

    return new Response(JSON.stringify({ 
      error: `All generation routes failed. Details: ${lastError}`,
      details: lastError
    }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (err) {
    return new Response(JSON.stringify({ 
      error: err.message || "Unknown unexpected exception in Cloudflare edge",
      details: err.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
