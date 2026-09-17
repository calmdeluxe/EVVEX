import React, { useEffect, useState } from 'react';
import { 
  Sparkles, Trophy, Wallet, GraduationCap, Flame, ArrowRight, ArrowUpRight, 
  Camera, Utensils, Music, HelpCircle, Film, Briefcase, BookOpen, Users, Play, Clock, ChevronRight
} from 'lucide-react';
import { Challenge } from '../types';

interface LandingPageProps {
  onStartNow: (intent?: { tab?: string; action?: string; targetId?: string }) => void;
  onExploreChallenges: () => void;
  onJoinChallenge: (challenge: Challenge) => void;
  featuredChallenges: Challenge[];
}

export default function LandingPage({ 
  onStartNow, 
  onExploreChallenges, 
  onJoinChallenge, 
  featuredChallenges 
}: LandingPageProps) {
  const [tickerIndex, setTickerIndex] = useState(0);

  // Load live eBooks compiled in local session
  const [liveEbooks, setLiveEbooks] = useState<any[]>(() => {
    const saved = localStorage.getItem('quizoe_compiled_ebooks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const liveActivities = [
    "🔥 @david_xp9 raised ₦150.00 in Tech Quiz Chat Bowl!",
    "🚀 New sponsored quiz: 'Binance Ultimate Crypto' is now live with ₦1,000 pool!",
    "👥 @chi_ama joined the 'Smartphone Photography Beat' challenge.",
    "🏆 @jollof_master won ₦250.00 from street-food recipe voting!",
    "🌟 @emeka_palm referred 5 users and earned a premium status voucher!"
  ];

  // Top 5 Trending Contents Automatic Shuffling slide lists
  const trendingContents = [
    {
      id: "trend_1",
      type: "video" as const,
      category: "Escrow Tutorial",
      title: "OPay Instant Wallet Settlement Setup Guide",
      description: "Step-by-step masterclass demonstrating how to secure rapid daily peer-to-peer trade escrows.",
      coverUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=500",
      stats: "🔥 4.8K views this week • Recommended",
      duration: "06:12"
    },
    {
      id: "trend_2",
      type: "ebook" as const,
      category: "Best Seller",
      title: "Lagos Financial Ledger Hacks & Arbitrage",
      description: "Exclusive carousel handbook outlining top safe compound yields for naira micro-accounts.",
      coverUrl: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=500",
      stats: "📚 850 readers active • ₦2,500 value",
      duration: "24 Cards"
    },
    {
      id: "trend_3",
      type: "video" as const,
      category: "Advanced Play",
      title: "Quiz Chat Master Clock Optimization Shortcuts",
      description: "How to instantly read and answer double-signature brainteasers under high clock pressure.",
      coverUrl: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=500",
      stats: "⚡ 5.2K plays live • CEO Pick",
      duration: "04:50"
    },
    {
      id: "trend_4",
      type: "ebook" as const,
      category: "New Release",
      title: "Web3 Smart Contracts for Naira Merchants",
      description: "Decentralized automated agreements for escrow, trade, and regional remittances.",
      coverUrl: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?q=80&w=500",
      stats: "📖 120 downloads • Complete Code",
      duration: "18 Cards"
    },
    {
      id: "trend_5",
      type: "ebook" as const,
      category: "Regulatory",
      title: "Fintech Laws & Escrow Escapement in West Africa",
      description: "Essential guidelines for setting up P2P micro-credit nodes compliant with AML statutes.",
      coverUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=500",
      stats: "🔐 Verified Compliance • ₦4,000 value",
      duration: "30 Cards"
    }
  ];

  const [activeTrendIndex, setActiveTrendIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % liveActivities.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [liveActivities.length]);

  // Automatic shuffle for trending content slides
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTrendIndex((prev) => (prev + 1) % trendingContents.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [trendingContents.length]);

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans">
      
      {/* Landing Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 py-4 px-6 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md">Q</div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">Quizoe<span className="text-blue-600">.</span></span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onStartNow()} 
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={() => onStartNow()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 px-5 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Register Free
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 1: HERO */}
      <section className="relative overflow-hidden py-16 lg:py-24 px-6 border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5 fill-blue-500" />
              The Creative Challenge Economy
            </span>
            <h1 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tight leading-none mb-6">
              Learn.<br className="hidden sm:block" />
              Compete.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Earn Rewards.</span>
            </h1>
            <p className="text-lg text-slate-600 font-medium leading-relaxed max-w-lg mb-8">
              Join quizzes, creative competitions, skill challenges, and sponsored brand campaigns while pocketing instant wallet cash out rewards.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button
                onClick={() => onStartNow()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 group transform active:scale-95"
              >
                Start Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onExploreChallenges}
                className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold py-4 px-8 rounded-2xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                Explore Challenges
              </button>
            </div>
          </div>

          {/* Right Floating Deck Illustration */}
          <div className="lg:col-span-6 relative flex justify-center max-w-lg mx-auto">
            <div className="relative w-full aspect-square rounded-[40px] bg-gradient-to-tr from-blue-100/50 via-indigo-55 to-purple-100/50 p-6 flex items-center justify-center">
              
              {/* Backglow element */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-400/20 blur-[100px] rounded-full"></div>

              {/* Card 1: Bank card style */}
              <div className="absolute -top-4 -right-4 w-52 p-4.5 rounded-2xl bg-slate-900 text-white shadow-xl rotate-[6deg] hover:rotate-0 transition-transform duration-300">
                <div className="flex justify-between items-start mb-3">
                  <div className="px-2 py-0.5 rounded bg-green-500 font-bold text-[8.5px]">ACTIVE</div>
                  <Wallet className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-450 uppercase font-mono">My Earnings</p>
                <p className="text-lg font-extrabold font-mono text-green-400 text-left">₦1,450.00</p>
                <div className="mt-3 flex gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-blue-500 opacity-90"></div>
                  <div className="w-4 h-4 rounded-full bg-purple-500 opacity-90 -ml-2"></div>
                </div>
              </div>

              {/* Card 2: Challenge card */}
              <div className="absolute -bottom-4 -left-4 w-56 p-4 rounded-2xl bg-white border border-slate-100 shadow-xl -rotate-[4deg] hover:rotate-0 transition-transform duration-300">
                <img 
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300"
                  className="w-full h-24 object-cover rounded-lg mb-3"
                  alt="Tech quiz"
                />
                <h4 className="font-bold text-xs text-slate-900 text-left">AI Quiz Chat Championship</h4>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 py-0.5 px-2 rounded-md">SPONSORED</span>
                  <span className="text-xs font-extrabold text-slate-900">Prize: ₦500</span>
                </div>
              </div>

              {/* Central Quiz card */}
              <div className="w-64 bg-white p-5 rounded-3xl border border-slate-100 shadow-xl z-20 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs font-bold">A</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase text-left">Question 3 of 10</span>
                </div>
                <p className="font-bold text-slate-800 text-sm leading-snug text-left">What mechanism defines transformers?</p>
                <div className="flex flex-col gap-2">
                  <div className="p-2 rounded-xl border border-blue-500 bg-blue-50 text-blue-800 text-xs font-bold flex justify-between items-center">
                    <span>Self-Attention</span>
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-[8px] text-white flex items-center justify-center">✓</span>
                  </div>
                  <div className="p-2 rounded-xl border border-slate-100 text-slate-500 text-xs font-medium text-left">
                    Gradient Descent
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* SECTION 2: LIVE ACTIVITY TICKER */}
      <div className="bg-slate-900 text-white py-3.5 px-6 overflow-hidden relative">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] font-extrabold text-amber-400 shrink-0 select-none">
            <Flame className="w-3.5 h-3.5 animate-pulse text-amber-500 fill-amber-500" />
            LIVE FEED:
          </div>
          <div className="h-6 flex-1 overflow-hidden relative">
            <div 
              className="absolute w-full text-sm font-semibold transition-transform duration-500 text-slate-200 text-left"
              style={{ transform: `translateY(-${tickerIndex * 24}px)` }}
            >
              {liveActivities.map((str, idx) => (
                <div key={idx} className="h-6 flex items-center truncate">
                  {str}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 🎬 ANIMATION: SHUFFLING TRENDING VIDEO & EBOOK CONTENT CAROUSEL */}
      {/* Mounted below the Get Started / Hero segments and right above eBook thumbnails */}
      <section className="bg-gradient-to-br from-slate-900 to-indigo-950 py-16 px-6 text-white relative overflow-hidden select-none">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="px-3.5 py-1 rounded-full bg-indigo-950 border border-indigo-700/40 text-indigo-400 text-[10px] font-black uppercase tracking-wider">
              🔥 PLATFORM HIGHLIGHTS ANIMATION
            </span>
            <h2 className="text-2xl md:text-4xl font-black mt-2 tracking-tight text-white">Top Trending Video &amp; eBook Masterclasses</h2>
            <p className="text-slate-400 text-xs font-semibold mt-1 max-w-md mx-auto">
              Shuffling live. Watch expert tutorials or purchase interactive companions with our rapid Paystack settlement keys.
            </p>
          </div>

          {/* ACTIVE SHIFTING SLIDE CONTAINER */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center max-w-4xl mx-auto min-h-[300px] transition-all duration-500 hover:border-white/20">
            
            {/* Visual Frame */}
            <div className="w-full md:w-2/5 aspect-4/3 rounded-2xl overflow-hidden relative border border-white/10 bg-slate-950 shrink-0">
              <img 
                src={trendingContents[activeTrendIndex].coverUrl} 
                className="w-full h-full object-cover opacity-80" 
                alt="Trending visual" 
              />
              
              {/* Type Badge */}
              <span className="absolute top-3 left-3 bg-indigo-650 text-white font-black text-[9px] uppercase py-1 px-2.5 rounded-full tracking-wider shadow-sm">
                {trendingContents[activeTrendIndex].type === 'video' ? '🎬 TUTORIAL VIDEO' : '📖 PREMIUM EBOOK'}
              </span>

              {/* Media Duration Badge */}
              <span className="absolute bottom-3 right-3 bg-black/85 text-slate-100 font-bold text-[9px] py-1 px-2.5 rounded-lg border border-white/10">
                {trendingContents[activeTrendIndex].duration}
              </span>

              {trendingContents[activeTrendIndex].type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>
              )}
            </div>

            {/* Slide Metadata & Information */}
            <div className="flex-1 text-left space-y-4">
              <div className="flex justify-between items-center bg-white/5 py-1 px-3.5 rounded-xl border border-white/5 inline-flex">
                <span className="text-[10px] font-black uppercase text-amber-400">{trendingContents[activeTrendIndex].category}</span>
              </div>
              <h3 className="text-xl md:text-2xl font-black tracking-tight text-white leading-tight">
                {trendingContents[activeTrendIndex].title}
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                {trendingContents[activeTrendIndex].description}
              </p>
              <div className="text-xs text-slate-400 font-mono italic">
                {trendingContents[activeTrendIndex].stats}
              </div>

              {/* Pay and buy action key trigger supporting intent savings */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => onStartNow({ tab: 'ebook_marketplace', action: 'buy_ebook', targetId: 'p_eb_1' })}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 px-5 rounded-xl uppercase tracking-wider cursor-pointer shadow-md transform active:scale-95 transition-all text-center"
                >
                  💳 Unlock Ticket
                </button>
                <button
                  onClick={() => onStartNow()}
                  className="bg-white/10 hover:bg-white/15 text-white text-xs font-bold py-3 px-5 rounded-xl uppercase tracking-wider cursor-pointer text-center"
                >
                  Explore Studio
                </button>
              </div>
            </div>

          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-1.5 mt-6">
            {trendingContents.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTrendIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  activeTrendIndex === idx ? 'w-6 bg-blue-500' : 'w-2 bg-white/20'
                }`}
              />
            ))}
          </div>

        </div>
      </section>

      {/* 📖 EBOOK LIVE THUMBNAILS & DIRECT PAYMENTS BUTTONS (posted by me live) */}
      <section className="py-16 px-6 max-w-7xl mx-auto border-b border-slate-100 text-left">
        <div className="text-left mb-10 pb-4 border-b border-slate-100 flex justify-between items-end">
          <div>
            <span className="text-xs font-extrabold text-blue-600 uppercase tracking-widest">Live Catalog</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-1">📚 Companion eBook Publications</h2>
            <p className="text-xs text-slate-500 font-medium">Swipe and browse micro-reading guides uploaded live by our content curators.</p>
          </div>
          <button 
            onClick={() => onStartNow()}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            See Marketplace <ChevronRight className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Flex grid */}
        {liveEbooks.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto w-full">
            <span className="text-4xl">📖</span>
            <h3 className="text-md font-black text-slate-800 mt-3">eBook Registry Empty</h3>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Authorized curators have not compiled active companion guides yet. Sign in or upgrade to post your own publication guides!
            </p>
            <button
              onClick={() => onStartNow()}
              className="mt-4 inline-flex items-center gap-1.5 bg-slate-900 text-white text-xs font-black py-2 px-4 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Sign In and Curate Ebooks
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {liveEbooks.map((book) => (
              <div key={book.id} className="bg-white rounded-3xl border border-slate-150 overflow-hidden shadow-xs relative hover:shadow-md transition-all flex flex-col justify-between">
                
                {/* Cover thumbnail */}
                <div className="aspect-video relative bg-slate-100">
                  <img 
                    src={book.thumbnail || book.coverImage || 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=300'} 
                    className="w-full h-full object-cover" 
                    alt="ebook cover" 
                  />
                  <span className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-[9px] font-black uppercase text-white px-2 py-0.5 rounded tracking-widest">
                    {book.category}
                  </span>
                  <span className="absolute bottom-2.5 right-2.5 bg-blue-600/90 text-white font-black text-[9px] px-2 py-1 rounded-lg">
                    ₦{book.price.toLocaleString()}
                  </span>
                </div>

                {/* Title & info */}
                <div className="p-5 flex-1 flex flex-col justify-between text-left">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-1">{book.title}</h4>
                    <p className="text-xs text-slate-500 font-semibold line-clamp-2 leading-relaxed mt-1">{book.subtitle}</p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">By @{book.authorName}</span>
                    
                    {/* DIRECT PAYMENT BUTTONS KEYS */}
                    <button
                      onClick={() => {
                        // Save checkout intent and redirect!
                        onStartNow({ tab: 'ebook_marketplace', action: 'buy_ebook', targetId: book.id });
                      }}
                      className="bg-blue-600 hover:bg-blue-750 text-white font-extrabold text-[10px] py-2 px-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-xs transform active:scale-95"
                    >
                      💳 Pay &amp; Unlock
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 3: FEATURED CHALLENGES */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12">
          <div className="text-left">
            <span className="text-xs font-extrabold text-blue-600 uppercase tracking-widest">Compete Today</span>
            <h2 className="text-4xl font-extrabold text-slate-900 mt-1">Featured Live Campaigns</h2>
          </div>
          <button 
            onClick={onExploreChallenges}
            className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-4 md:mt-0 cursor-pointer"
          >
            See Marketplace <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredChallenges.length > 0 ? (
            featuredChallenges.slice(0, 3).map((challenge) => (
              <div key={challenge.id} className="challenge-card flex flex-col h-full text-left">
                <div className="relative">
                  <img 
                    src={challenge.coverImage} 
                    className="w-full h-48 object-cover" 
                    alt={challenge.title}
                  />
                  <span className={`challenge-badge ${challenge.status === 'sponsored' ? 'badge-sponsored' : 'badge-active'}`}>
                    {challenge.status === 'sponsored' ? '🔥 SPONSORED' : '● LIVE'}
                  </span>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <span className="text-[11px] font-bold text-slate-400 bg-slate-100 py-1 px-2.5 rounded-md uppercase">
                      {challenge.category}
                    </span>
                    <div className="entry-fee-tag text-xs">
                      {challenge.entryFee === 0 ? 'FREE ENTRY' : `₦${challenge.entryFee.toFixed(2)}`}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 leading-snug mb-2 line-clamp-1">
                    {challenge.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-1 line-clamp-2">
                    {challenge.description}
                  </p>
                  <div className="border-t border-slate-100 pt-4 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{challenge.participants.toLocaleString()} joined</span>
                    </div>
                    <button
                      onClick={() => onJoinChallenge(challenge)}
                      className="bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      Join Challenge
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white p-8 md:p-12 rounded-3xl border border-slate-100/80 text-center flex flex-col items-center max-w-2xl mx-auto shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-3">No Active Campaigns Onboard</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-md">
                All pre-seeded dummy challenges have been pruned. Sign Up or Log In to access the admin board or social portal and publish your custom campaign tracks!
              </p>
              <button
                onClick={() => onStartNow()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl text-xs transition-all cursor-pointer shadow-md"
              >
                Access Dashboard &rarr;
              </button>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4: HOW IT WORKS */}
      <section className="bg-slate-900 text-white py-16 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-extrabold text-blue-400 uppercase tracking-widest">Operational Manual</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-2">How It Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Register Account", desc: "Sign up securely or claim a referral link configuration from an existing friend." },
              { step: "02", title: "Join Campaigns", desc: "Select free sponsored quiz chat maps or standard entry-fee aesthetic contests." },
              { step: "03", title: "Compete", desc: "Answer high-pressure quizzes under the clock or upload your creative media designs." },
              { step: "04", title: "Claim Revenue", desc: "Score premium grades and secure instant dollar tokens credited right to your balance." }
            ].map((node, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-2xl relative text-left">
                <span className="text-4xl font-extrabold text-blue-500 font-mono block mb-4">{node.step}</span>
                <h4 className="text-lg font-bold mb-2 text-slate-100">{node.title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed">{node.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: FEATURED CATEGORIES */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-extrabold text-blue-600 uppercase tracking-widest text-center">Multi-Discipline Platform</span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-2">Sectors &amp; Categories</h2>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {[
            { label: 'Photography', icon: Camera, color: 'text-violet-600' },
            { label: 'Food & Culinary', icon: Utensils, color: 'text-emerald-600' },
            { label: 'Dance & Rhythm', icon: Music, color: 'text-rose-600' },
            { label: 'Quiz Bowl', icon: HelpCircle, color: 'text-blue-600' },
            { label: 'Video Showcase', icon: Film, color: 'text-amber-600' },
            { label: 'Business Grant', icon: Briefcase, color: 'text-indigo-600' },
            { label: 'Storytelling Storyboard', icon: BookOpen, color: 'text-cyan-600' }
          ].map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div key={idx} className="category-badge-p text-slate-800">
                <Icon className={`w-5 h-5 ${cat.color}`} />
                <span className="text-sm font-semibold">{cat.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 6: FOOTER */}
      <footer className="bg-slate-950 text-slate-500 text-sm py-12 px-6 border-t border-slate-900 text-center">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-lg">Q</div>
            <span className="font-extrabold text-lg tracking-tight text-white">Quizoe<span className="text-blue-500">.</span></span>
          </div>
          <p>© 2026 Quizoe Technology Inc. All rights reserve-payouts secured. Partnered with regional microfinance banks.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-300 cursor-pointer">Security Code</span>
            <span>•</span>
            <span className="hover:text-slate-300 cursor-pointer">AML Policy</span>
            <span>•</span>
            <span className="hover:text-slate-300 cursor-pointer">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
