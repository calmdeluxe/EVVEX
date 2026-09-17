import React, { useState } from 'react';
import { User, Copy, Check, Shield, Medal, Award, LogOut, Settings, HelpCircle, Key, KeyRound, Sparkles, CheckSquare } from 'lucide-react';
import { User as UserType } from '../types';

interface ProfilePageProps {
  user: UserType;
  onUpgradeToPremium: () => void;
  onToast: (msg: string, type: 'success') => void;
  onLogout: () => void;
  onAvatarChange: (url: string) => void;
}

export default function ProfilePage({ user, onUpgradeToPremium, onToast, onLogout, onAvatarChange }: ProfilePageProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    onToast("Referral code copied successfully!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const dummyAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=150'
  ];

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto text-left select-none pb-24 md:pb-12">
      
      {/* HEADER SECTION */}
      <div className="mb-8 pb-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-950 flex items-center gap-2 tracking-tight animate-fade-in">
            My Portfolio
            <Sparkles className="w-5 h-5 text-blue-600 fill-blue-500" />
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Review your cashing statistics, customize public details, and configure safety thresholds.</p>
        </div>
      </div>

      {/* CORE AVATAR INFORMATION BOARD */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 mb-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left shadow-sm">
        <div className="relative shrink-0">
          <img 
            src={user.avatar} 
            alt={user.username} 
            className="w-24 h-24 rounded-[32px] object-cover ring-4 ring-blue-50"
          />
          <span className="absolute bottom-1 right-1 bg-blue-600 text-white rounded-full p-1.5 border-4 border-white shadow-md">
            <Shield className="w-4 h-4 fill-white/10" />
          </span>
        </div>

        <div className="flex-1 w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3 mb-3 shrink-0">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 leading-none">@{user.username}</h2>
              <p className="text-xs text-slate-400 font-mono mt-1">Wallet Account Identification: ID #{user.id}</p>
            </div>

            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${
              user.membershipStatus === 'premium'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 border border-yellow-300 font-extrabold shadow-sm'
                : 'bg-slate-100 text-slate-500'
            }`}>
              👑 {user.membershipStatus} client
            </span>
          </div>

          {/* Avatar customized options toggle */}
          <div className="flex flex-col gap-2 border-t border-slate-50 pt-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Change Avatar Avatar:</span>
            <div className="flex gap-2 justify-center sm:justify-start">
              {dummyAvatars.map((avUrl, i) => (
                <button
                  key={i}
                  onClick={() => onAvatarChange(avUrl)}
                  className={`w-8 h-8 rounded-full border-2 overflow-hidden cursor-pointer transition-transform ${
                    user.avatar === avUrl ? 'border-blue-600 scale-110' : 'border-transparent'
                  }`}
                >
                  <img src={avUrl} className="w-full h-full object-cover" alt="Avatar option" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* REFERRAL REWARDS CODE SHARING TOOL */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-3xl border border-indigo-100 flex flex-col sm:flex-row items-center justify-between sm:gap-6 gap-4 mb-8 text-center sm:text-left select-none">
        <div>
          <h4 className="font-extrabold text-indigo-950 text-md leading-snug">Invite Friends, Pocket $25 Credits!</h4>
          <p className="text-xs text-indigo-600 font-semibold mt-1">Get rewarded with liquid dollar balances as soon as your referral competes once!</p>
        </div>

        {/* Copy trigger box */}
        <div className="flex items-center gap-2 bg-white border border-indigo-200/50 p-2 rounded-2xl shrink-0 w-full sm:w-auto justify-between">
          <span className="text-xs font-black font-mono px-3 text-indigo-950 tracking-wider uppercase select-all">
            {user.referralCode}
          </span>
          <button
            onClick={handleCopyCode}
            aria-label="Copy code button"
            className="p-2.5 bg-indigo-600 hover:bg-slate-900 transition-colors text-white rounded-xl cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* PREMIUM MEMBER BENEFITS PROMO BLOCK */}
      {user.membershipStatus === 'basic' && (
        <div className="bg-gradient-to-br from-indigo-950 to-slate-950 text-white p-6 rounded-3xl border border-yellow-500/20 mb-8 text-left relative overflow-hidden shadow-premium">
          <div className="absolute top-0 right-0 w-[180px] h-[180px] bg-yellow-500/10 blur-[80px]" />
          
          <div className="relative z-10">
            <h4 className="text-lg font-black text-slate-100 flex items-center gap-2">
              Upgrade to Premium Hub Level
              <Sparkles className="w-4.5 h-4.5 text-yellow-400 fill-yellow-400 animate-pulse" />
            </h4>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-sm mt-1.5 mb-5">
              Premium members claim a golden platform profile, 0% deposit transaction charges, and triple rewards multipliers in all quizzes.
            </p>

            <button
              onClick={onUpgradeToPremium}
              className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs py-3 px-6 rounded-xl cursor-pointer shadow-md shadow-yellow-950/20 transform active:scale-95 transition-all text-center"
            >
              Unlock Prime Center ($9.99 One-Off)
            </button>
          </div>
        </div>
      )}

      {/* PORTFOLIO CLASSIFIED ACHIEVEMENT STATISTICS */}
      <h3 className="text-md font-extrabold text-slate-400 uppercase tracking-widest text-left mb-4 px-2">PORTFOLIO LANDMARKS</h3>
      <div className="grid grid-cols-3 gap-4 mb-8">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-100 text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Medal className="w-5.5 h-5.5" />
          </div>
          <p className="text-2xl font-black text-slate-800 font-mono">18</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 leading-snug">Quizzes Completed</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Award className="w-5.5 h-5.5" />
          </div>
          <p className="text-2xl font-black text-slate-800 font-mono">24</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 leading-snug">Challenges Voted</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Sparkles className="w-5.5 h-5.5" />
          </div>
          <p className="text-2xl font-black text-emerald-600 font-mono">${user.challengeEarnings.toFixed(0)}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 leading-snug">Bounty Funds Earned</p>
        </div>

      </div>

      {/* GENERAL CONFIGS SECTION */}
      <h3 className="text-md font-extrabold text-slate-400 uppercase tracking-widest text-left mb-4 px-2">ACCOUNT PREFERENCES</h3>
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden select-none">
        {[
          { label: 'Security & Two-Factor (2FA)', icon: KeyRound, desc: 'Setup extra passcode patterns for bank withdrawals.' },
          { label: 'Notification Settings', icon: Award, desc: 'Configure instant desktop mobile telemetry updates.' },
          { label: 'Help Desk / Support', icon: HelpCircle, desc: 'Contact payment gateway agents about processed deposits.' }
        ].map((pref, i) => {
          const Icon = pref.icon;
          return (
            <div key={i} className="flex gap-4 items-center p-4.5 hover:bg-slate-50 transition-colors border-b border-slate-100/50 last:border-0 cursor-default">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-bold text-slate-800 text-sm leading-tight">{pref.label}</p>
                <p className="text-slate-400 text-xs mt-0.5 font-medium">{pref.desc}</p>
              </div>
              <button className="text-xs font-bold text-slate-400 hover:text-blue-600 cursor-pointer">Configure</button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
