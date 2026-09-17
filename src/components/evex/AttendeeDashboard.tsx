import React, { useState } from 'react';
import { 
  Ticket, Calendar, Crown, User, HelpCircle, QrCode, 
  MapPin, Clock, ShieldCheck, Sparkles, ArrowRight, ExternalLink,
  Wallet, CheckCircle2, Bookmark, AlertCircle, Phone, Mail
} from 'lucide-react';
import { PurchasedTicket, EventItem, User as UserType } from '../../types';

interface AttendeeDashboardProps {
  currentUser: UserType;
  tickets: PurchasedTicket[];
  events: EventItem[];
  onExploreEvents: () => void;
  onSelectEvent: (event: EventItem) => void;
  onTopUpWallet?: () => void;
}

export const AttendeeDashboard: React.FC<AttendeeDashboardProps> = ({
  currentUser,
  tickets,
  events,
  onExploreEvents,
  onSelectEvent
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'tickets' | 'events' | 'vip' | 'profile' | 'support'>('tickets');
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<PurchasedTicket | null>(tickets[0] || null);

  const myTickets = tickets.filter(t => t.user_id === currentUser.id || t.attendee_email === currentUser.email);
  const nextTicket = myTickets[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* Top Banner & User Profile Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 pt-6 pb-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-amber-400"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white">
                    {currentUser.username}
                  </h1>
                  {currentUser.isVip && (
                    <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <Crown className="w-3 h-3" /> VIP MEMBER
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{currentUser.email} • {currentUser.phone || '+234 803 123 4567'}</p>
              </div>
            </div>

            {/* Quick Wallet Balance Pill */}
            <div className="bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800 flex items-center justify-between sm:justify-end gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">EVEX Naira Wallet</span>
                <span className="text-base font-black font-mono text-emerald-400">
                  ₦{currentUser.balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Tab Navigation Menu — STRICT ATTENDEE BOUNDARIES */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-6 pb-1 scrollbar-none border-t border-slate-800/80 mt-6">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'home' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Attendee Home
            </button>

            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'tickets' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              My Tickets ({myTickets.length})
            </button>

            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'events' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              Saved & Past Events
            </button>

            <button
              onClick={() => setActiveTab('vip')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'vip' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              VIP Lounge
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'profile' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Profile & Wallet
            </button>

            <button
              onClick={() => setActiveTab('support')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'support' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Help & Support
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* TAB 1: ATTENDEE HOME */}
        {activeTab === 'home' && (
          <div className="space-y-8">
            {/* Countdown / Next Upcoming Event */}
            {nextTicket && (
              <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 p-6 sm:p-8 rounded-3xl border border-amber-400/30 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <span className="text-xs font-extrabold text-amber-400 uppercase tracking-widest block mb-1">
                      Your Next Experience
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
                      {nextTicket.event_title}
                    </h2>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        {nextTicket.event_date}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        {nextTicket.event_venue}, {nextTicket.event_city}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTicketForQr(nextTicket);
                      setActiveTab('tickets');
                    }}
                    className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow transition flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4" /> View Admission Pass
                  </button>
                </div>
              </div>
            )}

            {/* Recommended For You */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Recommended For You</h3>
                <button onClick={onExploreEvents} className="text-xs font-semibold text-amber-400 hover:underline">
                  Browse all
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {events.slice(0, 3).map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => onSelectEvent(ev)}
                    className="cursor-pointer bg-slate-900 border border-slate-800 hover:border-amber-400/40 p-4 rounded-2xl transition group"
                  >
                    <img
                      src={ev.cover_image}
                      alt={ev.title}
                      className="w-full h-36 rounded-xl object-cover mb-3"
                    />
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                      {ev.category.replace('_', ' ')}
                    </span>
                    <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition line-clamp-1 mb-1">
                      {ev.title}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-1 mb-2">{ev.venue_name}</p>
                    <span className="text-xs font-bold text-amber-400">View Event →</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY TICKETS (QR PASSES & SENSITIVE GATE INSTRUCTIONS) */}
        {activeTab === 'tickets' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">My Active Passes</h2>
                <p className="text-xs text-slate-400">
                  Present your digital QR pass at the security gate for instant check-in.
                </p>
              </div>
              <button
                onClick={onExploreEvents}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 text-xs font-semibold transition"
              >
                + Book Another Event
              </button>
            </div>

            {myTickets.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
                <Ticket className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">You don't have any tickets yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
                  Explore concerts, galas, and tech mixers happening across Nigeria.
                </p>
                <button
                  onClick={onExploreEvents}
                  className="px-6 py-3 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs shadow"
                >
                  Explore Events Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tickets list */}
                <div className="lg:col-span-1 space-y-3">
                  {myTickets.map(tkt => {
                    const isSelected = selectedTicketForQr?.id === tkt.id;
                    return (
                      <div
                        key={tkt.id}
                        onClick={() => setSelectedTicketForQr(tkt)}
                        className={`p-4 rounded-2xl border cursor-pointer transition ${
                          isSelected
                            ? 'bg-amber-400/10 border-amber-400 shadow'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-xs font-bold text-white line-clamp-1">
                            {tkt.event_title}
                          </span>
                          <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                            {tkt.tier_name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">{tkt.event_date}</p>
                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
                          <span className="font-mono text-slate-400">{tkt.ticket_number}</span>
                          <span className="text-emerald-400 font-semibold">● Valid Pass</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Ticket Pass Inspection Card */}
                {selectedTicketForQr && (
                  <div className="lg:col-span-2 bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-8 rounded-3xl border-2 border-amber-400/30 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                          Official Admission Pass
                        </span>
                        <h3 className="text-lg sm:text-xl font-bold text-white">
                          {selectedTicketForQr.event_title}
                        </h3>
                      </div>
                      <span className="text-xs font-black text-amber-400 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full">
                        {selectedTicketForQr.tier_name}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Primary Attendee</span>
                          <span className="font-bold text-white text-sm">{selectedTicketForQr.attendee_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Date & Location</span>
                          <span className="text-slate-200 block font-medium">{selectedTicketForQr.event_date}</span>
                          <span className="text-slate-400 block">{selectedTicketForQr.event_venue}, {selectedTicketForQr.event_city}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Pass ID</span>
                          <span className="font-mono text-amber-300 font-bold">{selectedTicketForQr.ticket_number}</span>
                        </div>
                      </div>

                      {/* QR Display */}
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center flex flex-col items-center justify-center">
                        <div className="p-3 bg-white rounded-xl mb-2">
                          <QrCode className="w-36 h-36 text-slate-950" />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {selectedTicketForQr.qr_code_hash}
                        </span>
                      </div>
                    </div>

                    {/* Unlocked Sensitive Instructions */}
                    <div className="bg-amber-400/10 border border-amber-400/30 p-4 rounded-xl text-xs">
                      <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Private Check-in & Gate Entrance Guidance</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        Proceed to Main Concierge Turnstiles. Have your QR code ready at 100% screen brightness. Valet parking attendants are situated at Gate 2 West.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SAVED & PAST EVENTS */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Saved & Past Events</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {events.slice(0, 4).map(ev => (
                <div key={ev.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={ev.cover_image} alt={ev.title} className="w-14 h-14 rounded-xl object-cover" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1">{ev.title}</h4>
                      <p className="text-[11px] text-slate-400">{ev.venue_name} • {ev.city}</p>
                    </div>
                  </div>
                  <button onClick={() => onSelectEvent(ev)} className="text-xs font-bold text-amber-400 hover:underline">
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: VIP LOUNGE */}
        {activeTab === 'vip' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950 p-6 sm:p-8 rounded-3xl border border-amber-400/40">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider mb-2">
                <Crown className="w-4 h-4" />
                <span>EVEX VIP Society</span>
              </div>
              <h2 className="text-2xl font-black text-white mb-2">
                Exclusive VIP Privileges & Early Drops
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mb-6 leading-relaxed">
                As a verified VIP patron, enjoy complimentary fast-track check-in lanes, secret private tasting invitations, 48-hour early ticket reservation window, and concierge hotline.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">⚡ Fast-Track Gate</span>
                  <p className="text-slate-400">Never wait in standard security queues at partner arenas.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">🎟️ Secret Drops</span>
                  <p className="text-slate-400">Access unlisted private art auctions and exclusive dinners.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">🍸 Concierge Bar</span>
                  <p className="text-slate-400">Complimentary welcome champagne at participating VIP lounges.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE & WALLET */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white">Attendee Profile</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Username</span>
                  <span className="font-semibold text-white">{currentUser.username}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Email</span>
                  <span className="font-semibold text-white">{currentUser.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Phone</span>
                  <span className="font-semibold text-white">{currentUser.phone || '+234 803 123 4567'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Membership Status</span>
                  <span className="text-amber-400 font-bold uppercase">{currentUser.membershipStatus}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">EVEX Naira Wallet</h3>
                <span className="text-xs text-emerald-400 font-bold">Active Settlement</span>
              </div>
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Available Wallet Balance</span>
                  <p className="text-2xl font-black font-mono text-white mt-0.5">
                    ₦{currentUser.balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <button
                  onClick={() => alert('Paystack direct wallet deposit modal simulated.')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  + Top Up
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SUPPORT & CONCIERGE */}
        {activeTab === 'support' && (
          <div className="max-w-2xl bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white">EVEX Attendee Concierge</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Need assistance with an admission ticket, transfer request, refund query, or gate arrival? Reach out to our 24/7 event concierge desk.
            </p>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <Mail className="w-4 h-4 text-amber-400" />
                <span>support@evex.ng</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <Phone className="w-4 h-4 text-amber-400" />
                <span>+234 800 383 9647 (EVEX-HELP)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
