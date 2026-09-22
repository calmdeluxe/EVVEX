'use client';

import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { ChevronLeft, ShieldCheck, User, BookOpen, Share2, CheckCircle2, Tag, Trophy, Lock } from 'lucide-react';
import { supabase } from '../../../src/supabase';

interface PageProps {
  params?: { slug?: string } | Promise<{ slug?: string }>;
  searchParams?: { [key: string]: string | string[] | undefined } | Promise<{ [key: string]: string | string[] | undefined }>;
}

// Error Boundary to prevent ANY blank white screens
class SafeErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[BookRoute] Uncaught error in book preview handler:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <BookOpen className="w-16 h-16 text-slate-400 mb-4" />
          <h2 className="text-2xl font-black text-slate-900">Unable to load eBook preview</h2>
          <p className="text-slate-600 mt-2 max-w-md text-sm">
            We encountered a temporary issue loading this book. Please refresh the page or return to the main dashboard.
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => window.location.reload()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow transition-all"
            >
              Reload Page
            </button>
            <a
              href="/"
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm px-6 py-2.5 rounded-xl transition-all"
            >
              Go to Home
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function BookPage(props: PageProps) {
  return (
    <SafeErrorBoundary>
      <BookPageContent {...props} />
    </SafeErrorBoundary>
  );
}

function BookPageContent(props: PageProps) {
  const [slug, setSlug] = useState<string>('');
  const [affiliateCode, setAffiliateCode] = useState<string>('');
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [hasTrivia, setHasTrivia] = useState(false);
  const [triviaId, setTriviaId] = useState('');

  // 1. Safely resolve slug and ref from props or window location without throwing
  useEffect(() => {
    let isMounted = true;

    async function resolveParams() {
      try {
        let resolvedSlug = '';
        let resolvedRef = '';

        // Extract slug from props (Next.js 14/15)
        if (props?.params) {
          const p = await Promise.resolve(props.params);
          if (p?.slug) resolvedSlug = String(p.slug).trim();
        }

        // Fallback: Extract slug from browser pathname (e.g., /book/my-slug)
        if (!resolvedSlug && typeof window !== 'undefined' && window.location.pathname) {
          const match = window.location.pathname.match(/\/book\/([^\/?#]+)/i);
          if (match && match[1]) {
            resolvedSlug = decodeURIComponent(match[1]).trim();
          }
        }

        // Extract referral from props
        if (props?.searchParams) {
          const sp = await Promise.resolve(props.searchParams);
          const rawRef = sp?.ref || sp?.aff;
          if (rawRef) {
            resolvedRef = (Array.isArray(rawRef) ? rawRef[0] : String(rawRef)).trim();
          }
        }

        // Fallback: Extract referral code from browser window.location.search
        if (!resolvedRef && typeof window !== 'undefined' && window.location.search) {
          try {
            const urlParams = new URLSearchParams(window.location.search);
            const rawRef = urlParams.get('ref') || urlParams.get('aff') || '';
            if (rawRef) resolvedRef = rawRef.trim();
          } catch (paramErr) {
            console.warn('[BookRoute] Failed to parse URLSearchParams:', paramErr);
          }
        }

        if (isMounted) {
          setSlug(resolvedSlug);
          setAffiliateCode(resolvedRef);
        }

        // Store referral code in localStorage safely
        if (resolvedRef) {
          try {
            localStorage.setItem('affiliate_referrer', resolvedRef);
            localStorage.setItem('referralCode', resolvedRef);
            console.log('[BookRoute] Stored referral code:', resolvedRef);
          } catch (storageErr) {
            console.warn('[BookRoute] LocalStorage write skipped:', storageErr);
          }
        }
      } catch (err) {
        console.warn('[BookRoute] Error resolving route parameters:', err);
      }
    }

    resolveParams();
    return () => { isMounted = false; };
  }, [props]);

  // 2. Fetch genres safely
  useEffect(() => {
    async function loadGenres() {
      try {
        const { data } = await supabase.from('genres').select('*');
        if (data) setGenres(data);
      } catch (e) {
        console.warn('[BookRoute] Non-fatal genres fetch notice:', e);
      }
    }
    loadGenres();
  }, []);

  // 3. Fetch book by public_slug (with fallback to ID)
  useEffect(() => {
    if (!slug) {
      // If after short delay slug is still empty, stop loading
      const timer = setTimeout(() => {
        if (!slug) setLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }

    let isMounted = true;

    async function fetchBook() {
      try {
        setLoading(true);
        let bookData = null;

        // Primary: fetch by public_slug
        const { data: slugData } = await supabase
          .from('books')
          .select('*')
          .eq('public_slug', slug)
          .maybeSingle();

        if (slugData) {
          bookData = slugData;
        }

        // Fallback: check if UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        if (!bookData && isUUID) {
          const { data: idData } = await supabase
            .from('books')
            .select('*')
            .eq('id', slug)
            .maybeSingle();
          if (idData) bookData = idData;
        }

        // Fallback: check if numeric ID
        if (!bookData && /^\d+$/.test(slug)) {
          const { data: numData } = await supabase
            .from('books')
            .select('*')
            .eq('id', parseInt(slug, 10))
            .maybeSingle();
          if (numData) bookData = numData;
        }

        if (isMounted) {
          setBook(bookData);
          setLoading(false);
        }

        // Check for trivia
        if (bookData?.id) {
          try {
            const { data: triviaData } = await supabase
              .from('trivias')
              .select('id')
              .eq('book_id', bookData.id)
              .eq('status', 'active')
              .maybeSingle();
            if (triviaData && isMounted) {
              setHasTrivia(true);
              setTriviaId(triviaData.id);
            }
          } catch (tErr) {
            console.warn('[BookRoute] Non-fatal trivia check notice:', tErr);
          }
        }
      } catch (err) {
        console.error('[BookRoute] Error fetching book data:', err);
        if (isMounted) setLoading(false);
      }
    }

    fetchBook();
    return () => { isMounted = false; };
  }, [slug]);

  // 4. Track referral click in database asynchronously without blocking UI
  useEffect(() => {
    if (!affiliateCode || !book?.id) return;

    const trackClick = async () => {
      try {
        // Asynchronously post to backend
        fetch('/api/referral/track-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ref: affiliateCode,
            slug: book.public_slug || slug,
            book_id: book.id,
          })
        }).catch((apiErr) => {
          console.warn('[BookRoute] Async referral click track notice:', apiErr);
        });
      } catch (err) {
        console.warn('[BookRoute] Non-fatal referral click notice:', err);
      }
    };

    trackClick();
  }, [affiliateCode, book?.id, book?.public_slug, slug]);

  const handleBuy = () => {
    if (!book) return;
    try {
      localStorage.setItem('pendingPurchase', book.id);
      localStorage.setItem('pendingPurchaseType', 'book');
      if (affiliateCode) {
        localStorage.setItem('affiliate_referrer', affiliateCode);
        localStorage.setItem('referralCode', affiliateCode);
      }
    } catch (e) {}

    const buyUrl = `/book/${book.public_slug || book.id}/buy${affiliateCode ? `?ref=${affiliateCode}` : ''}`;
    window.location.href = buyUrl;
  };

  const handleShare = async () => {
    if (!book) return;
    const shareUrl = `${window.location.origin}/book/${book.public_slug || book.id}${affiliateCode ? `?ref=${affiliateCode}` : ''}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: book.title || 'eBook Preview',
          text: book.description || 'Check out this eBook on CalmReader!',
          url: shareUrl,
        });
        return;
      } catch (e) {}
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('[BookRoute] Clipboard copy failed:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4" />
        <p className="text-slate-500 font-bold text-sm tracking-wide">Loading eBook preview...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">eBook Not Found</h2>
        <p className="text-slate-500 mt-2 max-w-sm text-sm">
          The eBook you are looking for does not exist or has been removed.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-6 h-11 rounded-xl transition-all shadow"
        >
          Explore CalmReader
        </a>
      </div>
    );
  }

  const authorName = book.admin_note?.match(/author:([^,]+)/)?.[1] || book.author_name || 'Verified Author';
  const genreName = genres.find(g => String(g.id) === String(book.genre_id))?.name || 
                    genres.find(g => String(g.id) === String(book.genre))?.name || 
                    book.genre || 'General';

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col items-center justify-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col md:flex-row">
        {/* Cover Image */}
        <div className="w-full md:w-[45%] bg-[#020617] relative aspect-[3/4] md:aspect-auto flex items-center justify-center p-6 shrink-0 border-r border-slate-100">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent opacity-80 z-10" />
          <img
            src={book.cover_image || 'https://images.unsplash.com/photo-1543003919-a9957004bfa0?q=80&w=2000'}
            className="w-full h-full object-cover rounded-2xl md:rounded-[2rem] z-0"
            alt={book.title || 'Book Cover'}
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Details Content */}
        <div className="flex-1 p-8 sm:p-12 flex flex-col justify-between text-left">
          <div className="space-y-6">
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 2) {
                  window.history.back();
                } else {
                  window.location.href = '/';
                }
              }}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Go Back
            </button>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
                  CalmReader eBook
                </span>
                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> {genreName}
                </span>
                {affiliateCode && (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ref: {affiliateCode}
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
                {book.description || "Dive into this engaging, card-based interactive eBook designed for structured and peaceful reading on CalmReader."}
              </p>
            </div>

            {hasTrivia && (
              <div className="mt-6 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 rounded-2xl p-4 border border-indigo-100/80 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-600 text-white rounded-lg p-1.5 flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 tracking-tight">Interactive Trivia Challenge Available</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Earn bonus rewards upon reading completion.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6 pt-8 mt-8 border-t border-slate-100">
            <div className="flex items-baseline justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Price</span>
                <span className="text-3xl font-black text-slate-900">
                  {book.price && Number(book.price) > 0 ? `₦${Number(book.price).toLocaleString()}` : 'FREE'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleBuy}
                className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white font-black text-lg shadow-lg shadow-indigo-100 transition-all flex items-center justify-center cursor-pointer"
              >
                {book.price && Number(book.price) > 0 ? 'Buy Now' : 'Read Free'}
              </button>

              <button
                onClick={handleShare}
                className="w-full h-12 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 hover:text-indigo-600 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-in zoom-in-50" />
                    <span className="text-emerald-600 font-bold">Referral Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-slate-500" />
                    <span>Share eBook & Referral Link</span>
                  </>
                )}
              </button>
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
}
