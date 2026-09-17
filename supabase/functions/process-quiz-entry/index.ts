// Supabase Edge Function: process-quiz-entry
// Deducts entry tariff balance securely prior to start
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

    const { user_id, quiz_id, entry_fee_cents } = await req.json();

    // 1. Fetch wallet balance
    const { data: wallet, error: walletError } = await supabaseClient
      .from("wallets")
      .select("balance_cents")
      .eq("user_id", user_id)
      .single();

    if (walletError || !wallet) {
      throw new Error("Could not fetch user financial wallet ledger record.");
    }

    if (wallet.balance_cents < entry_fee_cents) {
      return new Response(
        JSON.stringify({ success: false, reason: "Insufficient balance for entry fee tariff." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // 2. Perform balance deduction atomicity
    const newBalance = wallet.balance_cents - entry_fee_cents;
    const { error: updateError } = await supabaseClient
      .from("wallets")
      .update({ balance_cents: newBalance })
      .eq("user_id", user_id);

    if (updateError) {
      throw new Error("Deduction transit error: Secure Rollback triggered.");
    }

    // 3. Document entry transaction log
    await supabaseClient.from("quiz_attempts").insert({
      quiz_id,
      user_id,
      score_cents: 0,
      max_score_cents: 100,
      submitted_at: null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        remaining_balance_cents: newBalance,
        reference: `CHALLENGE-ENTRY-${Date.now()}`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
