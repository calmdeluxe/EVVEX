import { Router } from "express";

/**
 * Publishing System & Campaign Contracts Routes
 * Implements IPC vs FC publishing, MPR referral validation, 
 * Campaign Contracts (7-day dispute holdback, ₦2,000-₦50,000 fee, 10% platform fee),
 * and FC -> IPC conversion flows.
 */

// In-memory fallback cache for campaign contracts and conversions if DB migration is pending
const fallbackCampaignContracts: any[] = [];
const fallbackIpcApplications: any[] = [];

export function setupPublishingRoutes(app: any, getSupabase: () => any, getSupabaseAdmin: () => any, authenticateUser: any, authenticateAdmin: any) {
  const router = Router();

  // 1. VALIDATE MPR REFERRAL CODE (Anti-Fraud: Check tier, active status, and prevent self-referral)
  router.get("/api/mpr/validate-code/:code", async (req: any, res: any) => {
    try {
      const code = (req.params.code || "").trim();
      const authorId = req.query.authorId;
      const authorEmail = (req.query.authorEmail || "").toLowerCase().trim();

      if (!code) {
        return res.status(400).json({ valid: false, error: "MPR referral code is required." });
      }

      const supabase = getSupabaseAdmin() || getSupabase();

      // Look up user by referral_code, username, or id prefix
      let mprUser: any = null;

      // Try exact referral_code first
      const { data: byCode } = await supabase
        .from("users")
        .select("id, email, full_name, username, account_tier, role, is_suspended")
        .eq("referral_code", code)
        .maybeSingle();

      if (byCode) {
        mprUser = byCode;
      } else {
        // Try looking up by username or id prefix (e.g. MPR-ABC123 or ABC123)
        const cleanCode = code.replace(/^mpr[-_]/i, "");
        const { data: byUsername } = await supabase
          .from("users")
          .select("id, email, full_name, username, account_tier, role, is_suspended")
          .or(`username.ilike.${code},username.ilike.${cleanCode},id.ilike.${cleanCode}%`)
          .limit(1)
          .maybeSingle();

        if (byUsername) {
          mprUser = byUsername;
        }
      }

      if (!mprUser) {
        return res.status(404).json({
          valid: false,
          error: `Referral code "${code}" not found. Please verify the code with your Marketing Partner.`
        });
      }

      // Check suspension
      if (mprUser.is_suspended === true || mprUser.is_suspended === 1) {
        return res.status(400).json({
          valid: false,
          error: "This Marketing Partner account is currently suspended."
        });
      }

      // Check MPR tier or role
      const isMpr = 
        mprUser.account_tier === "mpr" || 
        mprUser.role === "mpr" || 
        mprUser.account_tier === "author" || // Authors can also be partner advocates
        mprUser.role === "admin";

      if (!isMpr) {
        return res.status(400).json({
          valid: false,
          error: "This referral code does not belong to an active Marketing Partner (MPR)."
        });
      }

      // Anti-fraud: prevent self-referral
      if (authorId && mprUser.id === authorId) {
        return res.status(400).json({
          valid: false,
          error: "Self-referral violation: You cannot enter your own referral code."
        });
      }

      if (authorEmail && mprUser.email?.toLowerCase() === authorEmail) {
        return res.status(400).json({
          valid: false,
          error: "Self-referral violation: You cannot use your own account email as an MPR referral."
        });
      }

      return res.json({
        valid: true,
        mpr: {
          id: mprUser.id,
          full_name: mprUser.full_name || mprUser.username || "Verified Partner",
          username: mprUser.username || mprUser.email?.split("@")[0],
          referral_code: code
        },
        message: `Verified Marketing Partner: ${mprUser.full_name || mprUser.username || "Partner"}`
      });
    } catch (err: any) {
      console.error("[MPR Validate Error]", err);
      res.status(500).json({ valid: false, error: err.message || "Failed to validate code." });
    }
  });

  // 2. CAMPAIGN CONTRACTS: CREATE
  router.post("/api/campaigns/create", authenticateUser, async (req: any, res: any) => {
    try {
      const { bookId, mprId, campaignFee, targetClicks, targetReads, targetSales } = req.body;
      const authorId = req.profile?.id || req.user?.id;

      if (!bookId) {
        return res.status(400).json({ error: "Please select an eBook for this campaign." });
      }

      const fee = parseInt(campaignFee);
      if (isNaN(fee) || fee < 2000 || fee > 50000) {
        return res.status(400).json({ 
          error: "Campaign fee must be between ₦2,000 and ₦50,000 as per platform policy." 
        });
      }

      if (mprId && mprId === authorId) {
        return res.status(400).json({ 
          error: "Anti-fraud violation: You cannot contract yourself for a promotional campaign." 
        });
      }

      const platformFee = Math.round(fee * 0.10); // 10% platform fee
      const mprPayout = fee - platformFee;       // 90% MPR payout

      const successMetrics = {
        target_clicks: parseInt(targetClicks) || 500,
        target_reads: parseInt(targetReads) || 100,
        target_sales: parseInt(targetSales) || 20,
        current_clicks: 0,
        current_reads: 0,
        current_sales: 0
      };

      const supabase = getSupabaseAdmin() || getSupabase();

      const contractPayload = {
        author_id: authorId,
        mpr_id: mprId || null,
        book_id: bookId,
        campaign_fee: fee,
        platform_fee: platformFee,
        mpr_payout: mprPayout,
        status: "pending",
        success_metrics: successMetrics,
        author_signature: true,
        mpr_signature: false
      };

      let createdContract = null;

      try {
        const { data, error } = await supabase
          .from("campaign_contracts")
          .insert(contractPayload)
          .select("*")
          .single();

        if (error) throw error;
        createdContract = data;
      } catch (dbErr: any) {
        console.warn("[Campaign DB Warning] Using fallback storage for campaign contract:", dbErr.message);
        // Fallback resilient storage
        createdContract = {
          id: `contract_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          ...contractPayload,
          created_at: new Date().toISOString()
        };
        fallbackCampaignContracts.unshift(createdContract);
      }

      res.status(201).json({
        success: true,
        contract: createdContract,
        message: "Campaign contract draft created. Please proceed to fund the contract (funds held securely for 7-day dispute window)."
      });
    } catch (err: any) {
      console.error("[Campaign Create Error]", err);
      res.status(500).json({ error: err.message || "Failed to create campaign contract." });
    }
  });

  // 3. CAMPAIGN CONTRACTS: FUND (Author pays into platform hold)
  router.post("/api/campaigns/fund", authenticateUser, async (req: any, res: any) => {
    try {
      const { contractId, reference } = req.body;
      const authorId = req.profile?.id || req.user?.id;

      if (!contractId) {
        return res.status(400).json({ error: "Contract ID is required." });
      }

      const supabase = getSupabaseAdmin() || getSupabase();

      try {
        const { data, error } = await supabase
          .from("campaign_contracts")
          .update({
            status: "active",
            payment_reference: reference || `REF_${Date.now()}`,
            started_at: new Date().toISOString()
          })
          .eq("id", contractId)
          .select("*")
          .single();

        if (error) throw error;
        return res.json({ success: true, contract: data });
      } catch (dbErr: any) {
        const fallback = fallbackCampaignContracts.find(c => c.id === contractId);
        if (fallback) {
          fallback.status = "active";
          fallback.payment_reference = reference || `REF_${Date.now()}`;
          fallback.started_at = new Date().toISOString();
          return res.json({ success: true, contract: fallback });
        }
        return res.status(404).json({ error: "Campaign contract not found." });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. CAMPAIGN CONTRACTS: SIGN (MPR signs contract)
  router.post("/api/campaigns/sign", authenticateUser, async (req: any, res: any) => {
    try {
      const { contractId } = req.body;
      const userId = req.profile?.id || req.user?.id;

      const supabase = getSupabaseAdmin() || getSupabase();

      try {
        const { data: contract } = await supabase
          .from("campaign_contracts")
          .select("*")
          .eq("id", contractId)
          .single();

        if (!contract) throw new Error("Contract not found.");

        const updates: any = {};
        if (contract.mpr_id === userId || !contract.mpr_id) {
          updates.mpr_id = userId;
          updates.mpr_signature = true;
          if (contract.status === "funded" || contract.status === "pending") {
            updates.status = "active";
            updates.started_at = new Date().toISOString();
          }
        } else if (contract.author_id === userId) {
          updates.author_signature = true;
        }

        const { data: updated, error } = await supabase
          .from("campaign_contracts")
          .update(updates)
          .eq("id", contractId)
          .select("*")
          .single();

        if (error) throw error;
        return res.json({ success: true, contract: updated });
      } catch (dbErr: any) {
        const fallback = fallbackCampaignContracts.find(c => c.id === contractId);
        if (fallback) {
          fallback.mpr_signature = true;
          fallback.mpr_id = userId;
          fallback.status = "active";
          fallback.started_at = new Date().toISOString();
          return res.json({ success: true, contract: fallback });
        }
        return res.status(404).json({ error: "Campaign contract not found." });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. CAMPAIGN CONTRACTS: COMPLETE (MPR marks campaign complete -> triggers 7-day holdback)
  router.post("/api/campaigns/complete", authenticateUser, async (req: any, res: any) => {
    try {
      const { contractId } = req.body;
      const userId = req.profile?.id || req.user?.id;

      const completedAt = new Date();
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() + 7); // 7-day dispute window holdback

      const supabase = getSupabaseAdmin() || getSupabase();

      try {
        const { data, error } = await supabase
          .from("campaign_contracts")
          .update({
            status: "completed",
            completed_at: completedAt.toISOString(),
            payout_release_date: releaseDate.toISOString()
          })
          .eq("id", contractId)
          .select("*")
          .single();

        if (error) throw error;
        return res.json({
          success: true,
          contract: data,
          message: "Campaign marked as completed. Funds will be held for the 7-day dispute period before payout release."
        });
      } catch (dbErr: any) {
        const fallback = fallbackCampaignContracts.find(c => c.id === contractId);
        if (fallback) {
          fallback.status = "completed";
          fallback.completed_at = completedAt.toISOString();
          fallback.payout_release_date = releaseDate.toISOString();
          return res.json({ success: true, contract: fallback });
        }
        return res.status(404).json({ error: "Campaign contract not found." });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. CAMPAIGN CONTRACTS: DISPUTE (Author or MPR flags issue during 7-day holdback)
  router.post("/api/campaigns/dispute", authenticateUser, async (req: any, res: any) => {
    try {
      const { contractId, disputeReason } = req.body;
      if (!disputeReason) {
        return res.status(400).json({ error: "Please explain the reason for the dispute." });
      }

      const supabase = getSupabaseAdmin() || getSupabase();

      try {
        const { data, error } = await supabase
          .from("campaign_contracts")
          .update({
            status: "disputed",
            dispute_reason: disputeReason,
            dispute_opened_at: new Date().toISOString()
          })
          .eq("id", contractId)
          .select("*")
          .single();

        if (error) throw error;
        return res.json({
          success: true,
          contract: data,
          message: "Dispute recorded. Our admin team will arbitrate within 48 hours."
        });
      } catch (dbErr: any) {
        const fallback = fallbackCampaignContracts.find(c => c.id === contractId);
        if (fallback) {
          fallback.status = "disputed";
          fallback.dispute_reason = disputeReason;
          fallback.dispute_opened_at = new Date().toISOString();
          return res.json({ success: true, contract: fallback });
        }
        return res.status(404).json({ error: "Campaign contract not found." });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. CAMPAIGN CONTRACTS: GET USER'S CONTRACTS (Author or MPR)
  router.get("/api/campaigns/my-contracts", authenticateUser, async (req: any, res: any) => {
    try {
      const userId = req.profile?.id || req.user?.id;
      const supabase = getSupabaseAdmin() || getSupabase();

      let contracts: any[] = [];

      try {
        const { data, error } = await supabase
          .from("campaign_contracts")
          .select(`
            *,
            book:books(id, title, cover_image, price, content_type),
            author:author_id(id, full_name, email, username),
            mpr:mpr_id(id, full_name, email, username)
          `)
          .or(`author_id.eq.${userId},mpr_id.eq.${userId}`)
          .order("created_at", { ascending: false });

        if (!error && data) {
          contracts = data;
        }
      } catch (dbErr: any) {
        console.warn("[Campaigns API] Using in-memory fallback list:", dbErr.message);
      }

      // Merge fallback
      const userFallbacks = fallbackCampaignContracts.filter(c => c.author_id === userId || c.mpr_id === userId);
      const combined = [...contracts, ...userFallbacks];

      res.json({ contracts: combined });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. ADMIN: LIST ALL CAMPAIGN CONTRACTS
  router.get("/api/admin/campaign-contracts", authenticateAdmin, async (req: any, res: any) => {
    try {
      const supabase = getSupabaseAdmin() || getSupabase();
      let contracts: any[] = [];

      try {
        const { data, error } = await supabase
          .from("campaign_contracts")
          .select(`
            *,
            book:books(id, title, cover_image),
            author:author_id(id, full_name, email),
            mpr:mpr_id(id, full_name, email)
          `)
          .order("created_at", { ascending: false });

        if (!error && data) {
          contracts = data;
        }
      } catch (dbErr) {
        // Fallback
      }

      const combined = [...contracts, ...fallbackCampaignContracts];
      res.json({ contracts: combined });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. ADMIN: RELEASE CAMPAIGN PAYOUT (After 7 days or dispute resolution)
  router.post("/api/admin/campaign-contracts/:id/release-payout", authenticateAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseAdmin() || getSupabase();

      let contract: any = null;
      try {
        const { data } = await supabase.from("campaign_contracts").select("*").eq("id", id).single();
        contract = data;
      } catch (e) {
        contract = fallbackCampaignContracts.find(c => c.id === id);
      }

      if (!contract) {
        return res.status(404).json({ error: "Contract not found." });
      }

      if (!contract.mpr_id) {
        return res.status(400).json({ error: "No MPR assigned to this contract." });
      }

      // Credit MPR Wallet
      const payoutAmount = contract.mpr_payout || Math.round(contract.campaign_fee * 0.90);
      try {
        await supabase.rpc("increment_user_balance", {
          p_user_id: contract.mpr_id,
          p_wallet_delta: payoutAmount,
          p_total_earned_delta: payoutAmount
        });

        await supabase.from("transactions").insert({
          user_id: contract.mpr_id,
          type: "campaign_payout",
          amount: payoutAmount,
          status: "completed",
          book_id: contract.book_id
        });
      } catch (txErr: any) {
        console.warn("[Campaign Payout TX] Increment balance warning:", txErr.message);
      }

      // Mark contract settled
      try {
        await supabase
          .from("campaign_contracts")
          .update({ status: "settled", completed_at: new Date().toISOString() })
          .eq("id", id);
      } catch (e) {
        if (contract) contract.status = "settled";
      }

      res.json({
        success: true,
        message: `Successfully released ₦${payoutAmount.toLocaleString()} to MPR (Platform fee 10% retained).`
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10. FC -> IPC CONVERSION APPLICATION
  router.post("/api/books/:id/apply-ipc", authenticateUser, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { rightsDeclared, exclusivityAccepted } = req.body;
      const userId = req.profile?.id || req.user?.id;

      if (!rightsDeclared || !exclusivityAccepted) {
        return res.status(400).json({
          error: "To qualify for IPC conversion, you must declare full copyright ownership and agree to the 12-month platform exclusivity."
        });
      }

      const supabase = getSupabaseAdmin() || getSupabase();

      // Check book ownership & word count or sales
      const { data: book, error: bErr } = await supabase
        .from("books")
        .select("id, title, user_id, cards_json, content_type, word_count")
        .eq("id", id)
        .single();

      if (bErr || !book) {
        return res.status(404).json({ error: "Book not found." });
      }

      if (book.user_id !== userId && !req.isAdmin) {
        return res.status(403).json({ error: "Unauthorized: You are not the author of this book." });
      }

      // Calculate word count from cards
      let computedWordCount = book.word_count || 0;
      if (Array.isArray(book.cards_json) && book.cards_json.length > 0) {
        computedWordCount = book.cards_json.reduce((sum: number, c: any) => {
          const text = [c.title, c.text, c.chapter].filter(Boolean).join(" ");
          return sum + (text.trim() ? text.trim().split(/\s+/).length : 0);
        }, 0);
      }

      // Check sales count
      const { count: salesCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("book_id", id)
        .eq("status", "successful")
        .eq("type", "purchase");

      const hasReachedSalesThreshold = (salesCount || 0) >= 100;
      const hasReachedWordThreshold = computedWordCount >= 30000;

      // Update book status
      const updateData = {
        ipc_conversion_status: "pending",
        ipc_applied_at: new Date().toISOString(),
        rights_declared: true,
        exclusivity_declared: true,
        word_count: computedWordCount
      };

      try {
        await supabase.from("books").update(updateData).eq("id", id);
      } catch (upErr: any) {
        console.warn("[IPC Conversion Apply] Optional columns update warning:", upErr.message);
      }

      fallbackIpcApplications.unshift({
        book_id: id,
        title: book.title,
        user_id: book.user_id,
        sales_count: salesCount || 0,
        word_count: computedWordCount,
        has_sales_qualifier: hasReachedSalesThreshold,
        has_words_qualifier: hasReachedWordThreshold,
        applied_at: new Date().toISOString()
      });

      res.json({
        success: true,
        message: "Your application for IPC (Independent Premium Content - 70% Royalties) has been submitted for editorial review.",
        metrics: {
          word_count: computedWordCount,
          sales_count: salesCount || 0,
          qualifies: hasReachedSalesThreshold || hasReachedWordThreshold
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 11. ADMIN: LIST IPC APPLICATIONS & QUALITY CONTROL
  router.get("/api/admin/ipc-applications", authenticateAdmin, async (req: any, res: any) => {
    try {
      const supabase = getSupabaseAdmin() || getSupabase();
      let books: any[] = [];

      try {
        const { data, error } = await supabase
          .from("books")
          .select(`
            id, title, public_slug, price, content_type, word_count, author_share, platform_share,
            mpr_share, exclusivity_end_date, rights_declared, exclusivity_declared,
            ipc_conversion_status, ipc_applied_at, created_at, user_id,
            user:user_id(id, full_name, email, username)
          `)
          .or("ipc_conversion_status.eq.pending,content_type.eq.ipc")
          .order("created_at", { ascending: false });

        if (!error && data) {
          books = data;
        }
      } catch (dbErr) {
        // Fallback
      }

      res.json({ applications: books, fallbacks: fallbackIpcApplications });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 12. ADMIN: REVIEW IPC APPLICATION (Approve or Reject)
  router.post("/api/admin/books/:id/review-ipc", authenticateAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { action, adminNote } = req.body; // action: 'approve' | 'reject'

      if (action !== "approve" && action !== "reject") {
        return res.status(400).json({ error: "Action must be 'approve' or 'reject'." });
      }

      const supabase = getSupabaseAdmin() || getSupabase();

      if (action === "approve") {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        const { data, error } = await supabase
          .from("books")
          .update({
            content_type: "ipc",
            author_share: 70,
            platform_share: 30,
            mpr_share: 0,
            ipc_conversion_status: "approved",
            ipc_approved_at: new Date().toISOString(),
            exclusivity_end_date: oneYearFromNow.toISOString(),
            rights_declared: true,
            exclusivity_declared: true,
            admin_note: adminNote ? `IPC Approved: ${adminNote}` : "IPC Approved by Admin"
          })
          .eq("id", id)
          .select("*")
          .single();

        if (error) throw error;
        return res.json({
          success: true,
          message: "Book successfully converted to IPC! Future sales will allocate 70% to the author and 30% to the platform.",
          book: data
        });
      } else {
        const { data, error } = await supabase
          .from("books")
          .update({
            ipc_conversion_status: "rejected",
            admin_note: adminNote ? `IPC Rejected: ${adminNote}` : "IPC Rejected by Admin"
          })
          .eq("id", id)
          .select("*")
          .single();

        if (error) throw error;
        return res.json({
          success: true,
          message: "IPC application was rejected.",
          book: data
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 13. MPR BOUNDARIES: GET CURRENT MPR & 6-MONTH SWITCH STATUS
  router.get("/api/mpr/my-mpr", authenticateUser, async (req: any, res: any) => {
    try {
      const authorId = req.profile?.id || req.user?.id;
      const supabase = getSupabaseAdmin() || getSupabase();

      const { data: user, error: uErr } = await supabase
        .from("users")
        .select("id, email, referred_by_mpr, mpr_assigned_at, mpr_referral_locked, mpr_last_switch_at")
        .eq("id", authorId)
        .single();

      if (uErr || !user) {
        return res.status(404).json({ error: "User not found." });
      }

      if (!user.referred_by_mpr) {
        return res.json({
          hasMpr: false,
          canSwitch: true,
          message: "You are not currently linked to any Marketing Partner. You may enter an MPR referral code when launching your work."
        });
      }

      // Fetch MPR profile details
      const { data: mprUser } = await supabase
        .from("users")
        .select("id, full_name, username, email, referral_code")
        .eq("id", user.referred_by_mpr)
        .maybeSingle();

      const assignedAt = new Date(user.mpr_last_switch_at || user.mpr_assigned_at || Date.now());
      const now = new Date();
      const diffMs = now.getTime() - assignedAt.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const canSwitch = diffDays >= 180; // 6 months = 180 days
      const daysRemaining = Math.max(0, 180 - diffDays);

      res.json({
        hasMpr: true,
        mpr: {
          id: mprUser?.id || user.referred_by_mpr,
          name: mprUser?.full_name || mprUser?.username || "Assigned Partner",
          username: mprUser?.username,
          referral_code: mprUser?.referral_code
        },
        assignedAt: assignedAt.toISOString(),
        daysAssigned: diffDays,
        canSwitch,
        daysRemaining,
        locked: !!user.mpr_referral_locked,
        terms: "CalmReader policy allows authors to reassign their Marketing Partner after 6 months (180 days) of active partnership to maintain healthy creator autonomy."
      });
    } catch (err: any) {
      console.error("[My MPR Error]", err);
      res.status(500).json({ error: err.message || "Failed to fetch partner info." });
    }
  });

  // 14. MPR BOUNDARIES: SWITCH OR UNLINK MPR (Subject to 6-Month Rule)
  router.post("/api/mpr/switch", authenticateUser, async (req: any, res: any) => {
    try {
      const authorId = req.profile?.id || req.user?.id;
      const { newMprCode, action } = req.body; // action: 'switch' | 'unlink'
      const supabase = getSupabaseAdmin() || getSupabase();

      const { data: user, error: uErr } = await supabase
        .from("users")
        .select("id, email, referred_by_mpr, mpr_assigned_at, mpr_referral_locked, mpr_last_switch_at")
        .eq("id", authorId)
        .single();

      if (uErr || !user) {
        return res.status(404).json({ error: "User not found." });
      }

      if (!user.referred_by_mpr) {
        return res.status(400).json({ error: "You do not have an active MPR assigned." });
      }

      // Check 180-day rule
      const assignedAt = new Date(user.mpr_last_switch_at || user.mpr_assigned_at || Date.now());
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - assignedAt.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 180 && !req.isAdmin) {
        return res.status(403).json({
          error: `MPR Switch Boundary: You must complete 6 months (180 days) with your current partner before switching. ${180 - diffDays} days remaining.`
        });
      }

      if (action === "unlink") {
        await supabase
          .from("users")
          .update({
            referred_by_mpr: null,
            mpr_assigned_at: null,
            mpr_referral_locked: false,
            mpr_last_switch_at: new Date().toISOString()
          })
          .eq("id", authorId);

        return res.json({
          success: true,
          message: "Successfully unlinked from your Marketing Partner. You may assign a new partner anytime."
        });
      }

      // New code validation
      if (!newMprCode || !newMprCode.trim()) {
        return res.status(400).json({ error: "Please provide the new Marketing Partner's referral code." });
      }

      const cleanCode = newMprCode.trim();
      const { data: newMpr } = await supabase
        .from("users")
        .select("id, email, full_name, username, account_tier, role, is_suspended")
        .or(`referral_code.eq.${cleanCode},username.ilike.${cleanCode}`)
        .limit(1)
        .maybeSingle();

      if (!newMpr) {
        return res.status(404).json({ error: `Marketing Partner with code "${cleanCode}" not found.` });
      }

      if (newMpr.id === authorId || newMpr.email === user.email) {
        return res.status(400).json({ error: "Self-referral violation: You cannot assign yourself as your MPR." });
      }

      if (newMpr.is_suspended) {
        return res.status(400).json({ error: "This Marketing Partner account is currently suspended." });
      }

      // Update to new MPR
      await supabase
        .from("users")
        .update({
          referred_by_mpr: newMpr.id,
          mpr_assigned_at: new Date().toISOString(),
          mpr_last_switch_at: new Date().toISOString(),
          mpr_referral_locked: true
        })
        .eq("id", authorId);

      res.json({
        success: true,
        message: `Successfully switched your Marketing Partner to ${newMpr.full_name || newMpr.username}. The new 6-month partnership period has started.`,
        partner: {
          id: newMpr.id,
          name: newMpr.full_name || newMpr.username
        }
      });
    } catch (err: any) {
      console.error("[MPR Switch Error]", err);
      res.status(500).json({ error: err.message || "Failed to switch Marketing Partner." });
    }
  });

  // 15. LIVE REVENUE & NET SPLIT CALCULATOR
  router.post("/api/publishing/calculate-split", (req: any, res: any) => {
    try {
      const { price, lane, hasMpr } = req.body;
      const gross = Math.max(0, parseInt(price) || 0);

      // Domestic Paystack fee calculation
      let processingFee = gross * 0.015;
      if (gross >= 2500) processingFee += 100;
      processingFee = Math.min(2000, Math.round(processingFee));
      const net = Math.max(0, gross - processingFee);

      const isLaneB = (lane || '').toLowerCase() === 'lane_b' || (lane || '').toLowerCase() === 'ipc';

      let authorAmount = 0;
      let platformAmount = 0;
      let mprAmount = 0;

      if (isLaneB) {
        authorAmount = Math.round(net * 0.70);
        const platformNet = net - authorAmount;
        if (hasMpr) {
          mprAmount = Math.round(platformNet * 0.05); // 5% bonus from platform's 30%
        }
        platformAmount = platformNet - mprAmount;
      } else {
        authorAmount = Math.round(net * 0.30);
        if (hasMpr) {
          mprAmount = Math.round(net * 0.20);
        }
        platformAmount = net - authorAmount - mprAmount;
      }

      res.json({
        gross,
        processingFee,
        netRevenue: net,
        authorAmount,
        platformAmount,
        mprAmount,
        lane: isLaneB ? 'lane_b' : 'lane_a'
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mount router onto the main express app
  app.use(router);
}
