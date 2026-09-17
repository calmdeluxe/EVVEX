import React from 'react';
import { 
  Calendar, Clock, MapPin, ShieldAlert, Ticket, Sparkles, 
  HelpCircle, ArrowLeft, CheckCircle2, AlertCircle, Share2, 
  UserCheck, Lock, ChevronRight, FileText
} from 'lucide-react';
import { EventItem, TicketTier } from '../../types';

interface EventDetailsPageProps {
  event: EventItem;
  ticketTiers: TicketTier[];
  onGetTickets: (event: EventItem) => void;
  onBack: () => void;
}

export const EventDetailsPage: React.FC<EventDetailsPageProps> = ({
  event,
  ticketTiers,
  onGetTickets,
  onBack
}) => {
  const eventTiers = ticketTiers.filter(t => t.event_id === event.id);

  const formatDateTime = (startStr: string, endStr?: string) => {
    try {
      const s = new Date(startStr);
      const dateFormatted = s.toLocaleDateString('en-NG', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      const startTime = s.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
      let endTime = '';
      if (endStr) {
        const e = new Date(endStr);
        endTime = ` - ${e.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}`;
      }
      return { dateFormatted, timeFormatted: `${startTime}${endTime}` };
    } catch {
      return { dateFormatted: startStr, timeFormatted: '' };
    }
  };

  const { dateFormatted, timeFormatted } = formatDateTime(event.start_time, event.end_time);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* Top Back Navigation Bar */}
      <div className="sticky top-16 z-20 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            Back to Events
          </button>

          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            PAGE 3 • EVENT OVERVIEW
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {/* Cover Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 h-64 sm:h-80 md:h-96 mb-8 shadow-2xl">
          <img
            src={event.cover_image}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
          
          <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wide">
                {event.category.replace('_', ' ')}
              </span>
              {event.is_vip_only && (
                <span className="bg-purple-500 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
                  VIP EXCLUSIVE
                </span>
              )}
              {event.age_restriction && (
                <span className="bg-slate-900/80 backdrop-blur text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                  Age: {event.age_restriction}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              {event.title}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column (2/3) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Metadata Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date & Time</h4>
                  <p className="text-sm font-semibold text-white">{dateFormatted}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> {timeFormatted}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">General Venue</h4>
                  <p className="text-sm font-semibold text-white">{event.venue_name}</p>
                  <p className="text-xs text-slate-400">{event.venue_address}, {event.city}</p>
                </div>
              </div>
            </div>

            {/* Event Description */}
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-lg font-bold text-white mb-3">About This Event</h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>

            {/* What Attendees Should Expect */}
            {event.what_to_expect && event.what_to_expect.length > 0 && (
              <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  What Attendees Should Expect
                </h3>
                <ul className="space-y-2.5">
                  {event.what_to_expect.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Event Rules & Code of Conduct */}
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Event Rules & Policies
              </h3>
              <div className="space-y-2 mb-4">
                {event.dress_code && (
                  <div className="text-xs text-slate-300 flex items-center gap-2 pb-2 border-b border-slate-800">
                    <span className="font-bold text-white">Dress Code:</span>
                    <span>{event.dress_code}</span>
                  </div>
                )}
                {event.rules && event.rules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{rule}</span>
                  </div>
                ))}
              </div>

              {/* Strict Access Disclosure Notice */}
              <div className="bg-slate-950 p-4 rounded-xl border border-amber-400/20 text-xs text-slate-400 flex items-start gap-3">
                <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300 block mb-0.5">Private Gate & Access Instructions</span>
                  Exact check-in lanes, entry gate numbers, security concierge instructions, and your unique QR admission pass will be unlocked in your account immediately after ticket confirmation.
                </div>
              </div>
            </div>

            {/* Refund & Cancellation Policy */}
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Refund & Cancellation Policy
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {event.refund_policy || 'Tickets are non-refundable within 48 hours of doors opening. Event transfers and gift reassignments are supported inside your EVEX Attendee Dashboard.'}
              </p>
            </div>

            {/* Organizer Information */}
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Organized By
                </span>
                <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  {event.organizer_name || 'Verified EVEX Organizer'}
                </h4>
                {event.organizer_email && (
                  <p className="text-xs text-slate-400 mt-0.5">{event.organizer_email}</p>
                )}
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                  Verified Host
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar: Ticket Overview & Sticky Primary Action (1/3) */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  Admission Options
                </span>
                <h3 className="text-xl font-bold text-white">Available Tickets</h3>
              </div>

              {/* Tiers List */}
              <div className="space-y-3">
                {eventTiers.map(tier => {
                  const isSoldOut = tier.capacity > 0 && tier.sold_count >= tier.capacity;
                  const priceText = tier.price_kobo === 0 ? 'FREE' : `₦${(tier.price_kobo / 100).toLocaleString('en-NG')}`;

                  return (
                    <div 
                      key={tier.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{tier.name}</span>
                        <span className="text-sm font-extrabold text-amber-400">{priceText}</span>
                      </div>
                      {tier.perks && tier.perks.length > 0 && (
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          ✓ {tier.perks.join(' • ')}
                        </p>
                      )}
                      {isSoldOut ? (
                        <span className="text-[10px] text-red-400 font-bold block mt-1">SOLD OUT</span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-medium block mt-1">
                          {tier.capacity ? `${tier.capacity - tier.sold_count} passes left` : 'Available'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Primary Action Button */}
              <button
                id="btn-get-tickets"
                onClick={() => onGetTickets(event)}
                className="w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-base shadow-lg shadow-amber-400/20 transition flex items-center justify-center gap-2"
              >
                <Ticket className="w-5 h-5 text-slate-950" />
                Get Ticket / RSVP
              </button>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Guaranteed verified admission. Instant Paystack & EVEX wallet checkout with zero paper printing required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
