import React from 'react';
import { 
  CheckCircle2, QrCode, Calendar, MapPin, Download, Share2, 
  ArrowRight, ShieldCheck, Lock, Sparkles, Ticket, Copy
} from 'lucide-react';
import { EventItem, PurchasedTicket } from '../../types';

interface PaymentConfirmationPageProps {
  ticket: PurchasedTicket;
  event: EventItem;
  onGoToDashboard: () => void;
  onExploreMore: () => void;
}

export const PaymentConfirmationPage: React.FC<PaymentConfirmationPageProps> = ({
  ticket,
  event,
  onGoToDashboard,
  onExploreMore
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyTicket = () => {
    navigator.clipboard?.writeText(ticket.ticket_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">
        {/* Success Header Card */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
          </div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">
            PAGE 6 & 7 • PAYMENT CONFIRMED
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white">
            You're In! Admission Confirmed.
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Your payment was verified. An official digital pass has been delivered to your email and saved in your EVEX account.
          </p>
        </div>

        {/* Digital Ticket Pass Card — High Contrast Luxury Styling */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-920 rounded-3xl border-2 border-amber-400/40 p-6 sm:p-8 shadow-2xl shadow-amber-400/5 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-400/5 rounded-bl-full pointer-events-none" />

          {/* Top Notch & Branding */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm">
                E
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">
                EVEX PASS
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Tier</span>
              <span className="text-xs sm:text-sm font-black text-amber-400">
                {ticket.tier_name}
              </span>
            </div>
          </div>

          {/* Event Details */}
          <div className="mb-6">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
              {event.category.replace('_', ' ')}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
              {event.title}
            </h2>
            <div className="flex flex-wrap gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                {ticket.event_date}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                {ticket.event_venue}, {ticket.event_city}
              </span>
            </div>
          </div>

          {/* Attendee Name & Pass Reference */}
          <div className="grid grid-cols-2 gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800 mb-6 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Primary Attendee</span>
              <span className="font-bold text-white text-sm">{ticket.attendee_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Pass Reference</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-amber-300">{ticket.ticket_number}</span>
                <button onClick={handleCopyTicket} className="text-slate-400 hover:text-white">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* UNLOCKED SENSITIVE GATE & CHECK-IN INSTRUCTIONS (PAGE 7 MANDATE) */}
          <div className="bg-amber-400/10 border border-amber-400/40 p-5 rounded-2xl mb-8">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Unlocked: Private Gate & Check-in Instructions</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              {event.access_instructions_sensitive || 'Gate 2 West Check-in corridor. Present your QR code on phone screen. ID verification strictly enforced at gate.'}
            </p>
          </div>

          {/* QR Code Validation Box */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center">
            <div className="inline-block p-4 bg-white rounded-2xl shadow-xl mb-3">
              <QrCode className="w-36 h-36 sm:w-44 sm:h-44 text-slate-950" />
            </div>
            <p className="text-xs font-mono text-slate-400">
              HASH: {ticket.qr_code_hash}
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 mt-1">
              <ShieldCheck className="w-3 h-3" /> Verified EVEX Cryptographic Pass
            </span>
          </div>
        </div>

        {/* Post-Purchase Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
          <button
            id="btn-goto-tickets"
            onClick={onGoToDashboard}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-lg shadow-amber-400/20 transition flex items-center justify-center gap-2"
          >
            <Ticket className="w-4 h-4 text-slate-950" />
            Go to My Tickets
          </button>

          <button
            onClick={onExploreMore}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700 transition flex items-center justify-center gap-2"
          >
            Explore More Events <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
