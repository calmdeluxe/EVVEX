import React, { useState } from 'react';
import { Eye, EyeOff, Search, Calendar, CreditCard, Landmark, DollarSign, Wallet2, Sparkles, TrendingUp, Plus, ArrowUpRight, Send, UserPlus } from 'lucide-react';
import { User, Transaction } from '../types';

interface WalletPageProps {
  user: User;
  transactions: Transaction[];
  onOpenModal: (type: 'deposit' | 'withdraw' | 'transfer' | 'refer') => void;
}

export default function WalletPage({ user, transactions, onOpenModal }: WalletPageProps) {
  const [showWalletBalance, setShowWalletBalance] = useState(true);
  const [searchWord, setSearchWord] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'reward' | 'transfer'>('all');

  // Compute stat metrics dynamically from real ledger
  const depositsTotal = transactions.filter(t => t.type === 'deposit' && t.status === 'success').reduce((acc, c) => acc + c.amount, 0);
  const withdrawalsTotal = transactions.filter(t => t.type === 'withdrawal' && t.status === 'success').reduce((acc, c) => acc + c.amount, 0);
  const rewardsTotal = transactions.filter(t => (t.type === 'reward' || t.type === 'entry_fee') && t.status === 'success').reduce((acc, c) => acc + (c.type === 'reward' ? c.amount : -c.amount), 0);

  // Filters transactions
  const filteredLedger = transactions.filter((tx) => {
    const matchesSearch = tx.description.toLowerCase().includes(searchWord.toLowerCase()) || 
                          tx.reference.toLowerCase().includes(searchWord.toLowerCase());
    
    if (!matchesSearch) return false;
    if (activeFilter !== 'all' && tx.type !== activeFilter) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto text-left select-none">
      
      {/* HEADER SECTION - BANNER FINTECH CARD LOOK */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 md:p-8 shadow-premium mb-8 relative overflow-hidden">
        
        {/* Blurry glows */}
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[240px] h-[240px] bg-indigo-500/10 blur-[130px]" />
        <div className="absolute -bottom-10 right-10 w-[200px] h-[200px] bg-emerald-500/10 blur-[100px]" />

        {/* Content detail overlay */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          <div className="lg:col-span-7 flex flex-col items-start">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-500 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md tracking-wider">
                DEPOSIT ACCOUNT SECURE
              </span>
              <span className="text-slate-400 font-mono text-[11px] font-semibold">User Ident: #{user.id}</span>
            </div>

            <div className="flex items-center gap-3">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Available Liquid Balance</p>
              <button 
                type="button"
                onClick={() => setShowWalletBalance(!showWalletBalance)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5 focus:outline-none"
              >
                {showWalletBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-4xl lg:text-5xl font-black font-sans tracking-tight mt-1 mb-6">
              {showWalletBalance ? `₦${user.balance.toFixed(2)}` : '••••••'}
              <span className="text-xs font-mono font-medium text-slate-400 ml-2">NGN NAIRA</span>
            </p>

            {/* Sub-breakdowns bento */}
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="px-4 py-2 hover:bg-white/10 rounded-xl bg-white/5 border border-white/5 flex flex-col">
                <span className="text-slate-400 font-medium text-[10px] uppercase">CREATOR ENGAGEMENTS</span>
                <span className="font-extrabold text-blue-400 mt-0.5">
                  {showWalletBalance ? `₦${user.challengeEarnings.toFixed(2)}` : '•••'}
                </span>
              </div>
              <div className="px-4 py-2 hover:bg-white/10 rounded-xl bg-white/5 border border-white/5 flex flex-col">
                <span className="text-slate-400 font-medium text-[10px] uppercase">REFERRAL CASHBACK</span>
                <span className="font-extrabold text-yellow-400 mt-0.5">
                  {showWalletBalance ? `₦${user.referralEarnings.toFixed(2)}` : '•••'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick core triggers on fintech */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3 w-full shrink-0">
            <button
              onClick={() => onOpenModal('deposit')}
              className="bg-emerald-600 hover:bg-emerald-500 font-bold text-center text-sm p-4 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-white cursor-pointer shadow-md shadow-emerald-900/30"
            >
              <Plus className="w-5 h-5" />
              <span>Make Deposit</span>
            </button>
            <button
              onClick={() => onOpenModal('withdraw')}
              className="bg-white/10 hover:bg-white/15 border border-white/10 font-bold text-center text-sm p-4 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-slate-100 cursor-pointer"
            >
              <ArrowUpRight className="w-5 h-5 text-red-400" />
              <span>Withdraw Bank</span>
            </button>
            <button
              onClick={() => onOpenModal('transfer')}
              className="bg-white/10 hover:bg-white/15 border border-white/10 font-bold text-center text-sm p-4 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-slate-100 cursor-pointer"
            >
              <Send className="w-5 h-5 text-blue-400" />
              <span>P2P Transfer</span>
            </button>
            <button
              onClick={() => onOpenModal('refer')}
              className="bg-white/10 hover:bg-white/15 border border-white/10 font-bold text-center text-sm p-4 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-slate-100 cursor-pointer"
            >
              <UserPlus className="w-5 h-5 text-amber-400" />
              <span>Refer Peer</span>
            </button>
          </div>

        </div>

      </div>

      {/* CORE STATISTICAL BENTO TILES */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-100">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Total Deposits</span>
            <Wallet2 className="w-4.5 h-4.5 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-800 font-mono">₦{depositsTotal.toFixed(2)}</p>
          <div className="text-[10px] text-green-600 font-bold mt-1.5">Successful Payouts</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Total Withdrawals</span>
            <ArrowUpRight className="w-4.5 h-4.5 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-800 font-mono">₦{withdrawalsTotal.toFixed(2)}</p>
          <div className="text-[10px] text-red-500 font-bold mt-1.5">Processed 30s Settlements</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Net Game Revenue</span>
            <TrendingUp className="w-4.5 h-4.5 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-800 font-mono">₦{rewardsTotal.toFixed(2)}</p>
          <div className="text-[10px] text-blue-600 font-bold mt-1.5">Quiz Prize Multipliers</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Invited Peer Count</span>
            <UserPlus className="w-4.5 h-4.5 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-800 font-mono">{user.referredBy ? 1 : 0}</p>
          <div className="text-[10px] text-amber-600 font-bold mt-1.5">Active Network Bonus</div>
        </div>

      </section>

      {/* TRANSACTION HISTORICAL DETAIL LIST */}
      <section className="bg-white p-6 rounded-3xl border border-slate-100 text-left">
        
        {/* ledger header filter tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
          
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Financial Transaction Ledger</h3>
            <p className="text-xs text-slate-500 font-medium">Verify or search deposit settlements, peer transfers, and challenge bounty rewards.</p>
          </div>

          {/* Filtering buttons */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            {(['all', 'deposit', 'withdrawal', 'reward', 'transfer'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setActiveFilter(mode)}
                className={`px-3 py-1.5 rounded-xl text-[10px] capitalize font-extrabold tracking-wider transition-colors cursor-pointer ${
                  activeFilter === mode
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

        </div>

        {/* Searching bar */}
        <div className="dashboard-search-bar flex items-center pl-3.5 pr-2 py-2 mb-6 max-w-sm">
          <Search className="w-4.5 h-4.5 text-slate-400 shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Search details or reference logs..."
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none w-full"
          />
        </div>

        {/* Ledger Entries */}
        {filteredLedger.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-medium flex flex-col items-center justify-center">
            <Search className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5px]" />
            <p className="text-sm">No transaction matches discovered.</p>
            <p className="text-[11px] text-slate-400 mt-1">Refine your query spelling keywords matching reference IDs.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {filteredLedger.map((tx) => (
              <div key={tx.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100/50 transition-colors gap-3">
                
                {/* Visual icons */}
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    tx.type === 'reward' ? 'tx-icon-reward' : 
                    tx.type === 'deposit' ? 'tx-icon-deposit' : 
                    tx.type === 'withdrawal' ? 'tx-icon-withdrawal' : 'tx-icon-transfer'
                  }`}>
                    <ArrowUpRight className={`w-5.5 h-5.5 ${tx.type === 'withdrawal' || tx.type === 'transfer' ? 'rotate-90' : ''}`} />
                  </div>
                  <div className="text-left">
                    <p className="font-extrabold text-slate-800 text-sm leading-tight mb-1">{tx.description}</p>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 font-mono font-medium">
                      <span>Ref: {tx.reference}</span>
                      <span>•</span>
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(tx.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Amount and Status controls */}
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider ${
                    tx.status === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
                    tx.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {tx.status}
                  </span>
                  
                  <span className={`font-black font-mono text-base ${
                    tx.type === 'withdrawal' || tx.type === 'entry_fee' || tx.type === 'transfer' 
                      ? 'text-red-500' 
                      : 'text-green-500'
                  }`}>
                    {tx.type === 'withdrawal' || tx.type === 'entry_fee' || tx.type === 'transfer' ? '-' : '+'}
                    ₦{tx.amount.toFixed(2)}
                  </span>
                </div>

              </div>
            ))}
          </div>
        )}

      </section>

    </div>
  );
}
