import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import InteractiveChatQuizHall from '../components/InteractiveChatQuizHall';
import { User, Transaction } from '../types';
import { 
  Trophy, 
  Clock, 
  Coins, 
  BrainCircuit, 
  BookOpen, 
  Sparkles, 
  Wallet,
  MessageSquare,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const TriviaHub: React.FC = () => {
  const { user, profile, isAdmin, accountTier } = useAuth();
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isUserCEO = isAdmin || user?.email?.toLowerCase() === 'winbigonly@gmail.com' || (user as any)?.role === 'admin';
  const isUserTutor = accountTier === 'author' || profile?.account_tier === 'author' || (user as any)?.role === 'tutor';

  // Construct currentUser from CalmReader AuthContext
  const [currentUser, setCurrentUser] = useState<User>(() => ({
    id: user?.id || 'guest_reader_' + Math.random().toString(36).substring(2, 8),
    username: profile?.display_name || profile?.full_name || (user?.email ? user.email.split('@')[0] : 'CalmReader'),
    email: user?.email || 'reader@calmreader.com',
    avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id || 'calm_quiz'}`,
    referralCode: profile?.referral_code || 'CALM_QUIZ',
    balance: profile?.t_points !== undefined ? profile.t_points : 500,
    challengeEarnings: 0,
    referralEarnings: 0,
    totalEarnings: profile?.total_earnings || 0,
    membershipStatus: (accountTier === 'premium' || profile?.account_tier === 'premium') ? 'premium' : 'basic',
    role: isUserCEO ? 'ceo' : isUserTutor ? 'tutor' : 'free'
  }));

  // Update currentUser when auth profile updates
  React.useEffect(() => {
    if (user) {
      setCurrentUser(prev => ({
        ...prev,
        id: user.id,
        username: profile?.display_name || profile?.full_name || user.email?.split('@')[0] || prev.username,
        email: user.email || prev.email,
        avatar: profile?.avatar_url || prev.avatar,
        balance: profile?.t_points !== undefined ? profile.t_points : prev.balance,
        role: (isAdmin || user.email?.toLowerCase() === 'winbigonly@gmail.com') ? 'ceo' : (accountTier === 'author' ? 'tutor' : prev.role)
      }));
    }
  }, [user, profile, isAdmin, accountTier]);

  const handleAddTransaction = (tx: Transaction) => {
    showToast(`Transaction: ${tx.description} (${tx.amount > 0 ? '+' : ''}${tx.amount})`, 'success');
  };

  return (
    <DashboardLayout>
      <div className="page-container space-y-6 pb-20 max-w-7xl mx-auto min-w-0 overflow-x-hidden px-4 sm:px-6">
        
        {/* Toast alert */}
        {toastMessage && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl text-white text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300 ${
            toastMessage.type === 'error' ? 'bg-red-600' : toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-slate-900'
          }`}>
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{toastMessage.msg}</span>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border border-amber-400/30">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Live Quiz Chat Experience
                </span>
                {isUserCEO && (
                  <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-black uppercase tracking-wider flex items-center gap-1 border border-red-500/30">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin Control Enabled
                  </span>
                )}
              </div>
              
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-amber-400" />
                Interactive Quiz Chat Hall
              </h1>
              
              <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
                Connect in real time with fellow readers, solve instant timer questions, buzz in correct answers, and accumulate T-Points & rewards.
              </p>
            </div>

            {/* User Stats Quick Panel */}
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 shrink-0">
              <div className="flex items-center gap-3">
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.username} 
                  className="w-12 h-12 rounded-full border-2 border-amber-400 bg-slate-800"
                />
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Logged In As</div>
                  <div className="text-base font-black text-white flex items-center gap-1.5">
                    {currentUser.username}
                    {isUserCEO && <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black">ADMIN</span>}
                  </div>
                  <div className="text-xs text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                    <Coins className="w-3.5 h-3.5" />
                    <span>{currentUser.balance} T-Points</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Embedded Interactive Quiz Chat Hall Component */}
        <div className="bg-white dark:bg-[#0c0c14] rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-lg overflow-hidden">
          <InteractiveChatQuizHall 
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            onToast={showToast}
            onAddTransaction={handleAddTransaction}
          />
        </div>

      </div>
    </DashboardLayout>
  );
};

export default TriviaHub;
