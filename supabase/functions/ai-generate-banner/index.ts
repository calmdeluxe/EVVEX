// Supabase Edge Function: ai-generate-banner
// Generates eBook and contest cover art assets recursively
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { title, genre } = await req.json();

    // In production, you would call @google/genai or Imagen models here to synthesize real graphics
    const syntheticCovers = [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600",
      "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=600",
      "https://images.unsplash.com/photo-1618005198143-e5283b519a7f?q=80&w=600"
    ];
    
    // Pick based on title hash for consistency
    const hash = Array.from(title || "").reduce((acc, char: any) => acc + char.charCodeAt(0), 0);
    const chosenCoverUrl = syntheticCovers[hash % syntheticCovers.length];

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: chosenCoverUrl,
        promptFormulated: `Professional publishing ebook cover for "${title}" inside genre "${genre}". Modern graphic vector elements with high-fidelity gradients, rich orange slate.`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
