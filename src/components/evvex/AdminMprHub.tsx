import React, { useState } from 'react';
import { EventItem, PayoutRequest, User, AppRole } from '../../types';
import { Shield, Check, X, AlertTriangle, Users, DollarSign, Calendar, Sparkles } from 'lucide-react';

interface AdminMprHubProps {
  currentUser: User;
  events: EventItem[];
  payoutRequests: PayoutRequest[];
  allUsers: User[];
  onApproveEvent: (eventId: string) => void;
  onRejectEvent: (eventId: string, reason: string) => void;
  onApprovePayout: (payoutId: string) => void;
  onUpdateUserRole: (userId: string, newRole: AppRole) => void;
  onToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const AdminMprHub: React.FC<AdminMprHubProps> = ({
  currentUser,
  events,
  payoutRequests,
  allUsers,
  onApproveEvent,
  onRejectEvent,
  onApprovePayout,
  onUpdateUserRole,
  onToast
}) => {
  const [activeSection, setActiveSection] = useState<'events' | 'payouts' | 'roles'>('events');
  const [rejectModalEventId, setRejectModalEventId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isAdmin = currentUser.appRole === 'admin';
  const pendingEvents = events.filter(e => e.status === 'submitted' || e.status === 'under_review');
  const pendingPayouts = payoutRequests.filter(p => p.status === 'pending');

  const handleConfirmReject = () => {
    if (!rejectModalEventId) return;
    onRejectEvent(rejectModalEventId, rejectReason || 'Did not meet EVVEX compliance requirements');
    setRejectModalEventId(null);
    setRejectReason('');
    onToast('Event rejected and sent back to host with feedback', 'info');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">
            <Shield className="w-3.5 h-3.5" />
            {isAdmin ? 'Master Platform Governance' : 'MPR Compliance & Quality Gate'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            {isAdmin ? 'EVVEX Executive Control Hub' : 'MPR Audit & Moderation'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review submitted event listings, audit Nigerian bank payouts, and govern user access roles.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Pending Events</span>
            <span className="text-xl font-black text-amber-400">{pendingEvents.length}</span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Pending Payouts</span>
            <span className="text-xl font-black text-emerald-400">{pendingPayouts.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSection('events')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'events'
              ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
              : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          Event Approvals ({pendingEvents.length})
        </button>

        <button
          onClick={() => setActiveSection('payouts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'payouts'
              ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
              : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          Payout Audit ({pendingPayouts.length})
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveSection('roles')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'roles'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            Role Governance ({allUsers.length})
          </button>
        )}
      </div>

      {/* Section: Events Queue */}
      {activeSection === 'events' && (
        <div className="space-y-4">
          {pendingEvents.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">Event Review Queue Clear</h3>
              <p className="text-xs text-slate-400">All submitted event experiences have been reviewed and published.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingEvents.map(event => (
                <div key={event.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-400/20 text-amber-300">
                        Pending Review
                      </span>
                      <span className="text-xs text-slate-400">{event.city} • {event.category}</span>
                    </div>
                    <h4 className="text-lg font-bold text-white font-['Syne']">{event.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2">{event.tagline || event.description}</p>
                    <p className="text-xs text-slate-300 font-medium">
                      Venue: {event.venue_name} • Capacity: {event.max_capacity} guests
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setRejectModalEventId(event.id)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        onApproveEvent(event.id);
                        onToast(`Event "${event.title}" approved and published to live discovery!`, 'success');
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      Approve & Publish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section: Payouts */}
      {activeSection === 'payouts' && (
        <div className="space-y-4">
          {pendingPayouts.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <DollarSign className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Pending Payouts</h3>
              <p className="text-xs text-slate-400">All organizer withdrawal requests have been audited and disbursed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPayouts.map(p => (
                <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{p.host_name}</span>
                      <span className="text-[10px] text-slate-400">({p.event_title})</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Bank: <strong className="text-amber-400">{p.bank_name}</strong> | Acc: <strong className="text-white font-mono">{p.account_number}</strong> ({p.account_name})
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Gross: ₦{(p.gross_revenue_kobo / 100).toLocaleString('en-NG')} | Fee: ₦{(p.platform_fee_kobo / 100).toLocaleString('en-NG')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Net Payout</span>
                      <span className="text-lg font-black text-emerald-400">
                        ₦{(p.net_payout_kobo / 100).toLocaleString('en-NG')}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        onApprovePayout(p.id);
                        onToast(`Disbursement of ₦${(p.net_payout_kobo / 100).toLocaleString('en-NG')} approved for ${p.account_name}`, 'success');
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      Authorize Transfer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section: Roles */}
      {activeSection === 'roles' && isAdmin && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-['Syne']">
              Platform User Role Directory
            </h3>
            <span className="text-xs text-slate-400">Admin-exclusive role elevation</span>
          </div>

          <div className="divide-y divide-slate-800">
            {allUsers.map(user => (
              <div key={user.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-white">{user.username}</p>
                  <p className="text-xs text-slate-400 font-mono">{user.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={user.appRole || 'guest'}
                    onChange={e => {
                      const newR = e.target.value as AppRole;
                      onUpdateUserRole(user.id, newR);
                      onToast(`Updated role for ${user.username} to ${newR}`, 'success');
                    }}
                    className="bg-slate-950 border border-slate-800 text-amber-300 font-semibold text-xs px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    <option value="guest">Guest</option>
                    <option value="patron">Patron</option>
                    <option value="event_host">Event Host</option>
                    <option value="mpr">MPR</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Provide Rejection Feedback</h3>
            <textarea
              rows={3}
              placeholder="e.g. Venue capacity exceeds permit limit or ticket pricing does not match description."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalEventId(null)}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
