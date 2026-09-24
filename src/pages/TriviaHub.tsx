// LEGACY: CalmReader file, not part of EVEX product. To be unmounted in a later pass.
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { clearLandingPageCache } from './LandingPage';
import { DashboardLayout } from '../components/DashboardLayout';
import { TriviaCard } from '../components/TriviaCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Clock, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Coins,
  BrainCircuit,
  Timer,
  BookOpen,
  ArrowRight,
  Plus,
  Users,
  Settings,
  Shield,
  Sparkles,
  Share2,
  CheckCircle2,
  Trash2,
  Play,
  Wallet,
  FileText,
  HelpCircle,
  Lock,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { canPlayTrivia, isAdmin as checkIsAdmin } from '../utils/triviaEligibility';

export const TriviaHub: React.FC = () => {
    const { user, profile, isAdmin, accountTier, isAuthReady } = useAuth();
    const navigate = useNavigate();

    const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [selectedAdminTrivia, setSelectedAdminTrivia] = useState<any | null>(null);
    const [shareToast, setShareToast] = useState<string | null>(null);

    const [books, setBooks] = useState<any[]>([]);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestStep, setRequestStep] = useState(1);
    const [requestTitle, setRequestTitle] = useState("");
    const [requestDesc, setRequestDesc] = useState("");
    const [requestBookId, setRequestBookId] = useState("");
    const [requestDuration, setRequestDuration] = useState("15");
    const [requestRewardPoints, setRequestRewardPoints] = useState("100");
    const [requestPrice, setRequestPrice] = useState("200");
    const [requestQuestions, setRequestQuestions] = useState<any[]>([
      { question: "", options: ["", "", "", ""], correct_answer: "A", explanation: "", difficulty: "Medium", points: 10 }
    ]);
    const [isRequestSubmitting, setIsRequestSubmitting] = useState(false);
    const [requestError, setRequestError] = useState<string | null>(null);
    const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

    const handleShareClick = async (triviaId: string) => {
      if (!user) {
        alert("Sign in to share and earn rewards!");
        return;
      }
      const shareUrl = `${window.location.origin}/trivia/share/${triviaId}?ref=${user.id}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedId(triviaId);
      setShareToast("Trivia challenge link copied to clipboard!");
      setTimeout(() => {
        setCopiedId(null);
        setShareToast(null);
      }, 3000);
    };

    // Security Redirect: Removed mandatory redirect, now handled at the action level
    // but we still want to track auth ready for UI purposes
    useEffect(() => {
      // Logic removed to allow public view of the hub
    }, [user, isAuthReady, navigate]);

    const [hubError, setHubError] = useState<string | null>(null);

    const handlePlayClick = async (trivia: any) => {
      setHubError(null);
      if (!user) {
        const targetPath = trivia.id ? `/trivia/share/${trivia.id}` : `/trivia`;
        sessionStorage.setItem('redirectAfterLogin', targetPath);
        localStorage.setItem('redirectAfterLogin', targetPath);
        navigate(`/login?redirect=${encodeURIComponent(targetPath)}`, { state: { message: "Please login to play trivia" } });
        return;
      }

      const userWithRole = {
        ...user,
        role: profile?.role || (user as any)?.role,
        account_tier: profile?.account_tier || accountTier || 'free',
        is_admin: profile?.is_admin === true || isAdmin === true || (user as any)?.is_admin === true,
      };

      if (checkIsAdmin(userWithRole)) {
        setSelectedAdminTrivia(trivia);
        return;
      }

      setLoading(true);
      try {
        let hasPurchased = trivia.hasAccess || false;
        let hasCompletedReading = trivia.readingCompleted || false;

        const isGeneral = trivia.id === 'general' || !trivia.book_id;
        if (!isGeneral && user?.id) {
          const { data: purchase } = await supabase
            .from('ebook_purchases')
            .select('id')
            .eq('user_id', user.id)
            .eq('ebook_id', trivia.book_id || trivia.id)
            .maybeSingle();

          const { data: bookRec } = await supabase
            .from('books')
            .select('price, is_free')
            .eq('id', trivia.book_id || trivia.id)
            .maybeSingle();

          const isFreeBook = bookRec?.is_free === true || Number(bookRec?.price || 0) === 0;
          hasPurchased = !!purchase || isFreeBook;

          const { data: progress } = await supabase
            .from('reading_progress')
            .select('completed, progress')
            .eq('user_id', user.id)
            .eq('book_id', trivia.book_id || trivia.id)
            .maybeSingle();

          hasCompletedReading = progress ? (progress.completed === true || (progress.progress !== undefined && progress.progress >= 90)) : false;
        }

        const eligibility = canPlayTrivia(userWithRole, trivia, {
          hasPurchasedBook: hasPurchased,
          hasCompletedReading: hasCompletedReading,
          alreadyPlayed: trivia.alreadyAttempted,
          hasPaidEntryFee: Number(trivia.price || 0) === 0,
        });

        if (!eligibility.eligible) {
          setHubError(eligibility.message);
          setLoading(false);
          return;
        }
      } catch (err: any) {
        console.warn("[TriviaHub] Live access check error:", err);
      } finally {
        setLoading(false);
      }
      
      navigate(`/trivia/ebook/${trivia.id}`);
    };

    // REWARD UI: display wallet balance and points
    // BAN DUMMY: filter out test/mock data
    const [trivias, setTrivias] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [points, setPoints] = useState(0);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>("All");

    const categories = ["All", "Horror", "Thriller", "Self-Development", "General Knowledge", "eBook Based", "Premium Only"];

    const filteredTrivias = trivias.filter((t) => {
      if (selectedCategory === "All") return true;
      if (selectedCategory === "eBook Based") return !t.isGeneral;
      if (selectedCategory === "General Knowledge") return t.isGeneral;
      if (selectedCategory === "Premium Only") return t.price > 0 || t.target_tier === "premium";

      const cat = (t.category || t.target_category || "").toLowerCase();
      const sel = selectedCategory.toLowerCase();
      return cat.includes(sel) || sel.includes(cat);
    });

    const fetchTrivias = async () => {
      // Only trigger primary loader if we have NO data yet
      if (trivias.length === 0) {
        setLoading(true);
      }
      setFetchError(null);
      try {
        const session = await supabase.auth.getSession();
        const userId = session.data.session?.user?.id;

        // Hard delete all trivias with title = 'General Trivia Challenge' (Cleanup ghost trivias)
        try {
          await supabase
            .from("trivias")
            .delete()
            .eq("title", "General Trivia Challenge");
        } catch (cleanupErr) {
          console.warn("[TriviaHub] Failed to clean up ghost trivias:", cleanupErr);
        }

        // 1. Fetch active sessions from the trivias table
        const { data: rawTrivias, error: sError } = await supabase
          .from("trivias")
          .select("*")
          .eq("deleted", false)
          .eq("status", "active");

        if (sError) throw sError;

        const now = new Date();
        const activeSessions = (rawTrivias || []).filter((s: any) => {
          const isActive = s.status === "active";
          const isNotDeleted = s.deleted === false || s.deleted === null || s.deleted === undefined;
          const notExpired = !s.expiry_at || new Date(s.expiry_at) > now;
          return isActive && isNotDeleted && notExpired;
        });

        // 2. Fetch active questions count safely
        const { data: questions } = await supabase
          .from("trivia_questions")
          .select("ebook_id")
          .eq("is_active", true);

        const questionCounts: { [key: string]: number } = {};
        if (questions) {
          questions.forEach((q) => {
            if (q.ebook_id) {
              questionCounts[q.ebook_id] = (questionCounts[q.ebook_id] || 0) + 1;
            } else {
              questionCounts["general"] = (questionCounts["general"] || 0) + 1;
            }
          });
        }

        // 3. Fetch linked eBooks details
        const { data: books } = await supabase
          .from("books")
          .select("id, title, cover_image, status, price, cards_json, genre_id, admin_note, user_id");
        if (books) setBooks(books);

        // Fetch genres
        const { data: genres } = await supabase.from("genres").select("id, name");
        const genresList = genres || [];

        // Fetch user specific stats
        let purchasedBookIds = new Set<string>();
        let attemptedIds = new Set<string>();

        if (userId) {
          // Fetch purchases
          const { data: pData } = await supabase
            .from("ebook_purchases")
            .select("ebook_id")
            .eq("user_id", userId);
          purchasedBookIds = new Set((pData || []).map((p) => p.ebook_id));

          // Fetch attempts from daily_trivia_attempts
          const { data: aData } = await supabase
            .from("daily_trivia_attempts")
            .select("ebook_id")
            .eq("user_id", userId);
          attemptedIds = new Set((aData || []).map((a) => a.ebook_id || "general"));

          // Fetch attempts from trivia_participations as backup
          const { data: partData } = await supabase
            .from("trivia_participations")
            .select("trivia_id")
            .eq("user_id", userId);
          if (partData) {
            partData.forEach((p) => {
              attemptedIds.add(p.trivia_id);
            });
          }
        }

        // Fetch user reading progress
        const progressMap = new Map<string, { card_index: number; completed: boolean; progress: number }>();
        if (userId) {
          const { data: progressData } = await supabase
            .from("reading_progress")
            .select("book_id, card_index, completed, progress")
            .eq("user_id", userId);
          if (progressData) {
            progressData.forEach((p) => {
              progressMap.set(p.book_id, {
                card_index: p.card_index || 0,
                completed: !!p.completed,
                progress: p.progress || 0
              });
            });
          }
        }

        // 4. Merge results
        let formattedTrivias = activeSessions.map((session) => {
          const book = (books || []).find((b) => b.id === session.book_id);
          const isGeneral = !session.book_id;

          const hasAccess =
            isGeneral || !book?.price || book?.price === 0 || purchasedBookIds.has(session.book_id);
          
          // An attempt has been made if tracked in daily_attempts or participations
          const alreadyAttempted = attemptedIds.has(session.book_id || "general") || attemptedIds.has(session.id);

          const totalCards = (book && Array.isArray(book.cards_json)) ? book.cards_json.length : 0;
          const pRecord = book ? progressMap.get(book.id) : null;
          const cardIndex = pRecord ? pRecord.card_index : 0;
          const hasDbCompleted = pRecord ? (pRecord.completed || pRecord.progress >= 90) : false;
          const readingCompleted = isGeneral || totalCards === 0 || hasDbCompleted || cardIndex >= totalCards - 1;

          const actualPrice = session.price !== undefined && session.price !== null ? session.price : (isGeneral ? 0 : (book?.price || 0));
          const ruleTargetTier = session.target_tier || 'all';
          
          const userAccountTier = profile?.account_tier || 'free';
          const isLockedForTier = (ruleTargetTier === 'premium' || actualPrice > 0) && userAccountTier === 'free';

          const genreObj = book ? genresList.find(g => String(g.id) === String(book.genre_id)) : null;
          const bookGenreName = genreObj ? genreObj.name : (book?.admin_note?.includes('genre:') ? book.admin_note.split('genre:')[1].split(',')[0] : '');
          const targetCategory = session.target_category || 'all';
          const category = targetCategory !== 'all' ? targetCategory : (bookGenreName || (isGeneral ? "General Knowledge" : "General"));

          return {
            id: session.book_id || "general",
            session_id: session.id,
            book_id: session.book_id,
            type: session.type || 'marketing',
            title: session.title || (isGeneral ? "General Knowledge Challenge" : book?.title),
            description: session.description || (isGeneral ? "Mixed topic questions." : ""),
            cover_image: session.thumbnail_url || book?.cover_image || "",
            thumbnail_url: session.thumbnail_url || book?.cover_image || "",
            reward_points: session.reward_points,
            price: actualPrice,
            target_tier: ruleTargetTier,
            target_category: targetCategory,
            category: category,
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
            read_cards: cardIndex + 1,
            questions_count: session.book_id ? (questionCounts[session.book_id] || 10) : (questionCounts["general"] || 10),
            status: session.status || "active",
            is_owner: session.created_by === user?.id
          };
        });

        // Exclude/Filter expired trivias from appearing in Trivia Hub
        formattedTrivias = formattedTrivias.filter(t => {
          if (t.expiry_at && new Date(t.expiry_at) < now) {
            return false;
          }
          return true;
        });

        setTrivias(formattedTrivias);

        if (user?.id) {
          const { data: userData } = await supabase
            .from("users")
            .select("t_points")
            .eq("id", user.id)
            .maybeSingle();
          if (userData) {
            setPoints(userData.t_points || 0);
          }
        }
      } catch (err: any) {
        console.error("Error fetching trivia hub data directly:", err);
        setFetchError(err.message || "Connection to database failed");
        setTrivias([]);
      } finally {
        setLoading(false);
      }
    };
  
    useEffect(() => {
      // Clear all trivia-related cache (localStorage, sessionStorage)
      try {
        localStorage.removeItem("calmreader_landing_data_cache_local");
        localStorage.removeItem("calmreader_landing_data_cache_time_local");
        sessionStorage.removeItem("calmreader_landing_data_cache_local");
        sessionStorage.removeItem("calmreader_landing_data_cache_time_local");
        
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("trivia") || key.includes("trivia") || key.includes("landing"))) {
            localStorage.removeItem(key);
          }
        }
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key && (key.startsWith("trivia") || key.includes("trivia") || key.includes("landing"))) {
            sessionStorage.removeItem(key);
          }
        }
        clearLandingPageCache();
      } catch (err) {
        console.warn("[TriviaHub] Cache clearing failed on mount:", err);
      }

      fetchTrivias();
    }, [user?.id, isAdmin]);

  const getTimeLeft = (expiry: string) => {
    const diff = new Date(expiry).getTime() - new Date().getTime();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left`;
  };

  const handleDeleteTrivia = async (trivia: any) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${trivia.title || 'this trivia challenge'}"?`)) {
      return;
    }
    setLoading(true);
    try {
      const isGeneral = trivia.isGeneral || trivia.id === "general" || !trivia.book_id;
      const dbId = isGeneral ? "general" : (trivia.book_id || trivia.id);

      if (isGeneral) {
        await supabase.from("trivia_questions").delete().is("ebook_id", null);
        await supabase.from("daily_trivia_attempts").delete().is("ebook_id", null);
        await supabase.from("trivias").delete().eq("id", trivia.session_id || trivia.id);
      } else {
        await supabase.from("trivia_questions").delete().eq("ebook_id", dbId);
        await supabase.from("daily_trivia_attempts").delete().eq("ebook_id", dbId);
        await supabase.from("trivias").delete().eq("id", trivia.session_id || trivia.id);
      }

      localStorage.removeItem("calmreader_landing_data_cache_local");
      localStorage.removeItem("calmreader_landing_data_cache_time_local");
      try {
        sessionStorage.removeItem("calmreader_landing_data_cache_local");
        sessionStorage.removeItem("calmreader_landing_data_cache_time_local");
      } catch (e) {}
      try {
        clearLandingPageCache();
      } catch (cErr) {}

      setTrivias([]);
      await fetchTrivias();
      setHubError(null);
    } catch (err: any) {
      console.error("[TriviaHub] Delete action failed:", err);
      setHubError(`Failed to delete trivia: ${err.response?.data?.error || err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTrivia = (trivia: any) => {
    if (isAdmin) {
      navigate('/admin/trivia');
    } else if (accountTier === 'author' || accountTier === 'premium') {
      setRequestStep(1);
      setRequestTitle(trivia.title || "");
      setRequestDesc(trivia.description || "");
      setRequestBookId(trivia.book_id || "");
      setRequestPrice(String(trivia.price || "200"));
      setRequestRewardPoints(String(trivia.reward_points || "100"));
      setIsRequestModalOpen(true);
    } else {
      handlePlayClick(trivia);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-container space-y-5 pb-20 max-w-6xl mx-auto min-w-0 overflow-x-hidden">
        
        {/* ================= MOBILE-FIRST HEADER & SUMMARY (Mobile & Tablet) ================= */}
        <div className="block md:hidden space-y-4">
          {/* Greeting Header */}
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              Hi, {profile?.display_name || user?.user_metadata?.full_name || 'Trivia Center'} 👋
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Your platform for reading, learning and earning.
            </p>
          </div>

          {/* My Balance Card */}
          <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-amber-100 dark:bg-amber-900/50 p-2.5 rounded-xl shrink-0 text-amber-700 dark:text-amber-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">My Balance</p>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {points.toLocaleString()} <span className="text-xs font-bold text-amber-600">TP</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    (≈ ₦{(points * 5).toLocaleString()})
                  </span>
                </div>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 font-bold text-xs h-8 px-3 rounded-xl cursor-pointer shrink-0" 
              asChild
            >
              <Link to="/earnings">Withdraw</Link>
            </Button>
          </div>

          {/* User Profile Card */}
          <div 
            onClick={() => navigate('/profile')} 
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 flex items-center justify-between shadow-xs cursor-pointer hover:border-slate-300 dark:hover:border-white/20 transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                {(profile?.display_name || user?.email || 'TC').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {profile?.display_name || user?.email?.split('@')[0] || 'Trivia Center'}
                  </p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                    {accountTier === 'author' ? 'Author' : accountTier === 'premium' ? 'Premium' : isAdmin ? 'Admin' : 'Reader'}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  Active
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          {/* Quick Actions (2-column clean grid) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Quick Actions</h3>
              <Link to="/dashboard" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5">
                See all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Link 
                to="/create"
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-2.5 flex items-center justify-between shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Publish Book</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" />
              </Link>

              <Link 
                to="/books"
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-2.5 flex items-center justify-between shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Manage Books</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
              </Link>

              <Link 
                to="/earnings"
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-2.5 flex items-center justify-between shadow-xs hover:border-amber-300 dark:hover:border-amber-700 transition-all group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">View Earnings</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0" />
              </Link>

              <Link 
                to="/profile"
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-2.5 flex items-center justify-between shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Settings className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Settings</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
              </Link>
            </div>
          </div>
        </div>

        {/* ================= DESKTOP HEADER ================= */}
        <div className="hidden md:flex flex-row items-center justify-between gap-4 w-full">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Trivia Center</h1>
              {isAdmin ? (
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 shadow-sm rounded-full px-3 h-7 text-[10px] font-black uppercase tracking-widest shrink-0" asChild>
                  <Link to="/admin/trivia">
                    <Plus className="w-3 h-3 mr-1" /> Create New Trivia
                  </Link>
                </Button>
              ) : (accountTier === 'author' || accountTier === 'premium') ? (
                <Button 
                  size="sm" 
                  onClick={() => {
                    setRequestStep(1);
                    setRequestTitle("");
                    setRequestDesc("");
                    setRequestBookId("");
                    setRequestDuration("15");
                    setRequestRewardPoints("100");
                    setRequestPrice("200");
                    setRequestQuestions([{ question: "", options: ["", "", "", ""], correct_answer: "A", explanation: "", difficulty: "Medium", points: 10 }]);
                    setRequestError(null);
                    setRequestSuccess(null);
                    setIsRequestModalOpen(true);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 shadow-sm rounded-full px-3 h-7 text-[10px] font-black uppercase tracking-widest shrink-0"
                >
                  <Plus className="w-3 h-3 mr-1" /> Request Trivia
                </Button>
              ) : null}
            </div>
            <p className="text-xs sm:text-sm text-gray-500">Engage with eBook content, test your knowledge, and earn T-Points.</p>
          </div>
          
          <div className="flex items-center justify-between sm:justify-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 p-3 sm:p-4 rounded-xl shadow-xs w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-lg shrink-0">
                <Coins className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider truncate">My T-Points Balance</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-200">{points.toLocaleString()}</span>
                  <span className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium">≈ ₦{(points * 5).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" className="ml-auto border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs h-8 shrink-0" asChild>
              <Link to="/earnings">Withdraw</Link>
            </Button>
          </div>
        </div>

        {/* Error Banner */}
        {hubError && (
          <div className="bg-amber-50 border border-amber-200 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-4 text-amber-900 shadow-sm animate-fade-in my-2 w-full">
            <div className="flex items-center gap-3 min-w-0">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs font-black tracking-tight uppercase leading-relaxed truncate">
                {hubError}
              </p>
            </div>
            <button 
              onClick={() => setHubError(null)} 
              className="text-xs font-black text-amber-700 hover:text-amber-900 uppercase shrink-0 hover:underline"
            >
              Okay
            </button>
          </div>
        )}

        {/* Categories / Filters (Horizontal Scroll on Mobile) */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none w-full max-w-full -mx-1 px-1">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "secondary" : "ghost"}
              size="sm"
              className={`rounded-full shrink-0 font-bold transition-all text-xs h-8 px-3.5 ${
                selectedCategory === cat 
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs" 
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Featured Banner: Trivia Request Console */}
        {(isAdmin || accountTier === 'author' || accountTier === 'premium') && (
          <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-600 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-lg shadow-amber-900/10 text-white relative overflow-hidden group w-full">
            <div className="absolute -bottom-4 -right-4 opacity-15 pointer-events-none group-hover:scale-105 transition-transform">
              <Trophy className="w-32 h-32 sm:w-40 sm:h-40 text-white" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-white/20 backdrop-blur-xs text-white border-none font-black text-[10px] uppercase tracking-widest px-2.5 py-0.5">
                    {isAdmin ? 'SYSTEM ADMIN CONTROL' : accountTier === 'author' ? 'AUTHOR HUB' : 'PREMIUM HUB'}
                  </Badge>
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                </div>
                <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                  {isAdmin ? 'Trivia Management Console' : 'Trivia Request Console'}
                </h2>
                <p className="text-amber-100 font-medium max-w-xl text-xs sm:text-sm leading-relaxed">
                  {isAdmin 
                    ? 'You have full administrative control. Create new learning challenges, generate questions with AI, and monitor community engagement rewards.' 
                    : 'Create and manage trivia sessions, track participants and rewards, and more.'
                  }
                </p>
              </div>
              {isAdmin ? (
                <Button size="lg" className="w-full sm:w-auto bg-white text-amber-800 hover:bg-amber-50 font-black px-6 rounded-xl sm:rounded-2xl h-11 sm:h-12 shadow-md shrink-0 cursor-pointer text-xs sm:text-sm" asChild>
                  <Link to="/admin/trivia">
                    <Plus className="w-4 h-4 mr-1.5" /> Start New Trivia Session →
                  </Link>
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  onClick={() => {
                    setRequestStep(1);
                    setRequestTitle("");
                    setRequestDesc("");
                    setRequestBookId("");
                    setRequestDuration("15");
                    setRequestRewardPoints("100");
                    setRequestPrice("200");
                    setRequestQuestions([{ question: "", options: ["", "", "", ""], correct_answer: "A", explanation: "", difficulty: "Medium", points: 10 }]);
                    setRequestError(null);
                    setRequestSuccess(null);
                    setIsRequestModalOpen(true);
                  }}
                  className="w-full sm:w-auto bg-white text-amber-800 hover:bg-amber-50 font-black px-6 rounded-xl sm:rounded-2xl h-11 sm:h-12 shadow-md shrink-0 cursor-pointer text-xs sm:text-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Request Trivia Session →
                </Button>
              )}
            </div>
          </div>
        )}

        {fetchError && (
          <div className="bg-red-50 border border-red-100 p-8 rounded-2xl text-center space-y-4">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-red-900">Connection Issue</h3>
              <p className="text-red-700 text-sm max-w-2xl mx-auto break-all font-mono bg-red-100/50 p-2 rounded">
                {fetchError}
              </p>
              <p className="text-red-600 text-xs mt-2">
                Tip: Check the browser console (F12) for the full request/response log.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button variant="outline" onClick={() => window.location.reload()} className="border-red-200 text-red-700 hover:bg-red-100">
                Retry Connection
              </Button>
              {isAdmin && (
                <Button variant="default" asChild className="bg-red-600 hover:bg-red-700">
                   <Link to="/setup">
                      <Shield className="w-4 h-4 mr-2" /> Fix Connection Errors
                   </Link>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Trivia List */}
        {isAdmin && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-4 rounded-2xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-950 dark:text-amber-100 shadow-sm animate-fade-in w-full">
            <div className="flex items-center gap-3 min-w-0">
              <Shield className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs font-semibold leading-relaxed">
                <span className="font-bold">Admin/CEO Preview Mode:</span> You are viewing the trivia list. You can test-play trivias, but no points will be awarded or debited to maintain ecosystem integrity.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0">
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 sm:flex-initial border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold text-xs rounded-xl h-9" 
                onClick={async () => {
                  if (!window.confirm("Are you sure you want to purge all incomplete/orphaned trivia challenges (e.g. missing questions, missing title)?")) {
                    return;
                  }
                  setLoading(true);
                  try {
                    // Fetch trivias and questions
                    const { data: triviaSessions } = await supabase
                      .from("trivias")
                      .select("*")
                      .eq("deleted", false)
                      .eq("status", "active");
                    const { data: questions } = await supabase.from("trivia_questions").select("ebook_id");

                    const questionCounts: { [key: string]: number } = {};
                    let generalQuestionCount = 0;
                    (questions || []).forEach((q) => {
                      if (q.ebook_id) {
                        questionCounts[q.ebook_id] = (questionCounts[q.ebook_id] || 0) + 1;
                      } else {
                        generalQuestionCount++;
                      }
                    });

                    const toDeleteIds: string[] = [];
                    let generalToDelete = false;

                    (triviaSessions || []).forEach((s: any) => {
                      const isGeneral = s.book_id === null;
                      const title = (s.title || "").trim();
                      const qCount = isGeneral ? generalQuestionCount : (questionCounts[s.book_id] || 0);

                      if (!title || qCount === 0) {
                        if (isGeneral) {
                          generalToDelete = true;
                        } else {
                          toDeleteIds.push(s.book_id);
                        }
                      }
                    });

                    let deletedCount = 0;
                    if (toDeleteIds.length > 0) {
                      await supabase.from("trivias").delete().in("book_id", toDeleteIds);
                      await supabase.from("trivia_questions").delete().in("ebook_id", toDeleteIds);
                      await supabase.from("daily_trivia_attempts").delete().in("ebook_id", toDeleteIds);
                      deletedCount += toDeleteIds.length;
                    }
                    if (generalToDelete) {
                      await supabase.from("trivias").delete().is("book_id", null);
                      await supabase.from("trivia_questions").delete().is("ebook_id", null);
                      await supabase.from("daily_trivia_attempts").delete().is("ebook_id", null);
                      deletedCount += 1;
                    }

                    // Also standard ghost eBook cleanup
                    const ghostTitles = ["SAMPLE", "TEST", "DUMMY", "DELETED", "[DELETED]", "VOLUME 4", "VOLUME-4", "VOLUME 4-CHAPTER 1", "VOLUME 4 - CHAPTER 1"];
                    const { data: allBooks } = await supabase.from("books").select("id, title");
                    const ghostBookIds: string[] = [];
                    if (allBooks) {
                      allBooks.forEach((b: any) => {
                        const titleUpper = (b.title || "").toUpperCase();
                        if (ghostTitles.some(gt => titleUpper.includes(gt))) {
                          ghostBookIds.push(b.id);
                        }
                      });
                    }

                    if (ghostBookIds.length > 0) {
                      await supabase.from("books").delete().in("id", ghostBookIds);
                      await supabase.from("trivias").delete().in("book_id", ghostBookIds);
                      await supabase.from("trivia_questions").delete().in("ebook_id", ghostBookIds);
                      await supabase.from("daily_trivia_attempts").delete().in("ebook_id", ghostBookIds);
                      deletedCount += ghostBookIds.length;
                    }

                    alert(`Successfully purged ${deletedCount} incomplete or orphaned trivias.`);
                    await fetchTrivias();
                  } catch (err: any) {
                    console.error("[TriviaHub] Purge failed:", err);
                    alert(`Purge failed: ${err.message || err}`);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Purge Orphaned
              </Button>
              <Button size="sm" className="flex-1 sm:flex-initial bg-amber-600 hover:bg-amber-700 font-black shrink-0 text-xs rounded-xl h-9" asChild>
                <Link to="/admin/trivia">Open Management Hub</Link>
              </Button>
            </div>
          </div>
        )}

        {/* TRIVIA FIX: thumbnail with play button */}
        {loading && filteredTrivias.length > 0 && (
          <div className="w-full text-center py-2 text-xs text-amber-500 animate-pulse font-bold uppercase tracking-widest">
            Updating Trivias...
          </div>
        )}
        {/* TRIVIA LIST: Desktop Table view + Mobile Card-based layout */}
        {loading && !filteredTrivias.length ? (
          <div className="space-y-3 w-full">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="w-full h-24 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : filteredTrivias.length > 0 ? (
          <div className="w-full space-y-4">
            {/* Desktop Table (Hidden on Mobile) */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#0d0d15] shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/80 dark:bg-white/5 text-[11px] uppercase tracking-wider text-gray-400 font-bold border-b border-gray-100 dark:border-white/10">
                  <tr>
                    <th className="px-5 py-3.5">Title</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Questions</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-xs">
                  {filteredTrivias.map((trivia) => {
                    const isLive = trivia.status === "active" || !trivia.isLockedForTier;
                    return (
                      <tr key={trivia.id} className="hover:bg-amber-50/30 dark:hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base shrink-0">🧠</span>
                            <div className="min-w-0 max-w-xs">
                              <div className="font-bold text-gray-900 dark:text-white truncate">{trivia.title}</div>
                              <div className="text-[10px] text-gray-400 font-normal truncate">
                                {trivia.isGeneral ? "General Knowledge" : (trivia.book_title || "Linked eBook")}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                            📁 {trivia.category || trivia.target_category || (trivia.isGeneral ? "General Knowledge" : "Romance")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-1 text-xs">
                            <span>📝</span>
                            <span>{trivia.questions_count || 10} Questions</span>
                          </div>
                          {trivia.reward_points && (
                            <div className="text-[10px] text-amber-600 font-bold mt-0.5">+{trivia.reward_points} TP</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge className={
                            trivia.alreadyAttempted 
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-100 border-none text-[10px] font-bold"
                              : isLive
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none text-[10px] font-bold"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-100 border-none text-[10px] font-bold"
                          }>
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1" />
                            {trivia.alreadyAttempted ? "Completed" : isLive ? "Active" : "Locked"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handlePlayClick(trivia)}
                              className="h-7 px-2.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg gap-1 cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span>Play</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditTrivia(trivia)}
                              className="h-7 px-2 text-xs border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 font-bold rounded-lg gap-1 cursor-pointer"
                            >
                              <Settings className="w-3 h-3" />
                              <span>Edit</span>
                            </Button>
                            {(isAdmin || trivia.is_owner || accountTier === "author") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteTrivia(trivia)}
                                className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-lg gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleShareClick(trivia.session_id || trivia.id)}
                              className="h-7 px-2 text-xs text-gray-400 hover:text-amber-600 cursor-pointer"
                              title="Share"
                            >
                              <Share2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (Compact, Vertical Flow matching Mockup) */}
            <div className="block md:hidden space-y-3 w-full">
              {filteredTrivias.map((trivia) => {
                const isLive = trivia.status === "active" || !trivia.isLockedForTier;
                return (
                  <div
                    key={trivia.id}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3 min-w-0"
                  >
                    {/* Card Header with link to play */}
                    <div 
                      onClick={() => handlePlayClick(trivia)}
                      className="flex items-start justify-between gap-2 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <BrainCircuit className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-amber-600 transition-colors">
                            Trivia Master: {trivia.title}
                          </h4>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0 mt-1" />
                    </div>

                    {/* Metadata Items */}
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pl-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-500 dark:text-slate-400">Category:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {trivia.category || trivia.target_category || (trivia.isGeneral ? "General Knowledge" : "Romance")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          ₦{(Number(trivia.reward_points || 300) * 5).toLocaleString()}
                        </span>
                        {trivia.reward_points && (
                          <span className="text-[10px] text-amber-600 font-semibold">
                            (+{trivia.reward_points} TP)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                          trivia.alreadyAttempted ? "bg-slate-400" : isLive ? "bg-emerald-500" : "bg-amber-500"
                        }`} />
                        <span className="font-medium text-slate-500 dark:text-slate-400">Starts:</span>
                        <span className={`font-semibold ${
                          trivia.alreadyAttempted ? "text-slate-600 dark:text-slate-400" : isLive ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-amber-600 dark:text-amber-400"
                        }`}>
                          {trivia.alreadyAttempted ? "Completed" : isLive ? "Active" : "Locked"}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: Play + Edit + Delete + Share */}
                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 mt-auto">
                      <Button
                        size="sm"
                        onClick={() => handlePlayClick(trivia)}
                        className="h-9 px-4 text-xs bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Play</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTrivia(trivia)}
                        className="h-9 px-3 text-xs border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 font-bold rounded-xl flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Button>

                      {(isAdmin || trivia.is_owner || accountTier === "author") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteTrivia(trivia)}
                          className="h-9 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleShareClick(trivia.session_id || trivia.id)}
                        className="h-9 px-2.5 text-xs text-slate-400 hover:text-amber-600 rounded-xl ml-auto cursor-pointer shrink-0"
                        title="Share Trivia"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="w-full py-12 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/10">
            <div className="bg-amber-50 dark:bg-amber-950/40 w-14 h-14 rounded-full flex items-center justify-center mx-auto text-amber-600">
              <Trophy className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">No trivias available</h3>
              <p className="text-gray-500 text-xs max-w-xs mx-auto">Come back later! New trivia challenges are posted regularly by authors and admins.</p>
            </div>
          </div>
        )}

        {/* ================= HOW TRIVIA REWARDS WORK (Mobile Card Matching Mockup) ================= */}
        <div className="block md:hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">How Trivia Rewards Work</h3>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Complete the trivia, get rewards and track your progress as an author. Engagement fuels the CalmReader ecosystem.
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              1 TP = ₦5.00
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              One attempt per quiz
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              Win on 70%+ score
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              Instant wallet credit
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full text-xs font-bold h-10 border border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            onClick={() => {
              if (!user) {
                alert("Sign in to share and earn rewards!");
                return;
              }
              const referralLink = `${window.location.origin}/?ref=${user.id}`;
              navigator.clipboard.writeText(referralLink);
              setShareToast("Referral invitation link copied to clipboard!");
              setTimeout(() => setShareToast(null), 3000);
            }}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Start Link</span>
          </Button>
        </div>

        {/* ================= MORE OPTIONS ACCORDION (Mobile Matching Mockup) ================= */}
        <div className="block md:hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setIsMoreOptionsOpen(!isMoreOptionsOpen)}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white">More Options</p>
                <p className="text-[10px] text-slate-400 truncate">(Reports, History, Advanced Settings, etc.)</p>
              </div>
            </div>
            {isMoreOptionsOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            )}
          </button>

          {isMoreOptionsOpen && (
            <div className="border-t border-slate-100 dark:border-white/5 divide-y divide-slate-100 dark:divide-white/5">
              <Link
                to="/author-analytics"
                className="p-3 px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-500 group-hover:text-amber-600 transition-colors" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Reports</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                to="/dashboard"
                className="p-3 px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-500 group-hover:text-amber-600 transition-colors" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Session History</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                to="/settings"
                className="p-3 px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-slate-500 group-hover:text-amber-600 transition-colors" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Advanced Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                to="/support"
                className="p-3 px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 text-slate-500 group-hover:text-amber-600 transition-colors" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Help & Support</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          )}
        </div>

        {/* ================= DESKTOP EARNING RULES CARD ================= */}
        <Card className="hidden md:block bg-gradient-to-br from-green-50 to-emerald-50 border-none shadow-sm w-full min-w-0">
          <CardContent className="p-4 sm:p-8">
            <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-center">
              <div className="flex-1 space-y-4 w-full">
                <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center text-green-700">
                  <Coins className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-green-900">How Trivia Rewards Work</h3>
                <p className="text-xs sm:text-sm text-green-800/80 leading-relaxed">
                  Engagement fuels the CalmReader ecosystem. Participate in trivias to test your comprehension 
                  of books you've read or broad concepts. 
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-green-900">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    1 T-Point (TP) = ₦5.00
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-green-900">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    One attempt ever per quiz
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-green-900">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    Win on 70%+ score
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-green-900">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    Instant wallet credit
                  </div>
                </div>
              </div>
              <div className="relative group w-full sm:w-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-white p-4 sm:p-6 rounded-2xl shadow-xl w-full sm:w-64 space-y-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Refer & Earn Bonus</p>
                  <div className="flex flex-col items-center">
                    <Users className="w-12 h-12 text-green-600 mb-2" />
                    <p className="text-center text-xs text-gray-600">Refer a friend and earn 10% of their first purchase + 100 T-Points!</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full text-xs font-bold py-5 border-2 border-green-600 text-green-600 hover:bg-green-50"
                    onClick={() => {
                      if (!user) {
                        alert("Sign in to share and earn rewards!");
                        return;
                      }
                      const referralLink = `${window.location.origin}/?ref=${user.id}`;
                      navigator.clipboard.writeText(referralLink);
                      setShareToast("Referral invitation link copied to clipboard!");
                      setTimeout(() => setShareToast(null), 3000);
                    }}
                  >
                    Share Link
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Control Dialog */}
        {selectedAdminTrivia && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Badge className="bg-amber-100 text-amber-800 border-none font-bold uppercase tracking-wider text-[10px]">
                      Admin/CEO Actions
                    </Badge>
                    <h3 className="text-xl font-bold text-slate-950">
                      {selectedAdminTrivia.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {selectedAdminTrivia.book_title || "General Knowledge"}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedAdminTrivia(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-sm bg-slate-100 h-8 w-8 rounded-full flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>

                <div className="border-t border-slate-100 my-4" />

                <div className="grid grid-cols-1 gap-3">
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 animate-none"
                    onClick={() => {
                      const targetTrivia = selectedAdminTrivia;
                      setSelectedAdminTrivia(null);
                      // Bypass admin check for play
                      navigate(`/trivia/ebook/${targetTrivia.id}`);
                    }}
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Play Trivia
                  </Button>

                  <Button
                    variant="outline"
                    className={`w-full font-bold h-12 rounded-xl flex items-center justify-center gap-2 border ${
                      selectedAdminTrivia.status === "active" 
                        ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" 
                        : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                    }`}
                    onClick={async () => {
                      const targetTrivia = selectedAdminTrivia;
                      setSelectedAdminTrivia(null);
                      setLoading(true);
                      try {
                        const newStatus = targetTrivia.status === "active" ? "suspended" : "active";
                        const isGeneral = targetTrivia.id === "general" || !targetTrivia.book_id;
                        const dbId = isGeneral ? null : (targetTrivia.book_id || targetTrivia.id);

                        const query = isGeneral
                          ? supabase.from("trivias").update({ status: newStatus }).is("book_id", null)
                          : supabase.from("trivias").update({ status: newStatus }).eq("book_id", dbId);

                        const { error } = await query;
                        if (error) throw error;

                        await fetchTrivias();
                        setHubError(null);
                      } catch (err: any) {
                        console.error("[TriviaHub] Suspend action failed:", err);
                        setHubError(`Failed to update trivia status: ${err.message || err}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    <AlertCircle className="w-4 h-4" />
                    {selectedAdminTrivia.status === "active" ? "Suspend Trivia" : "Resume Trivia"}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full bg-red-50 border-red-200 text-red-600 hover:bg-red-100 font-bold h-12 rounded-xl flex items-center justify-center gap-2"
                    onClick={async () => {
                      if (!window.confirm("Are you sure you want to permanently delete this trivia challenge?")) {
                        return;
                      }
                      const targetTrivia = selectedAdminTrivia;
                      setSelectedAdminTrivia(null);
                      setLoading(true);
                      try {
                        const isGeneral = targetTrivia.isGeneral || targetTrivia.id === "general" || !targetTrivia.book_id;
                        const dbId = isGeneral ? "general" : (targetTrivia.book_id || targetTrivia.id);

                        if (isGeneral) {
                          // Delete from trivia_questions (Permanently delete!)
                          const { error: qErr } = await supabase
                            .from("trivia_questions")
                            .delete()
                            .is("ebook_id", null);
                          if (qErr) throw qErr;

                          // Delete from daily_trivia_attempts (Permanently delete!)
                          await supabase
                            .from("daily_trivia_attempts")
                            .delete()
                            .is("ebook_id", null);

                          // Delete from trivias (Permanently delete!)
                          const { error: tErr } = await supabase
                            .from("trivias")
                            .delete()
                            .eq("id", targetTrivia.session_id || targetTrivia.id);
                          if (tErr) throw tErr;
                        } else {
                          // Delete from trivia_questions (Permanently delete!)
                          const { error: qErr } = await supabase
                            .from("trivia_questions")
                            .delete()
                            .eq("ebook_id", dbId);
                          if (qErr) throw qErr;

                          // Delete from daily_trivia_attempts (Permanently delete!)
                          await supabase
                            .from("daily_trivia_attempts")
                            .delete()
                            .eq("ebook_id", dbId);

                          // Delete from trivias (Permanently delete!)
                          const { error: tErr } = await supabase
                            .from("trivias")
                            .delete()
                            .eq("id", targetTrivia.session_id || targetTrivia.id);
                          if (tErr) throw tErr;
                        }

                        // Clear cached landing page data in localStorage and sessionStorage
                        localStorage.removeItem("calmreader_landing_data_cache_local");
                        localStorage.removeItem("calmreader_landing_data_cache_time_local");
                        try {
                          sessionStorage.removeItem("calmreader_landing_data_cache_local");
                          sessionStorage.removeItem("calmreader_landing_data_cache_time_local");
                        } catch (e) {}

                        // Call in-memory landing page cache clear
                        try {
                          clearLandingPageCache();
                        } catch (cErr) {
                          console.warn("Could not clear in-memory landing cache:", cErr);
                        }

                        // Clear any cached trivia progress/data keys from localStorage and sessionStorage
                        try {
                          for (let i = localStorage.length - 1; i >= 0; i--) {
                            const key = localStorage.key(i);
                            if (key && (key.startsWith("trivia_") || key.includes("trivia"))) {
                              localStorage.removeItem(key);
                            }
                          }
                          for (let i = sessionStorage.length - 1; i >= 0; i--) {
                            const key = sessionStorage.key(i);
                            if (key && (key.startsWith("trivia_") || key.includes("trivia"))) {
                              sessionStorage.removeItem(key);
                            }
                          }
                        } catch (lErr) {
                          console.warn("Could not clear storage trivia keys:", lErr);
                        }

                        // Immediately refetch the updated trivia list from Supabase
                        setTrivias([]); // Reset state to ensure fresh list loading
                        await fetchTrivias();
                        setHubError(null);
                      } catch (err: any) {
                        console.error("[TriviaHub] Delete action failed:", err);
                        setHubError(`Failed to delete trivia: ${err.response?.data?.error || err.message || err}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Trivia Permanently
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full text-slate-500 hover:bg-slate-50 font-bold h-12 rounded-xl"
                    onClick={() => setSelectedAdminTrivia(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Floating Success Toast Banner */}
        <AnimatePresence>
          {shareToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-6 right-6 z-[100] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm tracking-tight border border-emerald-500/30 animate-none"
            >
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">✓</div>
              <span>{shareToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Request Trivia Modal */}
        <AnimatePresence>
          {isRequestModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900"
              >
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[10px] uppercase tracking-widest px-2">Step {requestStep} of 2</Badge>
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </div>
                    <h3 className="text-xl font-black text-slate-950 tracking-tight">Request New Trivia Session</h3>
                  </div>
                  <button
                    onClick={() => setIsRequestModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Form Content */}
                <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
                  {requestError && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-800 text-xs font-bold">
                      {requestError}
                    </div>
                  )}

                  {requestSuccess ? (
                    <div className="text-center py-8 space-y-4">
                      <div className="w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto text-3xl font-black">✓</div>
                      <h4 className="text-xl font-black text-slate-900">Submission Successful!</h4>
                      <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
                        Your trivia challenge request has been sent to our editorial board. We will review the content and authorize it shortly.
                      </p>
                      <Button onClick={() => setIsRequestModalOpen(false)} className="bg-slate-950 rounded-xl px-6">
                        Awesome
                      </Button>
                    </div>
                  ) : requestStep === 1 ? (
                    <div className="space-y-4">
                      {/* Step 1: Basic Info */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Attach to Card Book (Optional)</label>
                        <select
                          value={requestBookId}
                          onChange={(e) => setRequestBookId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 font-medium"
                        >
                          <option value="">General Knowledge (No Book Association)</option>
                          {books
                            .filter(b => accountTier === 'author' ? b.user_id === user?.id : true)
                            .map(b => (
                              <option key={b.id} value={b.id}>{b.title}</option>
                            ))
                          }
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">Premium users can request trivias for any books; Authors can request trivias for their own Card Books.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Trivia Title</label>
                          <input
                            type="text"
                            placeholder="e.g. Mastermind Series: Chapter 1"
                            value={requestTitle}
                            onChange={(e) => setRequestTitle(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Duration per Question (Seconds)</label>
                          <input
                            type="number"
                            min="5"
                            max="300"
                            value={requestDuration}
                            onChange={(e) => setRequestDuration(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Description</label>
                        <textarea
                          placeholder="Briefly describe what this trivia test is about..."
                          value={requestDesc}
                          onChange={(e) => setRequestDesc(e.target.value)}
                          rows={3}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Reward T-Points</label>
                          <input
                            type="number"
                            placeholder="e.g. 100"
                            value={requestRewardPoints}
                            onChange={(e) => setRequestRewardPoints(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Price to Play (T-Points)</label>
                          <input
                            type="number"
                            placeholder="e.g. 200"
                            value={requestPrice}
                            onChange={(e) => setRequestPrice(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Step 2: Questions */}
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Trivia Questions ({requestQuestions.length})</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRequestQuestions([...requestQuestions, { question: "", options: ["", "", "", ""], correct_answer: "A", explanation: "", difficulty: "Medium", points: 10 }])}
                          className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs"
                        >
                          + Add Question
                        </Button>
                      </div>

                      {requestQuestions.map((q, idx) => (
                        <div key={idx} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4 relative">
                          {requestQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setRequestQuestions(requestQuestions.filter((_, i) => i !== idx))}
                              className="absolute top-4 right-4 text-xs font-bold text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          )}
                          <h5 className="text-xs font-black text-amber-700 uppercase tracking-widest">Question #{idx + 1}</h5>
                          
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Question Prompt</label>
                            <input
                              type="text"
                              required
                              value={q.question}
                              onChange={(e) => {
                                const newQs = [...requestQuestions];
                                newQs[idx].question = e.target.value;
                                setRequestQuestions(newQs);
                              }}
                              placeholder="e.g. What is the main character's super power?"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {['A', 'B', 'C', 'D'].map((opt, oIdx) => (
                              <div key={opt}>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Option {opt}</label>
                                <input
                                  type="text"
                                  required
                                  value={q.options[oIdx]}
                                  onChange={(e) => {
                                    const newQs = [...requestQuestions];
                                    newQs[idx].options[oIdx] = e.target.value;
                                    setRequestQuestions(newQs);
                                  }}
                                  placeholder={`Enter option ${opt}`}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Correct Answer</label>
                              <select
                                value={q.correct_answer}
                                onChange={(e) => {
                                  const newQs = [...requestQuestions];
                                  newQs[idx].correct_answer = e.target.value;
                                  setRequestQuestions(newQs);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                              >
                                <option value="A">Option A</option>
                                <option value="B">Option B</option>
                                <option value="C">Option C</option>
                                <option value="D">Option D</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Difficulty</label>
                              <select
                                value={q.difficulty}
                                onChange={(e) => {
                                  const newQs = [...requestQuestions];
                                  newQs[idx].difficulty = e.target.value;
                                  setRequestQuestions(newQs);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                              >
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Explanation (Optional)</label>
                            <input
                              type="text"
                              value={q.explanation}
                              onChange={(e) => {
                                const newQs = [...requestQuestions];
                                newQs[idx].explanation = e.target.value;
                                setRequestQuestions(newQs);
                              }}
                              placeholder="Explain why this option is correct..."
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                {!requestSuccess && (
                  <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between shrink-0">
                    {requestStep === 2 ? (
                      <Button
                        variant="outline"
                        onClick={() => setRequestStep(1)}
                        className="rounded-xl border-slate-200 text-slate-700"
                        disabled={isRequestSubmitting}
                      >
                        Back
                      </Button>
                    ) : (
                      <div />
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setIsRequestModalOpen(false)}
                        className="rounded-xl text-slate-500 hover:bg-slate-100"
                        disabled={isRequestSubmitting}
                      >
                        Cancel
                      </Button>

                      {requestStep === 1 ? (
                        <Button
                          onClick={() => {
                            if (!requestTitle.trim() || !requestDesc.trim()) {
                              setRequestError("Title and Description are required.");
                              return;
                            }
                            setRequestError(null);
                            setRequestStep(2);
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl px-6"
                        >
                          Next: Questions
                        </Button>
                      ) : (
                        <Button
                          onClick={async () => {
                            // Validation
                            const invalidQ = requestQuestions.some(q => !q.question.trim() || q.options.some((o: string) => !o.trim()));
                            if (invalidQ) {
                              setRequestError("Please fill out all questions and option prompts.");
                              return;
                            }
                            setIsRequestSubmitting(true);
                            setRequestError(null);
                            try {
                              // We insert a row in public.trivias
                              const { error: insertErr } = await supabase.from('trivias').insert({
                                title: requestTitle,
                                description: requestDesc,
                                book_id: requestBookId || null,
                                duration_seconds: parseInt(requestDuration) || 15,
                                reward_points: parseInt(requestRewardPoints) || 100,
                                price: parseInt(requestPrice) || 0,
                                status: 'pending', // Pending Admin review!
                                is_active: false,
                                type: 'marketing',
                                requires_premium: false,
                                starts_at: new Date().toISOString(),
                                creator_id: user?.id || null,
                                promotional_writeup: JSON.stringify(requestQuestions) // Serialize questions in promotional_writeup!
                              });

                              if (insertErr) throw insertErr;
                              setRequestSuccess("SUBMISSION SUCCESSFUL!");
                            } catch (err: any) {
                              console.error("[RequestTrivia] Failed to submit request:", err);
                              setRequestError(err.message || "Failed to submit request. Please try again.");
                            } finally {
                              setIsRequestSubmitting(false);
                            }
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl px-6"
                          disabled={isRequestSubmitting}
                        >
                          {isRequestSubmitting ? "Submitting..." : "Submit Trivia Request"}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};
