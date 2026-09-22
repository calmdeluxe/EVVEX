// Supabase Edge Function: disburse-reward
// Disburses bounties directly into wallets upon certified grade verification
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { user_id, attempt_id, score_pct, reward_cents } = await req.json();

    // 1. Verify grade satisfies reward thresholds
    if (score_pct < 60) {
      return new Response(
        JSON.stringify({ success: false, reason: "Grade fails to satisfy 60% passing criteria thresholds." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // 2. Fetch the corresponding Attempt details
    const { data: attempt, error: attemptError } = await supabaseClient
      .from("quiz_attempts")
      .select("*")
      .eq("id", attempt_id)
      .single();

    if (attemptError || !attempt) {
      throw new Error("Specified quiz attempt record does not exist.");
    }

    if (attempt.submitted_at) {
      return new Response(
        JSON.stringify({ success: false, reason: "Bounty has already been claimed for this session." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // 3. Increment wallet balance
    const { data: wallet, error: walletError } = await supabaseClient
      .from("wallets")
      .select("balance_cents")
      .eq("user_id", user_id)
      .single();

    if (walletError || !wallet) {
      throw new Error("Could not load user wallet record.");
    }

    const newBalanceCents = wallet.balance_cents + reward_cents;
    await supabaseClient
      .from("wallets")
      .update({ balance_cents: newBalanceCents })
      .eq("user_id", user_id);

    // 4. Close attempt session to prevent re-entrancy
    await supabaseClient
      .from("quiz_attempts")
      .update({ 
        score_cents: score_pct, 
        submitted_at: new Date().toISOString() 
      })
      .eq("id", attempt_id);

    return new Response(
      JSON.stringify({
        success: true,
        bounty_credited_cents: reward_cents,
        wallet_new_balance_cents: newBalanceCents,
        authorization_signature: `BOUNTY-RELEASE-${attempt_id}`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
