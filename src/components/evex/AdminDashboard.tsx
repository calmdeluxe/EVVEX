import React, { useState } from 'react';
import { 
  ShieldCheck, AlertCircle, CheckCircle2, XCircle, Users, 
  DollarSign, Ticket, Calendar, Search, Filter, Settings,
  Check, RefreshCw, BarChart3, Briefcase, Megaphone
} from 'lucide-react';
import { 
  EventItem, User, VendorProfile, PayoutRequest, AdminStats, AppRole 
} from '../../types';

interface AdminDashboardProps {
  currentUser: User;
  events: EventItem[];
  users: User[];
  vendors: VendorProfile[];
  payouts: PayoutRequest[];
  stats: AdminStats;
  onApproveEvent: (eventId: string) => void;
  onRejectEvent: (eventId: string, reason: string) => void;
  onApprovePayout: (payoutId: string) => void;
  onVerifyVendor: (vendorId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  events,
  users,
  vendors,
  payouts,
  stats,
  onApproveEvent,
  onRejectEvent,
  onApprovePayout,
  onVerifyVendor
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'users' | 'vendors' | 'payouts' | 'settings'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingEventId, setRejectingEventId] = useState<string | null>(null);

  const pendingEvents = events.filter(e => e.status === 'under_review');
  const pendingPayouts = payouts.filter(p => p.status === 'pending');

  const handleRejectConfirm = () => {
    if (rejectingEventId) {
      onRejectEvent(rejectingEventId, rejectReason || 'Incomplete venue documentation');
      setRejectingEventId(null);
      setRejectReason('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* Admin Security Banner */}
      <div className="bg-slate-900 border-b border-rose-950/80 px-4 sm:px-6 pt-6 pb-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-rose-400 mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>RESTRICTED PLATFORM CONSOLE • EVEX ADMIN</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Platform Operations & Governance
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Full oversight of event moderation, vendor verification, NUBAN payouts, and role permissions.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Admin: {currentUser.email}</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-6 pb-1 scrollbar-none border-t border-slate-800/80 mt-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'overview' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Platform Overview
            </button>

            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'events' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Event Moderation ({pendingEvents.length} Pending)
            </button>

            <button
              onClick={() => setActiveTab('payouts')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'payouts' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Payout Clearance ({pendingPayouts.length})
            </button>

            <button
              onClick={() => setActiveTab('vendors')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'vendors' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              Vendor Verification ({vendors.length})
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'users' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              User Directory
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Gross Platform GMV</span>
                <p className="text-2xl font-black font-mono text-emerald-400">
                  ₦{(stats.totalRevenue).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-slate-400">{stats.totalTransactionsNum} transactions</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Registered Users</span>
                <p className="text-2xl font-black text-white">{stats.totalUsers.toLocaleString()}</p>
                <span className="text-[10px] text-slate-400">{stats.activeUsers.toLocaleString()} active this month</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Total Platform Events</span>
                <p className="text-2xl font-black text-amber-400">{events.length}</p>
                <span className="text-[10px] text-amber-400">{pendingEvents.length} awaiting review</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Pending Bank Payouts</span>
                <p className="text-2xl font-black text-rose-400">{pendingPayouts.length}</p>
                <span className="text-[10px] text-slate-400">Requires NUBAN sign-off</span>
              </div>
            </div>

            {/* Quick Action Queue */}
            {pendingEvents.length > 0 && (
              <div className="bg-slate-900 p-6 rounded-2xl border border-amber-400/40">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    Events Pending Review & Approval
                  </h3>
                  <button onClick={() => setActiveTab('events')} className="text-xs font-semibold text-amber-400 hover:underline">
                    View full list
                  </button>
                </div>

                <div className="space-y-3">
                  {pendingEvents.map(ev => (
                    <div key={ev.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                          Category: {ev.category.replace('_', ' ')}
                        </span>
                        <h4 className="text-sm font-bold text-white">{ev.title}</h4>
                        <p className="text-xs text-slate-400">{ev.venue_name}, {ev.city} • By: {ev.organizer_name || 'Host'}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onApproveEvent(ev.id)}
                          className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve & Publish
                        </button>
                        <button
                          onClick={() => setRejectingEventId(ev.id)}
                          className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EVENT MODERATION */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Event Moderation & Quality Control</h2>
            <div className="space-y-4">
              {events.map(ev => (
                <div key={ev.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img src={ev.cover_image} alt={ev.title} className="w-16 h-16 rounded-xl object-cover" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{ev.title}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          ev.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {ev.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{ev.venue_name} • {ev.city}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {ev.status !== 'published' && (
                      <button
                        onClick={() => onApproveEvent(ev.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow"
                      >
                        Publish Live
                      </button>
                    )}
                    <button
                      onClick={() => alert(`Audit log inspected for event: ${ev.title}`)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                    >
                      Audit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Rejection Modal */}
            {rejectingEventId && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
                  <h3 className="text-base font-bold text-white">Specify Rejection Reason</h3>
                  <textarea
                    rows={3}
                    placeholder="e.g. Please provide valid local government council permit for outdoor music."
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setRejectingEventId(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRejectConfirm}
                      className="px-4 py-2 rounded-xl bg-red-500 text-xs font-bold text-white shadow"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PAYOUT CLEARANCE */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Bank Payout Clearance Queue</h2>
            <div className="space-y-4">
              {payouts.map(pay => (
                <div key={pay.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white">{pay.event_title}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        pay.status === 'disbursed' || pay.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {pay.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Host: {pay.host_name} • Bank: {pay.bank_name} ({pay.account_number}) • Name: {pay.account_name}
                    </p>
                    <p className="text-xs font-mono text-emerald-400 font-bold mt-1">
                      Net Payout: ₦{(pay.net_payout_kobo / 100).toLocaleString('en-NG')} (Fee: ₦{(pay.platform_fee_kobo / 100).toLocaleString('en-NG')})
                    </p>
                  </div>

                  {pay.status === 'pending' && (
                    <button
                      onClick={() => onApprovePayout(pay.id)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <Check className="w-4 h-4" /> Disburse via Paystack NUBAN
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: VENDOR VERIFICATION */}
        {activeTab === 'vendors' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Vendor Profiles & Trust Verification</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vendors.map(v => (
                <div key={v.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{v.business_name}</h4>
                      {v.is_verified && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 font-bold px-1.5 py-0.2 rounded">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{v.category} • {v.service_area}</p>
                  </div>

                  {!v.is_verified && (
                    <button
                      onClick={() => onVerifyVendor(v.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs shadow"
                    >
                      Verify Badge
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: USER DIRECTORY */}
        {activeTab === 'users' && (
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">User Directory & Role Permissions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-semibold">User</th>
                    <th className="pb-3 font-semibold">Role</th>
                    <th className="pb-3 font-semibold">VIP Status</th>
                    <th className="pb-3 font-semibold">Wallet Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map(u => (
                    <tr key={u.id} className="py-2.5">
                      <td className="py-2.5">
                        <span className="font-bold text-white block">{u.username}</span>
                        <span className="text-slate-400 text-[11px]">{u.email}</span>
                      </td>
                      <td className="py-2.5 capitalize font-semibold text-amber-400">
                        {u.appRole?.replace('_', ' ') || 'Attendee'}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.isVip ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {u.isVip ? 'VIP Tier' : 'Standard'}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-slate-300 font-bold">
                        ₦{u.balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
