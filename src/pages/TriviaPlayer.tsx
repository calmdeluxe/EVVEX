// LEGACY: CalmReader file, not part of EVEX product. To be unmounted in a later pass.
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { isPlatformAdminEmail } from '../lib/authorization';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BrainCircuit, 
  Timer, 
  AlertCircle, 
  ChevronRight, 
  Trophy, 
  CheckCircle2, 
  XCircle,
  Clock,
  ArrowLeft,
  Coins,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { canPlayTrivia, isAdmin as checkIsAdmin, TriviaIneligibleReason, getReasonLabel } from '../utils/triviaEligibility';

export const TriviaPlayer: React.FC = () => {
  const { id } = useParams();
  const { user, isAuthReady, isAdmin, accountTier, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Security Redirect
  useEffect(() => {
    if (isAuthReady && !authLoading && !user) {
      console.log('[TriviaPlayer] Unauthenticated access. Redirecting to login.');
      const redirectUrl = window.location.pathname + window.location.search;
      sessionStorage.setItem('redirectAfterLogin', redirectUrl);
      localStorage.setItem('redirectAfterLogin', redirectUrl);
      navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
    }
  }, [user, isAuthReady, authLoading, navigate]);

  // REWARD UI: display wallet balance and points
  // BAN DUMMY: filter out test/mock data
  const [trivia, setTrivia] = useState<any>(null);
  const [triviaId, setTriviaId] = useState<string>('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'result'>('intro');
  const [claimPhone, setClaimPhone] = useState('');
  const [claimNetwork, setClaimNetwork] = useState('MTN');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [dataClaimSuccess, setDataClaimSuccess] = useState(false);

  const [copied, setCopied] = useState(false);

  const handleShareClick = async () => {
    if (!user) {
      alert("Sign in to share and earn rewards!");
      return;
    }
    const shareUrl = `${window.location.origin}/trivia/share/${triviaId || id}?ref=${user.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: trivia?.title || 'Trivia Challenge',
          url: shareUrl
        });
      } catch (e) {
        console.warn("Web Share failed:", e);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const submitClaimData = async () => {
    if (!claimPhone) {
      setClaimError('Please provide your mobile number.');
      return;
    }
    setClaiming(true);
    setClaimError('');
    try {
      const session = await supabase.auth.getSession();
      const userId = session.data.session?.user?.id;
      if (!userId) throw new Error("No user session found");

      const mbAmount = participationResult?.rewardStatus === 'grand_winner' ? 2000 : 300;
      
      const { error: insertErr } = await supabase
        .from('support_requests')
        .insert({
          user_id: userId,
          type: "Data Reward",
          subject: `Data Reward Claim: ${mbAmount} MB (${claimNetwork} - ${claimPhone})`,
          message: `Phone: ${claimPhone}\nNetwork: ${claimNetwork}\nAmount: ${mbAmount} MB\n\nNotes: User claimed from successful trivia game.`,
          status: 'pending'
        });

      if (insertErr) throw insertErr;

      setDataClaimSuccess(true);
    } catch (err: any) {
      console.error(err);
      setClaimError(err.message || 'Failed to submit claim.');
    } finally {
      setClaiming(false);
    }
  };
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [currentQuestionDuration, setCurrentQuestionDuration] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ineligibleReason, setIneligibleReason] = useState<TriviaIneligibleReason | null>(null);
  const [associatedBookId, setAssociatedBookId] = useState<string>('');
  const [participationResult, setParticipationResult] = useState<any>(null);
  
  const [trueWinnersCount, setTrueWinnersCount] = useState(0);
  const [compensatedCount, setCompensatedCount] = useState(0);
  const [payoutPoolExhausted, setPayoutPoolExhausted] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [questionResults, setQuestionResults] = useState<any[]>([]);

  const [isTimedOut, setIsTimedOut] = useState(false);

  const getQuestionDuration = (questionIndex: number, questionsList: any[] = questions) => {
    if (trivia?.duration_seconds && trivia.duration_seconds > 0) {
      return trivia.duration_seconds;
    }
    const isGeneral = !associatedBookId || id === 'general';
    if (isGeneral) {
      return 8; // General knowledge: 8 seconds maximum (5-8 range)
    } else {
      const q = questionsList[questionIndex];
      if (q && q.difficulty && q.difficulty.toLowerCase() === 'hard') {
        return 3; // Hard question: 3 seconds maximum
      }
      return 5; // Default / medium book trivia: 5 seconds maximum
    }
  };

  const checkBypass = () => {
    if (isPlatformAdminEmail(user?.email)) {
      return true; // Bypass all checks for verified platform administrators
    }
    return false;
  };

  useEffect(() => {
    if (!isAuthReady || authLoading) return;
    if (!user) {
      const redirectUrl = window.location.pathname + window.location.search;
      navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    const fetchTrivia = async () => {
      try {
        const userWithRole = {
          ...user,
          role: profile?.role || (user as any)?.role,
          account_tier: profile?.account_tier || accountTier || 'free',
          is_admin: profile?.is_admin === true || isAdmin === true || (user as any)?.is_admin === true || checkBypass(),
        };

        const isEligibleBypass = checkIsAdmin(userWithRole);

        let dbTrivia: any = null;
        let activeTriviaId = '';

        if (!id) {
          throw new Error("Trivia not found");
        }

        const isValidUUID = (val: string) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return uuidRegex.test(val);
        };

        let resolvedId = id;

        // If the ID is 'general', find the active general trivia UUID in the database
        if (id === 'general') {
          const { data: generalTrivia, error: genError } = await supabase
            .from('trivias')
            .select('id')
            .is('book_id', null)
            .eq('deleted', false)
            .eq('status', 'active')
            .maybeSingle();

          if (genError) {
            console.warn("[TriviaPlayer] Error querying general trivia:", genError);
          } else if (generalTrivia) {
            resolvedId = generalTrivia.id;
            console.log(`[TriviaPlayer] Resolved "general" to trivia UUID "${resolvedId}"`);
          } else {
            // Also try without status active just in case
            const { data: generalTriviaAny } = await supabase
              .from('trivias')
              .select('id')
              .is('book_id', null)
              .eq('deleted', false)
              .maybeSingle();
            if (generalTriviaAny) {
              resolvedId = generalTriviaAny.id;
            }
          }
        } else if (/^\d+$/.test(id)) {
          // If the ID is numeric, attempt to find the corresponding UUID in the database
          const bookIdNum = parseInt(id, 10);
          const { data: foundTriviaByBook, error: findError } = await supabase
            .from('trivias')
            .select('id')
            .eq('book_id', bookIdNum)
            .maybeSingle();

          if (findError) {
            console.warn("[TriviaPlayer] Error querying trivia by numeric book_id:", findError);
          } else if (foundTriviaByBook) {
            resolvedId = foundTriviaByBook.id;
            console.log(`[TriviaPlayer] Resolved numeric ID "${id}" to trivia UUID "${resolvedId}"`);
          } else {
            throw new Error("Trivia not found");
          }
        }

        // Validate that resolvedId is a valid UUID
        if (!isValidUUID(resolvedId)) {
          throw new Error("Invalid trivia link. Please check the URL.");
        }

        // Ensure the query uses ONLY .eq('id', resolvedId) — no extra filters.
        const { data: triviaData, error: triviaError } = await supabase
          .from('trivias')
          .select('*')
          .eq('id', resolvedId)
          .maybeSingle();

        if (triviaError) {
          throw new Error(`Failed to load trivia: ${triviaError.message}`);
        }

        dbTrivia = triviaData;

        // Fallback: If no direct trivia was found and the resolvedId is a UUID, it might be a book_id (UUID)
        if (!dbTrivia && isValidUUID(resolvedId)) {
          console.log(`[TriviaPlayer] Direct lookup by trivia ID "${resolvedId}" failed, trying lookup as book_id UUID...`);
          const { data: triviaByBook, error: bookTriviaErr } = await supabase
            .from('trivias')
            .select('*')
            .eq('book_id', resolvedId)
            .maybeSingle();

          if (bookTriviaErr) {
            console.warn("[TriviaPlayer] Error querying trivia by book_id UUID:", bookTriviaErr);
          } else if (triviaByBook) {
            dbTrivia = triviaByBook;
            console.log(`[TriviaPlayer] Resolved book UUID "${resolvedId}" to trivia UUID "${dbTrivia.id}"`);
          }
        }

        if (!dbTrivia) {
          throw new Error("Trivia not found");
        }

        if (dbTrivia.book_id) {
          setAssociatedBookId(dbTrivia.book_id);
        }

        activeTriviaId = dbTrivia.id;
        if (activeTriviaId) {
          setTriviaId(activeTriviaId);
        }

        // Authoritative Eligibility Check (Marketing vs Reader-Reward)
        let alreadyPlayed = false;
        let hasPurchased = false;
        let hasCompletedReading = false;
        let hasPaidEntryFee = Number(dbTrivia.price || 0) === 0;

        if (activeTriviaId && user?.id && !isEligibleBypass) {
          // Check daily_trivia_attempts & trivia_participations
          const { data: att } = await supabase
            .from('daily_trivia_attempts')
            .select('id')
            .eq('user_id', user.id)
            .eq('ebook_id', dbTrivia.book_id || "general")
            .maybeSingle();

          const { data: part } = await supabase
            .from('trivia_participations')
            .select('id')
            .eq('user_id', user.id)
            .eq('trivia_id', activeTriviaId)
            .maybeSingle();

          alreadyPlayed = !!(att || part);

          if (dbTrivia.book_id) {
            // Check ebook purchases
            const { data: purchase } = await supabase
              .from('ebook_purchases')
              .select('id')
              .eq('user_id', user.id)
              .eq('ebook_id', dbTrivia.book_id)
              .maybeSingle();

            const { data: bookRec } = await supabase
              .from('books')
              .select('price, is_free')
              .eq('id', dbTrivia.book_id)
              .maybeSingle();

            const isFreeBook = bookRec?.is_free === true || Number(bookRec?.price || 0) === 0;
            hasPurchased = !!purchase || isFreeBook;

            // Check reading progress
            const { data: progress } = await supabase
              .from('reading_progress')
              .select('completed, progress')
              .eq('user_id', user.id)
              .eq('book_id', dbTrivia.book_id)
              .maybeSingle();

            hasCompletedReading = progress ? (progress.completed === true || (progress.progress !== undefined && progress.progress >= 90)) : false;
          }

          if (Number(dbTrivia.price || 0) > 0) {
            const { data: feePart } = await supabase
              .from('trivia_participations')
              .select('id')
              .eq('user_id', user.id)
              .eq('trivia_id', activeTriviaId)
              .maybeSingle();
            hasPaidEntryFee = !!feePart;
          }
        }

        const eligibility = canPlayTrivia(userWithRole, dbTrivia, {
          hasPurchasedBook: hasPurchased,
          hasCompletedReading: hasCompletedReading,
          alreadyPlayed: alreadyPlayed,
          hasPaidEntryFee: hasPaidEntryFee,
        });

        if (!eligibility.eligible) {
          setIneligibleReason(eligibility.reason);
          throw new Error(eligibility.message);
        }

        // 2. Fetch questions
        let dbQuestions: any[] = [];
        const targetBookId = dbTrivia?.book_id; // null for general, UUID for books

        if (activeTriviaId) {
          const { data: qSessionData, error: qSessionErr } = await supabase
            .from('trivia_questions')
            .select('*')
            .eq('trivia_id', activeTriviaId)
            .eq('is_active', true)
            .order('order_number', { ascending: true });

          if (!qSessionErr && qSessionData && qSessionData.length > 0) {
            dbQuestions = qSessionData;
          }
        }

        if (dbQuestions.length === 0) {
          const qQuery = targetBookId
            ? supabase.from('trivia_questions').select('*').eq('ebook_id', targetBookId)
            : supabase.from('trivia_questions').select('*').is('ebook_id', null);

          const { data: qData, error: qErr } = await qQuery
            .eq('is_active', true)
            .order('order_number', { ascending: true });

          if (qErr) {
            console.warn("Error fetching questions via book_id/null:", qErr);
          } else if (qData) {
            dbQuestions = qData;
          }
        }
        
        // If no questions found from the active session, fetch general questions from trivia_questions
        if (dbQuestions.length === 0) {
          const { data: generalQ } = await supabase
            .from('trivia_questions')
            .select('*')
            .is('ebook_id', null)
            .eq('is_active', true)
            .limit(10);
          if (generalQ && generalQ.length > 0) {
            dbQuestions = generalQ;
          } else {
            // Try vault
            const { data: vaultQ } = await supabase
              .from('vault')
              .select('*')
              .eq('type', 'trivia_question')
              .limit(10);
            if (vaultQ) {
              dbQuestions = vaultQ.map((v: any, idx: number) => ({
                id: v.id,
                question: v.question_text || v.title || 'Trivia Question',
                options: Array.isArray(v.options) ? v.options : ['A', 'B', 'C', 'D'],
                correct_answer: v.correct_answer || 'A',
                explanation: v.explanation || '',
                difficulty: 'Medium',
                points: 10,
                order_number: idx + 1
              }));
            }
          }
        }

        if (dbQuestions.length === 0) {
          throw new Error("No trivia questions found in the database.");
        }

        setQuestions(dbQuestions);
        setTrueWinnersCount(0);
        setCompensatedCount(0);
        setPayoutPoolExhausted(false);

        const resolvedDuration = dbTrivia?.duration_seconds !== undefined && dbTrivia?.duration_seconds !== null
          ? parseInt(String(dbTrivia.duration_seconds))
          : 20;

        setTrivia({
          title: dbTrivia?.title || "Trivia Challenge",
          description: dbTrivia?.description || "Test your knowledge and earn points!",
          reward_points: dbTrivia?.reward_points || 10,
          duration_seconds: resolvedDuration > 0 ? resolvedDuration : 20
        });

        const savedProgressKey = `trivia_progress_${user?.id || 'anon'}_${activeTriviaId}`;
        const savedProgress = localStorage.getItem(savedProgressKey);
        if (savedProgress) {
          setHasSavedProgress(true);
          try {
            const saved = JSON.parse(savedProgress);
            if (saved && typeof saved.currentQuestionIndex === 'number') {
              setCurrentQuestionIndex(saved.currentQuestionIndex);
              setScore(saved.score || 0);
              setQuestionResults(saved.questionResults || []);
              const savedDur = getQuestionDuration(saved.currentQuestionIndex, dbQuestions);
              setCurrentQuestionDuration(savedDur);
              setTimeLeft(savedDur);
            } else {
              setCurrentQuestionIndex(0);
              setScore(0);
              const initialDur = resolvedDuration > 0 ? resolvedDuration : 20;
              setCurrentQuestionDuration(initialDur);
              setTimeLeft(initialDur);
            }
          } catch (e) {
            setCurrentQuestionIndex(0);
            setScore(0);
            const initialDur = resolvedDuration > 0 ? resolvedDuration : 20;
            setCurrentQuestionDuration(initialDur);
            setTimeLeft(initialDur);
          }
        } else {
          setHasSavedProgress(false);
          setCurrentQuestionIndex(0);
          setScore(0);
          const initialDur = resolvedDuration > 0 ? resolvedDuration : 20;
          setCurrentQuestionDuration(initialDur);
          setTimeLeft(initialDur);
        }
      } catch (fallbackErr: any) {
        console.error("Trivia direct load error details:", fallbackErr);
        setError(fallbackErr.message || 'Failed to load trivia');
      } finally {
        setLoading(false);
      }
    };
    fetchTrivia();
  }, [id, user, isAuthReady, authLoading, isAdmin, accountTier, profile]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (gameState === 'playing' && timeLeft > 0 && !showExplanation) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState, showExplanation, currentQuestionIndex, timeLeft]);

  useEffect(() => {
    if (gameState === 'playing' && triviaId) {
      const savedProgressKey = `trivia_progress_${user?.id || 'anon'}_${triviaId}`;
      localStorage.setItem(savedProgressKey, JSON.stringify({
        currentQuestionIndex,
        score,
        questionResults
      }));
    }
  }, [currentQuestionIndex, score, questionResults, gameState, user, triviaId]);

  const handleTimeout = async () => {
    if (showExplanation) return;
    setIsTimedOut(true);
    setIsCorrect(false);
    setShowExplanation(true);
    
    const currentQ = questions[currentQuestionIndex];
    const resultPayload = { question_id: currentQ.id, selected_answer: "", is_correct: false };

    setQuestionResults(prev => [
      ...prev,
      resultPayload
    ]);
  };

  const handleStart = () => {
    setGameState('playing');
    const initialDur = getQuestionDuration(currentQuestionIndex);
    setCurrentQuestionDuration(initialDur);
    setTimeLeft(initialDur);
  };

  const handleSelectOption = async (option: string) => {
    if (showExplanation) return;
    
    setSelectedOption(questions[currentQuestionIndex].options.indexOf(option));
    const currentQ = questions[currentQuestionIndex];
    const correct = option === currentQ.correct_answer;
    
    setIsCorrect(correct);
    setShowExplanation(true);
    if (correct) setScore(s => s + 1);

    const resultPayload = { question_id: currentQ.id, selected_answer: option, is_correct: correct };

    setQuestionResults(prev => [
      ...prev,
      resultPayload
    ]);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setShowExplanation(false);
      setIsCorrect(null);
      setSelectedOption(null);
      setIsTimedOut(false);
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      const nextDur = getQuestionDuration(nextIdx);
      setCurrentQuestionDuration(nextDur);
      setTimeLeft(nextDur);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setGameState('result');
    setIsSubmitting(true);
    if (triviaId) {
      const savedProgressKey = `trivia_progress_${user?.id || 'anon'}_${triviaId}`;
      localStorage.removeItem(savedProgressKey);
    }
    try {
      const correctAnswersCount = questionResults.filter((r: any) => r.is_correct).length;
      const totalQCount = questions.length;
      const scorePercent = totalQCount > 0 ? (correctAnswersCount / totalQCount) * 100 : 0;
      const isWin = scorePercent >= 70;
      const pointsAwarded = isWin ? (trivia?.reward_points || 10) : 0;

      const currentSession = (await supabase.auth.getSession()).data.session;
      const userId = currentSession?.user?.id;

      if (userId && triviaId) {
        // Log completion in trivia_participations
        await supabase.from('trivia_participations').upsert({
          trivia_id: triviaId,
          user_id: userId,
          score: correctAnswersCount,
          points_earned: pointsAwarded,
          completed_at: new Date().toISOString()
        });

        // Add points and wallet balance to user profile
        if (pointsAwarded > 0) {
          // Read current t_points and wallet_balance from users table
          const { data: userData } = await supabase
            .from('users')
            .select('t_points, wallet_balance')
            .eq('id', userId)
            .maybeSingle();
          
          const currentPoints = userData?.t_points || 0;
          const currentWallet = userData?.wallet_balance || 0;
          const walletCredit = pointsAwarded * 5; // Conversion factor of 5 Naira per T-Point

          await supabase
            .from('users')
            .update({ 
              t_points: currentPoints + pointsAwarded,
              wallet_balance: currentWallet + walletCredit
            })
            .eq('id', userId);

          // Log transaction of type trivia_reward
          await supabase.from('transactions').insert({
            user_id: userId,
            type: 'trivia_reward',
            amount: walletCredit,
            status: 'successful',
            book_id: trivia?.book_id || null
          });
        }
      }

      setParticipationResult({
        success: true,
        score: correctAnswersCount,
        totalQuestions: totalQCount,
        pointsEarned: pointsAwarded,
        rewardStatus: pointsAwarded > 0 ? 'grand_winner' : 'consolation',
        won: pointsAwarded > 0
      });
    } catch (fallbackErr: any) {
      console.error("Trivia submission error:", fallbackErr);
      setError('Failed to submit results. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center min-h-[60vh]"><div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div></DashboardLayout>;
  if (error) {
    const isAccessError = error.toLowerCase().includes("own this") || 
                          error.toLowerCase().includes("not found") || 
                          error.toLowerCase().includes("permission") || 
                          error.toLowerCase().includes("access") ||
                          error.toLowerCase().includes("locked") ||
                          error.toLowerCase().includes("read/purchase") ||
                          error.toLowerCase().includes("read the full book");

    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto py-16 px-6 text-center bg-white border border-slate-100 rounded-[2.5rem] shadow-xl space-y-6 animate-fade-in my-8">
          <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-red-600">
            <AlertCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Access Restricted</h2>
            {ineligibleReason && (
              <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider">
                {getReasonLabel(ineligibleReason)}
              </span>
            )}
            <p className="text-slate-500 text-sm leading-relaxed">
              {error}
            </p>
          </div>

          {ineligibleReason === 'READING_INCOMPLETE' || error.toLowerCase().includes("finish reading") || error.toLowerCase().includes("read/purchase") ? (
            <div className="space-y-4 pt-2">
              <div className="bg-indigo-50 border border-indigo-150 p-4 rounded-2xl text-indigo-900 text-xs font-semibold leading-relaxed text-left">
                💡 <span className="font-bold">Reader-Reward Qualification:</span> This trivia rewards genuine readers who have completed at least 90% of the book. Read the cards inside your account to unlock this challenge!
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => navigate(`/ebook/${associatedBookId || id}`)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 font-black text-xs uppercase tracking-wider h-12 rounded-xl text-white shadow-md transition-all duration-200"
                >
                  Read eBook Now &rarr;
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/trivia')}
                  className="w-full border-slate-200 text-slate-650 font-bold text-xs h-12 rounded-xl hover:bg-slate-50"
                >
                  Back to Trivia Hub
                </Button>
              </div>
            </div>
          ) : ineligibleReason === 'BOOK_NOT_PURCHASED' ? (
            <div className="space-y-4 pt-2">
              <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-2xl text-amber-900 text-xs font-semibold leading-relaxed text-left">
                💡 <span className="font-bold">Reader-Reward Qualification:</span> To participate in this book-specific Reader-Reward Trivia and earn verified T-Points, you must first purchase the linked eBook.
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => navigate(`/book/${associatedBookId || id}/buy`)}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-none font-black text-xs uppercase tracking-wider h-12 rounded-xl text-white shadow-md transition-all duration-200"
                >
                  Purchase eBook Now
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/bookshelf')}
                  className="w-full border-slate-200 text-slate-650 font-bold text-xs h-12 rounded-xl hover:bg-slate-50"
                >
                  Browse eBook Store
                </Button>
              </div>
            </div>
          ) : ineligibleReason === 'ALREADY_PLAYED' ? (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-slate-700 text-xs font-medium text-left">
                ℹ️ You have already completed your attempt for this trivia session. To maintain fair leaderboard rewards, sessions can only be played once.
              </div>
              <Button 
                onClick={() => navigate('/trivia')}
                className="w-full bg-amber-600 hover:bg-amber-700 font-bold h-12 rounded-xl text-white"
              >
                Explore More Trivias
              </Button>
            </div>
          ) : isAccessError && (id !== 'general' && associatedBookId) ? (
            <div className="space-y-4 pt-2">
              <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-2xl text-amber-900 text-xs font-semibold leading-relaxed text-left">
                💡 <span className="font-bold">Ecosystem Recommendation:</span> To unlock this interactive trivia and start earning high-value T-Points, purchase the linked eBook. Finish reading it to qualify!
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => navigate(`/book/${associatedBookId || id}/buy`)}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-none font-black text-xs uppercase tracking-wider h-12 rounded-xl text-white shadow-md transition-all duration-200"
                >
                  Purchase eBook Now
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/bookshelf')}
                  className="w-full border-slate-200 text-slate-650 font-bold text-xs h-12 rounded-xl hover:bg-slate-50"
                >
                  Browse eBook Store
                </Button>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <Button 
                onClick={() => navigate('/trivia')}
                className="w-full bg-amber-600 hover:bg-amber-700 font-bold h-12 rounded-xl text-white"
              >
                Back to Trivia Hub
              </Button>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <AnimatePresence mode="wait">
          {gameState === 'intro' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="text-center space-y-8 py-12"
            >
              <div className="bg-amber-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-amber-600">
                <BrainCircuit className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">{trivia.title}</h1>
                <p className="text-gray-500 max-w-lg mx-auto">{trivia.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 mb-1 uppercase">Questions</p>
                  <p className="text-2xl font-bold text-gray-950">{questions.length}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 mb-1 uppercase">Time / Question</p>
                  <p className="text-xl font-black text-gray-950">
                    {(!associatedBookId || id === 'general') ? '8s max' : '3s - 5s max'}
                  </p>
                </div>
              </div>

              <Card className="bg-amber-50 border-amber-200 shadow-sm max-w-md mx-auto">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Trophy className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                    <div className="text-left">
                      <p className="font-bold text-amber-900">Win {trivia.reward_points} T-Points!</p>
                      <p className="text-sm text-amber-800/80">Score at least 70% to claim your reward. This goes straight to your wallet balance.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* NAIRA CASH PRIZES LEADER QUOTA ALERT */}
              <Card className="bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-500/20 text-white shadow-lg max-w-md mx-auto overflow-hidden">
                <CardContent className="p-6 text-left space-y-4">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-indigo-400" />
                    <span className="font-black text-xs uppercase tracking-widest text-indigo-200">Exclusive Trivia Cash Pool</span>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <div>
                        <p className="font-bold text-gray-100">🥇 True Winner (₦5,000)</p>
                        <p className="text-xs text-indigo-300">Requires 98.9% or higher score</p>
                      </div>
                      <Badge className={trueWinnersCount >= 1 ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}>
                        {trueWinnersCount >= 1 ? "Claimed" : "1 Available"}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-100">🎁 Compensation (₦1,000)</p>
                        <p className="text-xs text-indigo-300">Requires 80.0% or higher score</p>
                      </div>
                      <Badge className={compensatedCount >= 4 ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}>
                        {compensatedCount >= 4 ? "All Claimed" : `${4 - compensatedCount} Available`}
                      </Badge>
                    </div>
                  </div>

                  {payoutPoolExhausted ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 leading-normal">
                      ⚠️ Note: Cash reward pools for this trivia are currently exhausted. You will still receive standard T-Points and complete the challenge!
                    </div>
                  ) : (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-xs text-indigo-300 leading-normal">
                      ✨ Successful rewards automatically file a <strong>₦ Cash Approval Ticket</strong> straight to your bank account dashboard!
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="pt-4 space-x-4 flex justify-center items-center">
                <Button variant="ghost" className="font-bold px-8" onClick={() => navigate('/trivia')}>Cancel</Button>
                <Button 
                  variant="outline"
                  className="font-bold px-8 flex items-center gap-2 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 h-10"
                  onClick={handleShareClick}
                >
                  <Share2 className="w-4 h-4 text-indigo-500" />
                  {copied ? 'Copied!' : 'Share Challenge'}
                </Button>
                <Button className="bg-amber-600 hover:bg-amber-700 font-extrabold px-12 py-6 text-lg shadow-lg shadow-amber-200" onClick={handleStart}>
                  {hasSavedProgress ? "Resume Trivia" : "Start Trivia"}
                </Button>
              </div>
            </motion.div>
          )}

          {gameState === 'playing' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => navigate('/trivia')}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Quit
                </Button>
                {trivia?.duration_seconds > 0 ? (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${
                    timeLeft <= 5 ? 'bg-red-100 text-red-700 animate-bounce shadow-md shadow-red-200 ring-2 ring-red-500' : 
                    timeLeft <= 10 ? 'bg-amber-100 text-amber-700 animate-pulse' : 
                    'bg-gray-100 text-gray-700'
                  }`}>
                    <Clock className={`w-4 h-4 ${timeLeft <= 5 ? 'animate-spin' : ''}`} />
                    <span className="font-mono text-lg">{timeLeft}s remaining</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-700 font-bold">
                    <Clock className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Untimed Challenge</span>
                  </div>
                )}
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                  Question {currentQuestionIndex + 1}/{questions.length}
                </div>
              </div>

              {/* Ticking Question Timer Progress Bar */}
              {currentQuestionDuration > 0 && (
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden relative shadow-inner">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      timeLeft <= 2 ? 'bg-red-500 animate-pulse' : timeLeft <= 4 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(timeLeft / (currentQuestionDuration || 5)) * 100}%` }}
                  />
                </div>
              )}

              <Progress value={questions.length > 0 ? ((((currentQuestionIndex + 1) / questions.length) * 100) || 0) : 0} className="h-1 bg-gray-100" />

              <div className="space-y-8 py-8">
                <div className="space-y-2">
                   <div className="flex items-center gap-2">
                     <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-widest ${
                       questions[currentQuestionIndex].difficulty === 'Hard' ? 'text-red-600 border-red-200 bg-red-50' :
                       questions[currentQuestionIndex].difficulty === 'Medium' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                       'text-green-600 border-green-200 bg-green-50'
                     }`}>
                       {questions[currentQuestionIndex].difficulty || 'Medium'}
                     </Badge>
                   </div>
                   <h2 className="text-base md:text-lg font-black tracking-tight text-gray-950 leading-snug">
                     {questions[currentQuestionIndex].question}
                   </h2>
                </div>

                <div className="grid gap-4">
                  {questions[currentQuestionIndex].options.map((option: string, i: number) => {
                    const isCorrectOption = option === questions[currentQuestionIndex].correct_answer;
                    const isSelected = selectedOption === i;
                    
                    let variantClass = 'border-gray-100 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50';
                    if (showExplanation) {
                      if (isCorrectOption) {
                        variantClass = 'border-green-500 bg-green-50 text-green-900 ring-4 ring-green-100 shadow-sm';
                      } else if (isSelected && !isCorrectOption) {
                        variantClass = 'border-red-500 bg-red-50 text-red-900 ring-4 ring-red-100';
                      } else {
                        variantClass = 'border-gray-100 bg-white text-gray-300 opacity-50';
                      }
                    } else if (isSelected) {
                      variantClass = 'border-amber-600 bg-amber-50 text-amber-900 shadow-md ring-4 ring-amber-100';
                    }

                    return (
                      <button
                        key={i}
                        disabled={showExplanation}
                        onClick={() => handleSelectOption(option)}
                        className={`w-full text-left p-3.5 md:p-4 rounded-xl border-2 transition-all font-bold text-xs md:text-sm flex items-center justify-between group ${variantClass}`}
                      >
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs md:text-sm shrink-0 ${
                            showExplanation && isCorrectOption ? 'bg-green-600 text-white' :
                            showExplanation && isSelected && !isCorrectOption ? 'bg-red-600 text-white' :
                            isSelected ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </div>
                          <span className="flex-1 leading-tight">{option}</span>
                        </div>
                        {showExplanation && isCorrectOption && <CheckCircle2 className="w-6 h-6 text-green-600" />}
                        {showExplanation && isSelected && !isCorrectOption && <XCircle className="w-6 h-6 text-red-600" />}
                        {isSelected && !showExplanation && <div className="w-6 h-6 rounded-full bg-amber-600" />}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {showExplanation && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={`p-6 rounded-2xl border-2 ${
                        isCorrect ? 'bg-green-50 border-green-100 text-green-900' :
                        isTimedOut ? 'bg-red-50 border-red-200 text-red-950 ring-2 ring-red-500 ring-offset-2' :
                        'bg-red-50 border-red-100 text-red-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : isTimedOut ? (
                          <Clock className="w-5 h-5 text-red-650 animate-pulse" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-650" />
                        )}
                        <span className="font-black uppercase tracking-widest text-xs">
                          {isCorrect ? 'Excellent!' : isTimedOut ? "⏰ TIME'S UP FOR THIS QUESTION!" : 'Not quite...'}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">
                        {questions[currentQuestionIndex].explanation}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex justify-end pt-8">
                <Button 
                  disabled={!showExplanation}
                  onClick={handleNext}
                  className="bg-gray-900 hover:bg-gray-800 text-white font-bold py-6 px-12 text-lg rounded-full"
                >
                  {currentQuestionIndex === questions.length - 1 ? 'Finish & See Score' : 'Next Question'}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {gameState === 'result' && (
            <motion.div
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 space-y-12"
            >
              {isSubmitting ? (
                <div className="space-y-6">
                  <div className="w-20 h-20 border-8 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <h2 className="text-2xl font-bold text-gray-900">Calculating your rewards...</h2>
                  <p className="text-gray-500">Submitting your answers to secure your rewards.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {participationResult?.won ? (
                      <div className="relative inline-block">
                        <motion.div 
                          initial={{ scale: 0 }} 
                          animate={{ scale: 1 }} 
                          transition={{ type: 'spring', damping: 10 }}
                          className="bg-green-100 w-32 h-32 rounded-full flex items-center justify-center mx-auto text-green-600"
                        >
                          <Trophy className="w-16 h-16" />
                        </motion.div>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          className="absolute -inset-4 border-4 border-dashed border-green-300 rounded-full"
                        />
                      </div>
                    ) : (
                      <div className="bg-red-100 w-32 h-32 rounded-full flex items-center justify-center mx-auto text-red-600">
                        <XCircle className="w-16 h-16" />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <h2 className="text-4xl font-black text-gray-900">
                        {participationResult?.won ? 'VICTORY!' : 'BETTER LUCK NEXT TIME'}
                      </h2>
                      <p className="text-xl font-bold text-gray-500">
                        You scored {score}/{questions.length}
                      </p>
                    </div>
                  </div>

                  {participationResult?.won && (
                    <Card className="bg-gradient-to-br from-green-600 to-emerald-700 text-white border-none shadow-2xl max-w-md mx-auto overflow-hidden">
                      <CardContent className="p-8 space-y-4">
                        <Coins className="w-12 h-12 text-green-200 mx-auto" />
                        <div className="space-y-1">
                          <p className="text-green-100 font-bold uppercase tracking-widest text-xs">Reward Earned</p>
                          <p className="text-5xl font-black">{participationResult.pointsEarned} TP</p>
                        </div>
                        <p className="text-green-50/70 text-sm">
                          ₦{(participationResult.pointsEarned * 5).toLocaleString()} has been added to your T-Points wallet.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {participationResult?.won && (
                    <Card className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-none shadow-2xl max-w-md mx-auto overflow-hidden mt-4">
                      <CardContent className="p-8 space-y-4 text-left">
                        <div className="flex items-center gap-3 mb-2 justify-center text-center">
                          <CheckCircle2 className="w-8 h-8 text-green-300 animate-bounce" />
                          <h3 className="font-extrabold text-xl">Claim Your Data Reward!</h3>
                        </div>
                        <p className="text-indigo-100 text-xs text-center leading-relaxed">
                          Enter your phone line and active network carrier below so our manual payment center can process your data package instantly.
                        </p>
                        
                        {dataClaimSuccess ? (
                          <div className="p-4 bg-emerald-600/35 border border-emerald-500 rounded-2xl text-center font-bold text-sm text-green-200">
                             🎉 Claim Ticket Submitted Successfully!
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase text-indigo-200 tracking-widest pl-1">Phone Number</Label>
                              <Input 
                                type="text"
                                placeholder="e.g. 080XXXXXXXX" 
                                value={claimPhone} 
                                onChange={(e) => setClaimPhone(e.target.value)}
                                className="bg-white/10 border-white/20 text-white placeholder-indigo-300 h-11 rounded-xl font-bold"
                              />
                            </div>
                            
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase text-indigo-200 tracking-widest pl-1">Mobile Carrier</Label>
                              <Select value={claimNetwork} onValueChange={setClaimNetwork}>
                                <SelectTrigger className="bg-indigo-700/50 border-white/20 text-white h-11 rounded-xl font-bold">
                                  <SelectValue placeholder="Select Carrier" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MTN">MTN</SelectItem>
                                  <SelectItem value="Glo">Glo</SelectItem>
                                  <SelectItem value="Airtel">Airtel</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {claimError && (
                              <p className="text-xs bg-red-650/30 border border-red-500/20 p-3 rounded-xl font-black text-red-200">{claimError}</p>
                            )}

                            <Button 
                              onClick={submitClaimData}
                              disabled={claiming}
                              className="w-full bg-green-500 hover:bg-green-600 text-white font-black h-12 rounded-xl text-sm transition-all"
                            >
                              {claiming ? 'Submitting ticket...' : 'Submit Claim Request'}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {!participationResult?.won && (
                    <div className="max-w-md mx-auto space-y-4">
                      <p className="text-gray-500 font-medium">
                        You didn't reach the 70% win threshold this time. Keep reading and try another challenge!
                      </p>
                      <Button variant="outline" onClick={() => navigate('/books')}>
                        Discover More Books
                      </Button>
                    </div>
                  )}

                  <div className="pt-8 flex justify-center gap-4">
                    <Button 
                      className="bg-gray-900 text-white font-bold py-4 px-12 rounded-xl"
                      onClick={() => navigate('/trivia')}
                    >
                      Return to Trivia Center
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-4 px-12 rounded-xl flex items-center gap-2"
                      onClick={handleShareClick}
                    >
                      <Share2 className="w-5 h-5 text-indigo-500" />
                      {copied ? 'Link Copied!' : 'Share Trivia Challenge'}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};
