import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, FileText, Check, AlertCircle, Sparkles, Trash2, 
  ChevronLeft, ChevronRight, Bookmark, Heart, DollarSign, CheckSquare, 
  Shield, Info, Play, TrendingUp, Lock, Sliders, Image as ImageIcon, 
  Upload, CheckCircle2, ShoppingCart, CreditCard, Clock, Calendar, Eye, ArrowRight
} from 'lucide-react';
import { User, Transaction } from '../types';

interface EbookCard {
  id: string;
  type: 'text' | 'tip' | 'warning' | 'quote' | 'summary' | 'checklist' | 'exercise' | 'cta';
  content: string;
  chapterName: string;
  title?: string;
  checklist?: string[];
  quoteAuthor?: string;
  image?: string;
}

export interface Ebook {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  coverImage: string;
  thumbnail: string;
  authorName: string;
  authorRole: 'ceo' | 'tutor';
  price: number;
  isFree: boolean;
  tags: string[];
  publishDate: string;
  cards: EbookCard[];
  views: number;
  revenue: number;
  cardBg?: string; // Selective theme styling pattern preset
}

export function getCardBgClasses(bgKey: string = 'default-dark') {
  switch (bgKey) {
    case 'cyber-grid':
      return 'bg-slate-950 text-emerald-400 border-emerald-500/30 shadow-md shadow-emerald-950/30';
    case 'warm-parchment':
      return 'bg-amber-100/95 text-amber-950 border-amber-250 shadow-md shadow-amber-900/10';
    case 'royal-indigo':
      return 'bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-indigo-100 border-indigo-700/40 shadow-lg shadow-indigo-950/35';
    case 'golden-coin':
      return 'bg-gradient-to-tr from-yellow-950 via-slate-900 to-yellow-950 text-yellow-100 border-yellow-750/40 shadow-lg shadow-yellow-950/20';
    case 'pure-minimalist':
      return 'bg-white text-slate-900 border-slate-200 shadow-lg shadow-slate-150';
    case 'default-dark':
    default:
      return 'bg-slate-900 text-slate-100 border-slate-800 shadow-xl';
  }
}

export interface DirectPaymentProof {
  id: string;
  userId: string;
  username: string;
  ebookId: string;
  ebookTitle: string;
  price: number;
  screenshotUrl: string;
  paymentDateTime: string;
  status: 'pending' | 'approved' | 'declined';
  submittedAt: string;
}

interface EbookStudioMarketplaceProps {
  currentUser: User;
  onToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onAddTransaction: (tx: Transaction) => void;
  setCurrentUser?: React.Dispatch<React.SetStateAction<User>>;
}

// PREMIUM SAMPLE PREBUILT DATA
const PREBUILT_BOOKS: Ebook[] = [];

export default function EbookStudioMarketplace({ 
  currentUser, 
  onToast, 
  onAddTransaction,
  setCurrentUser 
}: EbookStudioMarketplaceProps) {
  const isCEO = currentUser.username.toLowerCase() === 'winbigonly' || currentUser.email.toLowerCase() === 'winbigonly@gmail.com';
  const isTutor = (currentUser as any).role === 'tutor';

  // State
  const [ebooks, setEbooks] = useState<Ebook[]>(() => {
    const saved = localStorage.getItem('quizoe_compiled_ebooks');
    return saved ? JSON.parse(saved) : PREBUILT_BOOKS;
  });

  useEffect(() => {
    const autoCheckoutId = localStorage.getItem('quizoe_auto_open_checkout_id');
    if (autoCheckoutId) {
      localStorage.removeItem('quizoe_auto_open_checkout_id');
      const book = ebooks.find(e => e.id === autoCheckoutId);
      if (book) {
        setCheckoutBook(book);
        setCheckoutMode('options'); // Open direct checkout!
        onToast(`Resumed purchase checkout workflow for "${book.title}" automatically!`, "success");
      }
    }
  }, [ebooks]);

  const [purchasedEbookIds, setPurchasedEbookIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('quizoe_purchased_ebooks');
    // Pre-unlock free ones
    const initialList = ['eb_free'];
    return saved ? JSON.parse(saved) : [...initialList];
  });

  const [directProofs, setDirectProofs] = useState<DirectPaymentProof[]>(() => {
    const saved = localStorage.getItem('quizoe_payment_proofs');
    return saved ? JSON.parse(saved) : [];
  });

  // Navigation states
  const [activeSegment, setActiveSegment] = useState<'marketplace' | 'studio' | 'proof_reviewer' | 'my_library'>('marketplace');

  // Immersive Kindle simulator modes
  const [activeReadingBook, setActiveReadingBook] = useState<Ebook | null>(null);
  const [activeCardId, setActiveCardId] = useState(0);

  // checkout wizard configurations
  const [checkoutBook, setCheckoutBook] = useState<Ebook | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<'options' | 'paystack' | 'direct' | 'paystack_otp'>('options');
  const [paystackCard, setPaystackCard] = useState({ number: '4000 1234 5678 9010', expiry: '09/28', cvv: '123' });
  const [paystackOtp, setPaystackOtp] = useState('');
  const [copiedBankDetails, setCopiedBankDetails] = useState(false);
  const [directReceiptUrl, setDirectReceiptUrl] = useState('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=400');
  const [directPaymentTime, setDirectPaymentTime] = useState('June 8, 2026 at 10:30 AM');

  // eBook Creator Wizard states (Multi-stage)
  const [wizardStage, setWizardStage] = useState<'info' | 'content' | 'review' | 'cover'>('info');
  const [builderTitle, setBuilderTitle] = useState('');
  const [builderSubtitle, setBuilderSubtitle] = useState('');
  const [builderDesc, setBuilderDesc] = useState('');
  const [builderCategory, setBuilderCategory] = useState('Business & Finance');
  const [builderTags, setBuilderTags] = useState('Compounding, Naira, Wealth');
  const [builderPrice, setBuilderPrice] = useState('2500');
  const [builderIsFree, setBuilderIsFree] = useState(false);
  const [wordsPerCard, setWordsPerCard] = useState<number>(80); // Conversion algorithm ceiling!
  const [builderCardBg, setBuilderCardBg] = useState<string>('default-dark'); // Selective background
  const [rawTextBlock, setRawTextBlock] = useState('');
  const [builderCoverUrl, setBuilderCoverUrl] = useState('https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=600');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('Minimalist gold compounding cash coin layout representation');

  // Interactive Review and AI Curation states
  const [draftCards, setDraftCards] = useState<any[]>([]);
  const [aiInstructionMode, setAiInstructionMode] = useState<'refine_micro' | 'literal'>('refine_micro');
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [builderAuthorName, setBuilderAuthorName] = useState(currentUser.username);

  // Sync author name with current user
  useEffect(() => {
    if (currentUser) {
      setBuilderAuthorName(currentUser.username);
    }
  }, [currentUser]);

  const triggerAiImageGeneration = (promptText: string) => {
    setIsGeneratingImage(true);
    onToast("Connecting to deep visual diffusion engines... Seeding vectors...", "info");
    
    setTimeout(() => {
      const lower = promptText.toLowerCase();
      let selectedUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600";
      
      if (lower.includes('coin') || lower.includes('gold') || lower.includes('finance') || lower.includes('naira') || lower.includes('money') || lower.includes('wallet')) {
        const pool = [
          "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=600",
          "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=600",
          "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?q=80&w=600"
        ];
        selectedUrl = pool[Math.floor(Math.random() * pool.length)];
      } else if (lower.includes('code') || lower.includes('tech') || lower.includes('program') || lower.includes('dev') || lower.includes('web3') || lower.includes('contract')) {
        const pool = [
          "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?q=80&w=600",
          "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=600",
          "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=600"
        ];
        selectedUrl = pool[Math.floor(Math.random() * pool.length)];
      } else if (lower.includes('growth') || lower.includes('success') || lower.includes('achieve') || lower.includes('business')) {
        const pool = [
          "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=600",
          "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600",
          "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=600"
        ];
        selectedUrl = pool[Math.floor(Math.random() * pool.length)];
      } else {
        selectedUrl = `https://picsum.photos/seed/${encodeURIComponent(promptText.trim() || 'vibrant')}/600/600`;
      }
      
      setBuilderCoverUrl(selectedUrl);
      setIsGeneratingImage(false);
      onToast("✨ Live Cover Artwork generated and saved as thumbnail successfully!", "success");
    }, 1200);
  };

  // Persistence helpers
  const saveEbooksToDb = (updatedList: Ebook[]) => {
    setEbooks(updatedList);
    localStorage.setItem('quizoe_compiled_ebooks', JSON.stringify(updatedList));
  };

  const savePurchasesToDb = (updatedIds: string[]) => {
    setPurchasedEbookIds(updatedIds);
    localStorage.setItem('quizoe_purchased_ebooks', JSON.stringify(updatedIds));
  };

  const saveProofsToDb = (updatedProofs: DirectPaymentProof[]) => {
    setDirectProofs(updatedProofs);
    localStorage.setItem('quizoe_payment_proofs', JSON.stringify(updatedProofs));
  };  // Words Splitting Conversion algorithm
  const runLocalCardSplitter = () => {
    if (!rawTextBlock.trim()) {
      onToast("Raw ebook data writing is empty! Provide content inside the text box first.", "warning");
      return;
    }

    const lines = rawTextBlock.split('\n');
    const detectedChapters: { name: string; content: string[] }[] = [];
    let currentChapterName = '';
    let currentChapterContentLines: string[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      const chMatch = trimmed.match(/^(chapter|section|part|chap)\s*(\d+|\w+)?\s*[:.-]?\s*(.*)/i);
      
      if (chMatch) {
        if (currentChapterContentLines.length > 0 || currentChapterName) {
          detectedChapters.push({
            name: currentChapterName || 'Introduction',
            content: [...currentChapterContentLines]
          });
        }
        const chNumber = chMatch[2] || '';
        const chTitle = chMatch[3] || '';
        currentChapterName = `Chapter ${chNumber}${chTitle ? ': ' + chTitle : ''}`;
        currentChapterContentLines = [];
      } else if (trimmed.length > 0) {
        currentChapterContentLines.push(line);
      }
    });

    if (currentChapterContentLines.length > 0 || currentChapterName) {
      detectedChapters.push({
        name: currentChapterName || 'Introduction',
        content: [...currentChapterContentLines]
      });
    }

    const compiledCards: any[] = [];
    let cardCount = 1;

    const hasExplicitChapters = detectedChapters.length > 0 && detectedChapters.some(c => c.name.toLowerCase().includes('chapter') || c.name.toLowerCase().includes('section'));

    if (hasExplicitChapters) {
      detectedChapters.forEach((chObj) => {
        const words = chObj.content.join(' ').split(/\s+/).filter(w => w.trim().length > 0);
        let cursor = 0;

        while (cursor < words.length) {
          const chunkWords = words.slice(cursor, cursor + wordsPerCard);
          const chunkText = chunkWords.join(' ');
          
          let cardType: any = 'text';
          if (chunkText.toLowerCase().includes('tip:') || chunkText.toLowerCase().includes('hack:')) {
            cardType = 'tip';
          } else if (chunkText.toLowerCase().includes('danger:') || chunkText.toLowerCase().includes('never:')) {
            cardType = 'warning';
          } else if (chunkText.toLowerCase().includes('quote:')) {
            cardType = 'quote';
          } else if (chunkText.toLowerCase().includes('exercise:')) {
            cardType = 'exercise';
          }

          compiledCards.push({
            id: `card_gen_${Date.now()}_${cardCount}`,
            type: cardType,
            chapterName: chObj.name,
            content: chunkText,
            image: ''
          });

          cursor += wordsPerCard;
          cardCount++;
        }
      });
    } else {
      const allWords = rawTextBlock.split(/\s+/).filter(w => w.trim().length > 0);
      let wordCursor = 0;

      while (wordCursor < allWords.length) {
        const chunkWords = allWords.slice(wordCursor, wordCursor + wordsPerCard);
        const chunkText = chunkWords.join(' ');
        
        let cardType: any = 'text';
        if (chunkText.toLowerCase().includes('tip:') || chunkText.toLowerCase().includes('hack:')) {
          cardType = 'tip';
        } else if (chunkText.toLowerCase().includes('danger:') || chunkText.toLowerCase().includes('never:')) {
          cardType = 'warning';
        } else if (chunkText.toLowerCase().includes('quote:')) {
          cardType = 'quote';
        } else if (chunkText.toLowerCase().includes('exercise:')) {
          cardType = 'exercise';
        }

        compiledCards.push({
          id: `card_gen_${Date.now()}_${cardCount}`,
          type: cardType,
          chapterName: `Card ${cardCount}`,
          content: chunkText,
          image: ''
        });

        wordCursor += wordsPerCard;
        cardCount++;
      }
    }

    if (compiledCards.length === 0) {
      compiledCards.push({
        id: `card_fallback_${Date.now()}`,
        type: 'text',
        chapterName: "Introduction",
        content: rawTextBlock,
        image: ''
      });
    }

    setDraftCards(compiledCards);
    setWizardStage('review');
    onToast(`Compiled manuscript into ${compiledCards.length} editable cards! Proceeding to Review stage.`, 'success');
  };

  const triggerOpenRouterCardSplitter = async () => {
    if (!rawTextBlock.trim()) {
      onToast("Raw ebook data writing is empty! Provide content inside the text box first.", "warning");
      return;
    }

    setIsGeneratingCards(true);
    onToast("Connecting to OpenRouter AI (Gemini Flash) to split & compose reading cards...", "info");

    const systemPrompt = `You are a professional micro-learning eBook editor. Your job is to parse the user's raw text and split it into beautiful, swipeable micro-learning cards.
${aiInstructionMode === 'literal' 
  ? 'CRITICAL COMPLIANCE REQUIREMENT: You MUST abstain from altering or tampering with the content! Preserve the exact wording of the input text literal copy, word-for-word, without any rewriting, editing, summarizing, or deleting. Merely partition the exact input raw text into logical sequential cards.' 
  : 'Feel free to rewrite, optimize, and polish the content to be highly engaging and optimal for swipeable cards, introducing helpful tips, quote callouts, exercises, or warning boxes.'}

Each card should align with the user guidance of approximately ${wordsPerCard} words limit per card.
If explicit chapter or section indicators are present in the text (such as "Chapter X" or "Section Y"), group those cards correctly under those corresponding chapterNames!

You MUST respond with a STRICTLY VALID JSON array of objects representing cards. Do NOT return any preamble, markdown formatting ticks (unless wrapping a json block), explanations, or trailing commentary. Ensure it is correct JSON:
[
  {
    "chapterName": "Chapter name or card category title",
    "type": "text | tip | warning | quote | checklist | exercise",
    "content": "Card text content goes here.",
    "quoteAuthor": "Optional author name if type is quote",
    "image": "Optional visual illustration image URL suggestion or placeholder keyword"
  }
]`;

    try {
      const response = await fetch('/api/openrouter/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${systemPrompt}\n\nRaw Manuscript:\n${rawTextBlock}`,
          model: 'google/gemini-2.5-flash'
        })
      });

      const resData = await response.json();
      if ((resData.success || resData.simulated) && resData.text) {
        let textResult = resData.text.trim();
        if (textResult.startsWith('```json')) {
          textResult = textResult.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (textResult.startsWith('```')) {
          textResult = textResult.replace(/^```/, '').replace(/```$/, '').trim();
        }

        try {
          const parsed = JSON.parse(textResult);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mapped = parsed.map((item: any, idx: number) => ({
              id: `card_ai_${Date.now()}_${idx}`,
              type: item.type || 'text',
              chapterName: item.chapterName || `Card ${idx + 1}`,
              content: item.content || '',
              quoteAuthor: item.quoteAuthor || '',
              image: item.image && item.image.startsWith('http') ? item.image : ''
            }));
            setDraftCards(mapped);
            setWizardStage('review');
            onToast(`✨ OpenRouter AI compiled, split, and sequenced ${mapped.length} beautiful eBook cards successfully!`, 'success');
            return;
          }
        } catch (e) {
          console.error("XML/JSON parsing error of AI output, attempting text fallback", e);
        }
      }
      
      onToast("AI returned unparsable format. Falling back to local structural parser...", "warning");
      runLocalCardSplitter();
    } catch (err) {
      console.error("OpenRouter connection error, reverting to local converter", err);
      onToast("OpenRouter offline. Falling back to local structural parser...", "warning");
      runLocalCardSplitter();
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const compileAndPublishEbook = () => {
    if (!builderTitle.trim()) {
      onToast("Please provide an attractive ebook title.", "error");
      return;
    }

    const finalCards = [...draftCards];
    if (finalCards.length === 0) {
      onToast("No draft cards are curated! Please supply raw content and split cards first.", "error");
      return;
    }

    // Append Milestone card if not present to allow users to finish
    const hasCta = finalCards.some(c => c.type === 'cta');
    if (!hasCta) {
      finalCards.push({
        id: `card_cta_${Date.now()}`,
        type: 'cta',
        chapterName: "Congratulation Milestone",
        content: `Congratulations! You successfully read and parsed "${builderTitle}" by ${builderAuthorName}. Keep practicing!`,
        title: "Micro-Course eBook Graduated"
      });
    }

    const newEbook: Ebook = {
      id: `eb_${Date.now()}`,
      title: builderTitle,
      subtitle: builderSubtitle || "Accelerate your mastery on Quizoe",
      description: builderDesc || "Exclusive carousel swipe micro-learning module.",
      category: builderCategory,
      coverImage: builderCoverUrl || "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=600",
      thumbnail: builderCoverUrl || "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=150",
      authorName: builderAuthorName || currentUser.username,
      authorRole: isCEO ? 'ceo' : 'tutor',
      price: builderIsFree ? 0 : Number(builderPrice),
      isFree: builderIsFree,
      tags: builderTags.split(',').map(s => s.trim()).filter(s => s.length > 0),
      publishDate: new Date().toISOString().split('T')[0],
      cards: finalCards,
      views: 0,
      revenue: 0,
      cardBg: builderCardBg // Saved card background style
    };

    // Save into localStorage
    const saved = localStorage.getItem('quizoe_compiled_ebooks');
    const existingList = saved ? JSON.parse(saved) : PREBUILT_BOOKS;
    const nextList = [newEbook, ...existingList];
    saveEbooksToDb(nextList);

    // Reset wizard fields to empty
    setBuilderTitle('');
    setBuilderSubtitle('');
    setBuilderDesc('');
    setRawTextBlock('');
    setDraftCards([]);
    setWizardStage('info');
    setActiveSegment('marketplace');
    onToast(`Swipe eBook "${newEbook.title}" curated with ${newEbook.cards.length} cards and published!`, "success");
  };

  // CHECKOUT ENGINE
  const triggerPaystackSim = () => {
    if (!checkoutBook) return;
    setCheckoutMode('paystack_otp');
    onToast("Processing secure authorization transaction... Enter OTP", "info");
  };

  const verifyPaystackOtp = () => {
    if (!checkoutBook) return;

    // Withdraw entry amount from wallet or simulate card auth
    onToast("₦" + checkoutBook.price + " secured through Paystack Gateway. Unlocked!", "success");
    
    // Debit balance
    if (setCurrentUser) {
      setCurrentUser(prev => ({
        ...prev,
        balance: Math.max(0, prev.balance - checkoutBook.price)
      }));
    }

    // Add purchase
    const updatedIds = [...purchasedEbookIds, checkoutBook.id];
    savePurchasesToDb(updatedIds);

    // Save transaction
    const newTx: Transaction = {
      id: `tx_ebpaystack_${Date.now()}`,
      type: 'transfer',
      amount: checkoutBook.price,
      date: new Date().toISOString(),
      status: 'success',
      description: `eBook Unlock: ${checkoutBook.title}`,
      reference: `PSTK-EBPAY-${Math.floor(Math.random() * 9000000000)}`
    };
    onAddTransaction(newTx);

    // Split revenue if tutor is author (40% Platform direct commission takes)
    if (checkoutBook.authorRole === 'tutor') {
      const platformFee = Math.round(checkoutBook.price * 0.40);
      const authorCut = checkoutBook.price - platformFee;
      onToast(`Tutor Split active: Client paid ₦${checkoutBook.price}. Platform fee: 40% (₦${platformFee}), Author: 60% (₦${authorCut})`, "info");
    }

    setCheckoutBook(null);
  };

  const submitDirectPaymentScreenshot = () => {
    if (!checkoutBook) return;

    const newProof: DirectPaymentProof = {
      id: `proof_direct_${Date.now()}`,
      userId: currentUser.id,
      username: `@${currentUser.username}`,
      ebookId: checkoutBook.id,
      ebookTitle: checkoutBook.title,
      price: checkoutBook.price,
      screenshotUrl: directReceiptUrl,
      paymentDateTime: directPaymentTime,
      status: 'pending',
      submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };

    const updatedProofs = [newProof, ...directProofs];
    saveProofsToDb(updatedProofs);

    onToast("Direct transfer receipt submitted to Platform CEO! Awaiting proof confirmation.", "success");
    setCheckoutBook(null);
  };

  // CEO REVIEWER APPROVALS
  const handleReviewProof = (proofId: string, status: 'approved' | 'declined') => {
    const updatedProofs = directProofs.map(p => {
      if (p.id !== proofId) return p;
      
      if (status === 'approved') {
        const updatedIds = [...purchasedEbookIds, p.ebookId];
        savePurchasesToDb(updatedIds);
        onToast(`Receipt verified! User ${p.username} granted instant license access to "${p.ebookTitle}".`, 'success');
        
        // Split revenue notification
        const targetBook = ebooks.find(eb => eb.id === p.ebookId);
        if (targetBook && targetBook.authorRole === 'tutor') {
          const platformFee = Math.round(p.price * 0.40);
          const authorCut = p.price - platformFee;
          onToast(`Split payout: 40% (₦${platformFee}) deposited as system commission reserves.`, 'info');
        }
      } else {
        onToast(`Declined direct payment claim #${proofId.slice(-4)}. Notification returned.`, 'warning');
      }

      return { ...p, status };
    });

    saveProofsToDb(updatedProofs);
  };

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto px-4 md:px-8 mt-4">
      
      {/* 1. IMMERSIVE COMPANION READING MODE OVERLAY */}
      {activeReadingBook && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-50 flex flex-col justify-between p-4 md:p-8 animate-fade-in select-none text-white">
          <header className="flex justify-between items-center bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-indigo-600/20 rounded-xl text-indigo-400">
                <BookOpen className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-sm md:text-base leading-none text-slate-100">{activeReadingBook.title}</h3>
                {(() => {
                  const canEditChapter = currentUser.username.toLowerCase() === 'winbigonly' || activeReadingBook.authorName === currentUser.username;
                  if (canEditChapter) {
                    return (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] uppercase font-black tracking-wider text-slate-450 text-slate-400">Header:</span>
                        <input
                          type="text"
                          value={activeReadingBook.cards[activeCardId]?.chapterName || ''}
                          onChange={(e) => {
                            const updatedCards = [...activeReadingBook.cards];
                            updatedCards[activeCardId] = {
                              ...updatedCards[activeCardId],
                              chapterName: e.target.value
                            };
                            const updatedBook = { ...activeReadingBook, cards: updatedCards };
                            setActiveReadingBook(updatedBook);
                            // Update backing database state
                            const updatedList = ebooks.map(eb => eb.id === activeReadingBook.id ? updatedBook : eb);
                            saveEbooksToDb(updatedList);
                          }}
                          className="bg-slate-950/70 border border-slate-700 text-white font-extrabold py-0.5 px-2 rounded-md text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full max-w-[150px] uppercase"
                          placeholder="Card Header Label"
                        />
                      </div>
                    );
                  }
                  return (
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mt-1">
                      Chapter: {activeReadingBook.cards[activeCardId]?.chapterName || 'General'}
                    </span>
                  );
                })()}
              </div>
            </div>
            <button 
              onClick={() => setActiveReadingBook(null)}
              className="px-4 py-2 bg-slate-950/60 hover:bg-slate-700 text-xs font-black text-white uppercase rounded-xl transition-all cursor-pointer border border-slate-700"
            >
              Close kindle Reader
            </button>
          </header>

          <main className="max-w-2xl mx-auto w-full my-auto py-8">
            {activeReadingBook.cards.length === 0 ? (
              <div className="text-center text-slate-400 py-12">
                <p className="font-bold">This eBook contains no compiled swipe cards.</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Active Swipe Card */}
                <div className={`p-8 rounded-3xl border min-h-[300px] flex flex-col justify-between transition-all duration-300 transform scale-100 relative ${getCardBgClasses(activeReadingBook.cardBg)}`}>
                  
                  {/* Highlight category icon badges */}
                  <div className="absolute top-4 right-4 bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest py-1 px-3 border border-indigo-500/20 rounded-full">
                    {activeReadingBook.cards[activeCardId].type.toUpperCase()}
                  </div>

                  <div className="my-auto text-left col">
                    {activeReadingBook.cards[activeCardId]?.image && (
                      <div className="w-full max-h-36 rounded-xl overflow-hidden mb-4 border border-white/5 shadow-inner">
                        <img 
                          src={activeReadingBook.cards[activeCardId].image} 
                          alt="Visual Illustration" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    )}

                    {activeReadingBook.cards[activeCardId].type === 'quote' && (
                      <div className="space-y-3 font-serif">
                        <span className="text-4xl text-purple-400 block h-4">“</span>
                        <p className="italic text-slate-100 text-lg leading-relaxed font-semibold">
                          {activeReadingBook.cards[activeCardId].content}
                        </p>
                        {activeReadingBook.cards[activeCardId].quoteAuthor && (
                          <span className="text-xs uppercase font-extrabold font-sans tracking-wide text-purple-400 block">— {activeReadingBook.cards[activeCardId].quoteAuthor}</span>
                        )}
                      </div>
                    )}

                    {activeReadingBook.cards[activeCardId].type === 'tip' && (
                      <div className="space-y-2">
                        <span className="text-[9px] uppercase font-black tracking-widest text-emerald-400 bg-emerald-500/15 py-0.5 px-2 rounded border border-emerald-500/20">PRO SWIPE TIP</span>
                        <p className="text-slate-100 text-base font-bold leading-relaxed">
                          {activeReadingBook.cards[activeCardId].content}
                        </p>
                      </div>
                    )}

                    {activeReadingBook.cards[activeCardId].type === 'warning' && (
                      <div className="space-y-2">
                        <span className="text-[9px] uppercase font-black tracking-widest text-rose-400 bg-rose-500/15 py-0.5 px-2 rounded border border-rose-500/20">RISK WARNING</span>
                        <p className="text-slate-100 text-base font-bold leading-relaxed">
                          {activeReadingBook.cards[activeCardId].content}
                        </p>
                      </div>
                    )}

                    {activeReadingBook.cards[activeCardId].type === 'cta' && (
                      <div className="text-center space-y-4 py-4">
                        <Sparkles className="w-8 h-8 text-yellow-400 mx-auto animate-pulse" />
                        <h4 className="font-extrabold text-sm uppercase text-white">{activeReadingBook.cards[activeCardId].title || "Milestone Milestone"}</h4>
                        <p className="text-slate-300 text-xs leading-relaxed max-w-md mx-auto">{activeReadingBook.cards[activeCardId].content}</p>
                        <button 
                          onClick={() => {
                            setActiveReadingBook(null);
                            onToast("Chapter milestone completed! Profile index updated.", 'success');
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase py-2 px-6 rounded-lg shadow-sm"
                        >
                          Mark Milestone Complete
                        </button>
                      </div>
                    )}

                    {activeReadingBook.cards[activeCardId].type === 'text' && (
                      <p className="text-slate-100 text-base md:text-lg font-bold leading-relaxed font-sans">
                        {activeReadingBook.cards[activeCardId].content}
                      </p>
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-700/50 flex justify-between items-center text-xs text-slate-400 font-semibold select-none">
                    <span>Card {activeCardId + 1} of {activeReadingBook.cards.length}</span>
                    <div className="flex gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl">
                      <button 
                        onClick={() => setActiveCardId(prev => Math.max(0, prev - 1))}
                        disabled={activeCardId === 0}
                        className="text-slate-400 hover:text-white px-2 cursor-pointer disabled:opacity-20"
                      >
                        Prev
                      </button>
                      <span className="text-slate-500">|</span>
                      <button 
                        onClick={() => setActiveCardId(prev => Math.min(activeReadingBook.cards.length - 1, prev + 1))}
                        disabled={activeCardId === activeReadingBook.cards.length - 1}
                        className="text-slate-400 hover:text-white px-2 cursor-pointer disabled:opacity-20"
                      >
                        Next
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            )}
          </main>

          <footer className="w-full bg-slate-950 p-4 rounded-2xl flex justify-between items-center text-xs text-slate-500 select-none">
            <span>Author Credit: @{activeReadingBook.authorName}</span>
            <span>Immersive Digital Swipe Kindle Edition v2.10</span>
          </footer>
        </div>
      )}

      {/* 2. TRANSACTION CHECKOUT MODAL OVERLAY */}
      {checkoutBook && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full overflow-hidden text-slate-800 shadow-premium animate-scale-up">
            
            {/* Modal Header */}
            <header className="p-5 border-b border-slate-100 flex justify-between items-center select-none bg-slate-50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4.5 h-4.5 text-indigo-600" />
                <h3 className="font-extrabold text-sm uppercase text-slate-900">Checkout Security Portal</h3>
              </div>
              <button 
                onClick={() => setCheckoutBook(null)}
                className="text-xs bg-slate-200 text-slate-700 py-1 px-3 rounded-md hover:bg-slate-300 font-bold"
              >
                Cancel
              </button>
            </header>

            <main className="p-6 space-y-5">
              
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-3">
                <img src={checkoutBook.thumbnail} alt={checkoutBook.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                <div className="text-xs space-y-1 my-auto">
                  <span className="font-bold uppercase tracking-wider text-slate-400">{checkoutBook.category}</span>
                  <h4 className="font-extrabold text-slate-800 line-clamp-1">{checkoutBook.title}</h4>
                  <p className="font-bold text-indigo-600 font-mono">Price: ₦{checkoutBook.price.toLocaleString()}</p>
                </div>
              </div>

              {checkoutMode === 'options' && (
                <div className="space-y-3">
                  <h5 className="text-xs font-black uppercase text-slate-400 tracking-wider">Select Payout Option</h5>
                  <button 
                    onClick={() => setCheckoutMode('paystack')}
                    className="w-full p-4 border border-indigo-150 rounded-2xl bg-white hover:bg-indigo-50/40 text-left flex items-center justify-between transition-all group"
                  >
                    <div>
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                        💳 Paystack Instant Gateway
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">Instant digital token key delivery using registered billing credits.</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-indigo-600 transform group-hover:translate-x-1 transition-all" />
                  </button>

                  <button 
                    onClick={() => {
                      setCheckoutMode('direct');
                      setCopiedBankDetails(false);
                    }}
                    className="w-full p-4 border border-purple-150 rounded-2xl bg-white hover:bg-purple-50/40 text-left flex items-center justify-between transition-all group"
                  >
                    <div>
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                        🏛️ Direct Bank/OPay Transfer Submission
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">Upload payment screenshot receipt directly for manual CEO vetting unlock.</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-purple-600 transform group-hover:translate-x-1 transition-all" />
                  </button>
                </div>
              )}

              {/* PAYSTACK SCREEN */}
              {checkoutMode === 'paystack' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-teal-800 flex items-center justify-between font-bold">
                    <span>Paystack Merchant Checkout Secure</span>
                    <span className="text-[10px] bg-teal-600 text-white rounded px-1 px-1.5 font-mono">SECURE</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dummy card Number</label>
                      <input 
                        type="text" 
                        value={paystackCard.number} 
                        onChange={(e) => setPaystackCard({...paystackCard, number: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg font-bold text-slate-700" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Expiry date</label>
                        <input 
                          type="text" 
                          value={paystackCard.expiry} 
                          onChange={(e) => setPaystackCard({...paystackCard, expiry: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg font-mono font-bold" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">CVV Code</label>
                        <input 
                          type="text" 
                          value={paystackCard.cvv} 
                          onChange={(e) => setPaystackCard({...paystackCard, cvv: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg font-mono font-bold" 
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={triggerPaystackSim}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase rounded-xl shadow"
                  >
                    Pay ₦{checkoutBook.price.toLocaleString()} Securely
                  </button>
                </div>
              )}

              {/* OTP CONFIRM KEY */}
              {checkoutMode === 'paystack_otp' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200 space-y-1">
                    <p className="font-extrabold">Paystack Secure Bank OTP Handshake Required</p>
                    <p className="text-[10px]">A sample test numeric OTP was triggered. Provide any random number digits to unlock authorization.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Enter OTP code</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 123456" 
                      value={paystackOtp} 
                      onChange={(e) => setPaystackOtp(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 py-3 px-4 rounded-xl text-center font-mono font-black text-lg focus:outline-none focus:ring-1 focus:ring-teal-500" 
                    />
                  </div>

                  <button 
                    onClick={verifyPaystackOtp}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl"
                  >
                    Complete Bank Release
                  </button>
                </div>
              )}

              {/* DIRECT MANUAL TRANSFER SCREEN */}
              {checkoutMode === 'direct' && (
                <div className="space-y-4 text-xs text-slate-700">
                  <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-2">
                    <span className="text-[9px] font-black uppercase text-purple-600 bg-purple-100 py-0.5 px-2 rounded">Quizoe OPay Bank Details</span>
                    <p className="font-extrabold text-sm text-slate-900 mt-2">OPay Wallet Account: <span className="font-mono text-purple-600 bg-white px-2 py-0.5 border border-purple-200 rounded">08123456789</span></p>
                    <p className="font-bold text-slate-800">Account Name: Quizoe Ventures Publisher</p>
                    <p className="text-[10px] text-slate-500 font-medium">Please send the direct sum of ₦{checkoutBook.price} to this wallet. After translation completion, copy timestamp logs and supply receipt proof image below.</p>
                    
                    <button 
                      onClick={() => {
                        setCopiedBankDetails(true);
                        onToast("Direct transfer credentials copied to clipboard!", 'success');
                      }}
                      className="text-[10px] text-purple-700 font-black uppercase border border-purple-200 bg-white justify-center w-full py-1.5 rounded-lg flex items-center gap-1 shrink-0"
                    >
                      {copiedBankDetails ? "✓ Accounts Copied" : "📋 Copy Bank Wallet details"}
                    </button>
                  </div>

                  <div className="space-y-3 font-semibold text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Receipt Screenshot Image URL</label>
                      <input 
                        type="text" 
                        value={directReceiptUrl} 
                        onChange={(e) => setDirectReceiptUrl(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-slate-600" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Direct Transfer Payout Date &amp; Time</label>
                      <input 
                        type="text" 
                        value={directPaymentTime} 
                        onChange={(e) => setDirectPaymentTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-slate-600" 
                      />
                    </div>

                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1 text-[10px] md:text-xs">
                      <p className="font-bold text-indigo-900">CEO Inbox Direct Transmit Alert</p>
                      <p className="text-indigo-600 font-medium leading-normal">Our system monitors screenshot hashes. The platform CEO reviews payouts three times daily to activate corresponding modules.</p>
                    </div>
                  </div>

                  <button 
                    onClick={submitDirectPaymentScreenshot}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase rounded-xl"
                  >
                    Submit Proof Of Transfer Direct
                  </button>
                </div>
              )}

            </main>

          </div>
        </div>
      )}

      {/* 3. CORE SEGMENTS SELECTION HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-150 shadow-xs select-none">
        <div>
          <span className="text-[10px] font-black uppercase bg-indigo-600 text-white tracking-widest px-3 py-1 rounded-full shadow-sm select-none">📖 Swiping eBook Hub</span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-2.5">eBook Maker Studio &amp; Marketplace</h2>
          <p className="text-xs text-slate-500 font-medium">Browse swipe Kindle books or construct direct conversion swipe cards and split assets automatically.</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto shrink-0 pb-1.5 md:pb-0">
          <button 
            onClick={() => { setActiveSegment('marketplace'); setActiveReadingBook(null); }}
            className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer text-center flex-1 md:flex-none transition-all ${
              activeSegment === 'marketplace'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-50 text-slate-500 hover:text-slate-800'
            }`}
          >
            🛍️ eBook Marketplace
          </button>
          
          <button 
            onClick={() => { setActiveSegment('my_library'); setActiveReadingBook(null); }}
            className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer text-center flex-1 md:flex-none transition-all ${
              activeSegment === 'my_library'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-50 text-slate-500 hover:text-slate-800'
            }`}
          >
            📚 My Library
          </button>

          {(isCEO || isTutor) && (
            <button 
              onClick={() => { setActiveSegment('studio'); setActiveReadingBook(null); }}
              className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer text-center flex-1 md:flex-none transition-all ${
                activeSegment === 'studio'
                  ? 'bg-indigo-650 text-white shadow-sm animate-pulse'
                  : 'bg-slate-50 text-slate-500 hover:text-slate-800'
              }`}
            >
              ✍️ eBook Studio Maker
            </button>
          )}

          {isCEO && (
            <button 
              onClick={() => { setActiveSegment('proof_reviewer'); setActiveReadingBook(null); }}
              className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer text-center flex-1 md:flex-none transition-all relative ${
                activeSegment === 'proof_reviewer'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-500 hover:text-slate-800'
              }`}
            >
              🏛️ Bank Claims Review ({directProofs.filter(p => p.status === 'pending').length})
              {directProofs.filter(p => p.status === 'pending').length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                  !
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* 4. HUB GRID SEGMENT PANEL */}

      {/* MARKETPLACE IN PROGRESS */}
      {activeSegment === 'marketplace' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="flex items-center justify-between border-b pb-3 border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Trending Books Showcase</h3>
            <span className="text-xs font-bold text-slate-500">Platform Split Active (40% Platform / 60% Author)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ebooks.map((book) => {
              const isUnlocked = book.isFree || purchasedEbookIds.includes(book.id) || isCEO;
              return (
                <div key={book.id} className="bg-white rounded-3xl border border-slate-150 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    {/* Header Image */}
                    <div className="h-44 relative bg-slate-900">
                      <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover opacity-80" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/30 to-transparent" />
                      
                      <span className="absolute bottom-3 left-3 bg-indigo-650 text-white font-extrabold text-[9px] uppercase tracking-wider py-0.5 px-3 rounded-md">
                        {book.category}
                      </span>

                      <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-white font-mono font-black text-[10px] tracking-wide py-0.5 px-2 rounded-md">
                        {book.isFree ? "FREE ENTRY" : `₦${book.price.toLocaleString()}`}
                      </span>

                      {book.authorRole === 'tutor' && (
                        <span className="absolute top-3 right-3 bg-yellow-500 text-slate-950 font-black text-[8px] uppercase tracking-widest py-0.5 px-2 rounded shadow-sm">
                          🎓 Tutor Companion
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="p-5 space-y-2 text-left">
                      <div className="flex gap-1.5 flex-wrap">
                        {book.tags.map(t => (
                          <span key={t} className="text-[9px] font-black text-slate-400 font-mono">#{t.toUpperCase()}</span>
                        ))}
                      </div>
                      <h4 className="font-extrabold text-slate-950 text-sm leading-snug line-clamp-2">{book.title}</h4>
                      <p className="text-[11px] text-slate-500 font-bold">Author: @{book.authorName}</p>
                      <p className="text-xs text-slate-400 leading-normal line-clamp-3 italic">"{book.description}"</p>
                    </div>
                  </div>

                  <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{book.cards.length} swipe modules</span>
                    
                    {isUnlocked ? (
                      <button 
                        onClick={() => {
                          setActiveReadingBook(book);
                          setActiveCardId(0);
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white py-1.5 px-4 rounded-xl text-xs font-black uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-white" /> Open Swiper
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setCheckoutBook(book);
                          setCheckoutMode('options');
                        }}
                        className="bg-indigo-650 hover:bg-indigo-550 text-white py-1.5 px-4 rounded-xl text-xs font-black uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <Lock className="w-3 h-3" /> Get eBook
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MY LIBRARY */}
      {activeSegment === 'my_library' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b pb-3 border-slate-100 select-none">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Unveiled Ebook Compendiums</h3>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">
              Unlocked items: {ebooks.filter(b => b.isFree || purchasedEbookIds.includes(b.id) || isCEO).length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ebooks.filter(b => b.isFree || purchasedEbookIds.includes(b.id) || isCEO).map((book) => (
              <div key={book.id} className="bg-white rounded-3xl border border-indigo-100 overflow-hidden shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="h-40 relative bg-slate-900">
                    <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover opacity-85" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                    <span className="absolute bottom-3 left-3 bg-indigo-600 text-white font-extrabold text-[9px] uppercase tracking-wider py-0.5 px-2.5 rounded-md">{book.category}</span>
                  </div>
                  <div className="p-5 text-left space-y-1">
                    <h4 className="font-extrabold text-slate-900 text-sm">{book.title}</h4>
                    <p className="text-[10px] text-slate-500 font-bold">Compiled by @{book.authorName}</p>
                    <p className="text-xs text-slate-400 leading-normal line-clamp-2 mt-1 italic">"{book.description}"</p>
                  </div>
                </div>
                <div className="p-5 border-t border-slate-50 bg-slate-50/50">
                  <button 
                    onClick={() => {
                      setActiveReadingBook(book);
                      setActiveCardId(0);
                    }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase text-center cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" /> Access Swipe Reader
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CEO BANK PROOF REVIEW PANEL */}
      {activeSegment === 'proof_reviewer' && isCEO && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="flex items-center justify-between border-b pb-3 border-slate-100 select-none">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Direct Funds Receipt Auditing Logs</h3>
            <span className="text-[10px] font-mono font-black uppercase text-purple-600 bg-purple-100 py-0.5 px-3 rounded-full">Manual Vetting active</span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-150 overflow-hidden">
            <table className="w-full text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-extrabold uppercase border-b border-slate-150 tracking-wider">
                  <th className="py-3 px-4 text-left">Recipient</th>
                  <th className="py-3 px-4 text-left">eBook Requested</th>
                  <th className="py-3 px-4 text-left">Proof Screen</th>
                  <th className="py-3 px-4 text-left">Transfer Date/Time</th>
                  <th className="py-3 px-4 text-left">Sum Info</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold select-none">
                {directProofs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No proof of payment claims submitted yet.
                    </td>
                  </tr>
                ) : (
                  directProofs.map((proof) => (
                    <tr key={proof.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-900 font-bold">{proof.username}</td>
                      <td className="py-3 px-4 text-slate-800 font-black">{proof.ebookTitle}</td>
                      <td className="py-3 px-4">
                        <a href={proof.screenshotUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline flex items-center gap-1 font-bold">
                          <Eye className="w-3.5 h-3.5" /> View Receipt
                        </a>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono font-semibold">{proof.paymentDateTime}</td>
                      <td className="py-3 px-4 text-indigo-650 font-bold font-mono">₦{proof.price.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        {proof.status === 'pending' && <span className="bg-amber-100 text-amber-800 py-0.5 px-2.5 rounded-full text-[10px] font-black uppercase">PENDING VET</span>}
                        {proof.status === 'approved' && <span className="bg-emerald-100 text-emerald-800 py-0.5 px-2.5 rounded-full text-[10px] font-black uppercase">APPROVED APPROVED</span>}
                        {proof.status === 'declined' && <span className="bg-rose-100 text-rose-800 py-0.5 px-2.5 rounded-full text-[10px] font-black uppercase">RETRACTED</span>}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {proof.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleReviewProof(proof.id, 'declined')}
                              className="bg-slate-100 text-rose-600 border border-rose-100 hover:bg-rose-50 px-2 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer"
                            >
                              Deny
                            </button>
                            <button 
                              onClick={() => handleReviewProof(proof.id, 'approved')}
                              className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1 rounded text-[10px] font-black uppercase transition-all cursor-pointer shadow-sm"
                            >
                              Confirm Payment
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EBOOK COMPILER STUDIO - TUTORS / CEOS */}
      {activeSegment === 'studio' && (isCEO || isTutor) && (
        <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-xs animate-fade-in">
          <div className="flex border-b border-slate-150 pb-4 mb-6 gap-6 overflow-x-auto select-none">
            <button 
              type="button"
              onClick={() => setWizardStage('info')}
              className={`pb-4 text-xs font-black uppercase tracking-wider relative transition-all cursor-pointer shrink-0 ${
                wizardStage === 'info' ? 'text-indigo-650' : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              1. Book Parameters Slogan
              {wizardStage === 'info' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-650 rounded-full" />}
            </button>
            <button 
              type="button"
              onClick={() => setWizardStage('content')}
              className={`pb-4 text-xs font-black uppercase tracking-wider relative transition-all cursor-pointer shrink-0 ${
                wizardStage === 'content' ? 'text-indigo-650' : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              2. Text Manuscript Splitting
              {wizardStage === 'content' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-650 rounded-full" />}
            </button>
            <button 
              type="button"
              onClick={() => {
                if (draftCards.length === 0) {
                  onToast("You must split the manuscript first!", "warning");
                  return;
                }
                setWizardStage('review');
              }}
              className={`pb-4 text-xs font-black uppercase tracking-wider relative transition-all cursor-pointer shrink-0 ${
                wizardStage === 'review' ? 'text-indigo-650' : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              3. Review &amp; Curate Cards ({draftCards.length})
              {wizardStage === 'review' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-650 rounded-full" />}
            </button>
            <button 
              type="button"
              onClick={() => setWizardStage('cover')}
              className={`pb-4 text-xs font-black uppercase tracking-wider relative transition-all cursor-pointer shrink-0 ${
                wizardStage === 'cover' ? 'text-indigo-650' : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              4. Cover &amp; Author override
              {wizardStage === 'cover' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-650 rounded-full" />}
            </button>
          </div>

          <div className="space-y-6">
            
            {/* STAGE 1 */}
            {wizardStage === 'info' && (
              <div className="space-y-6 animate-fade-in text-left">
                {isTutor && (
                  <div className="p-4 bg-yellow-50 border border-yellow-250 rounded-2xl flex gap-3 text-slate-800 text-xs">
                    <Info className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-slate-900 uppercase">Tutor revenue distribution Model Active</p>
                      <p className="text-slate-600 font-medium leading-normal mt-1">
                        As a registered tutor, you keep <strong>60% of all generated sales</strong>. 
                        Quizoe platform retains a <strong>40% commission split</strong> on each processed settlement ledger checkout.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">eBook Title Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. OPay Naira Compounding"
                      value={builderTitle}
                      onChange={(e) => setBuilderTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-505 text-slate-800" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Catchy Subtitle/Slogan</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Multiply small Naira balances through daily targets"
                      value={builderSubtitle}
                      onChange={(e) => setBuilderSubtitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-505 text-slate-800" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">eBook Description Summary</label>
                  <textarea 
                    rows={2}
                    placeholder="Discuss what readers will take away from this micro-digest module..."
                    value={builderDesc}
                    onChange={(e) => setBuilderDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 py-2.5 px-4 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-505 text-slate-800" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Market Category</label>
                    <select 
                      value={builderCategory}
                      onChange={(e) => setBuilderCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 py-3 px-3 rounded-xl text-xs font-extrabold uppercase focus:outline-none cursor-pointer text-slate-800"
                    >
                      <option value="Business & Finance">Business &amp; Finance</option>
                      <option value="Technology & Coding">Technology &amp; Coding</option>
                      <option value="Self-Improvement">Self-Improvement</option>
                      <option value="Academic Guide">Academic Guide</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Tags (separated by comma)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Lagos, Fintech, Escrow"
                      value={builderTags}
                      onChange={(e) => setBuilderTags(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl text-xs font-semibold focus:outline-none text-slate-800" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Words ceiling per Swipe Card (*Algorithm Parameter*)</label>
                    <select 
                      value={wordsPerCard}
                      onChange={(e) => setWordsPerCard(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-250 py-3 px-3 rounded-xl text-xs font-black focus:outline-none text-indigo-700 cursor-pointer"
                    >
                      <option value={40}>40 words per Kindle Card (Fast swiper)</option>
                      <option value={80}>80 words per Kindle Card (Standard)</option>
                      <option value={120}>120 words per Kindle Card (Dense lessons)</option>
                      <option value={180}>180 words per Kindle Card (Expert prose)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Price specification (₦)</label>
                    <input 
                      type="number" 
                      disabled={builderIsFree}
                      placeholder="2500"
                      value={builderPrice}
                      onChange={(e) => setBuilderPrice(e.target.value)}
                      className="w-full bg-white border border-slate-200 py-2 px-3 rounded-lg text-xs font-mono font-bold text-slate-800" 
                    />
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Price Exempt</label>
                    <label className="flex items-center gap-2 cursor-pointer mt-1 font-bold text-xs select-none text-slate-800">
                      <input 
                        type="checkbox" 
                        checked={builderIsFree}
                        onChange={(e) => setBuilderIsFree(e.target.checked)}
                        className="w-4.5 h-4.5 accent-indigo-650 cursor-pointer"
                      />
                      <span>Mark Free of Charge for Catalog</span>
                    </label>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
                  <span className="block text-[10px] font-black uppercase text-slate-400">Card Background Preset style</span>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    {[
                      { key: 'default-dark', label: '🌌 Cosmic' },
                      { key: 'warm-parchment', label: '📜 Parchment' },
                      { key: 'royal-indigo', label: '🔮 Indigo' },
                      { key: 'cyber-grid', label: '🧬 Cyber' },
                      { key: 'golden-coin', label: '💰 Golden' },
                      { key: 'pure-minimalist', label: '🕊️ Minimalist' }
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setBuilderCardBg(item.key);
                          onToast(`Wallpaper configured to: ${item.label}`, 'success');
                        }}
                        className={`py-2 px-2.5 rounded-xl border text-[10px] font-bold uppercase text-center transition-all cursor-pointer ${
                          builderCardBg === item.key
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button 
                    type="button"
                    onClick={() => {
                      if (!builderTitle.trim()) {
                        onToast("Please supply eBook title before continuing.", "warning");
                        return;
                      }
                      setWizardStage('content');
                    }}
                    className="bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black uppercase py-3 px-6 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    Next Stage: Write Manuscript <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 2 */}
            {wizardStage === 'content' && (
              <div className="space-y-5 animate-fade-in text-left">
                <div className="flex justify-between items-center select-none">
                  <label className="block text-[10px] font-black uppercase text-slate-400">Main Manuscript Content box</label>
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 font-black px-2 py-0.5 rounded">Words algorithm parses this block into {wordsPerCard}-word cards</span>
                </div>

                <textarea
                  rows={9}
                  placeholder="Insert the raw, fully fleshed out text of your companion eBook here. You can supply headings, chapters, paragraphs, bullet lists, tips, warnings, or quotes. Once ready, you can let the AI partition & re-work cards or run a literal local card partitioning."
                  value={rawTextBlock}
                  onChange={(e) => setRawTextBlock(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 p-4 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-505 text-slate-800 leading-relaxed font-sans"
                />

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-650" />
                    <span className="text-xs font-black uppercase text-slate-700">AI Partitioning &amp; Styling Guidelines</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAiInstructionMode('refine_micro');
                        onToast("AI configured to polished micro-learning summarizer mode", "info");
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        aiInstructionMode === 'refine_micro' 
                          ? 'border-indigo-600 bg-indigo-50/50' 
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-xs font-black text-slate-850 uppercase">✨ Polished Micro-learning Redesigner</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium leading-normal">
                        Allows AI to rewrite headers, polish copy, extract micro study highlights, or insert appropriate warning/tip cards.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAiInstructionMode('literal');
                        onToast("AI configured to rigid non-tamper verbatim mode", "info");
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        aiInstructionMode === 'literal' 
                          ? 'border-indigo-600 bg-indigo-50/50' 
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-xs font-black text-slate-850 uppercase">🛡️ Verbatim Literal Segmenter</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium leading-normal">
                        Strict command: AI will abstain from altering/tampering with input. It merely chunks sequential raw manuscript verbatim.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between gap-3 pt-3 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setWizardStage('info')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold py-3 px-5 rounded-xl cursor-pointer"
                  >
                    Back Parameters
                  </button>

                  <div className="flex flex-col md:flex-row gap-2">
                    <button 
                      type="button"
                      disabled={isGeneratingCards || !rawTextBlock.trim()}
                      onClick={runLocalCardSplitter}
                      className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      ⚙️ Standard Local Parser (No AI)
                    </button>
                    <button 
                      type="button"
                      disabled={isGeneratingCards || !rawTextBlock.trim()}
                      onClick={triggerOpenRouterCardSplitter}
                      className="bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-black uppercase py-3 px-5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isGeneratingCards ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Splitting cards...
                        </>
                      ) : (
                        <>
                          🤖 Split &amp; Compile Cards with OpenRouter
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 3: INTERACTIVE REVIEW & CURATION */}
            {wizardStage === 'review' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2.5xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black uppercase text-indigo-950">Draft Curation Lab ({draftCards.length} Cards Generated)</h4>
                    <p className="text-[11.5px] text-indigo-700 leading-normal mt-1 font-medium">
                      Curate layout boxes, rewrite parts, or embed decorative high-resolution illustration backdrops!
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      type="button"
                      onClick={() => {
                        const newCard = {
                          id: `card_man_${Date.now()}`,
                          type: 'text',
                          chapterName: `Chapter ${draftCards.length + 1}`,
                          content: 'Insert new lesson swipe card text here...',
                          image: ''
                        };
                        setDraftCards([...draftCards, newCard]);
                        onToast("Appended blank curation card to list bottom", "success");
                      }}
                      className="bg-indigo-600 hover:bg-indigo-550 text-white text-[10px] font-black uppercase py-2 px-3.5 rounded-lg transition-all cursor-pointer"
                    >
                      ➕ Add Blank Card
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        if (confirm("Are you sure you want to clear the entire draft card roster?")) {
                          setDraftCards([]);
                        }
                      }}
                      className="bg-rose-50 text-rose-700 hover:bg-rose-100 text-[10px] font-black uppercase py-2 px-3.5 rounded-lg border border-rose-200 cursor-pointer"
                    >
                      ❌ Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-5 max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
                  {draftCards.map((card, idx) => (
                    <div key={card.id || idx} className="bg-white border-2 border-slate-50 hover:border-indigo-100 rounded-2.5xl p-5 shadow-xs relative transition-all">
                      
                      <div className="flex flex-col md:flex-row gap-2 items-start md:items-center justify-between pb-3 border-b border-slate-100 mb-4 select-none">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10.5px] font-mono font-bold select-none">{idx + 1}</span>
                          <span className="text-[10px] font-black uppercase text-slate-400">Card Settings &amp; Visuals</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...draftCards];
                              const newCard = {
                                id: `card_inserted_${Date.now()}`,
                                type: 'text',
                                chapterName: card.chapterName || `Chapter ${idx + 1}`,
                                content: 'Inserted swipe card prose...',
                                image: ''
                              };
                              updated.splice(idx + 1, 0, newCard);
                              setDraftCards(updated);
                              onToast("Inserted blank curator slot immediately below!", "info");
                            }}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-650 text-[10px] font-black uppercase py-1 px-2.5 rounded border border-slate-250 transition-all cursor-pointer flex items-center gap-1"
                          >
                            ➕ Insert Below
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = draftCards.filter((_, i) => i !== idx);
                              setDraftCards(updated);
                              onToast(`Removed card #${idx + 1} from draft list.`, 'warning');
                            }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-650 text-[10px] font-black uppercase py-1 px-2.5 rounded border border-rose-200 cursor-pointer"
                          >
                            ❌ Delete Card
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        
                        {/* Column Left: Visual Layout Preview */}
                        <div className="md:col-span-4 space-y-3">
                          <div className={`p-4 rounded-xl border aspect-video flex flex-col justify-between relative overflow-hidden text-left bg-slate-950 ${getCardBgClasses(builderCardBg)} select-none`}>
                            <span className="absolute top-2 right-2 text-[7px] font-black uppercase text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                              {card.type}
                            </span>
                            
                            {card.image && (
                              <img src={card.image} alt="Mock visual" className="absolute top-0 left-0 right-0 h-10 w-full object-cover opacity-50 reference select-none" />
                            )}
                            
                            <div className="my-auto z-10">
                              <p className="text-[9px] font-extrabold text-indigo-400 uppercase mb-0.5 tracking-wider truncate w-4/5">
                                {card.chapterName || 'General'}
                              </p>
                              <p className="text-[9px] text-white font-bold leading-tight line-clamp-3 italic">
                                "{card.content || 'No text written yet'}"
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[9px] font-black uppercase text-slate-400">Card Layout Box Template</label>
                            <select
                              value={card.type || 'text'}
                              onChange={(e) => {
                                const updated = [...draftCards];
                                updated[idx] = { ...updated[idx], type: e.target.value };
                                setDraftCards(updated);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2 rounded-lg text-[11px] font-black focus:outline-none uppercase cursor-pointer"
                            >
                              <option value="text">📄 General Text (Standard)</option>
                              <option value="tip">💡 Professional learning Tip</option>
                              <option value="warning">⚠️ Action Risk Warning</option>
                              <option value="quote">💬 Editorial block Quote</option>
                              <option value="checklist">✅ Sequence Checklist</option>
                              <option value="exercise">🏋️ Interactive Study Exercise</option>
                            </select>
                          </div>
                        </div>

                        {/* Column Right: Literal Inputs */}
                        <div className="md:col-span-8 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Chapter Name / Card Title</label>
                              <input 
                                type="text"
                                value={card.chapterName || ''}
                                onChange={(e) => {
                                  const updated = [...draftCards];
                                  updated[idx] = { ...updated[idx], chapterName: e.target.value };
                                  setDraftCards(updated);
                                }}
                                placeholder="Chapter Name"
                                className="w-full bg-slate-50 border border-slate-205 py-2 px-3 rounded-lg text-xs font-semibold text-slate-800"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Illustration Backdrop Image (Optional)</label>
                              <div className="flex gap-1.5">
                                <input 
                                  type="text"
                                  value={card.image || ''}
                                  onChange={(e) => {
                                    const updated = [...draftCards];
                                    updated[idx] = { ...updated[idx], image: e.target.value };
                                    setDraftCards(updated);
                                  }}
                                  placeholder="Paste image link URL..."
                                  className="w-full bg-slate-50 border border-slate-205 py-1.5 px-2 rounded-lg text-xs font-mono text-slate-800 truncate"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const seedPool = [
                                      "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=400",
                                      "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=400",
                                      "https://images.unsplash.com/photo-1526302757582-7af72602013a?q=80&w=400",
                                      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=400",
                                      "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?q=80&w=400",
                                      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=400",
                                      "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=400"
                                    ];
                                    const selected = seedPool[Math.floor(Math.random() * seedPool.length)];
                                    const updated = [...draftCards];
                                    updated[idx] = { ...updated[idx], image: selected };
                                    setDraftCards(updated);
                                    onToast("Assigned premium Unsplash card illustration backdrop!", "success");
                                  }}
                                  title="SeedTest"
                                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] px-2 rounded border border-indigo-200 cursor-pointer uppercase shrink-0"
                                >
                                  🎲 seed
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[9px] font-black uppercase text-slate-400">Card Core Prose/Content Text</label>
                            <textarea 
                              rows={3}
                              value={card.content || ''}
                              onChange={(e) => {
                                const updated = [...draftCards];
                                updated[idx] = { ...updated[idx], content: e.target.value };
                                setDraftCards(updated);
                              }}
                              className="w-full bg-slate-50 border border-slate-205 p-2.5 rounded-lg text-xs font-semibold text-slate-800 leading-normal"
                              placeholder="Prose payload..."
                            />
                          </div>

                          {card.type === 'quote' && (
                            <div>
                              <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Quote Author Credit</label>
                              <input 
                                type="text"
                                placeholder="Warren Buffett"
                                value={card.quoteAuthor || ''}
                                onChange={(e) => {
                                  const updated = [...draftCards];
                                  updated[idx] = { ...updated[idx], quoteAuthor: e.target.value };
                                  setDraftCards(updated);
                                }}
                                className="w-full bg-slate-50 border border-slate-205 py-1.5 px-3 rounded-lg text-xs font-bold text-indigo-650"
                              />
                            </div>
                          )}

                        </div>

                      </div>

                    </div>
                  ))}
                </div>

                <div className="flex justify-between select-none pt-4 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setWizardStage('content')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-705 text-xs font-extrabold py-3 px-5 rounded-xl cursor-pointer"
                  >
                    Back to Manuscript
                  </button>

                  <button 
                    type="button"
                    onClick={() => setWizardStage('cover')}
                    className="bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black uppercase py-3 px-6 rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                  >
                    Next Stage: Wrap Cover &amp; Release <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 4 */}
            {wizardStage === 'cover' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  
                  {/* Left Column: Cover & Thumbnail Inputs & Tools */}
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">eBook URL Cover Image</label>
                        <input 
                          type="text" 
                          placeholder="Paste clear image URL here..."
                          value={builderCoverUrl}
                          onChange={(e) => setBuilderCoverUrl(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-505 text-slate-800" 
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Author Override Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Professor winbigonly"
                          value={builderAuthorName}
                          onChange={(e) => setBuilderAuthorName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl text-xs font-extrabold focus:outline-none focus:ring-1 focus:ring-indigo-505 text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Image Generation AI Option */}
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-650 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700">Cover Art Generator tool</span>
                      </div>
                      
                      <p className="text-[10.5px] text-slate-500 leading-normal font-sans">
                        Describe the vibe of your cover template (e.g., <strong className="text-slate-700">"digital gold ledger stacks"</strong> or <strong className="text-slate-700">"cyberpunk coding workspace"</strong>). The generator will assemble matching designs as the eBook cover.
                      </p>

                      <div className="space-y-3">
                        <input 
                          type="text"
                          placeholder="e.g. Minimalist compounding gold, deep midnight indigo"
                          value={imagePrompt}
                          onChange={(e) => setImagePrompt(e.target.value)}
                          className="w-full bg-white border border-slate-250 py-2.5 px-3 rounded-lg text-xs font-semibold text-slate-850 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={isGeneratingImage}
                          onClick={() => triggerAiImageGeneration(imagePrompt)}
                          className={`w-full py-2.5 px-4 rounded-xl font-black text-[11px] uppercase transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                            isGeneratingImage 
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          }`}
                        >
                          {isGeneratingImage ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5 text-indigo-650" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Designing Cover Artwork...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" /> Generate cover art
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live File Preview & Thumbnail Handler */}
                  <div className="space-y-3">
                    <span className="block text-[10px] font-black uppercase text-slate-400">Compiled Real-Time Cover Preview</span>
                    
                    <div className="border border-slate-180 rounded-3xl overflow-hidden bg-slate-900 text-white relative shadow-md flex flex-col h-[270px] select-none">
                      <img 
                        src={builderCoverUrl || "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=600"} 
                        alt="Ebook cover" 
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                      />
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
                      
                      {/* Typographic Overlay */}
                      <div className="p-6 mt-auto relative z-10 space-y-2 text-left">
                        <span className="text-[9px] uppercase font-black tracking-widest text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-2 py-0.5 rounded">
                          {builderCategory.toUpperCase()}  •  SWIPE BOOK
                        </span>
                        
                        <h3 className="text-sm md:text-base font-black text-white leading-tight drop-shadow-md">
                          {builderTitle || "Title Placeholder"}
                        </h3>
                        
                        <p className="text-[11px] text-slate-300 line-clamp-2 drop-shadow-sm font-semibold">
                          {builderSubtitle || "Subtitle placeholder will populate live as you type."}
                        </p>
                        
                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-300">
                          <span>BY @{builderAuthorName || currentUser.username}</span>
                          <span className="font-extrabold text-[#10b981]">
                            {builderIsFree ? "FREE ENTRY" : `₦${Number(builderPrice).toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-[10px] text-slate-400 text-center font-medium">
                      Live preview accurately overlays visual metadata coefficients before compiling.
                    </div>
                  </div>

                </div>

                <div className="flex justify-between select-none pt-4 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setWizardStage('review')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold py-2.5 px-4 rounded-xl cursor-pointer"
                  >
                    Back to Review
                  </button>

                  <button 
                    type="button"
                    onClick={compileAndPublishEbook}
                    className="bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-black uppercase py-2.5 px-6 rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                  >
                    ✓ Publish eBook
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
