// LEGACY: CalmReader file, not part of EVEX product. To be unmounted in a later pass.
import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, CreditCard, User, BookOpen, Share2, CheckCircle2, Tag, Trophy, Lock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import axios from 'axios';

// Error Boundary ensuring eBook route NEVER renders a blank page
class SafeBookErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[EbookPage] Caught rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <BookOpen className="w-14 h-14 text-slate-400 mb-3" />
          <h2 className="text-2xl font-black text-slate-900">eBook Preview</h2>
          <p className="text-slate-600 mt-2 max-w-sm text-sm">
            We encountered a temporary display issue. Please refresh or return to explore books.
          </p>
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => window.location.reload()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition-all"
            >
              Refresh Page
            </button>
            <a
              href="/"
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
            >
              Browse Library
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const EbookPage: React.FC = () => {
  return (
    <SafeBookErrorBoundary>
      <EbookPageContent />
    </SafeBookErrorBoundary>
  );
};

const EbookPageContent: React.FC = () => {
  const { idOrSlug, slug, id } = useParams<{ idOrSlug?: string; slug?: string; id?: string }>();
  const bookIdentifier = slug || idOrSlug || id || '';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, accountTier, isAdmin } = useAuth();

  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOwned, setIsOwned] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasBookTrivia, setHasBookTrivia] = useState(false);
  const [bookTriviaId, setBookTriviaId] = useState('');
  const [genres, setGenres] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [standardCopied, setStandardCopied] = useState(false);

  // Safely extract referral code from query params without throwing
  const affiliateCode = (() => {
    try {
      const fromSearch = searchParams.get('ref') || searchParams.get('aff');
      if (fromSearch) return fromSearch.trim();
      if (typeof window !== 'undefined' && window.location.search) {
        const raw = new URLSearchParams(window.location.search);
        return (raw.get('ref') || raw.get('aff') || '').trim();
      }
      return '';
    } catch (e) {
      console.warn('[EbookPage] Error parsing referral parameter:', e);
      return '';
    }
  })();

  // Share book link with referral code attached
  const handleShareBook = async () => {
    if (!book) return;
    const shareCode = affiliateCode || user?.id || '';
    const shareUrl = `${window.location.origin}/book/${book.public_slug || book.id}${shareCode ? `?ref=${shareCode}` : ''}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: book.title || 'eBook',
          url: shareUrl
        });
      } catch (e) {
        console.warn("Web Share failed:", e);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setStandardCopied(true);
        setTimeout(() => setStandardCopied(false), 2000);
      } catch (err) {
        console.warn("Clipboard copy failed:", err);
      }
    }
  };

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const { data } = await supabase.from('genres').select('*');
        if (data) {
          setGenres(data);
        }
      } catch (err) {
        console.warn('Failed to load genres:', err);
      }
    };
    fetchGenres();
  }, []);

  // Fetch book data using public_slug with fallback to ID
  useEffect(() => {
    const fetchBookAndStatus = async () => {
      if (!bookIdentifier) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        let bookData = null;

        // 1. Primary: Fetch book data using public_slug
        const { data: slugData } = await supabase
          .from('books')
          .select('*')
          .eq('public_slug', bookIdentifier)
          .maybeSingle();

        if (slugData) {
          bookData = slugData;
        }

        // 2. Fallback: If not found by public_slug and identifier is a UUID, fetch by id
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookIdentifier);
        if (!bookData && isUUID) {
          const { data: idData } = await supabase
            .from('books')
            .select('*')
            .eq('id', bookIdentifier)
            .maybeSingle();
          if (idData) {
            bookData = idData;
          }
        }

        // 3. Fallback: If integer ID
        if (!bookData && /^\d+$/.test(bookIdentifier)) {
          const { data: numData } = await supabase
            .from('books')
            .select('*')
            .eq('id', parseInt(bookIdentifier, 10))
            .maybeSingle();
          if (numData) {
            bookData = numData;
          }
        }

        // 4. Resilient Fallback: Query backend API endpoint if client Supabase query was restricted
        if (!bookData) {
          try {
            const apiRes = await axios.get(`/api/books/public/${encodeURIComponent(bookIdentifier)}`);
            if (apiRes.data?.book) {
              bookData = apiRes.data.book;
            }
          } catch (apiErr) {
            // Non-fatal, handled gracefully below
            console.warn('[EbookPage] API fallback fetch notice:', apiErr);
          }
        }

        if (!bookData) {
          setBook(null);
          setLoading(false);
          return;
        }

        setBook(bookData);

        // Check if already purchased
        if (user?.id) {
          let owned = false;
          try {
            const { data: directPurchase } = await supabase
              .from('ebook_purchases')
              .select('id')
              .eq('ebook_id', bookData.id)
              .eq('user_id', user.id)
              .maybeSingle();
            if (directPurchase) {
              owned = true;
            }
          } catch (e) {
            console.warn('[EbookPage] Error checking ebook_purchases', e);
          }

          if (!owned) {
            try {
              const { data: tx } = await supabase
                .from('transactions')
                .select('id')
                .eq('book_id', bookData.id)
                .eq('user_id', user.id)
                .eq('status', 'successful')
                .eq('type', 'purchase')
                .maybeSingle();
              if (tx) {
                owned = true;
              }
            } catch (e) {
              console.warn('[EbookPage] Error checking transactions', e);
            }
          }

          const isFreeBook = !bookData.price || Number(bookData.price) === 0;
          if (isFreeBook) {
            owned = true;
          }

          setIsOwned(owned);

          // Fetch reading progress
          try {
            const { data: progressData } = await supabase
              .from('reading_progress')
              .select('completed, progress')
              .eq('book_id', bookData.id)
              .eq('user_id', user.id)
              .maybeSingle();
            if (progressData) {
              setIsCompleted(!!progressData.completed || (progressData.progress !== undefined && progressData.progress >= 90));
              setProgress(progressData.progress || 0);
            }
          } catch (e) {
            console.warn('[EbookPage] Error checking reading_progress', e);
          }
        }

        // Check if there is trivia for this book
        try {
          const { data: triviaData } = await supabase
            .from('trivias')
            .select('id')
            .eq('book_id', bookData.id)
            .eq('status', 'active')
            .maybeSingle();
          if (triviaData) {
            setHasBookTrivia(true);
            setBookTriviaId(triviaData.id);
          } else {
            // Check if there are active trivia questions for this book
            const { data: qData } = await supabase
              .from('trivia_questions')
              .select('id')
              .eq('ebook_id', bookData.id)
              .eq('is_active', true)
              .limit(1);
            if (qData && qData.length > 0) {
              setHasBookTrivia(true);
              setBookTriviaId(bookData.id);
            }
          }
        } catch (e) {
          console.warn('[EbookPage] Error checking trivias', e);
        }
      } catch (err) {
        console.error('Error loading ebook details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookAndStatus();
  }, [bookIdentifier, user]);

  // If ref is present, track referral click in database without breaking the page
  useEffect(() => {
    if (!affiliateCode || !book?.id) return;

    const trackReferralClick = async () => {
      try {
        // Store referral code in localStorage for future signup / purchase attribution
        try {
          localStorage.setItem('affiliate_referrer', affiliateCode);
          localStorage.setItem('referralCode', affiliateCode);
        } catch (storageErr) {
          console.warn('[Referral Tracker] LocalStorage save warning:', storageErr);
        }

        // Call backend API to track the referral click
        try {
          await axios.post('/api/referral/track-click', {
            ref: affiliateCode,
            slug: book.public_slug || bookIdentifier,
            book_id: book.id,
          });
          console.log('[Referral Tracker] Tracked click successfully');
        } catch (apiErr) {
          console.warn('[Referral Tracker] Server click track non-fatal notice:', apiErr);
          
          // Direct fallback to Supabase if affiliateCode is a valid UUID
          try {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(affiliateCode);
            if (isUUID) {
              await supabase.from('referrals').insert({
                referrer_id: affiliateCode,
                reward_granted: false,
              });
            }
          } catch (dbErr) {
            // Non-fatal, suppress constraint error
          }
        }
      } catch (err) {
        // Never break the page even if tracking encounters any unexpected error
        console.warn('[Referral Tracker] Non-fatal error tracking referral click:', err);
      }
    };

    trackReferralClick();
  }, [affiliateCode, book?.id, book?.public_slug, bookIdentifier]);

  const handleBuy = () => {
    if (!book) return;
    const paymentUrl = `/payment?item=book&id=${book.id}${affiliateCode ? `&ref=${affiliateCode}` : ''}`;
    
    // Store intent in localStorage
    try {
      localStorage.setItem('pendingPurchase', book.id);
      localStorage.setItem('pendingPurchaseType', 'book');
      if (affiliateCode) {
        localStorage.setItem('affiliate_referrer', affiliateCode);
        localStorage.setItem('referralCode', affiliateCode);
      }
    } catch (e) {}

    // If user is logged in, navigate straight to payment
    if (user) {
      navigate(paymentUrl);
      return;
    }

    // If guest, direct to checkout page
    navigate(`/book/${book.public_slug || book.id}/buy${affiliateCode ? `?ref=${affiliateCode}` : ''}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <BookOpen className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-black text-slate-900">eBook Not Found</h2>
        <p className="text-slate-500 mt-2 max-w-sm">The eBook you are looking for does not exist or has been removed.</p>
        <Button onClick={() => navigate('/dashboard')} className="mt-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 h-11">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const authorName = book.admin_note?.match(/author:([^,]+)/)?.[1] || book.author_name || 'Verified Author';

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl shadow-slate-100 border border-slate-100 overflow-hidden flex flex-col md:flex-row">
        {/* Cover Image Half */}
        <div className="w-full md:w-[45%] bg-[#020617] relative aspect-[3/4] md:aspect-auto flex items-center justify-center p-6 shrink-0 border-r border-slate-50">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-80 z-10" />
          <img 
            src={book.cover_image || 'https://images.unsplash.com/photo-1543003919-a9957004bfa0?q=80&w=2000'} 
            className="w-full h-full object-cover rounded-2xl md:rounded-[2rem] z-0" 
            alt={book.title}
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Details Half */}
        <div className="flex-1 p-8 sm:p-12 flex flex-col justify-between text-left">
          <div className="space-y-6">
            <button 
              onClick={() => {
                if (window.history.length > 2) {
                  navigate(-1);
                } else {
                  navigate('/dashboard');
                }
              }} 
              className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest"
            >
              <ChevronLeft className="w-4 h-4" /> Go Back
            </button>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
                  CalmReader eBook
                </span>
                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> {genres.find(g => String(g.id) === String(book.genre_id))?.name || genres.find(g => String(g.id) === String(book.genre))?.name || book.genre || 'General'}
                </span>
                {isOwned && (
                  <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
                    Owned
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight italic tracking-tight font-serif">
                {book.title}
              </h1>

              <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest">
                <User className="w-4 h-4 text-slate-400" />
                <span>By {authorName}</span>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description / Summary</span>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                {book.description || "Dive into this engaging, card-based interactive eBook designed for structured and peaceful offline-friendly reading on CalmReader."}
              </p>
            </div>

            {hasBookTrivia && (
              <div className="mt-6 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 rounded-2xl p-5 border border-indigo-100/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-600 text-white rounded-lg p-1.5 flex items-center justify-center">
                      <Trophy className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 tracking-tight">Interactive Trivia Challenge</h4>
                      <p className="text-[11px] text-slate-500 font-medium">Test your understanding & win bonus rewards!</p>
                    </div>
                  </div>
                  {isCompleted || isOwned || isAdmin || accountTier === 'author' ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-200">
                      Unlocked
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-600 font-medium leading-relaxed bg-white/60 p-3 rounded-xl border border-indigo-50">
                  {isCompleted || isOwned || isAdmin || accountTier === 'author' ? (
                    <p>🎉 Excellent! You have unlocked this eBook's trivia challenge. You can now test your memory and score extra points!</p>
                  ) : (
                    <p>🔒 <strong>Requirement:</strong> Purchase this book or complete reading it (at least 90%) to unlock the associated trivia challenge.</p>
                  )}
                </div>

                {(isCompleted || isOwned || isAdmin || accountTier === 'author') ? (
                  <Button
                    onClick={() => navigate(`/trivia/ebook/${bookTriviaId || book.id}`)}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 font-black text-xs uppercase tracking-wider h-11 rounded-xl text-white shadow-md transition-all duration-200"
                  >
                    Play Trivia Challenge
                  </Button>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] text-indigo-700 font-bold px-1">
                      <span>Reading Progress: {progress}%</span>
                      <span>Finish to Unlock</span>
                    </div>
                    {/* Visual progress bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6 pt-8 mt-8 border-t border-slate-50">
            <div className="flex items-baseline justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Price</span>
                <span className="text-3xl font-black text-slate-900">
                  {book.price && Number(book.price) > 0 ? `₦${Number(book.price).toLocaleString()}` : 'FREE'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {isOwned || Number(book.price) <= 0 ? (
                <Button 
                  onClick={() => navigate(`/read/${book.id}`)}
                  className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-5 h-5" /> {Number(book.price) <= 0 ? 'Read Free' : 'Read eBook Now'}
                </Button>
              ) : (
                <Button 
                  onClick={handleBuy}
                  className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white font-black text-lg shadow-lg shadow-indigo-100 transition-all"
                >
                  Buy Now
                </Button>
              )}

              {user && (accountTier === 'premium' || accountTier === 'author' || isAdmin) ? (
                <Button 
                  variant="outline"
                  onClick={() => {
                    const affiliateUrl = `${window.location.origin}/ebook/${book.public_slug || book.id}?ref=${user.id}`;
                    navigator.clipboard.writeText(affiliateUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="w-full h-12 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 hover:text-indigo-600 flex items-center justify-center gap-2 transition-all"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-in zoom-in-50" />
                      <span className="text-emerald-600 font-bold">Affiliate Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-slate-500" />
                      <span>Copy Affiliate Link</span>
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={handleShareBook}
                  className="w-full h-12 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 hover:text-indigo-600 flex items-center justify-center gap-2 transition-all"
                >
                  {standardCopied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-in zoom-in-50" />
                      <span className="text-emerald-600 font-bold">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-slate-500" />
                      <span>Share eBook</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Secure transaction processed by Paystack</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
