import React, { useState } from 'react';
import { Eye, EyeOff, PlusCircle, ArrowUpRight, Send, UserPlus, Milestone, TrendingUp, Sparkles } from 'lucide-react';
import { User } from '../types';

interface WalletCardProps {
  user: User;
  onDeposit: () => void;
  onWithdraw: () => void;
  onTransfer: () => void;
  onRefer: () => void;
}

export default function WalletCard({ user, onDeposit, onWithdraw, onTransfer, onRefer }: WalletCardProps) {
  const [showBalance, setShowBalance] = useState(true);

  return (
    <div id="opay-wallet-card" className="wallet-card-container hover-lift select-none">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="opay-pill font-mono tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-white fill-white" />
            QUIZOE TRUST®
          </div>
          <span className="text-slate-400 text-xs font-mono">OPay Partner</span>
        </div>
        <div className="brand-chip flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-blue-500 mr-[-4px] opacity-90"></div>
          <div className="w-4 h-4 rounded-full bg-purple-500 opacity-90"></div>
        </div>
      </div>

      {/* Primary Balance Section */}
      <div className="mb-6 relative">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
          <span>Available Wallet Balance</span>
          <button 
            type="button"
            onClick={() => setShowBalance(!showBalance)}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5 focus:outline-none"
          >
            {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold tracking-tight font-sans">
            {showBalance ? `₦${user.balance.toFixed(2)}` : '••••••'}
          </span>
          <span className="text-slate-400 text-xs font-mono ml-1">NGN</span>
        </div>
      </div>
 
      {/* Sub Earnings Breakdown in Bento Block */}
      <div className="grid grid-cols-3 gap-2 bg-white/5 border border-white/10 rounded-2xl p-3 mb-6 backdrop-blur-md">
        <div className="text-center border-r border-white/10 pr-2">
          <p className="text-[10px] text-slate-400 font-medium uppercase">Challenges</p>
          <p className="text-sm font-bold text-green-400 mt-0.5">
            {showBalance ? `₦${user.challengeEarnings.toFixed(2)}` : '•••'}
          </p>
        </div>
        <div className="text-center border-r border-white/10 px-2">
          <p className="text-[10px] text-slate-400 font-medium uppercase">Referrals</p>
          <p className="text-sm font-bold text-amber-400 mt-0.5">
            {showBalance ? `₦${user.referralEarnings.toFixed(2)}` : '•••'}
          </p>
        </div>
        <div className="text-center pl-2">
          <p className="text-[10px] text-slate-400 font-medium uppercase">Total Income</p>
          <p className="text-sm font-bold text-blue-400 mt-0.5">
            {showBalance ? `₦${user.totalEarnings.toFixed(2)}` : '•••'}
          </p>
        </div>
      </div>

      {/* Quick Fintech Actions in Glass Core */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={onDeposit}
          className="fin-btn cursor-pointer font-sans focus:outline-none"
        >
          <PlusCircle className="w-5 h-5 text-green-400" />
          <span className="text-[11px] font-semibold text-slate-200">Deposit</span>
        </button>

        <button
          onClick={onWithdraw}
          className="fin-btn cursor-pointer font-sans focus:outline-none"
        >
          <ArrowUpRight className="w-5 h-5 text-red-400" />
          <span className="text-[11px] font-semibold text-slate-200">Withdraw</span>
        </button>

        <button
          onClick={onTransfer}
          className="fin-btn cursor-pointer font-sans focus:outline-none"
        >
          <Send className="w-5 h-5 text-blue-400" />
          <span className="text-[11px] font-semibold text-slate-200">Transfer</span>
        </button>

        <button
          onClick={onRefer}
          className="fin-btn cursor-pointer font-sans focus:outline-none"
        >
          <UserPlus className="w-5 h-5 text-amber-400" />
          <span className="text-[11px] font-semibold text-slate-200">Refer</span>
        </button>
      </div>
    </div>
  );
}
