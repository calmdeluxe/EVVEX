// LEGACY: CalmReader file, not part of EVEX product. To be unmounted in a later pass.
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Maximize2, Minimize2, Flag, AlertTriangle, Download, CloudOff, CheckCircle2, FileText, RefreshCw, Settings2, Bookmark, Sun, Moon, Loader2, FileDown, Share2, BookOpen, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import html2pdf from 'html2pdf.js';
import { AVAILABLE_FONTS } from './CreateBook';

declare const PaystackPop: any;

const CARD_THEMES = [
  { id: 'nebula', name: 'Celestial Spark', font: 'font-serif', gradient: 'radial-gradient(circle at 50% 10%, #7e22ce44 0%, transparent 60%), radial-gradient(circle at 15% 85%, #f59e0b22 0%, transparent 40%)', bg: '#060317', text: '#e2e8f0', cardBg: 'rgba(13, 10, 27, 0.88)', cardText: '#f8fafc', border: 'rgba(168, 85, 247, 0.25)' },
  { id: 'aurora', name: 'Emerald Nebula', font: 'font-sans', gradient: 'radial-gradient(circle at 20% 20%, #10b98155 0%, transparent 60%), radial-gradient(circle at 80% 80%, #3b82f644 0%, transparent 60%)', bg: '#02070f', text: '#e2e8f0', cardBg: 'rgba(1, 10, 21, 0.88)', cardText: '#f8fafc', border: 'rgba(16, 185, 129, 0.25)' },
  { id: 'eclipse', name: 'Solar Flare', font: 'font-serif', gradient: 'radial-gradient(circle at 50% 50%, #f9731633 0%, transparent 70%), radial-gradient(circle at 20% 80%, #7c2d1255 0%, transparent 50%)', bg: '#0b0603', text: '#e2e8f0', cardBg: 'rgba(18, 10, 5, 0.88)', cardText: '#fed7aa', border: 'rgba(249, 115, 22, 0.25)' },
  { id: 'paper', name: 'Antique Paper', font: 'font-serif', gradient: 'none', bg: '#FAF8F5', text: '#1E1E1E', cardBg: '#FFFFFF', cardText: '#1A1A1A', border: 'rgba(0, 0, 0, 0.08)' },
  { id: 'sepia', name: 'Warm Sepia', font: 'font-serif', gradient: 'none', bg: '#F4ECD8', text: '#3E2723', cardBg: '#FBF6EC', cardText: '#3E2723', border: 'rgba(67, 52, 34, 0.09)' },
  { id: 'night', name: 'Nocturnal Void', font: 'font-sans', gradient: 'none', bg: '#0C0C0C', text: '#D1D5DB', cardBg: '#151515', cardText: '#E5E7EB', border: 'rgba(255, 255, 255, 0.08)' },
  { id: 'sunset', name: 'Cyber Sunset', font: 'font-serif', gradient: 'radial-gradient(circle at 30% 20%, #ff4e0055 0%, transparent 60%), radial-gradient(circle at 70% 80%, #2e100bdd 0%, transparent 60%)', bg: '#060302', text: '#f3f4f6', cardBg: 'rgba(18, 9, 7, 0.88)', cardText: '#ffeedd', border: 'rgba(255, 78, 0, 0.25)' },
  { id: 'neon', name: 'Neon Void', font: 'font-sans', gradient: 'radial-gradient(circle at 20% 30%, #4f46e544 0%, transparent 50%), radial-gradient(circle at 80% 70%, #7e22ce44 0%, transparent 50%)', bg: '#010214', text: '#f3f4f6', cardBg: 'rgba(4, 5, 25, 0.88)', cardText: '#e0e7ff', border: 'rgba(99, 102, 241, 0.25)' },
  { id: 'royal', name: 'Royal Velvet', font: 'font-serif', gradient: 'radial-gradient(circle at 10% 40%, #a855f744 0%, transparent 50%), radial-gradient(circle at 90% 60%, #4c1d9555 0%, transparent 50%)', bg: '#04020f', text: '#ecfeff', cardBg: 'rgba(10, 6, 26, 0.88)', cardText: '#fae8ff', border: 'rgba(168, 85, 247, 0.25)' },
  { id: 'gold', name: 'Liquid Gold', font: 'font-sans', gradient: 'radial-gradient(circle at 20% 20%, #f59e0b22 0%, transparent 60%), radial-gradient(circle at 80% 80%, #78350f33 0%, transparent 60%)', bg: '#070603', text: '#f3f4f6', cardBg: 'rgba(15, 12, 6, 0.88)', cardText: '#fef3c7', border: 'rgba(245, 158, 11, 0.2)' },
];

export const ReadBook: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, isAdmin, isAuthReady } = useAuth();
  const [book, setBook] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [shareCopied, setShareCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasPaidPDF, setHasPaidPDF] = useState(false);
  const [paystackConfig, setPaystackConfig] = useState<any>(null);
  const [activeThemeId, setActiveThemeId] = useState('sunset');
  const [activeFontId, setActiveFontId] = useState('font-lora');
  const [readerFontSize, setReaderFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>(() => {
    return (sessionStorage.getItem('reader_font_size') as any) || 'md';
  });
  const [isNightMode, setIsNightMode] = useState(() => {
    return localStorage.getItem('reader_night_mode') !== 'false';
  });
  const [readerLineHeight, setReaderLineHeight] = useState<'relaxed' | 'loose'>('relaxed');
  const [readerAlignment, setReaderAlignment] = useState<'left' | 'justify' | 'center'>(() => {
    return (localStorage.getItem('reader_alignment') as any) || 'left';
  });

  useEffect(() => {
    localStorage.setItem('reader_alignment', readerAlignment);
  }, [readerAlignment]);

  const [optionsOpen, setOptionsOpen] = useState(false);

  // SHARE: link with ref parameter
  const handleShareBook = async () => {
    if (!book) return;
    if (!user) {
      alert("Sign in to share and earn rewards!");
      return;
    }
    const shareUrl = `${window.location.origin}/ebook/${book.public_slug || book.id}?ref=${user.id}`;
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
      navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };
  const [showChapterList, setShowChapterList] = useState(true);
  const [visitedChapters, setVisitedChapters] = useState<number[]>([]);
  const [imagePosition, setImagePosition] = useState<'background' | 'top' | 'bottom'>(() => {
    return (localStorage.getItem('preferred_image_position') as any) || 'background';
  });

  // Bookmark specific stats & handlers
  const [bookmarking, setBookmarking] = useState(false);
  const [dbBookmarkIndex, setDbBookmarkIndex] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('preferred_image_position', imagePosition);
  }, [imagePosition]);

  // Load cloud/offline progress bookmark upon mount / routing
  useEffect(() => {
    const loadBookmark = async () => {
      if (!book?.id) return;
      
      const localBookmarkKey = user?.id ? `reading_progress_${user.id}_${book.id}` : `bookmark_${book.id}`;
      const localBookmark = localStorage.getItem(localBookmarkKey);
      let initialIdx = localBookmark ? parseInt(localBookmark) : 0;
      
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('reading_progress')
            .select('card_index')
            .eq('user_id', user.id)
            .eq('book_id', book.id)
            .maybeSingle();
            
          if (data && data.card_index !== undefined && data.card_index !== null) {
            const dbIdx = parseInt(data.card_index);
            setDbBookmarkIndex(dbIdx);
            if (!localBookmark || dbIdx !== initialIdx) {
              initialIdx = dbIdx;
            }
          }
        } catch (err) {
          console.warn("[Bookmark] Cloud load failed, falling back to local bookmark.", err);
        }
      }
      
      if (initialIdx > 0 && initialIdx < (book.cards_json?.length || 0)) {
        setCurrentIndex(initialIdx);
        setShowChapterList(false);
      }
    };
    
    loadBookmark();
  }, [book?.id, user?.id]);

  // Handle bookmark saving to Supabase & localStorage
  const saveBookmark = async (customIndex?: number) => {
    const targetIndex = customIndex !== undefined ? customIndex : currentIndex;
    if (!book?.id) return;
    
    const totalCards = book.cards_json?.length || 1;
    const progressPercent = totalCards > 1 ? Math.min(100, Math.round((targetIndex / (totalCards - 1)) * 100)) : 100;
    const isCompleted = progressPercent >= 90;

    setBookmarking(true);
    const localBookmarkKey = user?.id ? `reading_progress_${user.id}_${book.id}` : `bookmark_${book.id}`;
    localStorage.setItem(localBookmarkKey, String(targetIndex));
    setDbBookmarkIndex(targetIndex);
    
    if (user?.id) {
      try {
        const { error } = await supabase
          .from('reading_progress')
          .upsert({
            user_id: user.id,
            book_id: book.id,
            card_index: targetIndex,
            progress: progressPercent,
            completed: isCompleted,
            last_read_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,book_id' });
          
        if (error) {
          console.warn("[Bookmark] Upsert failed, executing override.");
          await supabase
            .from('reading_progress')
            .delete()
            .eq('user_id', user.id)
            .eq('book_id', book.id);
            
          await supabase
            .from('reading_progress')
            .insert({
              user_id: user.id,
              book_id: book.id,
              card_index: targetIndex,
              progress: progressPercent,
              completed: isCompleted,
              last_read_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        }
      } catch (err) {
        console.warn("[Bookmark] Cloud sync failed, stored bookmark locally.", err);
      }
    }
    setBookmarking(false);
  };

  // Auto-save reading progress on page turn
  useEffect(() => {
    if (book?.id && currentIndex !== null && !showChapterList) {
      const timer = setTimeout(() => {
        saveBookmark(currentIndex);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, book?.id, showChapterList]);

  useEffect(() => {
    if (book?.id) {
      const visitedKey = user?.id ? `visited_${user.id}_${book.id}` : `visited_${book.id}`;
      const stored = localStorage.getItem(visitedKey);
      if (stored) {
        try {
          setVisitedChapters(JSON.parse(stored));
        } catch (e) {
          setVisitedChapters([]);
        }
      } else {
        setVisitedChapters([]);
      }
      setShowChapterList(true);
    }
  }, [book?.id, user?.id]);

  useEffect(() => {
    if (book?.id && currentIndex !== null && !showChapterList) {
      const key = user?.id ? `visited_${user.id}_${book.id}` : `visited_${book.id}`;
      setVisitedChapters(prev => {
        if (!prev.includes(currentIndex)) {
          const next = [...prev, currentIndex];
          localStorage.setItem(key, JSON.stringify(next));
          return next;
        }
        return prev;
      });
    }
  }, [currentIndex, book?.id, showChapterList, user?.id]);

  const selectChapter = (index: number) => {
    setCurrentIndex(index);
    setShowChapterList(false);
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const fetchBook = async () => {
      if (!id || !isAuthReady) return;
      
      try {
        // Only set loading if we don't have the book yet or it's a different one
        if (!book || (book.id !== id && book.public_slug !== id)) {
          setLoading(true);
        }
        
        // Robust lookup: handle UUIDs, slugs, and integer IDs
        const identifier = id!;
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        
        let bookData = null;
        let bookError = null;

        if (isUUID) {
          const { data, error } = await supabase.from('books').select('*').eq('id', identifier).maybeSingle();
          bookData = data;
          bookError = error;
        }

        if (!bookData) {
          const { data, error } = await supabase.from('books').select('*').eq('public_slug', identifier).maybeSingle();
          bookData = data;
          if (error) bookError = error;
        }

        if (!bookData && /^\d+$/.test(identifier)) {
          const { data, error } = await supabase.from('books').select('*').eq('id', parseInt(identifier)).maybeSingle();
          bookData = data;
          if (error) bookError = error;
        }
          
        if (bookError) throw bookError;

        if (bookData) {
          if (bookData.status === -1) {
             setBook(null);
             return;
          }
          
          const parsedBook = { ...bookData };
          try {
            if (typeof bookData.cards_json === 'string') {
              parsedBook.cards_json = JSON.parse(bookData.cards_json);
            }
          } catch (e) {
            parsedBook.cards_json = [];
          }
          setBook(parsedBook);

          if (parsedBook.admin_note) {
            const themeMatch = parsedBook.admin_note.match(/theme:([a-zA-Z0-9-]+)/);
            if (themeMatch) setActiveThemeId(themeMatch[1]);
            
            const fontMatch = parsedBook.admin_note.match(/font:([a-zA-Z0-9-]+)/);
            if (fontMatch) setActiveFontId(fontMatch[1]);
          }

          // Access Check: If book is paid and user is not admin/author, they MUST have a purchase
          const currentUserId = profile?.id || user?.id;
          const isOwner = bookData.user_id === currentUserId;
          const isPaid = bookData.price && bookData.price > 0;
          
          if (isPaid && !isAdmin && !isOwner) {
            // Check for DB purchase
            let hasPurchase = false;
            try {
              const { data: purchase } = await supabase
                .from('ebook_purchases')
                .select('*')
                .eq('user_id', currentUserId)
                .eq('ebook_id', bookData.id)
                .maybeSingle();
              if (purchase) hasPurchase = true;
            } catch (e) {
              console.warn("[Access] Direct purchase check failed (schema mismatch?), falling back to transactions check.");
            }

            // Fallback: Check transactions directly if ebook_purchases is a broken view
            if (!hasPurchase) {
              try {
                const { data: tx } = await supabase
                  .from('transactions')
                  .select('*')
                  .eq('user_id', currentUserId)
                  .eq('book_id', bookData.id)
                  .eq('status', 'successful')
                  .eq('type', 'purchase')
                  .maybeSingle();
                if (tx) hasPurchase = true;
              } catch (e) {
                console.warn("[Access] Transaction fallback failed.");
              }
            }

            // Also check for a mock access token (for testing convenience)
            const mockAccess = localStorage.getItem(`access_${bookData.id}`);

            if (!hasPurchase && !mockAccess) {
               console.log('[Access] No purchase record or mock access found. Redirecting to buy.');
               navigate(`/book/${bookData.public_slug || bookData.id}/buy`);
               return;
            }
          }
          
          // Suspended check
          if ((bookData.is_suspended || bookData.status === -2 || bookData.status === '-2') && !isAdmin && !isOwner) {
            setBook(null);
          }
        } else {
          setBook(null);
        }
      } catch (err) {
        console.error("ReadBook Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id, user?.id, isAdmin, isAuthReady]);

  const baseTheme = CARD_THEMES.find(t => t.id === activeThemeId) || CARD_THEMES[0];
  const currentTheme = isNightMode ? baseTheme : {
    ...baseTheme,
    id: 'day',
    bg: '#FAF8F5',
    text: '#1E1E1E',
    cardBg: 'transparent',
    cardText: '#1E1E1E',
    border: 'rgba(0,0,0,0.06)',
    gradient: 'none'
  };
  const contentType = book?.admin_note?.match(/type:([a-z]+)/)?.[1] || 'ebook';
  const cardImagePos = book?.cards_json?.[currentIndex]?.image_position || imagePosition;

  useEffect(() => {
    // Load Paystack config and user's payment status
    const checkPdfStatus = async () => {
      if (!user) return;
      
      // Check if user has already paid for the PDF of this book
      const { data: purchase } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', id)
        .eq('type', 'pdf_purchase')
        .eq('status', 'successful')
        .maybeSingle();

      if (purchase) {
        setHasPaidPDF(true);
      }

      // Fetch Paystack public key
      const { data: configData } = await supabase
        .from('config')
        .select('*')
        .eq('key', 'paystack_public_key')
        .single();
        
      if (configData) {
        setPaystackConfig({ paystackPublicKey: configData.value });
      }
    };

    checkPdfStatus();

    // Load Paystack script
    if (!window.document.getElementById('paystack-script')) {
      const script = document.createElement('script');
      script.id = 'paystack-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [id, isOffline, user]);

  const handleDownload = () => {
    if (!book) return;
    try {
      localStorage.setItem(`offline_book_${book.id}`, JSON.stringify(book));
      setDownloaded(true);
    } catch (err) {
      alert('Failed to save for offline reading. Your storage might be full.');
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    setReporting(true);
    try {
      const { error } = await supabase
        .from('reported_content')
        .insert({
          book_id: id,
          card_index: currentIndex,
          reporter_id: profile?.id || 'anonymous',
          reason: reportReason,
          status: 'pending',
        });

      if (error) throw error;
      setReportOpen(false);
      setReportReason('');
      alert('Report submitted. Thank you for helping keep CalmReader safe.');
    } catch (err) {
      console.error(err);
      alert('Failed to submit report.');
    } finally {
      setReporting(false);
    }
  };

  const handlePDFDownload = async () => {
    if (!book) return;

    // Check if payment is required
    const isOwner = profile?.id === book.user_id;
    const needsToPay = book.pdf_price > 0 && !hasPaidPDF && !isOwner && !isAdmin;

    if (needsToPay) {
      if (!paystackConfig?.paystackPublicKey) {
        alert('Payment system is undergoing maintenance. Please consult admin for assistance.');
        return;
      }

      const handler = PaystackPop.setup({
        key: paystackConfig.paystackPublicKey,
        email: user?.email || profile?.email || 'customer@example.com',
        amount: book.pdf_price * 100,
        currency: 'NGN',
        metadata: {
          book_id: book.id,
          type: 'pdf_purchase'
        },
        callback: (response: any) => {
          // Record successful payment locally immediately
          setHasPaidPDF(true);
          alert('Payment successful! Your PDF is generating...');
          generatePDF();
        },
        onClose: () => {
          setExporting(false);
        }
      });
      handler.openIframe();
      return;
    }

    generatePDF();
  };

  const generatePDF = async () => {
    setExporting(true);
    try {
      const element = document.createElement('div');
      element.className = 'pdf-container';
      element.style.padding = '0';
      element.style.margin = '0';
      element.style.fontFamily = 'serif';
      element.style.background = '#fff';

      // Create PDF Content
      const content = `
        <div style="padding: 60px; text-align: center; border-bottom: 2px solid #eee; background: white;">
          <h1 style="font-size: 36px; margin-bottom: 15px; color: #1a1a1a;">${book.title}</h1>
          <p style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">
             By ${book.admin_note?.match(/author:([^,]+)/)?.[1] || 'Verified Author'}
          </p>
          <p style="color: #999; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">Card-Based Anthology</p>
        </div>
        ${book.cards_json.map((card: string, i: number) => `
          <div style="page-break-after: always; height: 11in; width: 8.5in; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px; text-align: center; background: #fff; border: 1px solid #f0f0f0; box-sizing: border-box; position: relative;">
            <div style="font-size: 28px; line-height: 1.6; color: #222; font-style: italic; max-width: 80%;">
              "${card}"
            </div>
            <div style="position: absolute; bottom: 80px; width: 100%; left: 0; text-align: center; color: #999; font-size: 11px; letter-spacing: 4px; font-family: sans-serif; font-weight: bold;">
              CARD ${i + 1} OF ${book.cards_json.length}
            </div>
          </div>
        `).join('')}
      `;
      element.innerHTML = content;

      const opt = {
        margin: 0,
        filename: `${book.title.replace(/\s+/g, '_')}_Official_Cards.pdf`,
        image: { type: 'jpeg' as const, quality: 1.0 },
        html2canvas: { 
          scale: 3, 
          useCORS: true, 
          logging: false,
          letterRendering: true
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const nextCard = () => {
    if (book && currentIndex < (book.cards_json?.length || 0) - 1) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const variants: any = {
    enter: (direction: number) => ({
      x: direction > 0 ? 350 : -350,
      opacity: 0,
      scale: 0.93,
      rotate: direction > 0 ? 6 : -6,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        x: { type: "spring", stiffness: 380, damping: 32 },
        opacity: { duration: 0.15 },
        scale: { duration: 0.18 },
        rotate: { duration: 0.18 }
      }
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 350 : -350,
      opacity: 0,
      scale: 0.93,
      rotate: direction < 0 ? 6 : -6,
      transition: {
        x: { type: "spring", stiffness: 380, damping: 32 },
        opacity: { duration: 0.15 }
      }
    })
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextCard();
      if (e.key === 'ArrowLeft') prevCard();
      if (e.key === 'Escape') navigate(user ? '/dashboard' : '/');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book, currentIndex]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Book not found</h2>
        <Button onClick={() => {
          if (window.history.length > 2) {
            navigate(-1);
          } else {
            navigate(user ? '/dashboard' : '/');
          }
        }} className="mt-4 bg-green-700">
          {user ? 'Go to Dashboard' : 'Go Back Home'}
        </Button>
      </div>
    );
  }

  const themeId = book?.admin_note?.includes('theme:') ? book.admin_note.split('theme:')[1].split(',')[0] : (book?.admin_note || 'sunset');
  const selectedTheme = CARD_THEMES.find(t => t.id === themeId) || CARD_THEMES[0];

  return (
    <div className={`min-h-screen flex flex-col relative overflow-hidden transition-colors duration-1000 ${currentTheme.font || 'font-serif'} ${isFullScreen ? 'fixed inset-0 z-50' : ''}`} style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}>
      {/* Atmospheric Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-1000" style={{ background: currentTheme.gradient }}>
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] opacity-20 animate-pulse pointer-events-none"
          style={{ background: 'radial-gradient(circle at center, #ffffff11 0%, transparent 60%)' }}
        />
      </div>

      {/* Reader Header */}
      <header className={`h-16 px-4 flex items-center justify-between z-10 backdrop-blur-md border-b transition-colors ${currentTheme.bg.includes('f') ? 'bg-white/80 border-black/5 text-black' : 'bg-black/20 border-white/10 text-white'}`}>
        <div className="flex items-center gap-4">
          <Link to="/" className="hidden sm:flex items-center gap-2 group mr-2 transition-opacity hover:opacity-80">
            <BookOpen className="w-5 h-5 text-[#EAB308] fill-[#EAB308]/20" />
            <span className={`font-sans font-black text-sm tracking-tighter ${currentTheme.bg.includes('f') ? 'text-black' : 'text-white'}`}>CalmReader</span>
          </Link>
          <Button variant="ghost" className="gap-2 font-bold flex items-center shrink-0" onClick={() => {
            navigate(user ? '/dashboard' : '/');
          }}>
            <Home className="w-4 h-4 text-[#EAB308]" /> {user ? 'Dashboard' : 'Home'}
          </Button>
          {!showChapterList && contentType === 'ebook' && (
            <Button 
              variant="outline" 
              className={`h-9 px-3 text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl transition-all active:scale-95 ${
                currentTheme.bg.includes('f') ? 'bg-black/5 text-slate-800 border-black/10 hover:bg-black/10' : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
              }`}
              onClick={() => setShowChapterList(true)}
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              Chapter List
            </Button>
          )}
          <div className="hidden md:block text-left max-w-xs lg:max-w-md">
            <h1 className="font-bold line-clamp-1 text-base">{book.title}</h1>
            <p className={`text-[10px] uppercase tracking-widest ${currentTheme.bg.includes('f') ? 'text-black/50' : 'text-white/50'}`}>
              {book.admin_note?.match(/author:([^,]+)/)?.[1] || 'Verified Author'} • Card {currentIndex + 1} of {book.cards_json?.length || 0}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOffline && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-[10px] font-bold uppercase tracking-widest">
              <CloudOff className="w-3 h-3" /> Offline
            </div>
          )}
          
          {contentType === 'ebook' && (
            <Button 
              type="button"
              variant="ghost" 
              size="sm" 
              onClick={() => setOptionsOpen(!optionsOpen)}
              className={`h-9 px-3.5 text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl transition-all ${
                optionsOpen 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : currentTheme.bg.includes('f') ? 'text-slate-700 hover:text-black hover:bg-black/5' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">Style & Options</span>
            </Button>
          )}

          {contentType === 'ebook' && (
            <Button 
              type="button"
              variant="ghost" 
              size="sm" 
              onClick={handleShareBook}
              className={`h-9 px-3.5 text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl transition-all ${
                currentTheme.bg.includes('f') ? 'text-slate-700 hover:text-black hover:bg-black/5' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Share2 className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">{shareCopied ? 'Copied!' : 'Share eBook'}</span>
            </Button>
          )}

          {contentType === 'ebook' && !showChapterList && (
            <Button 
              type="button"
              variant="ghost" 
              size="sm" 
              onClick={() => saveBookmark()}
              disabled={bookmarking}
              className={`h-8 text-[10px] font-black uppercase tracking-widest gap-1.5 rounded-lg transition-all ${
                dbBookmarkIndex === currentIndex
                  ? 'bg-amber-500 text-black font-extrabold hover:bg-amber-600' 
                  : currentTheme.bg.includes('f') ? 'text-slate-700 hover:text-black hover:bg-black/5' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Bookmark this page index to resume reading from here"
            >
              <Bookmark className={`w-3.5 h-3.5 ${dbBookmarkIndex === currentIndex ? 'fill-current' : ''}`} />
              {dbBookmarkIndex === currentIndex ? 'Bookmarked' : 'Bookmark Card'}
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={() => setReportOpen(true)} className="text-white/40 hover:text-red-400 hover:bg-white/10">
            <Flag className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsFullScreen(!isFullScreen)} className="text-white/70 hover:text-white hover:bg-white/10">
            {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Options Dropdown Overlay */}
      <AnimatePresence>
        {optionsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute right-4 top-18 w-[320px] sm:w-[380px] p-6 rounded-3xl border shadow-2xl z-50 backdrop-blur-2xl ${
              currentTheme.bg.includes('f') 
                ? 'bg-white/95 border-black/5 text-slate-800 shadow-slate-200/50' 
                : 'bg-[#151522]/95 border-white/10 text-white shadow-black/80'
            }`}
          >
            <div className="space-y-6">
              {/* Title */}
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                  <Settings2 className="w-4 h-4 animate-spin-slow" /> Reader Settings
                </span>
                <button 
                  onClick={() => setOptionsOpen(false)}
                  className="text-xs font-bold opacity-50 hover:opacity-100"
                >
                  Close
                </button>
              </div>

              {/* Day/Night Mode Switcher */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Reading Mode</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNightMode(false);
                      localStorage.setItem('reader_night_mode', 'false');
                    }}
                    className={`py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      !isNightMode 
                        ? 'bg-amber-500 text-black shadow-md font-extrabold' 
                        : currentTheme.bg.includes('f') ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" /> Day Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNightMode(true);
                      localStorage.setItem('reader_night_mode', 'true');
                    }}
                    className={`py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      isNightMode 
                        ? 'bg-indigo-600 text-white shadow-md font-extrabold' 
                        : currentTheme.bg.includes('f') ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" /> Night Mode
                  </button>
                </div>
              </div>

              {/* Font Sizer */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Text Font Size</span>
                <div className="grid grid-cols-4 gap-2">
                  {(['sm', 'md', 'lg', 'xl'] as const).map(size => (
                    <button
                      key={size}
                      onClick={() => setReaderFontSize(size)}
                      className={`py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                        readerFontSize === size 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : currentTheme.bg.includes('f') ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {size === 'sm' ? 'Aa-' : size === 'md' ? 'Aa' : size === 'lg' ? 'Aa+' : 'Aa++'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Spacing */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Line Spacing</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setReaderLineHeight('relaxed')}
                    className={`py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                      readerLineHeight === 'relaxed' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : currentTheme.bg.includes('f') ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    Comfortable
                  </button>
                  <button
                    onClick={() => setReaderLineHeight('loose')}
                    className={`py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                      readerLineHeight === 'loose' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : currentTheme.bg.includes('f') ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    Spacious
                  </button>
                </div>
              </div>

              {/* Font Face Picker */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Typography (Font Face)</span>
                <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                  {AVAILABLE_FONTS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setActiveFontId(f.id)}
                      className={`flex flex-col text-left p-2.5 rounded-xl transition-all border ${
                        activeFontId === f.id 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
                          : currentTheme.bg.includes('f') ? 'bg-black/5 hover:bg-black/10 border-transparent' : 'bg-white/5 hover:bg-white/10 border-transparent'
                      }`}
                    >
                      <span className={`text-base font-normal ${f.id} leading-none`}>ABC abc</span>
                      <span className="text-[8px] font-bold opacity-60 tracking-wider mt-1">{f.name.split(' (')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Alignment */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Text Alignment</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['left', 'justify', 'center'] as const).map(align => (
                    <button
                      key={align}
                      onClick={() => setReaderAlignment(align)}
                      className={`py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                        readerAlignment === align 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : currentTheme.bg.includes('f') ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {align === 'left' ? 'Left' : align === 'justify' ? 'Justified' : 'Center'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Selector */}
              <div className="space-y-2.5 border-t border-black/5 dark:border-white/5 pt-3">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Theme Accent Color</span>
                <div className="grid grid-cols-5 gap-2">
                  {CARD_THEMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setActiveThemeId(t.id)}
                      title={t.name}
                      className={`w-8 h-8 rounded-full border-2 transition-all relative flex items-center justify-center ${
                        activeThemeId === t.id ? 'border-indigo-500 scale-110 shadow-md' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ background: t.bg }}
                    >
                      {activeThemeId === t.id && (
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.text }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout Image Position Swapper */}
              {book.cards_json?.[currentIndex]?.image_url && (
                <div className="space-y-2.5 pt-3 border-t border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Poster Image Layout</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['background', 'top', 'bottom'] as const).map(pos => (
                      <button
                        key={pos}
                        onClick={() => setImagePosition(pos)}
                        className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                          cardImagePos === pos 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : currentTheme.bg.includes('f') ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {pos === 'background' ? 'BG Aura' : pos === 'top' ? 'Top Card' : 'Bottom Card'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-2.5 border-t border-black/5 dark:border-white/5 pt-3">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Actions</span>
                <div className="grid grid-cols-1 gap-2">
                  {/* Bookmark */}
                  <button
                    onClick={() => saveBookmark()}
                    disabled={bookmarking}
                    className={`py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-between ${
                      dbBookmarkIndex === currentIndex 
                        ? 'bg-emerald-600 text-white' 
                        : currentTheme.bg.includes('f') ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Bookmark className={`w-3.5 h-3.5 ${dbBookmarkIndex === currentIndex ? 'fill-current' : ''}`} />
                      {dbBookmarkIndex === currentIndex ? 'Card Bookmarked' : 'Bookmark Card'}
                    </span>
                    {bookmarking && <Loader2 className="w-3 h-3 animate-spin" />}
                  </button>

                  {/* Save Offline */}
                  <button
                    onClick={handleDownload}
                    className={`py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${
                      downloaded 
                        ? 'bg-green-600 text-white' 
                        : currentTheme.bg.includes('f') ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {downloaded ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Saved Offline</>
                    ) : (
                      <><Download className="w-3.5 h-3.5" /> Save Offline</>
                    )}
                  </button>

                  {/* Download PDF */}
                  {book.price > 0 && (
                    <button
                      onClick={handlePDFDownload}
                      disabled={exporting}
                      className="py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                    >
                      {exporting ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting PDF...</>
                      ) : (
                        <><FileDown className="w-3.5 h-3.5" /> Download PDF Book</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Stage */}
      <main className={`flex-1 flex flex-col items-center justify-start overflow-y-auto min-h-0 relative z-10 w-full ${
        showChapterList ? 'p-4 md:p-8 pt-8 md:pt-16' : 'p-2 md:p-4'
      }`}>
        <AnimatePresence custom={direction}>
          {showChapterList && contentType === 'ebook' ? (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className={`w-full max-w-2xl rounded-[32px] p-6 md:p-10 border shadow-2xl flex flex-col z-25 transition-all duration-300 ${
                currentTheme.bg.includes('f') ? 'bg-white/95 border-black/5 text-slate-900' : 'bg-white/5 border-white/10 text-white'
              }`} 
              style={{ backgroundColor: currentTheme.cardBg, color: currentTheme.cardText, maxHeight: '80vh' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 mb-6" style={{ borderColor: currentTheme.bg.includes('f') ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }}>
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.25em] ${currentTheme.bg.includes('f') ? 'text-indigo-600' : 'text-indigo-400'}`}>Table of Contents</span>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight mt-1">{book.title}</h2>
                  <p className={`text-xs mt-1 ${currentTheme.bg.includes('f') ? 'text-slate-500' : 'text-slate-400'}`}>Select a chapter below to commence reading. Your progress is automatically recorded.</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-2xl border border-emerald-500/20 text-xs font-black shrink-0 self-start sm:self-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>{visitedChapters.length} / {book.cards_json?.length || 0} Read</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {book.cards_json?.map((card: any, idx: number) => {
                  const isVisited = visitedChapters.includes(idx);
                  const isCurrent = currentIndex === idx;
                  const chapterLabel = typeof card === 'string' 
                    ? `Chapter ${idx + 1}`
                    : (card?.chapter || `Chapter ${idx + 1}`);
                  const chapterTitle = typeof card === 'string'
                    ? (card.length > 60 ? card.slice(0, 60) + "..." : card)
                    : (card?.title || (card?.text?.length > 60 ? card.text.slice(0, 60) + "..." : card?.text || 'Untitled Chapter'));

                  return (
                    <button
                      key={idx}
                      onClick={() => selectChapter(idx)}
                      className={`w-full text-left p-4 rounded-2xl flex items-center justify-between gap-4 transition-all duration-200 group relative border ${
                        isVisited 
                          ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20' 
                          : isCurrent
                          ? 'bg-indigo-500/10 border-indigo-500/30'
                          : currentTheme.bg.includes('f') 
                          ? 'bg-slate-50 hover:bg-slate-100 border-black/[0.03] hover:border-black/[0.08]' 
                          : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/15'
                      }`}
                    >
                      {isVisited && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-2xl" />
                      )}

                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-xs ${
                          isVisited 
                            ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-black/20 text-indigo-400 border border-white/5'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[10px] font-black uppercase tracking-wider ${
                            isVisited 
                              ? 'text-emerald-400' 
                              : currentTheme.bg.includes('f') ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            {chapterLabel}
                          </p>
                          <h4 className={`text-sm font-bold truncate ${
                            isVisited 
                              ? 'text-emerald-300' 
                              : ''
                          } ${currentTheme.bg.includes('f') ? 'text-slate-800' : 'text-white'}`}>
                            {chapterTitle}
                          </h4>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isVisited ? (
                          <div className="flex items-center gap-1.5 bg-emerald-500 text-white font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-[0_2px_10px_rgba(16,185,129,0.3)]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            <span>Visited</span>
                          </div>
                        ) : (
                          <span className={`text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider ${currentTheme.bg.includes('f') ? 'text-indigo-600' : 'text-indigo-400'}`}>
                            Read →
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              <div className="flex justify-end gap-3 mt-6 border-t pt-4 animate-fade-in" style={{ borderColor: currentTheme.bg.includes('f') ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }}>
                {visitedChapters.length > 0 && (
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm"
                    className={`text-[10px] font-black uppercase tracking-widest px-4 rounded-xl hover:text-red-400 ${currentTheme.bg.includes('f') ? 'hover:bg-red-50' : 'hover:bg-red-500/10'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Reset reading progress for this book?")) {
                        const visitedKey = user?.id ? `visited_${user.id}_${book.id}` : `visited_${book.id}`;
                        localStorage.removeItem(visitedKey);
                        setVisitedChapters([]);
                      }
                    }}
                  >
                    Clear Progress
                  </Button>
                )}
                <Button 
                  type="button"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-2 rounded-xl text-xs uppercase tracking-widest active:scale-95 transition-transform"
                  onClick={() => {
                    const firstUnread = book.cards_json?.findIndex((_: any, i: number) => !visitedChapters.includes(i));
                    selectChapter(firstUnread !== -1 ? firstUnread : 0);
                  }}
                >
                  {visitedChapters.length === 0 ? 'Start Reading' : 'Continue Reading'}
                </Button>
              </div>
            </motion.div>
          ) : contentType === 'video' ? (
            <div className="w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl relative z-10 ring-1 ring-white/10">
              {book.book_url && (
                <iframe 
                  className="w-full h-full"
                  src={book.book_url.includes('youtube.com') || book.book_url.includes('youtu.be') 
                    ? `https://www.youtube.com/embed/${book.book_url.split('v=')[1]?.split('&')[0] || book.book_url.split('/').pop()}` 
                    : book.book_url}
                  title={book.title}
                  allowFullScreen
                />
              )}
            </div>
          ) : contentType === 'blog' ? (
             <div className="w-full max-w-4xl bg-white rounded-[40px] p-8 md:p-16 shadow-2xl overflow-y-auto max-h-[85vh] z-10">
               <h1 className="text-4xl md:text-5xl font-black mb-10 tracking-tight text-slate-900 border-b pb-8 border-slate-100">{book.title}</h1>
               <div className="prose prose-slate max-w-none">
                  <p className="text-xl md:text-2xl leading-relaxed text-slate-700 font-medium whitespace-pre-wrap">
                    {book.cards_json?.[0]?.text || book.content || (typeof book.cards_json === 'string' ? book.cards_json : 'No content available.')}
                  </p>
               </div>
             </div>
          ) : (
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            whileTap={{ cursor: 'grabbing', scale: 0.98 }}
            onDragEnd={(_, info) => {
              const swipe = info.offset.x;
              const threshold = 50; // More sensitive threshold
              if (swipe < -threshold) nextCard();
              else if (swipe > threshold) prevCard();
            }}
            className="w-[92vw] max-w-[95%] mx-auto flex flex-col p-4 md:p-8 text-left cursor-grab active:cursor-grabbing relative z-20 group transition-colors duration-1000 justify-start"
             style={{ color: currentTheme.cardText, touchAction: 'pan-y' }}
          >
            {/* Ambient Background Glow (Non-restrictive) */}
            <div className={`absolute inset-0 rounded-[40px] pointer-events-none opacity-0`} />
            
            {cardImagePos === 'background' && book.cards_json?.[currentIndex]?.image_url && (
              <div className="absolute inset-0 z-0 overflow-hidden rounded-[40px] max-w-4xl mx-auto opacity-20">
                <img 
                  src={book.cards_json[currentIndex].image_url} 
                  alt="" 
                  className={`w-full h-full object-cover ${currentTheme.bg.includes('f') ? 'mix-blend-multiply' : 'mix-blend-overlay'}`}
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Quick floating position switch directly on card for instant mobile/desktop adjustment */}
            {book.cards_json?.[currentIndex]?.image_url && (
              <div className="absolute top-4 right-4 z-40 flex items-center gap-0.5 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/10 scale-90 md:scale-100 opacity-30 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setImagePosition('background'); }}
                  className={`h-5 px-2 text-[8px] font-black uppercase tracking-wider rounded-full transition-all ${
                    cardImagePos === 'background' ? 'bg-white text-black font-extrabold' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  BG
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setImagePosition('top'); }}
                  className={`h-5 px-2 text-[8px] font-black uppercase tracking-wider rounded-full transition-all ${
                    cardImagePos === 'top' ? 'bg-white text-black font-extrabold' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Top
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setImagePosition('bottom'); }}
                  className={`h-5 px-2 text-[8px] font-black uppercase tracking-wider rounded-full transition-all ${
                    cardImagePos === 'bottom' ? 'bg-white text-black font-extrabold' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Btm
                </button>
              </div>
            )}

            <div className="z-10 space-y-6 flex-1 flex flex-col justify-start items-stretch text-left w-full min-h-0 overflow-y-auto max-h-full pr-1 scrollbar-reading">
              {/* Dynamic TOP image */}
              {cardImagePos === 'top' && book.cards_json?.[currentIndex]?.image_url && (
                <div className="w-full max-h-[140px] md:max-h-[220px] rounded-3xl overflow-hidden mb-4 border border-black/5 hover:border-black/10 shadow-sm transition-all shrink-0 relative bg-black/5">
                  <img 
                    src={book.cards_json[currentIndex].image_url} 
                    alt="" 
                    className="w-full h-full object-cover opacity-100"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div className="flex flex-col items-start gap-2 mb-2">
                {book.cards_json?.[currentIndex]?.chapter && (
                  <span className={`text-[9px] font-black uppercase tracking-[0.5em] ${currentTheme.bg.includes('f') ? 'text-indigo-600/40' : 'text-indigo-400/50'}`}>
                    {book.cards_json[currentIndex].chapter}
                  </span>
                )}
                <div className={`h-px w-12 ${currentTheme.bg.includes('f') ? 'bg-black/5' : 'bg-white/10'}`} />
                <span className={`text-[8px] font-bold uppercase tracking-[0.3em] ${currentTheme.bg.includes('f') ? 'text-black/30' : 'text-white/20'}`}>
                  Card {currentIndex + 1} of {book.cards_json?.length}
                </span>
              </div>
              
              {book.cards_json?.[currentIndex]?.title && (
                <h4 className={`text-sm md:text-lg font-black uppercase tracking-[0.2em] mb-2 text-left ${currentTheme.bg.includes('f') ? 'text-black/70' : 'text-white/80'}`}>
                  {book.cards_json[currentIndex].title}
                </h4>
              )}
              <p className={`w-full max-w-[650px] whitespace-pre-wrap ${
                readerAlignment === 'center' ? 'text-center mx-auto' :
                readerAlignment === 'justify' ? 'text-justify ml-0 mr-auto' :
                'text-left ml-0 mr-auto'
              } ${
                readerFontSize === 'sm' ? 'text-[15px]' :
                readerFontSize === 'md' ? 'text-[17px]' :
                readerFontSize === 'lg' ? 'text-[20px]' :
                'text-[24px]'
              } drop-shadow-sm font-normal ${activeFontId} ${
                activeFontId === 'font-mono' ? 'tracking-normal' :
                activeFontId === 'font-sans' ? 'tracking-wide' :
                activeFontId === 'font-grotesk' ? 'tracking-normal md:tracking-wide' :
                'tracking-wide md:tracking-wider'
              }`} style={{ 
                color: currentTheme.cardText,
                lineHeight: readerLineHeight === 'relaxed' ? '1.5' : '1.75'
              }}>
                {typeof book.cards_json?.[currentIndex] === 'string' 
                  ? book.cards_json[currentIndex] 
                  : book.cards_json?.[currentIndex]?.text}
              </p>

              {/* Dynamic BOTTOM image */}
              {cardImagePos === 'bottom' && book.cards_json?.[currentIndex]?.image_url && (
                <div className="w-full max-h-[140px] md:max-h-[220px] rounded-3xl overflow-hidden mt-4 border border-black/5 hover:border-black/10 shadow-sm transition-all shrink-0 relative bg-black/5">
                  <img 
                    src={book.cards_json[currentIndex].image_url} 
                    alt="" 
                    className="w-full h-full object-cover opacity-100"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            {/* Swipe hints */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            </div>
          </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Navigation Arrows */}
        {contentType === 'ebook' && !showChapterList && (
          <div className="hidden md:block">
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-8 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition-all"
              onClick={prevCard}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-8 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition-all"
              onClick={nextCard}
              disabled={currentIndex === (book.cards_json?.length || 0) - 1}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          </div>
        )}

       </main>

      {/* Progress Bar */}
      {contentType === 'ebook' && !showChapterList && (
        <div className="h-1 bg-white/5 w-full relative z-10">
          <motion.div 
            className="h-full bg-gradient-to-r from-[#ff4e00] to-[#ff8e00] shadow-[0_0_10px_rgba(255,78,0,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(100, (((currentIndex + 1) / (book.cards_json?.length || 1)) * 100) || 0))}%` }}
          />
        </div>
      )}

      {/* Mobile Navigation */}
      {contentType === 'ebook' && !showChapterList && (
        <footer className="md:hidden h-24 border-t border-white/10 flex items-center justify-between px-12 bg-black/20 backdrop-blur-md z-10">
          <Button
            variant="ghost"
            onClick={prevCard}
            disabled={currentIndex === 0}
            className="flex flex-col items-center gap-1 text-white/50 disabled:opacity-20"
          >
            <ChevronLeft className="w-8 h-8" />
            <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Prev</span>
          </Button>
          <div className="text-xs font-mono tracking-widest text-white/30">
            {String(currentIndex + 1).padStart(2, '0')} / {String(book.cards_json?.length || 0).padStart(2, '0')}
          </div>
          <Button
            variant="ghost"
            onClick={nextCard}
            disabled={currentIndex === (book.cards_json?.length || 0) - 1}
            className="flex flex-col items-center gap-1 text-white/50 disabled:opacity-20"
          >
            <ChevronRight className="w-8 h-8" />
            <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Next</span>
          </Button>
        </footer>
      )}

      {/* Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span>Report Content</span>
            </DialogTitle>
            <DialogDescription>
              Help us understand what's wrong with this content. Your report will be reviewed by an administrator.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Describe the issue (e.g., inappropriate language, harmful content)..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleReport}
              disabled={reporting || !reportReason.trim()}
            >
              {reporting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

