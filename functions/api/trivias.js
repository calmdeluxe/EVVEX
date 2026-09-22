import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = context.env.VITE_SUPABASE_URL || context.env.SUPABASE_URL;
    const supabaseKey = context.env.VITE_SUPABASE_ANON_KEY || context.env.SUPABASE_ANON_KEY || context.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ trivias: [], message: "Supabase credentials are not configured in environment." }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Resolve User Session if Token exists
    const authHeader = context.request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    
    let userId = null;
    let userEmail = null;
    let userAccountTier = 'free';

    if (token && token !== "undefined" && token !== "null") {
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          userId = user.id;
          userEmail = user.email;

          // Fetch profile to get real account tier
          const { data: profile } = await supabase
            .from("profiles")
            .select("account_tier")
            .eq("id", userId)
            .maybeSingle();
          if (profile) {
            userAccountTier = profile.account_tier || 'free';
          }
        }
      } catch (authError) {
        console.warn("[CF Function Trivia] Token check failed:", authError);
      }
    }

    // 2. Fetch active sessions from 'trivias' table
    const now = new Date().toISOString();
    let activeSessions = [];
    let tableExists = true;
    try {
      const { data, error: sError } = await supabase
        .from("trivias")
        .select("*")
        .eq("status", "active")
        .or(`expiry_at.is.null,expiry_at.gt.${now}`);
      
      if (sError) {
        if (sError.code === "42P01") {
          tableExists = false;
        } else {
          throw sError;
        }
      } else {
        activeSessions = data || [];
      }
    } catch (err) {
      console.warn("[CF Function Trivia] Query on 'trivias' failed:", err);
      tableExists = false;
    }

    // 3. Fetch active questions count to skip empty trivias
    let questions = [];
    try {
      const { data, error: qError } = await supabase
        .from("trivia_questions")
        .select("ebook_id")
        .eq("is_active", true);
      
      if (!qError && data) {
        questions = data;
      }
    } catch (err) {
      console.warn("[CF Function Trivia] Query on 'trivia_questions' failed:", err);
    }

    const questionCounts = {};
    let generalQuestionCount = 0;
    questions.forEach((q) => {
      if (q.ebook_id) {
        questionCounts[q.ebook_id] = (questionCounts[q.ebook_id] || 0) + 1;
      } else {
        generalQuestionCount++;
      }
    });

    const verifiedSessions = (activeSessions || []).filter((s) => {
      const qCount = s.book_id ? (questionCounts[s.book_id] || 0) : generalQuestionCount;
      return qCount > 0;
    });

    // 4. Fetch linked Books details
    let books = [];
    try {
      const { data, error: bError } = await supabase
        .from("books")
        .select("id, title, cover_image, status, price, cards_json, is_published");
      if (!bError && data) {
        books = data;
      }
    } catch (err) {
      console.warn("[CF Function Trivia] Query on 'books' failed:", err);
    }

    const booksMap = new Map(books.map(b => [b.id, b]));

    // 5. User Specific Stats (purchases, attempts, progress)
    let purchasedBookIds = new Set();
    let attemptedIds = new Set();
    const progressMap = new Map();

    if (userId) {
      // Fetch Purchases
      let purchasedBookIdsArray = [];
      try {
        const { data: pData, error: pError } = await supabase
          .from("ebook_purchases")
          .select("ebook_id")
          .eq("user_id", userId);
        if (!pError && pData) {
          purchasedBookIdsArray = pData.map((p) => p.ebook_id);
        } else {
          // Fallback to successful transactions
          const { data: txData } = await supabase
            .from("transactions")
            .select("book_id")
            .eq("user_id", userId)
            .eq("status", "successful")
            .eq("type", "purchase");
          if (txData) {
            purchasedBookIdsArray = txData.map((tx) => tx.book_id).filter(Boolean);
          }
        }
      } catch (err) {
        console.warn("[CF Function Trivia] Fetching purchases failed:", err);
      }
      purchasedBookIds = new Set(purchasedBookIdsArray);

      // Fetch Attempts / Participations
      try {
        const { data: aData } = await supabase
          .from("daily_trivia_attempts")
          .select("ebook_id")
          .eq("user_id", userId);
        
        if (aData) {
          aData.forEach((a) => attemptedIds.add(a.ebook_id || "general"));
        } else {
          // Fallback to legacy trivia_participations
          const { data: attempts } = await supabase
            .from("trivia_participations")
            .select("trivia_id")
            .eq("user_id", userId);
          if (attempts) {
            attempts.forEach(att => attemptedIds.add(att.trivia_id));
          }
        }
      } catch (err) {
        console.warn("[CF Function Trivia] Fetching attempts failed:", err);
      }

      // Fetch Reading Progress
      try {
        const { data: progressData } = await supabase
          .from("reading_progress")
          .select("book_id, card_index")
          .eq("user_id", userId);
        if (progressData) {
          progressData.forEach((p) => {
            progressMap.set(p.book_id, p.card_index);
          });
        }
      } catch (err) {
        console.warn("[CF Function Trivia] Fetching reading progress failed:", err);
      }
    }

    // 6. Merge & Construct Results
    const formattedTrivias = verifiedSessions.map((session) => {
      const book = booksMap.get(session.book_id);
      const isGeneral = !session.book_id;

      const hasAccess = isGeneral || (!book?.price || book.price === 0) || purchasedBookIds.has(session.book_id);
      const alreadyAttempted = attemptedIds.has(session.book_id || "general");

      const totalCards = (book && Array.isArray(book.cards_json)) ? book.cards_json.length : 0;
      const cardIndex = book ? (progressMap.get(book.id) || 0) : 0;
      const readingCompleted = isGeneral || totalCards === 0 || cardIndex >= totalCards - 1;

      const actualPrice = session.price !== undefined && session.price !== null ? session.price : (isGeneral ? 0 : (book?.price || 0));
      const ruleTargetTier = session.target_tier || 'all';
      const isLockedForTier = (ruleTargetTier === 'premium' || actualPrice > 0) && userAccountTier === 'free';

      return {
        id: session.book_id || "general",
        session_id: session.id,
        title: session.title || (isGeneral ? "General Knowledge Challenge" : book?.title),
        description: session.description || (isGeneral ? "Mixed topic questions." : ""),
        cover_image: session.thumbnail_url || book?.cover_image || "",
        thumbnail_url: session.thumbnail_url || book?.cover_image || "",
        reward_points: session.reward_points || 100,
        price: actualPrice,
        target_tier: ruleTargetTier,
        promotional_writeup: session.promotional_writeup || "",
        expiry_at: session.expiry_at,
        created_at: session.created_at,
        hasAccess,
        alreadyAttempted,
        isGeneral,
        readingCompleted,
        isLockedForTier,
        book_title: isGeneral ? "General Knowledge" : book?.title,
        total_cards: totalCards,
        read_cards: cardIndex + 1
      };
    });

    const coveredKeys = new Set(verifiedSessions.map(s => s.book_id || "general"));

    // Dynamic Merging Fallback loop has been disabled to prevent deleted or non-active trivias from appearing.

    return new Response(JSON.stringify({ trivias: formattedTrivias }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (err) {
    console.error("[CF Function Trivia] Graceful fallback on overall exception:", err);
    return new Response(JSON.stringify({ trivias: [], error: err.message || "Failed to fetch user trivias safely" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
