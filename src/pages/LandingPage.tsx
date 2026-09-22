import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  BookOpen, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  ChevronLeft,
  ChevronRight, 
  PenLine as PenLineIcon, 
  Brain, 
  Video, 
  Newspaper,
  CheckCircle2,
  Instagram,
  Twitter,
  Facebook,
  Music,
  MessageCircle,
  MessageSquareQuote,
  Menu,
  X,
  Play,
  PlayCircle,
  ExternalLink,
  DollarSign,
  User,
  Wand2,
  RefreshCw,
  Sparkles,
  Star,
  Gift,
  VenetianMask,
  Clock,
  LayoutGrid,
  List,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from "../AuthContext";
import { supabase } from "../supabase";
import { ThemeToggle } from '@/components/ThemeToggle';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { getCachedLandingData } from '../utils/offlineCache';

// Global in-memory cache to guarantee instantaneous navigation and zero-delay content persistence (Task 5 & 12)
let globalFeaturedBooks: any[] | null = null;
let globalBlogs: any[] | null = null;
let globalVideos: any[] | null = null;
let globalFeaturedTrivias: any[] | null = null;
let globalActivePromo: any | null = null;
let globalLastFetchTime = 0;

export const clearLandingPageCache = () => {
  globalFeaturedBooks = null;
  globalBlogs = null;
  globalVideos = null;
  globalFeaturedTrivias = null;
  globalActivePromo = null;
  globalLastFetchTime = 0;
};

export const LandingPage: React.FC = () => {
  const { user, profile, isAdmin, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [featuredBooks, setFeaturedBooks] = useState<any[]>(globalFeaturedBooks || []);
  const [featuredTrivias, setFeaturedTrivias] = useState<any[]>(globalFeaturedTrivias || []);
  const [blogs, setBlogs] = useState<any[]>(globalBlogs || []);
  const [videos, setVideos] = useState<any[]>(globalVideos || []);
  const [loading, setLoading] = useState(!globalFeaturedBooks);
  const { search } = useLocation();

  const [activePromo, setActivePromo] = useState<any>(globalActivePromo);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  // Original Carousel layout and drag tracking states (for other uses or restored modules)
  const [dragOffset, setDragOffset] = useState(0);
  const [maxDrag, setMaxDrag] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const carouselOuterRef = React.useRef<HTMLDivElement>(null);
  const carouselTrackRef = React.useRef<HTMLDivElement>(null);

  // Hero carousel drag states
  const [heroDragOffset, setHeroDragOffset] = useState(0);
  const [heroMaxDrag, setHeroMaxDrag] = useState(0);
  const [isHeroDragging, setIsHeroDragging] = useState(false);
  const heroCarouselOuterRef = React.useRef<HTMLDivElement>(null);
  const heroCarouselTrackRef = React.useRef<HTMLDivElement>(null);

  // Books list pagination
  const [booksPage, setBooksPage] = useState(1);
  const [activeSegment, setActiveSegment] = useState<'ebooks' | 'blogs' | 'videos'>('ebooks');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Data loader: In Capacitor, skip the initial API call and load from cache; otherwise standard web behavior
  useEffect(() => {
    const CACHE_KEY = "calmreader_landing_data_cache_local";
    const CACHE_TIME_KEY = "calmreader_landing_data_cache_time_local";
    const FIVE_MINUTES = 5 * 60 * 1000;

    const loadFromCache = () => {
      console.log("[LandingPage] Capacitor detected: loading from cache or local storage");
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          if (parsed.featuredBooks && parsed.featuredBooks.length > 0) {
            setFeaturedBooks(parsed.featuredBooks);
            setBlogs(parsed.blogs || []);
            setVideos(parsed.videos || []);
            setFeaturedTrivias(parsed.featuredTrivias || []);
            if (parsed.activePromo) setActivePromo(parsed.activePromo);
            setLoading(false);
            return true;
          }
        } catch (e) {
          console.warn("[LandingPage] Cache parse error:", e);
        }
      }

      // Fallback to bundled offline starter catalog
      const fallback = getCachedLandingData();
      setFeaturedBooks(fallback.featuredBooks);
      setBlogs(fallback.blogs || []);
      setVideos(fallback.videos || []);
      setFeaturedTrivias(fallback.featuredTrivias || []);
      setLoading(false);
      return false;
    };

    const loadFromAPI = async (isBackground = false) => {
      const now = Date.now();

      if (!isBackground) {
        // In web mode, check memory or localStorage cache first for fast display
        if (globalFeaturedBooks && now - globalLastFetchTime < FIVE_MINUTES) {
          setFeaturedBooks(globalFeaturedBooks);
          setBlogs(globalBlogs || []);
          setVideos(globalVideos || []);
          setFeaturedTrivias(globalFeaturedTrivias || []);
          if (globalActivePromo) setActivePromo(globalActivePromo);
          setLoading(false);
          return;
        }

        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
        if (cachedData && cachedTime && now - Number(cachedTime) < FIVE_MINUTES) {
          try {
            const parsed = JSON.parse(cachedData);
            setFeaturedBooks(parsed.featuredBooks || []);
            setBlogs(parsed.blogs || []);
            setVideos(parsed.videos || []);
            setFeaturedTrivias(parsed.featuredTrivias || []);
            if (parsed.activePromo) setActivePromo(parsed.activePromo);
            setLoading(false);
            return;
          } catch (e) {}
        }
        setLoading(true);
      }

      const ghostTitles = ['SAMPLE', 'TEST', 'DUMMY', 'DELETED', '[DELETED]', 'VOLUME 4', 'VOLUME-4', 'VOLUME 4-CHAPTER 1', 'VOLUME 4 - CHAPTER 1'];

      // Wrap fetches with a 3-second timeout to prevent offline / slow network hangs
      const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 3000));

      const booksPromise = (async () => {
        try {
          const fetchPromise = supabase
            .from('books')
            .select('*')
            .order('created_at', { ascending: false });
          const resQuery: any = await Promise.race([fetchPromise, timeoutPromise]);
          return resQuery.data || [];
        } catch (err) {
          return [];
        }
      })();

      const promosPromise = (async () => {
        try {
          const fetchPromise = supabase
            .from('trivias')
            .select('*')
            .eq('deleted', false)
            .eq('status', 'active');
          const promos: any = await Promise.race([fetchPromise, timeoutPromise]);
          return promos?.data || [];
        } catch (e) {
          return [];
        }
      })();

      const triviasPromise = (async () => {
        try {
          const fetchPromise = supabase
            .from("trivias")
            .select("*")
            .eq("deleted", false)
            .eq("status", "active");
          const res: any = await Promise.race([fetchPromise, timeoutPromise]);
          const sessions = res?.data || [];
          const formatted: any[] = [];
          const coveredKeys = new Set<string>();

          if (sessions && sessions.length > 0) {
            sessions.forEach((session: any) => {
              const key = session.book_id || "general";
              if (!coveredKeys.has(key)) {
                const isGeneral = !session.book_id;
                formatted.push({
                  ...session,
                  id: session.book_id || "general",
                  title: session.title || "Trivia Challenge",
                  description: session.description || "Interactive trivia challenge",
                  cover_image: session.thumbnail_url || "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=600&auto=format&fit=crop",
                  thumbnail_url: session.thumbnail_url || "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=600&auto=format&fit=crop",
                  price: isGeneral ? 0 : (session.price !== undefined && session.price !== null ? session.price : 200),
                  book_title: isGeneral ? "General Knowledge" : (session.title || "Linked eBook"),
                  isGeneral,
                });
                coveredKeys.add(key);
              }
            });
          }
          return formatted;
        } catch (e) {
          return [];
        }
      })();

      try {
        const [books, promos, trivias] = await Promise.all([booksPromise, promosPromise, triviasPromise]);

        if (promos && promos.length > 0) {
          setActivePromo(promos[0]);
        }

        const sortedBooksData = [...books].sort((a: any, b: any) => {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });

        const safeBooks = sortedBooksData.filter((b: any) => {
          const isPub = b.is_published === 1 || b.is_published === true || b.is_published === 'true' || b.is_published === '1';
          if (!isPub) return false;
          const bookTitle = (b.title || '').toUpperCase();
          if (ghostTitles.some(gt => bookTitle.includes(gt))) return false;
          const isDeleted = (b.admin_note || '').includes('[DELETED]') || (b.title || '').includes('[DELETED]') || b.status === -1 || b.status === '-1';
          if (isDeleted) return false;
          return true;
        });

        const realEbooks = safeBooks.filter((b: any) => {
          const adminNote = b.admin_note || '';
          return !adminNote.includes('type:blog') && !adminNote.includes('type:video');
        });

        if (realEbooks.length > 0) {
          setFeaturedBooks(realEbooks);
          globalFeaturedBooks = realEbooks;
        }

        const realBlogs = safeBooks.filter((b: any) => (b.admin_note || '').includes('type:blog'));
        const realVideos = safeBooks.filter((b: any) => (b.admin_note || '').includes('type:video'));
        if (realBlogs.length > 0) setBlogs(realBlogs);
        if (realVideos.length > 0) setVideos(realVideos);

        const safeTrivias = trivias.filter((t: any) => {
          const tTitle = (t.title || '').toUpperCase();
          if (ghostTitles.some(gt => tTitle.includes(gt))) return false;
          if (t.deleted === true || t.deleted === 'true') return false;
          if (t.status && t.status !== 'active' && !t.isGeneral) return false;
          return true;
        });
        const sliceTrivias = safeTrivias.slice(0, 5);
        if (sliceTrivias.length > 0) setFeaturedTrivias(sliceTrivias);

        // Cache if valid items found
        if (realEbooks.length > 0) {
          try {
            const cachePayload = {
              featuredBooks: realEbooks,
              blogs: realBlogs,
              videos: realVideos,
              featuredTrivias: sliceTrivias,
              activePromo: promos && promos.length > 0 ? promos[0] : null
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
            localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
          } catch (scErr) {}
        }
      } catch (err) {
        console.warn("[LandingPage] API load fallback:", err);
      } finally {
        setLoading(false);
      }
    };

    // Check if running in Capacitor
    const isCapacitor = typeof window !== 'undefined' && Boolean(
      (window as any)?.Capacitor?.isNativePlatform?.() || 
      (window as any)?.Capacitor?.getPlatform?.() === 'android'
    );

    if (isCapacitor) {
      // Load from cache or local storage
      loadFromCache();
      // If network available, quietly sync in the background without blocking UI
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        loadFromAPI(true);
      }
    } else {
      // Normal web behavior
      loadFromAPI(false);
    }
  }, []);

  useEffect(() => {
    if (!activePromo) return;

    const updateTimer = () => {
      const now = Date.now();
      const startTime = new Date(activePromo.start_time).getTime();
      const difference = startTime - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds, total: difference });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activePromo]);

  // Pick up referral code from URL and persist it
  useEffect(() => {
    const params = new URLSearchParams(search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('referralCode', ref);
      console.log(`[Landing] Saved referral code: ${ref}`);
    }
  }, [search]);

  // AI Creation Animation State
  const [creationStep, setCreationStep] = useState(0); // 0: Idle/Typing, 1: Generating, 2: Generated
  const typingText = "The Legend of Queen Amina: A story of fire and strength...";
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    let timeout: any;
    if (creationStep === 0) {
      if (displayText.length < typingText.length) {
        timeout = setTimeout(() => {
          setDisplayText(typingText.slice(0, displayText.length + 1));
        }, 20); // Faster typing
      } else {
        timeout = setTimeout(() => setCreationStep(1), 400); 
      }
    } else if (creationStep === 1) {
      timeout = setTimeout(() => setCreationStep(2), 600); // Super snappy generation
    } else {
      timeout = setTimeout(() => {
        setCreationStep(0);
        setDisplayText("");
      }, 2500); // Shorter loop cycle
    }
    return () => clearTimeout(timeout);
  }, [creationStep, displayText]);



  // Recalculates horizontal drag track constraints reactively whenever books load or window resizes
  useEffect(() => {
    const handleResize = () => {
      if (carouselOuterRef.current && carouselTrackRef.current) {
        const outerWidth = carouselOuterRef.current.offsetWidth;
        const trackWidth = carouselTrackRef.current.scrollWidth;
        setMaxDrag(Math.max(0, trackWidth - outerWidth));
      }
      if (heroCarouselOuterRef.current && heroCarouselTrackRef.current) {
        const outerWidth = heroCarouselOuterRef.current.offsetWidth;
        const trackWidth = heroCarouselTrackRef.current.scrollWidth;
        setHeroMaxDrag(Math.max(0, trackWidth - outerWidth));
      }
    };

    handleResize();
    const timer = setTimeout(handleResize, 600); // Allow domestic cards to finish layout
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [featuredBooks]);

  // Autoplay hero carousel slideshow (transits on its own)
  useEffect(() => {
    if (!featuredBooks || featuredBooks.length <= 1 || isHeroDragging) return;
    const interval = setInterval(() => {
      setHeroDragOffset(prev => {
        const isMobile = window.innerWidth < 640;
        const step = isMobile ? 334 : 404; // card width (310/380) + gap (24)
        const next = prev - step;
        if (Math.abs(next) > heroMaxDrag + 10) {
          return 0; // Wrap back to beginning
        }
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [featuredBooks, heroMaxDrag, isHeroDragging]);

  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'not set';
    console.log("API base URL: " + apiBaseUrl);
    if (featuredBooks && featuredBooks.length > 0) {
      console.log("First book title: " + featuredBooks[0].title);
    } else {
      console.log("First book title: No books loaded yet");
    }
  }, [featuredBooks]);

  const handleSecureAction = (targetPath: string) => {
    if (!user) {
      // Save intent pattern for eBook purchases as requested
      if (targetPath.includes('/purchase/') || targetPath.includes('/payment')) {
        const parts = targetPath.split('/');
        const idFromPath = parts[parts.length - 1].split('?')[0]; // Strip query params for storage
        const params = new URLSearchParams(targetPath.split('?')[1] || "");
        const ebookId = params.get('id') || idFromPath;
        
        if (ebookId && ebookId.length > 5 && ebookId !== 'payment') { // Basic sanity check for ID
          console.log(`[Landing] Storing pending purchase: ${ebookId}`);
          localStorage.setItem('pendingPurchase', ebookId);
        }
      }
      
      // General redirect after login
      localStorage.setItem('redirectAfterLogin', targetPath);
      
      // Force Login for action items to ensure session is established immediately
      navigate(`/login?redirect=${encodeURIComponent(targetPath)}`);
    } else {
      // Role checks for restricted areas
      if (targetPath === '/anonymous') {
         if (!isAdmin && profile?.account_tier === 'free') {
            navigate('/upgrade/premium', { 
              state: { 
                message: "Anonymous confession hub is available for Premium and Author accounts only.",
                redirectAfter: '/anonymous'
              } 
            });
            return;
         }
      }

      // If already signed in, go directly to payment with the ID
      if (targetPath.includes('/purchase/')) {
        const ebookId = targetPath.split('/').pop()?.split('?')[0];
        navigate(`/payment?id=${ebookId}`);
      } else {
        navigate(targetPath);
      }
    }
  };

  const [confessionIndex, setConfessionIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const confessionsPreview = [
    "I once lied to get a job I wasn't qualified for. I learned everything in 3 months.",
    "I still miss my ex after 4 years. I pretend I'm over it. I'm not.",
    "I once stole ₦500 from my mother's purse and I still feel guilty decades later.",
    "I'm secretly a writer but my family thinks I'm studying engineering."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setConfessionIndex((prev) => (prev + 1) % confessionsPreview.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const activeItems = React.useMemo(() => {
    if (activeSegment === 'blogs') return blogs;
    if (activeSegment === 'videos') return videos;
    return featuredBooks;
  }, [activeSegment, featuredBooks, blogs, videos]);

  return (
    <div className={`landing-page-root min-h-screen selection:bg-primary/20 selection:text-foreground overflow-x-hidden font-sans transition-colors duration-300 ${isDarkMode ? 'bg-[#030308] text-white' : 'bg-sky-100 text-slate-900'}`}>
      {/* 1. HEADER */}
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`relative w-full z-50 border-b transition-colors duration-300 ${isDarkMode ? 'bg-[#030308] border-white/5 text-white' : 'bg-sky-100 border-sky-200/50 text-slate-950'}`}
      >
        <nav className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <BookOpen className="w-8 h-8 text-[#EAB308] fill-[#EAB308]/20" />
            <span className={`font-sans font-black text-2xl tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>CalmReader</span>
          </Link>

          {/* Desktop Navigation */}
          <div className={`hidden lg:flex items-center gap-8 text-sm font-medium ${isDarkMode ? 'text-white/70' : 'text-slate-700'}`}>
            <Link to="/" className="hover:text-[#EAB308] text-[#EAB308] transition-colors">Home</Link>
            <Link to="/bookshelf" className="hover:text-[#EAB308] transition-colors">Explore</Link>
            <Link to="/dashboard" className="hover:text-[#EAB308] transition-colors">For Writers</Link>
            <Link to="/#how-it-works" className="hover:text-[#EAB308] transition-colors">How It Works</Link>
            <Link to="/#pricing" className="hover:text-[#EAB308] transition-colors">Pricing</Link>
            <Link to="/download" className="hover:text-[#EAB308] transition-colors inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <Smartphone className="w-4 h-4" /> Android App
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-6">
            <PWAInstallButton variant="icon" />
            <ThemeToggle />
            {!user ? (
              <div className="flex items-center gap-4">
                <Link to="/login" className={`px-6 h-12 flex items-center justify-center text-sm font-bold rounded-xl transition-colors ${isDarkMode ? 'text-white hover:bg-white/5' : 'text-slate-800 hover:bg-sky-200/40'}`}>Login</Link>
                <Button asChild className="bg-[#EAB308] text-black hover:bg-[#EAB308]/90 font-bold px-8 h-12 rounded-xl shadow-xl transition-transform hover:scale-105 active:scale-95">
                  <Link to="/signup">Get Started</Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <Button asChild variant="outline" className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10 font-bold px-4 h-12 rounded-xl">
                    <Link to="/admin">Admin Hub</Link>
                  </Button>
                )}
                <Button asChild className="bg-[#EAB308] text-black hover:bg-[#EAB308]/90 font-bold px-8 h-12 rounded-xl shadow-xl transition-transform hover:scale-105 active:scale-95">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-3 lg:hidden">
            <PWAInstallButton variant="icon" />
            <ThemeToggle />
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`p-2 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </nav>
      </motion.div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed inset-0 z-[60] backdrop-blur-2xl flex flex-col p-10 lg:hidden ${isDarkMode ? 'bg-[#030308]/95 text-white' : 'bg-sky-100/98 text-slate-900'}`}
          >
            <div className="flex justify-end mb-10">
              <button onClick={() => setIsMenuOpen(false)} className={`p-2 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                <X className="w-8 h-8" />
              </button>
            </div>
            <div className={`flex flex-col gap-7 text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white/60' : 'text-slate-700'}`}>
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="hover:text-[#EAB308] text-[#EAB308]">Home</Link>
              <Link to="/bookshelf" onClick={() => setIsMenuOpen(false)} className="hover:text-[#EAB308]">Explore</Link>
              <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="hover:text-[#EAB308]">For Writers</Link>
              <Link to="/download" onClick={() => setIsMenuOpen(false)} className="hover:text-[#EAB308] text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Smartphone className="w-6 h-6" /> Download Android App
              </Link>
              <Link to="/#how-it-works" onClick={() => setIsMenuOpen(false)} className="hover:text-[#EAB308]">How It Works</Link>
              <Link to="/#pricing" onClick={() => setIsMenuOpen(false)} className="hover:text-[#EAB308]">Pricing</Link>
            </div>
            <div className="mt-auto flex flex-col gap-4">
              {!user ? (
                <>
                  <Link to="/login" onClick={() => setIsMenuOpen(false)} className={`h-16 flex items-center justify-center font-bold ${isDarkMode ? 'text-white/50' : 'text-slate-600'}`}>Log in</Link>
                  <Button asChild className="h-16 rounded-2xl bg-[#EAB308] text-black font-bold text-lg">
                    <Link to="/signup">Get Started</Link>
                  </Button>
                </>
              ) : (
                <Button asChild className="h-16 rounded-2xl bg-[#EAB308] text-black font-bold text-lg">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MAIN HERO & CONTAINER */}
      <div className="relative pt-12 pb-16 px-6 max-w-7xl mx-auto flex flex-col items-center text-center z-10">
        {/* Background Atmosphere */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          {!user ? (
            <Button asChild size="lg" className="bg-[#EAB308] text-black hover:bg-[#EAB308]/90 h-12 px-6 text-sm font-extrabold rounded-xl shadow-xl shadow-amber-500/10 transition-transform hover:scale-105 active:scale-95">
              <Link to="/signup">Get Started</Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="bg-[#EAB308] text-black hover:bg-[#EAB308]/90 h-12 px-6 text-sm font-extrabold rounded-xl shadow-xl shadow-amber-500/10 transition-transform hover:scale-105 active:scale-95">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          )}
          <Button asChild size="lg" variant="outline" className={`h-12 px-6 text-sm font-extrabold rounded-xl transition-all hover:scale-105 active:scale-95 border shadow-sm ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-white bg-white/5' : 'border-slate-900/15 bg-white/40 hover:bg-white/60 text-slate-900'}`}>
            <Link to="/bookshelf">Browse Books</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className={`h-12 px-6 text-sm font-extrabold rounded-xl transition-all hover:scale-105 active:scale-95 border shadow-sm ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-white bg-white/5' : 'border-slate-900/15 bg-white/40 hover:bg-white/60 text-slate-900'}`}>
            <Link to="/explore/trivia">Join Trivia</Link>
          </Button>
        </div>

        {/* Small Tagline Section */}
        <p className={`text-xs sm:text-sm font-bold tracking-wide max-w-lg mt-6 animate-in fade-in duration-700 ${isDarkMode ? 'text-white/60' : 'text-slate-700 font-semibold'}`}>
          Bite‑sized eBooks, real confessions, and trivia — all in one place.
        </p>
      </div>

      {/* 3. COVER CAROUSEL */}
      <section className="pb-16 px-6 max-w-7xl mx-auto relative z-10">
        <div className="relative w-full flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full relative overflow-hidden"
            ref={heroCarouselOuterRef}
            id="hero-swipe-animation-container"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#EAB308]/30 bg-black/40">
                <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[#EAB308]">Drag & Swipe to Explore Preview</span>
              </div>
              <div className="flex gap-1">
                <Button 
                  type="button" 
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHeroDragOffset(prev => { const isMobile = window.innerWidth < 640; return Math.min(0, prev + (isMobile ? 334 : 404)); });
                  }}
                  className="w-8 h-8 rounded-full hover:bg-[#EAB308] hover:text-black hover:scale-105 transition-all flex items-center justify-center border bg-[#0c0c14] border-white/10 text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  type="button" 
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHeroDragOffset(prev => { const isMobile = window.innerWidth < 640; return Math.max(-heroMaxDrag, prev - (isMobile ? 334 : 404)); });
                  }}
                  className="w-8 h-8 rounded-full hover:bg-[#EAB308] hover:text-black hover:scale-105 transition-all flex items-center justify-center border bg-[#0c0c14] border-white/10 text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {loading || featuredBooks.length === 0 ? (
              <div className="flex gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="min-w-[280px] sm:min-w-[340px] aspect-[3/4] rounded-3xl animate-pulse border bg-[#0c0c14]/50 border-white/10" />
                ))}
              </div>
            ) : (
              <motion.div
                ref={heroCarouselTrackRef}
                drag="x"
                dragConstraints={{ left: -heroMaxDrag, right: 0 }}
                dragElastic={0.15}
                animate={{ x: heroDragOffset }}
                transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                onDragStart={() => setIsHeroDragging(true)}
                onDragEnd={(e, info) => {
                  const next = heroDragOffset + info.offset.x;
                  setHeroDragOffset(Math.max(-heroMaxDrag, Math.min(0, next)));
                  setTimeout(() => setIsHeroDragging(false), 80);
                }}
                className="flex gap-4 sm:gap-6 select-none cursor-grab active:cursor-grabbing touch-pan-y py-2"
              >
                {featuredBooks.map((book) => (
                  <motion.div
                    key={`hero-book-${book.id}`}
                    whileHover={{ scale: 1.02, y: -4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    onClick={() => {
                      if (isHeroDragging) return;
                      const isFree = !book.price || Number(book.price) === 0;
                      navigate(isFree ? `/read/${book.id}` : `/book/${book.public_slug || book.id}/buy`);
                    }}
                    className="min-w-[280px] sm:min-w-[340px] w-[280px] sm:w-[340px] aspect-[3/4] relative rounded-[28px] overflow-hidden flex-shrink-0 group border transition-all duration-300 border-white/10 bg-[#0d0d15] shadow-2xl"
                  >
                    <img 
                      src={book.cover_image || 'https://images.unsplash.com/photo-1543004218-ee141104975a?auto=format&fit=crop&q=80&w=800'} 
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85" 
                      alt={book.title}
                      draggable="false"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5 flex flex-col justify-end h-1/2">
                      <Badge className="bg-[#EAB308] text-black border-none font-bold text-[8px] mb-2 w-fit px-2 py-0.5">PREVIEW</Badge>
                      <h4 className="font-extrabold text-[#EAB308] text-[10px] uppercase tracking-widest truncate mb-0.5">
                        {book.users?.full_name || book.author_name || 'Verified Author'}
                      </h4>
                      <h3 className="font-serif italic font-bold text-white text-sm sm:text-base leading-tight line-clamp-2">
                        {book.title}
                      </h3>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* 4. TRENDING EBOOKS & CONTENT LIST SECTION */}
      <section className="py-12 px-6 max-w-7xl mx-auto relative z-10 w-full">
        <div className="border-t pt-12 pb-12 w-full border-slate-900/10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 border-b pb-8 w-full border-slate-900/10">
            <div className="space-y-4">
               <div>
                  <span className="text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] mb-2 inline-block">Curated Content Directory</span>
                  <h2 className="text-3xl md:text-4xl font-sans font-black tracking-tighter text-slate-950">Discovery Explorer</h2>
               </div>
               <div className="flex flex-wrap gap-2.5">
                  {[
                    { id: 'ebooks', label: '📖 eBooks', icon: BookOpen },
                    { id: 'blogs', label: '✍️ Insights & Blogs', icon: Newspaper },
                    { id: 'videos', label: '🎥 Masterclasses', icon: Video }
                  ].map((seg) => (
                    <button
                      key={seg.id}
                      onClick={() => {
                        setActiveSegment(seg.id as any);
                        setBooksPage(1);
                      }}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                        activeSegment === seg.id 
                          ? 'bg-[#EAB308] text-black shadow-[0_10px_20px_rgba(234,179,8,0.25)] scale-105' 
                          : 'bg-[#0c0c14] text-white/70 hover:bg-[#1a1a24] hover:text-white border border-white/5'
                      }`}
                    >
                      {seg.label}
                    </button>
                  ))}
               </div>
            </div>

            <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
              {/* List / Grid Toggle Switch */}
              <div className="flex p-1 rounded-xl border shadow-sm bg-[#0c0c14] border-white/10">
                <button 
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#EAB308] text-black shadow-sm' : 'text-white/40 hover:text-white'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  title="List View"
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#EAB308] text-black shadow-sm' : 'text-white/40 hover:text-white'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <Link 
                to={activeSegment === 'ebooks' ? '/bookshelf' : activeSegment === 'blogs' ? '/blog' : '/videos'} 
                className="flex items-center gap-1.5 text-[#EAB308] font-bold text-xs hover:underline uppercase tracking-wider"
              >
                Explore All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="w-full">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {[1,2,3,4,5].map(i => <div key={i} className={`aspect-[3/4] rounded-2xl animate-pulse ${isDarkMode ? 'bg-white/5' : 'bg-sky-200/30'}`} />)}
              </div>
            ) : activeItems.length > 0 ? (
              <>
                <div className={viewMode === 'grid' 
                  ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6" 
                  : "grid grid-cols-1 gap-4 max-w-4xl mx-auto"
                }>
                  {activeItems.slice((booksPage - 1) * 10, booksPage * 10).map((item, idx) => {
                    const isBlog = activeSegment === 'blogs';
                    const isVideo = activeSegment === 'videos';
                    const isFree = !isBlog && !isVideo && (!item.price || Number(item.price) === 0);
                    const targetUrl = isBlog 
                      ? `/blog/${item.public_slug || item.id}` 
                      : (isVideo || isFree)
                        ? `/read/${item.id}` 
                        : `/book/${item.public_slug || item.id}/buy`;

                    if (viewMode === 'grid') {
                      return (
                        <motion.div 
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.2) }}
                          viewport={{ once: true, margin: "-10px" }}
                          onClick={() => handleSecureAction(targetUrl)}
                          className="group cursor-pointer space-y-3"
                        >
                          <div className={`aspect-[3/4] relative rounded-2xl overflow-hidden border transition-all duration-300 ${isDarkMode ? 'border-white/5 bg-white/5 shadow-md group-hover:shadow-[0_15px_30px_rgba(0,0,0,0.5)] group-hover:border-white/10' : 'border-sky-200 bg-white shadow-md shadow-sky-100 group-hover:shadow-[0_15px_30px_rgba(2,132,199,0.15)] group-hover:border-sky-300'}`}>
                            {isVideo && (
                              <div className="absolute inset-0 flex items-center justify-center z-10">
                                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                  <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                                </div>
                              </div>
                            )}
                            <img 
                              src={item.cover_image || (isBlog ? 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800' : isVideo ? 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800' : 'https://images.unsplash.com/photo-1543004218-ee141104975a?auto=format&fit=crop&q=80&w=800')} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                              alt={item.title} 
                              draggable="false"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                               <Badge className={`backdrop-blur-md border text-[9px] px-2 py-0.5 ${isDarkMode ? 'bg-white/10 border-white/10 text-white' : 'bg-sky-100 border-sky-300 text-sky-800 font-bold'}`}>{item.price && Number(item.price) > 0 ? `₦${Number(item.price).toLocaleString()}` : "FREE"}</Badge>

                            </div>
                          </div>
                          <div className="px-1 text-left">
                            <span className="text-[8px] font-black uppercase tracking-widest block mb-0.5 text-slate-800">
                              {isVideo ? 'Masterclass Video' : isBlog ? 'Insight Article' : 'eBook Portfolio'}
                            </span>
                            <h4 className="font-bold text-xs sm:text-sm line-clamp-1 group-hover:text-[#EAB308] transition-colors leading-tight text-slate-950">
                              {item.title}
                            </h4>
                            <p className="text-[10px] font-medium truncate mt-0.5 text-slate-900/70 font-semibold">
                             {item.users?.full_name || item.author_name || 'Verified Author'}
                            </p>
                          </div>
                        </motion.div>
                      );
                    } else {
                      // Compact List View (reduces large cards, fits beautifully)
                      return (
                        <motion.div 
                          key={item.id}
                          initial={{ opacity: 0, x: -15 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.2) }}
                          viewport={{ once: true }}
                          onClick={() => handleSecureAction(targetUrl)}
                          className="group cursor-pointer border rounded-2xl p-4 flex gap-5 items-center transition-all duration-300 w-full bg-[#0c0c14] border-white/5 hover:border-white/10 hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)]"
                        >
                          <div className="w-14 h-16 sm:w-16 sm:h-20 shrink-0 rounded-lg overflow-hidden relative shadow-md bg-white/10">
                            {isVideo && (
                              <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30">
                                <Play className="w-4 h-4 text-white fill-current" />
                              </div>
                            )}
                            <img 
                              src={item.cover_image || (isBlog ? 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800' : isVideo ? 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800' : 'https://images.unsplash.com/photo-1543004218-ee141104975a?auto=format&fit=crop&q=80&w=800')} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                              alt={item.title} 
                              draggable="false"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <Badge className="backdrop-blur-md border text-[9px] px-2 py-0.5 bg-white/10 border-white/10 text-white">{item.price && Number(item.price) > 0 ? `₦${Number(item.price).toLocaleString()}` : "FREE"}</Badge>
                              <span className="text-[9px] font-bold uppercase tracking-widest leading-none text-white/40">
                                By {item.users?.full_name || item.author_name || 'Verified Author'}
                              </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-black leading-tight group-hover:text-[#EAB308] transition-colors truncate text-white">
                              {item.title}
                            </h3>
                            <p className="text-[10px] sm:text-xs font-medium line-clamp-1 mt-1 font-sans text-white/40">
                              {item.description || "Discover premium content, specialized guide guides, and interactive chapters."}
                            </p>
                          </div>

                        </motion.div>
                      );
                    }
                  })}
                </div>

                {/* Pagination */}
                {activeItems.length > 10 && (
                  <div className="flex items-center justify-center gap-3 mt-12 p-2 rounded-xl w-fit mx-auto animate-in fade-in border bg-[#0c0c14] border-white/10">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setBooksPage(prev => Math.max(1, prev - 1));
                      }}
                      disabled={booksPage === 1}
                      className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-[#EAB308] hover:bg-[#EAB308]/10 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                    </Button>
                    <span className="text-[10px] font-bold px-1 tracking-widest uppercase text-white/50">
                      Page {booksPage} of {Math.ceil(activeItems.length / 10)}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setBooksPage(prev => Math.min(Math.ceil(activeItems.length / 10), prev + 1));
                      }}
                      disabled={booksPage >= Math.ceil(activeItems.length / 10)}
                      className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-[#EAB308] hover:bg-[#EAB308]/10 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="py-16 text-center rounded-2xl border animate-in fade-in bg-[#0c0c14] border-white/5 text-white/30">
                <p className="text-xs font-medium italic">Our curators are gathering content... Check back soon.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. TRENDING TRIVIA TOP 5 SECTION */}
      <section className="py-24 px-6 border-b overflow-hidden relative border-slate-900/10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-amber-500/5 blur-[120px] pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge className="bg-amber-500/10 text-[#EAB308] border border-[#EAB308]/20 mb-4 font-sans">Trivia Hub</Badge>
            <h2 className="text-3xl md:text-5xl font-sans font-black tracking-tight mb-4 text-slate-950">
              Trending Trivia <span className="text-[#EAB308]">Challenges</span>
            </h2>
            <p className="text-sm font-medium font-sans text-slate-800">
              Test your knowledge, climb the ranks, and earn premium rewards.
            </p>
          </div>

          <div className="space-y-4 max-w-2xl mx-auto">
            {featuredTrivias && featuredTrivias.length > 0 ? (
              featuredTrivias.slice(0, 5).map((trivia: any, idx: number) => (
                <motion.div
                  key={trivia.id || trivia.session_id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  onClick={() => {
                    const path = `/trivia/ebook/${trivia.id || trivia.session_id || 'general'}`;
                    if (user) {
                      navigate(path);
                    } else {
                      handleSecureAction(path);
                    }
                  }}
                  className="group cursor-pointer rounded-2xl p-4 flex gap-4 items-center transition-all duration-300 hover:-translate-y-1 border bg-[#0c0c14] border-white/5 hover:border-white/10 hover:shadow-[0_15px_30px_rgba(234,179,8,0.05)]"
                >
                  {/* Rank Badge */}
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[#EAB308] border border-amber-500/20 flex items-center justify-center font-black text-sm shrink-0 shadow-inner group-hover:bg-[#EAB308] group-hover:text-black transition-colors">
                    #{idx + 1}
                  </div>

                  {/* Book Thumbnail */}
                  <div className="w-14 h-16 sm:w-16 sm:h-20 shrink-0 rounded-lg overflow-hidden relative bg-white/10 shadow-md">
                    <img
                      src={trivia.cover_image || "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=150&auto=format&fit=crop"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      alt={trivia.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  </div>

                  {/* Title & Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <h4 className="font-bold text-sm line-clamp-1 group-hover:text-[#EAB308] transition-colors leading-tight text-white">
                      {trivia.title}
                    </h4>
                    <p className="text-[11px] mt-1 font-medium truncate text-white/40">
                      {trivia.isGeneral ? 'General Knowledge Pool' : (trivia.book_title || 'Linked eBook')}
                    </p>
                  </div>

                  {/* Points Reward Tag */}
                  <div className="text-right shrink-0">
                    <span className="block text-[10px] font-black text-[#EAB308] uppercase tracking-wide">
                      +{trivia.reward_points} TP
                    </span>
                    <span className="text-[9px] font-bold flex items-center gap-1 justify-end mt-0.5 text-white/35">
                      <Clock className="w-2.5 h-2.5" /> Live
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-12 text-center rounded-3xl border bg-[#0c0c14] border-white/5 text-white/30">
                <p className="text-xs italic font-medium">No trivia available — check back soon!</p>
              </div>
            )}
          </div>

          <div className="text-center mt-12">
            <Button 
              size="lg" 
              onClick={() => {
                if (user) {
                  navigate('/trivia');
                } else {
                  handleSecureAction('/trivia');
                }
              }}
              className="bg-[#EAB308] text-black hover:bg-[#EAB308]/90 h-16 px-10 text-lg font-black rounded-2xl shadow-xl shadow-amber-500/10 transition-transform hover:scale-105"
            >
              Explore Trivia Hub <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

        </div>
      </section>

      {/* 4. AI CREATION ANIMATION */}
      <section className="py-24 px-6 border-y border-white/5 bg-[#0c0c14] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <Badge className="bg-[#EAB308]/10 text-[#EAB308] border-none mb-6">AI Magic</Badge>
              <h2 className={`text-4xl md:text-6xl font-black mb-8 tracking-tighter leading-[1.1] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Paste Content. <br/>
                <span className={isDarkMode ? 'text-white/30' : 'text-slate-400'}>Watch Magic Happen.</span>
              </h2>
              <p className={`text-lg mb-10 leading-relaxed font-medium ${isDarkMode ? 'text-white/50' : 'text-slate-700'}`}>
                Our AI engine automatically transforms your long manuscripts into beautiful, card-based interactive eBooks. Ready to publish in seconds.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white/80' : 'text-slate-800'}`}>Intelligent Chapter Splitting</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white/80' : 'text-slate-800'}`}>Sentiment-based Theme Selection</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white/80' : 'text-slate-800'}`}>Interactive Trivia Generation</span>
                </div>
              </div>
            </div>

            <div className={`relative aspect-square lg:aspect-video rounded-[3rem] p-8 overflow-hidden border transition-all ${isDarkMode ? 'bg-black/40 border-white/10 shadow-2xl' : 'bg-sky-200/50 border-sky-300 shadow-xl shadow-sky-100'}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-[#EAB308]/5 to-transparent pointer-events-none" />
              
              <AnimatePresence mode="wait">
                {creationStep === 0 && (
                  <motion.div 
                    key="step0"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="h-full flex flex-col"
                  >
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-3 h-3 rounded-full bg-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                      <div className="w-3 h-3 rounded-full bg-green-500/50" />
                      <span className={`text-[10px] font-bold uppercase tracking-widest ml-2 ${isDarkMode ? 'text-white/20' : 'text-slate-600'}`}>Manuscript Editor</span>
                    </div>
                    <div className={`flex-1 rounded-2xl p-6 font-serif italic text-lg leading-relaxed overflow-hidden transition-all ${isDarkMode ? 'bg-white/5 text-white/40' : 'bg-white text-slate-800 shadow-inner'}`}>
                      {displayText}
                      <motion.span 
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="inline-block w-0.5 h-6 bg-[#EAB308] ml-1 align-middle"
                      />
                    </div>
                  </motion.div>
                )}

                {creationStep === 1 && (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center text-center space-y-6"
                  >
                    <div className="relative">
                      <RefreshCw className="w-16 h-16 text-[#EAB308] animate-spin" />
                      <Sparkles className="w-8 h-8 text-[#EAB308] absolute -top-2 -right-2 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">Analyzing Narratives</h4>
                      <p className={`text-sm italic ${isDarkMode ? 'text-white/40' : 'text-slate-600'}`}>Crafting card experiences...</p>
                    </div>
                  </motion.div>
                )}

                {creationStep === 2 && (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="h-full flex items-center justify-center"
                  >
                    <div className={`w-64 aspect-[3/4] bg-gradient-to-b rounded-3xl border-2 border-[#EAB308]/50 p-8 flex flex-col text-center ${isDarkMode ? 'from-[#1a1a24] to-black shadow-[0_0_50px_rgba(234,179,8,0.2)]' : 'from-white to-sky-50 shadow-xl shadow-sky-200'}`}>
                       <span className="text-[8px] font-bold text-[#EAB308] uppercase tracking-[0.3em] mb-4">Amina: Warrior Queen</span>
                       <div className="flex-1 flex flex-col items-center justify-center">
                          <p className={`text-xl font-serif italic leading-relaxed ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            "Strength is not in the sword, but in the heart that carries it."
                          </p>
                       </div>
                       <div className="mt-auto pt-6 flex justify-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-white/20" />
                          <div className="w-6 h-1 rounded-full bg-[#EAB308]" />
                          <div className="w-1 h-1 rounded-full bg-white/20" />
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BLOG & VIDEO SECTIONS */}
      <section className="py-32 px-6 border-y border-white/5 bg-[#0c0c14] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div>
               <span className="text-indigo-400 text-sm font-bold uppercase tracking-[0.2em] mb-4 inline-block">Insights & Multimedia</span>
               <h2 className="text-4xl md:text-5xl font-sans font-black tracking-tighter text-white">Read & Watch</h2>
            </div>
            <Link to="/blog" className="flex items-center gap-2 text-[#EAB308] font-bold text-sm hover:underline">
              View All Insights <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* Blog Column */}
            <div className="space-y-12">
               <div className="flex items-center gap-4 mb-8">
                  <Newspaper className="w-8 h-8 text-indigo-400" />
                  <h3 className={`text-2xl font-black uppercase tracking-tighter ${isDarkMode ? 'text-white/30' : 'text-slate-400'}`}>The Journal</h3>
               </div>
               <div className="space-y-10">
                  {blogs.length > 0 ? blogs.map(blog => (
                    <div key={blog.id} onClick={() => navigate(`/blog/${blog.public_slug || blog.id}`)} className="group cursor-pointer flex gap-6 items-start">
                       <div className="w-32 h-32 shrink-0 rounded-2xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
                          <img src={blog.cover_image || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover" alt="Blog" />
                       </div>
                       <div>
                          <h4 className={`text-xl font-bold mb-2 group-hover:text-[#EAB308] transition-colors ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>{blog.title}</h4>
                          <p className={`text-sm line-clamp-2 mb-4 ${isDarkMode ? 'text-white/40' : 'text-slate-600'}`}>{blog.description || blog.excerpt || "Reading is a journey through infinity."}</p>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/20' : 'text-slate-500'}`}>Read Article • {new Date(blog.created_at).toLocaleDateString()}</span>
                       </div>
                    </div>
                  )) : (
                    <div className={`py-10 text-center rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5 text-white/20' : 'bg-sky-200/10 border-sky-200 text-slate-500'}`}>
                      <p className="text-xs italic">No journal entries yet.</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Video Column */}
            <div className="space-y-12">
               <div className="flex items-center gap-4 mb-8">
                  <Video className="w-8 h-8 text-rose-400" />
                  <h3 className={`text-2xl font-black uppercase tracking-tighter ${isDarkMode ? 'text-white/30' : 'text-slate-400'}`}>Calm Vision</h3>
               </div>
               <div className="space-y-10">
                  {videos.length > 0 ? videos.map(video => (
                    <div key={video.id} onClick={() => navigate(`/read/${video.id}`)} className="group cursor-pointer relative aspect-video rounded-3xl overflow-hidden border border-white/5">
                       <img src={video.cover_image || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=800'} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60" alt="Video" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 group-hover:bg-white/20 transition-all">
                             <Play className="w-6 h-6 text-white fill-white" />
                          </div>
                       </div>
                       <div className="absolute bottom-6 left-6 right-6">
                          <h4 className="text-lg font-bold text-white mb-1">{video.title}</h4>
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">12:45 • Published Recently</span>
                       </div>
                    </div>
                  )) : (
                    <div className={`aspect-video flex items-center justify-center rounded-3xl border ${isDarkMode ? 'bg-white/5 border-white/5 text-white/20' : 'bg-sky-200/10 border-sky-200 text-slate-500'}`}>
                      <p className="text-xs italic">No video series available.</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6.5 TRIVIA PROMO COUNTDOWN SECTION */}
      {activePromo && Date.now() < new Date(activePromo.end_time).getTime() && (
        <section className={`py-20 px-6 border-t border-b transition-colors duration-300 ${isDarkMode ? 'bg-[#05050a] border-white/5' : 'bg-sky-100/50 border-sky-200'}`}>
          <div className="max-w-7xl mx-auto">
            <div className={`relative rounded-[3rem] border p-8 md:p-14 overflow-hidden shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-12 ${isDarkMode ? 'bg-gradient-to-br from-indigo-950/30 via-slate-900/30 to-black border-white/5' : 'bg-white border-sky-200 shadow-sky-100'}`}>
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#EAB308]/10 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
              
              <div className="space-y-6 max-w-2xl text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-[#EAB308]/10 text-[#EAB308] border border-[#EAB308]/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                  <Clock className="w-3.5 h-3.5 animate-pulse" /> Active Promotion
                </div>
                <div className="space-y-2">
                  <h3 className={`text-3xl md:text-5xl font-sans font-black tracking-tighter uppercase leading-none ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                    {activePromo.title}
                  </h3>
                  <p className="text-[#EAB308] text-lg font-black tracking-tight flex items-center justify-center lg:justify-start gap-1.5">
                    <Sparkles className="w-5 h-5 animate-bounce" /> Prize Pool: {activePromo.prize}
                  </p>
                </div>
                <p className={`text-sm font-medium leading-relaxed max-w-lg ${isDarkMode ? 'text-white/50' : 'text-slate-700'}`}>
                  Test your comprehension of this exclusive masterwork to unlock data rewards, cash payouts, and ecosystem champion points instantly.
                </p>
              </div>

              <div className="space-y-6 flex flex-col items-center shrink-0 w-full lg:w-auto">
                <div className="text-center">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] block mb-4 ${isDarkMode ? 'text-white/40' : 'text-slate-600'}`}>
                    {timeLeft.total > 0 ? "PRIME DRAW COUNTDOWN" : "DRAW IS CURRENTLY"}
                  </span>
                  
                  {timeLeft.total > 0 ? (
                    <div className="flex gap-4 sm:gap-6 justify-center">
                      <div className={`border backdrop-blur-md rounded-2xl p-4 w-18 sm:w-20 text-center ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-sky-50 border-sky-200 shadow-md shadow-sky-100'}`}>
                        <span className="text-2xl sm:text-3xl font-black block tracking-tight">{timeLeft.days}</span>
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Days</span>
                      </div>
                      <div className={`border backdrop-blur-md rounded-2xl p-4 w-18 sm:w-20 text-center ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-sky-50 border-sky-200 shadow-md shadow-sky-100'}`}>
                        <span className={`text-2xl sm:text-3xl font-black block tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{timeLeft.hours}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white/40' : 'text-slate-500'}`}>Hours</span>
                      </div>
                      <div className={`border backdrop-blur-md rounded-2xl p-4 w-18 sm:w-20 text-center ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-sky-50 border-sky-200 shadow-md shadow-sky-100'}`}>
                        <span className={`text-2xl sm:text-3xl font-black block tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{timeLeft.minutes}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white/40' : 'text-slate-500'}`}>Mins</span>
                      </div>
                      <div className={`border backdrop-blur-md rounded-2xl p-4 w-18 sm:w-20 text-center ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-sky-50 border-sky-200 shadow-md shadow-sky-100'}`}>
                        <span className={`text-2xl sm:text-3xl font-black block tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{timeLeft.seconds}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white/40' : 'text-slate-500'}`}>Secs</span>
                      </div>
                    </div>
                  ) : (
                    <Badge className="bg-green-500 text-white font-black text-xs uppercase tracking-widest px-6 py-2 border-none rounded-full shadow-[0_0_20px_rgba(34,197,94,0.4)] animate-pulse">
                      Live Now • Active Payouts
                    </Badge>
                  )}
                </div>

                <Button 
                  onClick={() => navigate('/explore/trivia')}
                  className="w-full sm:w-64 h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-none rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  <Sparkles className="w-4 h-4" /> {timeLeft.total > 0 ? "Join Trivia Hub!" : "Play & Win Live"}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. FOR WRITERS SECTION */}
      <section className="py-32 px-6">
        <div className={`max-w-7xl mx-auto border rounded-[48px] overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-[#0c0c14] border-white/5' : 'bg-white border-sky-200 shadow-2xl shadow-sky-100'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="relative h-[400px] lg:h-auto overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&q=80&w=1200" 
                className="absolute inset-0 w-full h-full object-cover"
                alt="Writer"
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
            <div className="p-12 lg:p-24 flex flex-col justify-center">
              <span className="text-[#EAB308] font-serif italic text-xl mb-4">For Writers. By Writers.</span>
              <h2 className={`text-5xl md:text-7xl font-sans font-black mb-8 tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                Write. <span className="text-[#EAB308]">Publish.</span> Earn.
              </h2>
              <p className={`text-lg leading-relaxed mb-10 font-medium ${isDarkMode ? 'text-white/50' : 'text-slate-700'}`}>
                Join thousands of writers on CalmReader. Publish your stories, grow your audience and earn in Naira.
              </p>
              <Button size="lg" asChild className="bg-[#EAB308] text-black hover:bg-[#EAB308]/90 h-16 px-10 text-lg font-bold rounded-2xl transition-transform hover:scale-105 w-fit">
                <Link to="/signup">Start Writing <ArrowRight className="ml-2 w-5 h-5" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. COMMUNITY SECTION */}
      <section className="py-32 px-6 text-center">
        <div className="max-w-7xl mx-auto">
          <span className="text-slate-900 text-sm font-bold uppercase tracking-[0.2em] mb-4 inline-block">Our Community</span>
          <h2 className="text-4xl md:text-6xl font-sans font-black mb-20 tracking-tighter text-slate-950">
            Real people. Real stories. Real impact.
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {[
              { name: "Tolu, Lagos", quote: "CalmReader changed how I read. Short, deep and addictive!" },
              { name: "Ifeoma, Enugu", quote: "The anonymous confessions hit different. So real, so relatable." },
              { name: "Daniel, Abuja", quote: "Finally, a platform that pays writers fairly in Naira!" }
            ].map((t, i) => (
              <div key={i} className={`p-10 border rounded-[32px] flex flex-col transition-all duration-300 ${isDarkMode ? 'bg-[#0c0c14] border-white/5' : 'bg-white border-sky-200 shadow-xl shadow-sky-100/50'}`}>
                <MessageSquareQuote className="w-8 h-8 text-[#EAB308] mb-6 opacity-30" />
                <p className={`text-xl font-medium leading-relaxed mb-10 flex-1 italic ${isDarkMode ? 'text-white/80' : 'text-slate-800'}`}>
                  "{t.quote}"
                </p>
                <span className={`text-sm font-bold uppercase tracking-widest ${isDarkMode ? 'text-white/30' : 'text-slate-500'}`}>— {t.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. JOIN CTA BANNER */}
      <section className="py-24 px-6">
        <div className={`max-w-7xl mx-auto border rounded-[40px] p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat opacity-90 transition-all duration-300 ${isDarkMode ? 'bg-[#0a0a0f] border-white/5' : 'bg-white border-sky-200 shadow-2xl shadow-sky-100'}`}>
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 bg-[#EAB308]/10 text-[#EAB308] rounded-3xl flex items-center justify-center shrink-0">
               <Gift className="w-10 h-10" />
            </div>
            <div>
               <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>Join CalmReader Today</h2>
               <p className={`text-lg leading-relaxed font-medium ${isDarkMode ? 'text-white/40' : 'text-slate-600'}`}>
                  Read amazing stories, share your own and be part of a community that truly gets you.
               </p>
            </div>
          </div>
          <Button size="lg" asChild className="bg-[#EAB308] text-black hover:bg-[#EAB308]/90 h-16 px-10 text-lg font-bold rounded-2xl transition-transform hover:scale-105 whitespace-nowrap">
             <Link to="/signup">Get Started Now <ArrowRight className="ml-2 w-5 h-5" /></Link>
          </Button>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className={`py-12 border-t font-sans relative z-10 w-full transition-colors duration-300 ${isDarkMode ? 'border-white/5 bg-[#030308]' : 'border-sky-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
               <BookOpen className="w-6 h-6 text-[#EAB308]" />
               <span className={`font-sans font-black text-xl tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>CalmReader</span>
            </div>
            
            <div className={`flex flex-wrap justify-center gap-6 sm:gap-8 text-xs font-semibold ${isDarkMode ? 'text-white/40' : 'text-slate-600'}`}>
               <Link to="/download" className={`transition-colors text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1`}>
                 <Smartphone className="w-3.5 h-3.5" />
                 <span>Android APK</span>
               </Link>
               <Link to="/about" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-slate-950'}`}>About</Link>
               <Link to="/terms" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-slate-950'}`}>Terms</Link>
               <Link to="/privacy" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-slate-950'}`}>Privacy</Link>
               <Link to="/support" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-slate-950'}`}>Support</Link>
            </div>

            <div className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-white/20' : 'text-slate-500'}`}>
              <p>© 2026 CalmReader. All Rights Reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
