import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { Button } from '../components/ui/button';
import { 
  BrainCircuit, 
  Trophy, 
  Clock, 
  ArrowLeft, 
  CheckCircle2, 
  Share2, 
  Coins, 
  Lock, 
  Unlock,
  AlertCircle,
  Gamepad2,
  BookOpen,
  ShoppingBag,
  Sparkles,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { canPlayTrivia, isAdmin as checkIsAdmin, getReasonLabel } from '../utils/triviaEligibility';

export const TriviaSharedPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, accountTier, isAdmin, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [trivia, setTrivia] = useState<any>(null);
  const [associatedBook, setAssociatedBook] = useState<any>(null);
  const [sampleCards, setSampleCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);

  // Eligibility States
  const [hasPurchased, setHasPurchased] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [hasCompletedReading, setHasCompletedReading] = useState(false);
  const [entryFeePaid, setEntryFeePaid] = useState(false);
  const [topEarners, setTopEarners] = useState<any[]>([]);

  // 1. Unauthenticated redirect to login
  useEffect(() => {
    if (!authLoading && !user) {
      const redirectUrl = window.location.pathname + window.location.search;
      navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
    }
  }, [user, authLoading, navigate]);

  // 2. Fetch trivia details, book info, sample preview, reading progress, and leaderboard
  useEffect(() => {
    const fetchTriviaDetails = async () => {
      if (!id || !user || authLoading) return;
      try {
        setLoading(true);
        setErrorMsg(null);

        // Fetch trivia by ID or slug/book_id
        let { data: triviaData, error: triviaError } = await supabase
          .from('trivias')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!triviaData && id !== 'general') {
          const { data: triviaByBook } = await supabase
            .from('trivias')
            .select('*')
            .eq('book_id', id)
            .maybeSingle();
          if (triviaByBook) {
            triviaData = triviaByBook;
          }
        }

        if (triviaError || !triviaData) {
          setErrorMsg('Trivia challenge not found.');
          setLoading(false);
          return;
        }

        setTrivia(triviaData);

        const userWithRole = {
          ...user,
          role: profile?.role || (user as any)?.role,
          account_tier: profile?.account_tier || accountTier || 'free',
          is_admin: profile?.is_admin === true || isAdmin === true || (user as any)?.is_admin === true,
        };

        const isEligibleBypass = checkIsAdmin(userWithRole);

        // Check if already played
        if (user?.id && !isEligibleBypass) {
          const [attRes, partRes] = await Promise.all([
            supabase.from('daily_trivia_attempts').select('id').eq('user_id', user.id).eq('ebook_id', triviaData.book_id || "general").maybeSingle(),
            supabase.from('trivia_participations').select('id').eq('user_id', user.id).eq('trivia_id', triviaData.id).maybeSingle()
          ]);
          if (attRes.data || partRes.data) {
            setAlreadyPlayed(true);
          }
        }

        // Fetch associated book details & sample cards
        if (triviaData.book_id) {
          const { data: bookData } = await supabase
            .from('books')
            .select('id, title, cover_image, description, price, admin_note')
            .eq('id', triviaData.book_id)
            .maybeSingle();

          if (bookData) {
            setAssociatedBook({
              ...bookData,
              author_name: bookData.admin_note?.match(/author:([^,]+)/)?.[1] || 'Author'
            });

            // Fetch first 2-3 cards for preview
            const { data: cards } = await supabase
              .from('book_cards')
              .select('id, card_number, content, title')
              .eq('book_id', bookData.id)
              .order('card_number', { ascending: true })
              .limit(3);

            setSampleCards(cards || []);
          }

          // Check purchase
          if (isEligibleBypass) {
            setHasPurchased(true);
          } else {
            const { data: purchase } = await supabase
              .from('ebook_purchases')
              .select('id')
              .eq('user_id', user.id)
              .eq('ebook_id', triviaData.book_id)
              .maybeSingle();

            setHasPurchased(!!purchase || (bookData && Number(bookData.price) === 0));
          }

          // Check reading progress
          if (isEligibleBypass) {
            setReadingProgress(100);
            setHasCompletedReading(true);
          } else {
            const { data: progress } = await supabase
              .from('reading_progress')
              .select('completed, progress')
              .eq('user_id', user.id)
              .eq('book_id', triviaData.book_id)
              .maybeSingle();

            const pVal = progress?.progress || (progress?.completed ? 100 : 0);
            setReadingProgress(pVal);
            setHasCompletedReading(pVal >= 90 || progress?.completed === true);
          }
        } else {
          // General trivia (no book linked)
          setHasPurchased(true);
          setReadingProgress(100);
          setHasCompletedReading(true);
        }

        // Entry Fee status
        const entryFee = Number(triviaData.price || triviaData.entry_fee || 0);
        if (entryFee === 0 || isEligibleBypass) {
          setEntryFeePaid(true);
        } else {
          const { data: part } = await supabase
            .from('trivia_participations')
            .select('id')
            .eq('user_id', user.id)
            .eq('trivia_id', triviaData.id)
            .maybeSingle();

          setEntryFeePaid(!!part);
        }

        // Leaderboard: Top Trivia Earners
        try {
          const { data: leaders } = await supabase
            .from('trivia_participations')
            .select('points_earned, user_id, users(full_name, email)')
            .gt('points_earned', 0)
            .order('points_earned', { ascending: false })
            .limit(5);

          if (leaders) {
            setTopEarners(leaders);
          }
        } catch (lErr) {
          console.warn("[TriviaSharedPage] Leaderboard fetch error:", lErr);
        }

      } catch (err) {
        console.error('[TriviaSharedPage] Unexpected error:', err);
        setErrorMsg('Failed to load trivia eligibility check.');
      } finally {
        setLoading(false);
      }
    };

    fetchTriviaDetails();
  }, [id, user, authLoading, isAdmin, accountTier]);

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/trivia/${trivia?.id || id}${user ? `?ref=${user.id}` : ''}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: trivia?.title || 'Trivia Challenge',
          url: shareUrl
        });
        return;
      } catch (e) {
        console.warn("Web Share failed/cancelled:", e);
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (errorMsg || !trivia) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <BrainCircuit className="w-16 h-16 text-slate-600 mb-4" />
        <h2 className="text-2xl font-black">Trivia Not Found</h2>
        <p className="text-slate-400 mt-2 max-w-sm">{errorMsg || "The trivia challenge does not exist."}</p>
        <Button onClick={() => navigate('/trivia')} className="mt-6 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl px-6 h-11">
          Explore Trivias
        </Button>
      </div>
    );
  }

  if (alreadyPlayed) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="bg-amber-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
          <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
        </div>
        <h2 className="text-2xl font-black">Already Played!</h2>
        <p className="text-slate-400 mt-2 max-w-sm">You have completed your attempt for this trivia challenge. Check back soon for new trivia competitions!</p>
        <Button onClick={() => navigate('/trivia')} className="mt-6 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl px-6 h-11">
          Back to Trivia Hub
        </Button>
      </div>
    );
  }

  const userWithRole = {
    ...user,
    role: profile?.role || (user as any)?.role,
    account_tier: profile?.account_tier || accountTier || 'free',
    is_admin: profile?.is_admin === true || isAdmin === true || (user as any)?.is_admin === true,
  };

  const isMarketing = trivia?.type !== 'reader_reward';

  const eligibility = canPlayTrivia(userWithRole, trivia, {
    hasPurchasedBook: hasPurchased,
    hasCompletedReading: hasCompletedReading,
    alreadyPlayed: alreadyPlayed,
    hasPaidEntryFee: entryFeePaid,
  });

  const isEligibleToPlay = eligibility.eligible;
  const entryFeeAmount = Number(trivia.price || trivia.entry_fee || 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans py-10 px-4 sm:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/trivia')} 
            className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 font-bold text-xs uppercase tracking-widest transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Trivia Center
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Status:</span>
            {isEligibleToPlay ? (
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Ready to Play
              </span>
            ) : (
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" /> Requirements Pending
              </span>
            )}
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
          
          {/* Header Banner */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center border-b border-slate-800 pb-8">
            <div className="md:col-span-4 shrink-0">
              <img 
                src={trivia.thumbnail_url || associatedBook?.cover_image || 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=2000'} 
                alt={trivia.title}
                className="w-full h-56 sm:h-64 object-cover rounded-2xl border border-slate-800 shadow-xl"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="md:col-span-8 space-y-4 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`border text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${
                  isMarketing 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                }`}>
                  {isMarketing ? '🎯 Marketing Trivia (Open Discovery)' : '🏆 Reader-Reward Trivia'}
                </span>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
                  Eligibility Check
                </span>
                {entryFeeAmount > 0 ? (
                  <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
                    Entry Fee: ₦{entryFeeAmount.toLocaleString()}
                  </span>
                ) : (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
                    Free Entry
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white italic tracking-tight font-serif">
                {trivia.title}
              </h1>

              {associatedBook && (
                <p className="text-sm text-slate-300 font-medium">
                  Required Book Material: <span className="text-amber-400 font-bold">"{associatedBook.title}"</span> by {associatedBook.author_name || 'Author'}
                </p>
              )}

              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                {trivia.description || "Complete the required reading and entry checks below to unlock this interactive trivia challenge and earn rewards!"}
              </p>

              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-black text-amber-400">Reward: +{trivia.reward_points || 100} T-Points</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-bold text-slate-300">{trivia.duration_seconds || 5}s per question</span>
                </div>
              </div>
            </div>
          </div>

          {/* Eligibility Requirements Checklist */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" /> Requirements Checklist
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Check 1: Material Access */}
              <div className={`p-4 rounded-2xl border text-left space-y-2 transition-all ${
                isMarketing || hasPurchased 
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' 
                  : 'bg-slate-900 border-amber-500/40 text-amber-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    1. eBook Access {isMarketing && '(Optional)'}
                  </span>
                  {isMarketing || hasPurchased ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-amber-400" />
                  )}
                </div>
                <h4 className="text-sm font-bold text-white">
                  {isMarketing ? "✅ Open Discovery" : hasPurchased ? "✅ Material Purchased" : "🔒 Buy to Unlock"}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isMarketing 
                    ? "Book purchase is optional for this Marketing Trivia challenge." 
                    : hasPurchased 
                      ? "You have unlocked access to this book." 
                      : `Purchase required (₦${associatedBook?.price?.toLocaleString() || '1,000'})`}
                </p>
                {!isMarketing && !hasPurchased && associatedBook && (
                  <Button 
                    onClick={() => navigate(`/book/${associatedBook.id}/buy`)}
                    className="w-full mt-2 h-9 text-xs font-black bg-amber-500 hover:bg-amber-600 text-black rounded-xl gap-1"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> Buy eBook – ₦{associatedBook.price?.toLocaleString() || '1,000'}
                  </Button>
                )}
              </div>

              {/* Check 2: Entry Fee */}
              <div className={`p-4 rounded-2xl border text-left space-y-2 transition-all ${
                entryFeePaid 
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' 
                  : 'bg-slate-900 border-purple-500/40 text-purple-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">2. Entry Ticket</span>
                  {entryFeePaid ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <CreditCard className="w-5 h-5 text-purple-400" />
                  )}
                </div>
                <h4 className="text-sm font-bold text-white">
                  {entryFeePaid ? "✅ Ticket Confirmed" : `Entry Fee: ₦${entryFeeAmount.toLocaleString()}`}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {entryFeePaid ? "Entry ticket verified for this session." : "Pay entry fee to join competitive reward pool."}
                </p>
                {!entryFeePaid && entryFeeAmount > 0 && (
                  <Button 
                    onClick={() => navigate(`/payment?type=trivia_entry&trivia_id=${trivia.id}&amount=${entryFeeAmount}`)}
                    className="w-full mt-2 h-9 text-xs font-black bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-1"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Pay Entry Fee (₦{entryFeeAmount.toLocaleString()})
                  </Button>
                )}
              </div>

              {/* Check 3: Reading Progress */}
              <div className={`p-4 rounded-2xl border text-left space-y-2 transition-all ${
                isMarketing || hasCompletedReading 
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' 
                  : 'bg-slate-900 border-blue-500/40 text-blue-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    3. Read Requirement {isMarketing && '(Optional)'}
                  </span>
                  {isMarketing || hasCompletedReading ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <BookOpen className="w-5 h-5 text-blue-400" />
                  )}
                </div>
                <h4 className="text-sm font-bold text-white">
                  {isMarketing 
                    ? "✅ Open to All" 
                    : hasCompletedReading 
                      ? "✅ Read Requirement Met (90%+)" 
                      : `Reading Progress: ${readingProgress}%`}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isMarketing 
                    ? "Reading completion is optional for Marketing Trivia." 
                    : hasCompletedReading 
                      ? "You have read enough content to challenge questions." 
                      : "Must view at least 90% of book cards first."}
                </p>
                {!isMarketing && !hasCompletedReading && associatedBook && (
                  <Button 
                    onClick={() => navigate(`/read/${associatedBook.id}`)}
                    className="w-full mt-2 h-9 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Read eBook Now &rarr;
                  </Button>
                )}
              </div>

            </div>
          </div>

          {/* Material Taste/Preview Section */}
          {associatedBook && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-left space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> Taste the Material Preview (First Cards)
                </span>
                <Link to={`/read/${associatedBook.id}`} className="text-xs font-bold text-slate-400 hover:text-white underline">
                  Full Reader &rarr;
                </Link>
              </div>

              {sampleCards.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {sampleCards.map((card, idx) => (
                    <div key={card.id || idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider block">
                        Card #{card.card_number || idx + 1}
                      </span>
                      <h5 className="text-xs font-bold text-white line-clamp-1">{card.title || `Excerpt #${idx + 1}`}</h5>
                      <p className="text-[11px] text-slate-300 line-clamp-3 leading-relaxed font-serif">
                        {card.content || "Preview text excerpt from book..."}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  "{associatedBook.description || 'Preview sample excerpt unavailable. Open the full eBook reader to explore.'}"
                </p>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <div className="text-left">
              <span className="text-xs text-slate-400 block font-semibold">Eligibility Verification Result:</span>
              <span className={`text-sm font-black uppercase ${isEligibleToPlay ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isEligibleToPlay ? '🎉 All Conditions Fulfilled' : (eligibility.message || '⚠️ Action Required before playing')}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button 
                variant="outline"
                onClick={handleCopyLink}
                className="flex-1 sm:flex-none h-12 rounded-xl border-slate-800 bg-slate-900 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Share Link"}</span>
              </Button>

              <Button 
                disabled={!isEligibleToPlay}
                onClick={() => navigate(`/trivia/ebook/${trivia.id}`)}
                className={`flex-1 sm:flex-none h-12 px-8 rounded-xl font-black text-sm uppercase tracking-wider text-black transition-all shadow-xl ${
                  isEligibleToPlay 
                    ? 'bg-amber-400 hover:bg-amber-300 shadow-amber-500/20 animate-pulse' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Gamepad2 className="w-5 h-5 mr-1" />
                {isEligibleToPlay ? "Play Trivia Now" : (eligibility.reason ? getReasonLabel(eligibility.reason) : "Locked")}
              </Button>
            </div>
          </div>

        </div>

        {/* Top Earners Leaderboard Section */}
        {topEarners.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-left space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Trophy className="w-4 h-4" /> Top Trivia Winners Leaderboard
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Live Ranking</span>
            </div>

            <div className="space-y-2">
              {topEarners.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                      idx === 0 ? 'bg-amber-400 text-black' : idx === 1 ? 'bg-slate-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-xs text-white block">
                        {item.users?.full_name || item.users?.email?.split('@')[0] || 'Top Player'}
                      </span>
                      <span className="text-[10px] text-slate-500">Verified Winner</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-black text-xs text-amber-400 block">+{item.points_earned} T-Points</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">Reward Credited</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
