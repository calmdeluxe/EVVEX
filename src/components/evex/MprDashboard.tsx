import React, { useState } from 'react';
import { 
  Megaphone, DollarSign, Users, Link2, Copy, CheckCircle2, 
  Sparkles, ArrowRight, Share2, Download, TrendingUp, Calendar
} from 'lucide-react';
import { MprCampaign, MprReferral, User } from '../../types';

interface MprDashboardProps {
  currentUser: User;
  campaigns: MprCampaign[];
  referrals: MprReferral[];
  onWithdrawEarnings?: (amountKobo: number) => void;
}

export const MprDashboard: React.FC<MprDashboardProps> = ({
  currentUser,
  campaigns,
  referrals
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'campaigns' | 'referrals' | 'earnings'>('home');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const mprCode = currentUser.referralCode || 'EVEX_VIP99';

  // Stats calculation
  const totalCommissionKobo = referrals.reduce((acc, r) => acc + r.commission_earned_kobo, 0);
  const confirmedCommissionKobo = referrals
    .filter(r => r.status === 'confirmed' || r.status === 'disbursed')
    .reduce((acc, r) => acc + r.commission_earned_kobo, 0);
  const pendingCommissionKobo = referrals
    .filter(r => r.status === 'pending')
    .reduce((acc, r) => acc + r.commission_earned_kobo, 0);

  const handleCopyLink = (eventId: string) => {
    const link = `https://evex.ng/events/${eventId}?mpr=${mprCode}`;
    navigator.clipboard?.writeText(link);
    setCopiedCode(eventId);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* Top Banner */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 pt-6 pb-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
                <Megaphone className="w-3.5 h-3.5 text-purple-400" />
                <span>LAYER 5 • MPR (MARKETING PARTNER) DASHBOARD</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Promoter & Influencer Partner Hub
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Earn verified ticket commissions by promoting Nigeria's top concerts, festivals, and business mixers.
              </p>
            </div>

            {/* MPR Partner Code Pill */}
            <div className="bg-slate-950 px-4 py-2 rounded-2xl border border-purple-500/30 flex items-center gap-3 self-start sm:self-auto">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Your Partner Code</span>
                <span className="text-sm font-mono font-black text-purple-400">{mprCode}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(mprCode);
                  setCopiedCode('code');
                  setTimeout(() => setCopiedCode(null), 2000);
                }}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                {copiedCode === 'code' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-6 pb-1 scrollbar-none border-t border-slate-800/80 mt-6">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'home' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              MPR Overview
            </button>

            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'campaigns' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5 text-purple-400" />
              Promote Events ({campaigns.length})
            </button>

            <button
              onClick={() => setActiveTab('referrals')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'referrals' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              Referred Sales ({referrals.length})
            </button>

            <button
              onClick={() => setActiveTab('earnings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'earnings' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Commission Earnings
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* TAB 1: MPR OVERVIEW */}
        {activeTab === 'home' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Total Commission Earned</span>
                <p className="text-2xl font-black font-mono text-emerald-400">
                  ₦{(totalCommissionKobo / 100).toLocaleString('en-NG')}
                </p>
                <span className="text-[10px] text-slate-400">{referrals.length} referred purchases</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Confirmed & Cleared</span>
                <p className="text-2xl font-black font-mono text-white">
                  ₦{(confirmedCommissionKobo / 100).toLocaleString('en-NG')}
                </p>
                <span className="text-[10px] text-emerald-400">Ready for bank transfer</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Pending Approval</span>
                <p className="text-2xl font-black font-mono text-amber-400">
                  ₦{(pendingCommissionKobo / 100).toLocaleString('en-NG')}
                </p>
                <span className="text-[10px] text-slate-400">Clears 24hrs post-event</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Active Campaigns</span>
                <p className="text-2xl font-black text-purple-400">{campaigns.length}</p>
                <span className="text-[10px] text-slate-400">Promotions running</span>
              </div>
            </div>

            {/* Quick Promotion Spotlights */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h3 className="text-base font-bold text-white mb-4">Top Paying Campaigns to Promote</h3>
              <div className="space-y-3">
                {campaigns.map(camp => (
                  <div key={camp.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img src={camp.event_cover} alt={camp.event_title} className="w-14 h-14 rounded-xl object-cover" />
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                          Earn {camp.commission_percentage}% per ticket sold
                        </span>
                        <h4 className="text-sm font-bold text-white">{camp.event_title}</h4>
                        <p className="text-xs text-slate-400">{camp.event_date} • {camp.event_city}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopyLink(camp.event_id)}
                      className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow flex items-center gap-2 self-start sm:self-auto"
                    >
                      {copiedCode === camp.event_id ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          Link Copied!
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4" />
                          Get Promo Link
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROMOTE EVENTS */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Event Promotion Toolkits</h2>
            <p className="text-xs text-slate-400 -mt-4">
              Copy pre-written social media copy, flyers, and your tracked referral link for each event.
            </p>

            <div className="space-y-6">
              {campaigns.map(camp => (
                <div key={camp.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <img src={camp.event_cover} alt={camp.event_title} className="w-16 h-16 rounded-xl object-cover" />
                      <div>
                        <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block">
                          {camp.commission_percentage}% Commission Rate
                        </span>
                        <h3 className="text-base font-bold text-white">{camp.event_title}</h3>
                        <p className="text-xs text-slate-400">{camp.event_date} • {camp.event_city}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyLink(camp.event_id)}
                        className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow flex items-center gap-1.5"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        {copiedCode === camp.event_id ? 'Copied ✓' : 'Copy Tracked Link'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-300 mb-1">Pre-Written Promo Copy:</h4>
                    <p className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      "{camp.marketing_copy}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: REFERRED SALES TABLE */}
        {activeTab === 'referrals' && (
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">Referred Ticket Sales</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-semibold">Buyer Name</th>
                    <th className="pb-3 font-semibold">Event Title</th>
                    <th className="pb-3 font-semibold">Tier</th>
                    <th className="pb-3 font-semibold">Ticket Sale</th>
                    <th className="pb-3 font-semibold">Commission</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {referrals.map(ref => (
                    <tr key={ref.id} className="py-2.5">
                      <td className="py-2.5 font-bold text-white">{ref.buyer_name}</td>
                      <td className="py-2.5 text-slate-300">{ref.event_title}</td>
                      <td className="py-2.5 text-amber-400">{ref.tier_name} ({ref.ticket_count})</td>
                      <td className="py-2.5 font-mono text-slate-300">
                        ₦{(ref.gross_sale_kobo / 100).toLocaleString('en-NG')}
                      </td>
                      <td className="py-2.5 font-mono font-bold text-emerald-400">
                        ₦{(ref.commission_earned_kobo / 100).toLocaleString('en-NG')}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ref.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {ref.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: COMMISSION EARNINGS & WITHDRAWAL */}
        {activeTab === 'earnings' && (
          <div className="max-w-2xl mx-auto bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
            <h2 className="text-xl font-bold text-white">MPR Commission Payout</h2>
            <p className="text-xs text-slate-400">
              Withdraw cleared referral commissions directly into your commercial bank account.
            </p>

            <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Cleared Balance Available</span>
                <p className="text-2xl font-black font-mono text-emerald-400 mt-1">
                  ₦{(confirmedCommissionKobo / 100).toLocaleString('en-NG')}
                </p>
              </div>

              <button
                onClick={() => alert(`Commission withdrawal of ₦${(confirmedCommissionKobo / 100).toLocaleString('en-NG')} sent to your bank account!`)}
                disabled={confirmedCommissionKobo <= 0}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs shadow"
              >
                Withdraw to Bank
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
