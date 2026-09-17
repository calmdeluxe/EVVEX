import React, { useState } from 'react';
import { 
  Zap, Trophy, ShieldAlert, Sparkles, HelpCircle, BookOpen, 
  ArrowUpRight, Wallet, CheckCircle2, Lock, ArrowRight, Gift, Compass
} from 'lucide-react';
import { User, Challenge } from '../../types';

interface FreeDashboardProps {
  currentUser: User;
  onUpgradeToPremium: (cost: number, finalRole: 'premium' | 'tutor') => void;
  onOpenModal: (type: 'deposit' | 'withdraw' | 'transfer' | 'refer') => void;
  onToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function FreeDashboard({
  currentUser,
  onUpgradeToPremium,
  onOpenModal,
  onToast
}: FreeDashboardProps) {
  const [activePlanSelection, setActivePlanSelection] = useState<'premium' | 'tutor'>('premium');
  const [claimTokenValue, setClaimTokenValue] = useState('');

  const handleRedeemToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimTokenValue.trim()) return;

    const savedTokensStr = localStorage.getItem('quizoe_promo_tokens');
    if (!savedTokensStr) {
      onToast('Invalid Promo Code: Token does not exist or has expired.', 'error');
      return;
    }

    try {
      const tokensList: any[] = JSON.parse(savedTokensStr);
      const matchIndex = tokensList.findIndex(t => t.token.trim().toUpperCase() === claimTokenValue.trim().toUpperCase());

      if (matchIndex === -1) {
        onToast('Invalid Promo Code: Token not found in active registries.', 'error');
        return;
      }

      const matchedToken = tokensList[matchIndex];

      if (matchedToken.isUsed) {
        onToast('Invalid Promo Code: This token has already been claimed by another user.', 'error');
        return;
      }

      const isTokenExpired = new Date(matchedToken.expiresAt).getTime() < Date.now();
      if (isTokenExpired) {
        onToast('Expired Promo Code: This token validity phase has already elapsed.', 'error');
        return;
      }

      // Valid and unused! Redeem it.
      // Update token list status
      tokensList[matchIndex] = {
        ...matchedToken,
        isUsed: true,
        usedBy: currentUser.username
      };
      localStorage.setItem('quizoe_promo_tokens', JSON.stringify(tokensList));

      // Calculate promotional expirations
      const exStr = new Date(Date.now() + matchedToken.durationDays * 24 * 60 * 60 * 1000).toISOString();
      
      // Update locally immediately
      currentUser.role = matchedToken.targetRole;
      currentUser.promotionExpiresAt = exStr;
      currentUser.originalRole = 'free';

      // Bubble status update to parent state with 0 cost!
      onUpgradeToPremium(0, matchedToken.targetRole);

      setClaimTokenValue('');
      onToast(`Hooray! Gift Token successfully redeemed. You now have temporary access to the ${matchedToken.targetRole.toUpperCase()} License for ${matchedToken.durationDays} days!`, 'success');

    } catch (err) {
      console.error(err);
      onToast('Redemption failed due to structured parse mismatch.', 'error');
    }
  };

  const handleUpgradeCycle = (tier: 'premium' | 'tutor') => {
    const cost = tier === 'premium' ? 2000 : 10000;
    if (currentUser.balance < cost) {
      onToast(`Insufficient Balance: Upgrading to ${tier.toUpperCase()} costs ₦${cost.toLocaleString()}. Please fund your OPay/PalmPay balance first.`, 'error');
      return;
    }
    // Perform standard administrative deduction and award role
    onUpgradeToPremium(cost, tier);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in text-left">
      
      {/* PERSISTENT PROMOTIONAL NOTIFICATION BANNER */}
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 blur-3xl rounded-full" />
        
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500/20 mt-1">
            <Zap className="w-6 h-6 fill-amber-500 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Limited Basic Plan Notification
              <span className="text-[10px] bg-red-150 text-red-700 py-0.5 px-2 rounded-full font-bold">Free Basic Status</span>
            </h2>
            <p className="text-xs text-slate-600 font-semibold mt-1 max-w-2xl leading-relaxed">
              Your account is currently under the Free tier. Free members can browse and purchase digital companion eBooks, but are strictly prohibited from participating in chat room quizzes and team activities. Upgrade below to activate full capabilities.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const el = document.getElementById('upgrade_hub_console');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="relative z-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs py-3 px-5 rounded-xl transition-all shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
        >
          <span>Upgrade Options</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* CORE INFO & UPGRADE OPTIONS SECTION */}
      <div id="upgrade_hub_console" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: THE UPGRADE CONSOLE */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-50 mb-6">
              <Sparkles className="w-5 h-5 text-indigo-655" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Quizoe Sovereign Upgrades Hub</h3>
                <p className="text-xs text-slate-500 font-medium font-sans">Compare account tiers and unlock professional monetization tools instantly.</p>
              </div>
            </div>

            {/* SELECTION TABS */}
            <div className="grid grid-cols-2 bg-slate-100 p-1.5 rounded-2xl gap-2 mb-6 select-none border border-slate-200">
              <button
                onClick={() => setActivePlanSelection('premium')}
                className={`py-2 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activePlanSelection === 'premium' 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-100' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Gift className="w-4 h-4 text-amber-500" />
                <span>Premium Charter (₦2,000)</span>
              </button>
              <button
                onClick={() => setActivePlanSelection('tutor')}
                className={`py-2 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activePlanSelection === 'tutor' 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-100' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Trophy className="w-4 h-4 text-blue-600" />
                <span>Tutor Mini-Office (₦10,000)</span>
              </button>
            </div>

            {/* UPGRADE DETAILS DISPLAY */}
            {activePlanSelection === 'premium' ? (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border border-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 py-0.5 px-2 rounded-md">Tier Upgrade</span>
                    <h4 className="text-lg font-black text-slate-900 mt-1.5 flex items-center gap-1.5">
                      Premium Account Member Status 
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">Elevate your client experience to have first-row competition rights.</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] text-slate-400 font-black uppercase">One-Time Fee</p>
                    <p className="text-xl font-black text-slate-900">₦2,000</p>
                  </div>
                </div>

                <div className="space-y-4 text-left">
                  <h4 className="text-xs font-black text-slate-505 uppercase tracking-wider">Features Included in Premium:</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="flex gap-2.5 items-start">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-slate-800">Quiz Chat Room Participation</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Join authorized quiz challenge chat rooms, answer live, and earn direct prizes.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-slate-800">Affiliate Link Sharing (15% Commission)</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Share affiliate links of any eBooks and get 15% sales commission credited to your wallet.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-slate-800">Direct Referrals (₦25 Bonus)</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Refer friends with your customized tracking link; win bonuses for every verified protocol checkout.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-slate-800">Full eBook Store Purchases</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Buy and read companion guides compiled live by certified tutors.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-sans font-bold flex items-center gap-1">
                    <Wallet className="w-4 h-4 text-slate-400" />
                    Current Wallet Balance: <strong className="text-slate-800">₦{currentUser.balance.toLocaleString()}</strong>
                  </span>
                  
                  <button
                    onClick={() => handleUpgradeCycle('premium')}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs py-3 px-6 rounded-xl transition-all cursor-pointer shadow-xs transform active:scale-95"
                  >
                    Activate Premium — ₦2,000
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600/5 to-indigo-600/5 border border-blue-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-100 py-0.5 px-2 rounded-md">Creator Mini-Office Upgrade</span>
                    <h4 className="text-lg font-black text-slate-900 mt-1.5 flex items-center gap-1.5">
                      Tutor Account Member Status 
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">Activate administrative office privileges and publish learning media.</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] text-slate-400 font-black uppercase">One-Time Fee</p>
                    <p className="text-xl font-black text-slate-900">₦10,000</p>
                  </div>
                </div>

                <div className="space-y-4 text-left">
                  <h4 className="text-xs font-black text-slate-505 uppercase tracking-wider">Features Included in Tutor:</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="flex gap-2.5 items-start">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-slate-800">Create Companion eBooks &amp; Guides</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Author, compile, and price custom guides. Receive up to 90% sales revenue distribution.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-slate-800">Draft Content Request Reviews</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Upload blogs, tutorials, and promotional videos to our global feeds. Evaluated and approved by Admin safely.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-slate-800">Quiz Room Creation &amp; Handling</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Draft quiz rooms, request approval from Admin, and coordinate quizzes. (Note: Subject to Admin moderation).</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-slate-800">Quiz Chat Room Entry Rights</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Gain administrative rights to engage with active users inside ongoing chat rooms.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-sans font-bold flex items-center gap-1">
                    <Wallet className="w-4 h-4 text-slate-400" />
                    Current Wallet Balance: <strong className="text-slate-800">₦{currentUser.balance.toLocaleString()}</strong>
                  </span>
                  
                  <button
                    onClick={() => handleUpgradeCycle('tutor')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-3 px-6 rounded-xl transition-all cursor-pointer shadow-xs transform active:scale-95 animate-pulse"
                  >
                    Activate Tutor Mini-Office — ₦10,000
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CHAT QUIZ LOBBY LOCK CARD */}
          <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-left">
            <div className="flex gap-3 items-start">
              <div className="p-2 border border-red-200 rounded-xl bg-red-100 text-red-700 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-red-900 uppercase tracking-wider">Quiz Chat Rooms Locked for Free Plan</h4>
                <p className="text-[11px] text-red-700 leading-normal font-semibold mt-1">
                  You cannot join or participate in active conversational quizzes under the basic tier. Only Premium and Tutor accounts have official rights to engage with real-time room chats and answer questions.
                </p>
                <div className="mt-3 flex gap-2">
                  <button 
                    onClick={() => setActivePlanSelection('premium')}
                    className="bg-red-750 text-white font-extrabold text-[10px] py-1.5 px-3.5 rounded-lg hover:bg-red-800 transition-colors cursor-pointer"
                  >
                    Upgrade Now
                  </button>
                  <button 
                    onClick={() => {
                      const el = document.getElementById('free_ebooks_section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-transparent text-red-700 hover:bg-red-100/50 font-extrabold text-[10px] py-1.5 px-3.5 rounded-lg transition-colors cursor-pointer border border-red-200"
                  >
                    View Ebooks marketplace
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: QUICK WALLET LEDGER ACCESS */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xs">
            <h3 className="text-xs font-black text-slate-900 border-b border-slate-50 pb-3 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-600" />
              Your basic ledger balance
            </h3>

            <div className="p-4 rounded-2xl bg-indigo-50/30 border border-slate-100 flex items-center justify-between text-left mb-6">
              <div>
                <span className="text-[10px] text-slate-400 font-black uppercase">OPay Credit Balance</span>
                <h4 className="text-xl font-black text-slate-900 mt-0.5">₦{currentUser.balance.toFixed(2)}</h4>
              </div>
              <span className="bg-emerald-50 text-emerald-700 font-bold text-[10px] py-0.5 px-2 rounded-md">
                Active Basic
              </span>
            </div>

            <div className="space-y-2 text-left">
              <button
                onClick={() => onOpenModal('deposit')}
                className="w-full py-2.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-black text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                <Wallet className="w-4 h-4 text-indigo-650" />
                <span>Simulate Paystack Deposit</span>
              </button>
              
              <div className="text-[9.5px] text-slate-400 text-center font-medium leading-normal mt-2">
                Need to fund your balance to test upgrades? Click Paystack Deposit above to add mock NGN funds instantly.
              </div>
            </div>
          </div>

          {/* REDEEM TOKEN CARD */}
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xs text-left">
            <h3 className="text-xs font-black text-slate-900 border-b border-slate-50 pb-3 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Gift className="w-4 h-4 text-indigo-600" />
              Claim Promo Gift Token
            </h3>

            <p className="text-[10.5px] text-slate-500 font-semibold mb-3 leading-relaxed">
              Have an alphanumeric promotional token generated by winbigonly / admin? Paste it below to activate your temporary membership license.
            </p>

            <form onSubmit={handleRedeemToken} className="space-y-2.5">
              <input
                type="text"
                required
                placeholder="PROMO-XXXXX-XXXX"
                value={claimTokenValue}
                onChange={(e) => setClaimTokenValue(e.target.value)}
                className="w-full bg-slate-50 border border-slate-250 font-mono text-center font-black rounded-lg py-2.5 px-3 uppercase tracking-wider text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-550"
              />
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 rounded-xl text-xs transition-colors cursor-pointer text-center"
              >
                Apply Token Key
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
