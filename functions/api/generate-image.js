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

    const rawBody = await context.request.json();
    const { prompt, width, height } = rawBody;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing 'prompt' parameter in request body." }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        }
      });
    }

    const w = width || 512;
    const h = height || 512;

    // Check if safety binding exists
    if (context.env && context.env.IMAGE_WORKER) {
      const binding = context.env.IMAGE_WORKER;
      
      // If bound as Cloudflare AI binding [ai] containing `.run()`
      if (typeof binding.run === "function") {
        try {
          const aiResponse = await binding.run(
            "@cf/stabilityai/stable-diffusion-xl-base-1.0",
            {
              prompt: prompt,
              height: h,
              width: w,
            }
          );
          
          if (aiResponse) {
            let imageBuffer;
            if (aiResponse instanceof Response) {
              imageBuffer = await aiResponse.arrayBuffer();
            } else if (aiResponse instanceof ReadableStream) {
              const res = new Response(aiResponse);
              imageBuffer = await res.arrayBuffer();
            } else if (aiResponse instanceof ArrayBuffer) {
              imageBuffer = aiResponse;
            } else if (aiResponse.image) {
              const base64Data = aiResponse.image;
              const binaryStr = atob(base64Data);
              const len = binaryStr.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
              imageBuffer = bytes.buffer;
            } else {
              const res = new Response(aiResponse);
              imageBuffer = await res.arrayBuffer();
            }

            return new Response(imageBuffer, {
              headers: {
                "Content-Type": "image/jpeg",
                ...corsHeaders,
              }
            });
          }
        } catch (aiErr) {
          console.error("[CF AI Binding Error] Failed during .run():", aiErr);
        }
      }

      // If bound as Cloudflare Service/Worker fetch binding containing `.fetch()`
      if (typeof binding.fetch === "function") {
        try {
          const response = await binding.fetch("https://anything", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ prompt, width, height })
          });

          if (response.ok) {
            const blob = await response.blob();
            return new Response(blob, {
              headers: {
                "Content-Type": "image/jpeg",
                ...corsHeaders,
              }
            });
          } else {
            const errorText = await response.text();
            console.error(`Bound Image Worker fetch failed: ${errorText}`);
          }
        } catch (fetchErr) {
          console.error("[CF Fetch Binding Error] Failed during .fetch():", fetchErr);
        }
      }
    }

    // High fidelity backup: Pollinations AI prompt generator
    console.log("[CF Image Generator] Running fallback generative engine...");
    const seed = Math.floor(Math.random() * 1000000);
    const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&enhance=true`;
    
    try {
      const response = await fetch(pollUrl);
      if (response.ok) {
        const imageBuffer = await response.arrayBuffer();
        return new Response(imageBuffer, {
          headers: {
            "Content-Type": "image/jpeg",
            ...corsHeaders,
          }
        });
      }
    } catch (pollErr) {
      console.error("[Pollinations Fallback Error] Network error:", pollErr);
    }

    return new Response(JSON.stringify({ 
      error: "IMAGE_WORKER binding failed to respond, and fallback engine was unreachable." 
    }), {
      status: 502,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Unknown error during edge image generation processing" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      }
    });
  }
}
