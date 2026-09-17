import React, { useState } from 'react';
import { Bell, Search, Trophy, Compass, UserPlus, Sparkles, HelpCircle, ArrowRight, Activity, ShoppingBag, ArrowUpRight, CheckSquare, BookOpen } from 'lucide-react';
import { User, Challenge, Transaction } from '../types';
import WalletCard from './WalletCard';

interface HomePageProps {
  user: User;
  challenges: Challenge[];
  transactions: Transaction[];
  onTabChange: (tab: string) => void;
  onJoinChallenge: (challenge: Challenge) => void;
  onPlayQuiz: (challenge: Challenge) => void;
  onOpenModal: (type: 'deposit' | 'withdraw' | 'transfer' | 'refer') => void;
}

export default function HomePage({ 
  user, 
  challenges, 
  transactions, 
  onTabChange, 
  onJoinChallenge, 
  onPlayQuiz,
  onOpenModal 
}: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  // Filter challenges based on query
  const filteredFeatured = challenges
    .filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.category.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 3);

  const mockNotifications = [
    { text: "⚡ Payout alert: withdrawal of ₦100.00 dispatched successfully.", time: "1 hour ago" },
    { text: "🏆 @chi_ama liked your photo submission.", time: "5 hours ago" },
    { text: "🔥 Double Referrals: Invite any user and receive ₦25 bonus credits.", time: "1 day ago" }
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto text-left">
      
      {/* TOP HEADER */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        
        {/* Profile greetings */}
        <div className="flex items-center gap-3">
          <img 
            src={user.avatar} 
            alt={user.username} 
            className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-100"
          />
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-1.5">
              Hello, {user.username}!
              <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-400" />
            </h2>
            <p className="text-xs text-slate-500 font-medium">Ready to claim your rewards today?</p>
          </div>
        </div>

        {/* Global Search and notification hub */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 relative">
          
          <div className="dashboard-search-bar flex items-center pl-3.5 pr-2 py-2 w-full sm:w-64 max-w-sm">
            <Search className="w-4.5 h-4.5 text-slate-400 shrink-0 mr-2" />
            <input 
              type="text" 
              placeholder="Search quizzes, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none w-full"
            />
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer relative focus:outline-none"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-premium p-4 z-50 text-left scale-100">
                <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-50">
                  <h4 className="font-extrabold text-slate-900 text-sm">Notifications</h4>
                  <span className="text-[10px] font-bold text-blue-600 uppercase">Clear All</span>
                </div>
                <div className="flex flex-col gap-3">
                  {mockNotifications.map((notif, idx) => (
                    <div key={idx} className="p-2 hover:bg-slate-50 rounded-lg">
                      <p className="text-xs font-semibold text-slate-800 leading-normal">{notif.text}</p>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 block">{notif.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </header>

      {/* 👑 CEO MASTER QUICK PANEL CHANNELS */}
      {(user.username.toLowerCase() === 'winbigonly' || user.email?.toLowerCase() === 'winbigonly@gmail.com') && (
        <div className="mb-8 p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-premium flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden animate-fade-in select-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-650/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="z-10 text-left">
            <span className="text-[10px] font-black uppercase bg-blue-600 text-white py-1 px-3 rounded-full tracking-widest inline-block shadow-sm">👑 PLATFORM OWNER CONSOLE</span>
            <h3 className="text-xl font-black tracking-tight mt-3 text-white">Editorial Conversational Quiz & Publishing Studio</h3>
            <p className="text-xs text-slate-300 font-medium mt-1 pr-6 max-w-xl">
              Hello, @{user.username}! Access your AI-Powered Conversational Quiz Builder, deploy interactive rooms, or publish premium companion eBooks instantly.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 z-10 shrink-0 w-full md:w-auto">
            <button
              onClick={() => onTabChange('ceo_quizzes')}
              className="flex-1 md:flex-none py-3 px-5 text-center text-xs font-black uppercase rounded-2xl bg-white text-slate-900 border border-white hover:bg-slate-100 cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
            >
              🎯 Open Chat Quiz Studio
            </button>
            <button
              onClick={() => onTabChange('ceo_ebooks')}
              className="flex-1 md:flex-none py-3 px-5 text-center text-xs font-black uppercase rounded-2xl bg-slate-800 text-white border border-slate-700 hover:bg-slate-750 cursor-pointer transition-all flex items-center justify-center gap-2 animate-pulse"
            >
              📖 Go to eBook Publisher
            </button>
          </div>
        </div>
      )}

      {/* TWO COLUMN GRID FOR HERO CORNER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left column Opay Card */}
        <div className="lg:col-span-5 w-full">
          <WalletCard 
            user={user}
            onDeposit={() => onOpenModal('deposit')}
            onWithdraw={() => onOpenModal('withdraw')}
            onTransfer={() => onOpenModal('transfer')}
            onRefer={() => onOpenModal('refer')}
          />
        </div>

        {/* Right column Quick Actions Grid */}
        <div className="lg:col-span-7 w-full flex flex-col justify-between h-full min-h-[220px]">
          
          <div className="mb-4 text-left">
            <h3 className="text-md font-bold text-slate-400 uppercase tracking-wider mb-2">QUICK SHORTCUTS</h3>
            <p className="text-xs text-slate-500 font-medium">Select a quick operation to get started immediately.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
            
            <button
              onClick={() => onTabChange('chat_quiz_hall')}
              className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-amber-200 hover:shadow-md hover:translate-y-[-2px] transition-all flex flex-col items-center gap-3 w-full text-center cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[11px] font-black tracking-tight text-slate-800 uppercase">Live Chat Quiz</span>
            </button>

            <button
              onClick={() => onTabChange('ebook_marketplace')}
              className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md hover:translate-y-[-2px] transition-all flex flex-col items-center gap-3 w-full text-center cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <BookOpen className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[11px] font-black tracking-tight text-slate-800 uppercase">eBook Studio</span>
            </button>

            <button
              onClick={() => onTabChange('challenges')}
              className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-md hover:translate-y-[-2px] transition-all flex flex-col items-center gap-3 w-full text-center cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Trophy className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[11px] font-black tracking-tight text-slate-800 uppercase">Join Quiz</span>
            </button>

            <button
              onClick={() => onTabChange('challenges')}
              className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-emerald-200 hover:shadow-md hover:translate-y-[-2px] transition-all flex flex-col items-center gap-3 w-full text-center cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Compass className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[11px] font-black tracking-tight text-slate-800 uppercase">Join Contest</span>
            </button>

            <button
              onClick={() => onOpenModal('refer')}
              className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-pink-200 hover:shadow-md hover:translate-y-[-2px] transition-all flex flex-col items-center gap-3 w-full text-center cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600">
                <UserPlus className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[11px] font-black tracking-tight text-slate-800 uppercase">Invite Buddy</span>
            </button>

            <button
              onClick={() => onTabChange('feed')}
              className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md hover:translate-y-[-2px] transition-all flex flex-col items-center gap-3 w-full text-center cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Activity className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[11px] font-black tracking-tight text-slate-800 uppercase">Global Feed</span>
            </button>

          </div>

        </div>

      </div>

      {/* SECTION 3: FEATURED COMPETITIONS - Large horizontal cards scrolls */}
      <section className="mt-12 text-left">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Featured Competitions</h3>
          <button 
            type="button"
            onClick={() => onTabChange('challenges')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-0.5"
          >
            See All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Horizontal Flex Grid */}
        <div className="horizontal-scroll-container">
          {challenges.filter(c => c.status === 'sponsored').length > 0 ? (
            challenges.filter(c => c.status === 'sponsored').map((chal) => (
              <div 
                key={chal.id} 
                className="horizontal-scroll-item challenge-card shrink-0 select-none flex flex-col bg-white border border-slate-100 rounded-3xl"
              >
                <div className="relative h-44 w-full">
                  <img 
                    src={chal.coverImage} 
                    className="w-full h-full object-cover"
                    alt={chal.title}
                  />
                  <span className="challenge-badge badge-sponsored">🔥 SPONSORED</span>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{chal.category}</span>
                    <span className="text-xs font-bold text-slate-900 border border-slate-100 px-2 py-0.5 rounded-lg bg-slate-50">Free Entry</span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 mb-1 leading-snug text-md truncate">{chal.title}</h4>
                  <p className="text-xs text-slate-500 leading-normal line-clamp-2 mb-4 flex-1">{chal.description}</p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-auto shrink-0">
                    <span className="text-xs font-bold text-blue-600">Prize Pool: ₦{chal.prizePool}</span>
                    <button
                      onClick={() => {
                        if (chal.questions && chal.questions.length > 0) {
                          onPlayQuiz(chal);
                        } else {
                          onJoinChallenge(chal);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl cursor-pointer shadow-sm transition-colors"
                    >
                      {chal.questions && chal.questions.length > 0 ? 'Start Quiz' : 'Join Card'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="w-full py-8 text-center text-slate-400 font-medium flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Trophy className="w-8 h-8 text-slate-300 mb-1.5 stroke-[1.5px]" />
              <p className="text-xs font-semibold text-slate-500">No sponsored quizzes active</p>
              <p className="text-[10px] text-slate-400">Deploy custom campaigns from the Admin Console!</p>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4: RECOMMENDED CHALLENGES & SECTION 5: LATEST BANK ACTIVITY */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        
        {/* Recommended list */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 text-left">
          <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide mb-6">Recommended Challenges</h3>
          
          <div className="flex flex-col gap-4">
            {challenges.filter(c => c.status === 'active').length > 0 ? (
              challenges.filter(c => c.status === 'active').slice(0, 3).map((chal) => (
                <div key={chal.id} className="flex gap-4 items-center p-3 hover:bg-slate-50 rounded-2xl transition-colors border-b border-slate-50 last:border-0 pb-4">
                  <img 
                    src={chal.coverImage} 
                    className="w-16 h-16 rounded-xl object-cover shrink-0" 
                    alt={chal.title} 
                  />
                  <div className="flex-1 overflow-hidden">
                    <span className="text-[9px] font-extrabold text-blue-600 tracking-wider uppercase mb-1 block">{chal.category}</span>
                    <h4 className="font-bold text-slate-800 text-sm truncate leading-tight">{chal.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{chal.participants.toLocaleString()} active challengers</p>
                  </div>
                  <button
                    onClick={() => onJoinChallenge(chal)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 transition-all cursor-pointer shadow-sm"
                  >
                    <ArrowRight className="w-4.5 h-4.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 font-medium flex flex-col items-center justify-center">
                <Compass className="w-6 h-6 text-slate-300 mb-1.5" />
                <p className="text-xs font-semibold text-slate-500">All challenge lists are empty</p>
                <p className="text-[10px] text-slate-400">Head to the Admin Builders panel to add active events.</p>
              </div>
            )}
          </div>
        </div>

        {/* Latest Activity logs list */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 text-left">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Latest Bank Activity</h3>
            <button
              onClick={() => onTabChange('wallet')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              See Ledger
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {transactions.slice(0, 4).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-2xl border border-slate-50 transition-all">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    tx.type === 'reward' ? 'tx-icon-reward' : 
                    tx.type === 'deposit' ? 'tx-icon-deposit' : 
                    tx.type === 'withdrawal' ? 'tx-icon-withdrawal' : 'tx-icon-transfer'
                  }`}>
                    <ArrowUpRight className={`w-5 h-5 ${tx.type === 'withdrawal' || tx.type === 'transfer' ? 'rotate-90' : ''}`} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-slate-800 text-sm truncate leading-tight">{tx.description}</p>
                    <span className="text-[10px] font-bold text-slate-400 block mt-0.5">Reference: {tx.reference}</span>
                  </div>
                </div>
                <span className={`font-bold font-mono text-sm shrink-0 pl-2 ${
                  tx.type === 'withdrawal' || tx.type === 'entry_fee' || tx.type === 'transfer' 
                    ? 'text-red-500' 
                    : 'text-green-500'
                }`}>
                  {tx.type === 'withdrawal' || tx.type === 'entry_fee' || tx.type === 'transfer' ? '-' : '+'}
                  ₦{tx.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </section>

    </div>
  );
}
