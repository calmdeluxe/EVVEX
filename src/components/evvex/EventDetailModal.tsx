import React, { useState } from 'react';
import { EventItem, TicketTier, PurchasedTicket, User } from '../../types';
import { X, Calendar, MapPin, Clock, Users, Shield, Crown, Check, Sparkles, CreditCard, Wallet, AlertCircle } from 'lucide-react';

interface EventDetailModalProps {
  event: EventItem | null;
  ticketTiers: TicketTier[];
  currentUser: User;
  onClose: () => void;
  onTicketPurchased: (ticket: PurchasedTicket, updatedUser: User) => void;
  onToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  ticketTiers,
  currentUser,
  onClose,
  onTicketPurchased,
  onToast
}) => {
  if (!event) return null;

  const eventTiers = ticketTiers.filter(t => t.event_id === event.id);
  const [selectedTierId, setSelectedTierId] = useState<string>(eventTiers[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [attendeeName, setAttendeeName] = useState(currentUser.username || 'Samuel Chukwuemeka');
  const [attendeeEmail, setAttendeeEmail] = useState(currentUser.email || 'winbigonly@gmail.com');
  const [attendeePhone, setAttendeePhone] = useState('+234 803 123 4567');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'paystack'>('wallet');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccessPass, setIsSuccessPass] = useState<PurchasedTicket | null>(null);

  const selectedTier = eventTiers.find(t => t.id === selectedTierId) || eventTiers[0];
  const unitPriceNaira = selectedTier ? selectedTier.price_kobo / 100 : 0;
  const totalPriceNaira = unitPriceNaira * quantity;

  const isPatronTier = selectedTier?.is_patron_only || event.is_patron_only;
  const userHasPatron = currentUser.appRole === 'patron' || currentUser.appRole === 'admin';

  const handleCheckout = () => {
    if (isPatronTier && !userHasPatron) {
      onToast('This tier requires an active Patron Society status. Please upgrade to Patron to book.', 'error');
      return;
    }

    if (!selectedTier) {
      onToast('Please select a ticket tier', 'warning');
      return;
    }

    if (paymentMethod === 'wallet' && currentUser.balance < totalPriceNaira) {
      onToast(`Insufficient wallet balance. You have ₦${currentUser.balance.toLocaleString('en-NG')} but need ₦${totalPriceNaira.toLocaleString('en-NG')}.`, 'error');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);

      const ticketNumber = `EVX-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const newTicket: PurchasedTicket = {
        id: `tkt_${Date.now()}`,
        ticket_number: ticketNumber,
        event_id: event.id,
        event_title: event.title,
        tier_id: selectedTier.id,
        tier_name: selectedTier.name,
        user_id: currentUser.id,
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        attendee_phone: attendeePhone,
        price_paid_kobo: selectedTier.price_kobo * quantity,
        paystack_reference: `PSTK_EVX_${Date.now()}`,
        payment_status: 'success',
        checked_in: false,
        qr_code_hash: `EVX-QR-${ticketNumber}-${event.city || 'LAGOS'}`,
        created_at: new Date().toISOString(),
        event_date: new Date(event.start_time).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        event_venue: event.venue_name,
        event_city: event.city
      };

      const updatedUser: User = {
        ...currentUser,
        balance: paymentMethod === 'wallet' ? currentUser.balance - totalPriceNaira : currentUser.balance
      };

      onTicketPurchased(newTicket, updatedUser);
      setIsSuccessPass(newTicket);
      onToast(`Pass reserved! Ticket #${newTicket.ticket_number} has been issued.`, 'success');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccessPass ? (
          /* Ticket Issuance Confirmation */
          <div className="p-8 sm:p-10 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg shadow-emerald-500/20">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">Booking Confirmed</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
                Your EVVEX Pass is Ready!
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                We've verified your booking and generated your official gate entry QR code. Present this pass at the gate.
              </p>
            </div>

            {/* Digital Pass Card */}
            <div className="max-w-md mx-auto bg-slate-950 border border-amber-400/40 rounded-2xl p-6 text-left space-y-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Official Entry Pass</span>
                  <h4 className="text-base font-bold text-white font-['Syne']">{isSuccessPass.event_title}</h4>
                  <p className="text-xs text-slate-400">{isSuccessPass.event_venue}, {isSuccessPass.event_city}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-emerald-400">{isSuccessPass.tier_name}</span>
                  <p className="text-[10px] text-slate-500 font-mono">{isSuccessPass.ticket_number}</p>
                </div>
              </div>

              {/* QR Code Placeholder Graphic */}
              <div className="bg-white p-4 rounded-xl max-w-[200px] mx-auto shadow-inner flex flex-col items-center justify-center space-y-2">
                <div className="w-36 h-36 border-4 border-dashed border-slate-900/40 flex items-center justify-center bg-slate-100 rounded-lg">
                  <div className="text-center">
                    <p className="font-mono text-xs font-black text-slate-900 tracking-tighter">|||||||||||||||||||</p>
                    <p className="font-mono text-[9px] font-bold text-slate-700 mt-1">{isSuccessPass.ticket_number}</p>
                    <p className="font-mono text-[8px] text-emerald-700 font-semibold uppercase mt-0.5">● GATE PASS VERIFIED</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-600 font-mono font-medium">Scan at entrance</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800 text-slate-400">
                <div>
                  <span className="text-[10px] text-slate-500 block">Attendee</span>
                  <span className="text-white font-semibold">{isSuccessPass.attendee_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Date & Time</span>
                  <span className="text-white font-semibold">{isSuccessPass.event_date}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onClose}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition-all cursor-pointer text-sm"
              >
                Done & View Passes
              </button>
            </div>
          </div>
        ) : (
          /* Booking Details & Tier Selector */
          <div>
            {/* Header Cover */}
            <div className="relative h-52 sm:h-64 overflow-hidden bg-slate-950">
              <img
                src={event.cover_image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200'}
                alt={event.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

              <div className="absolute bottom-4 left-6 right-6 space-y-2">
                {event.is_patron_only && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-0.5 rounded bg-amber-400 text-slate-950">
                    <Crown className="w-3 h-3" />
                    Patron Exclusive
                  </span>
                )}
                <h2 className="text-2xl sm:text-3xl font-black text-white font-['Syne'] leading-tight">
                  {event.title}
                </h2>
                <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    {new Date(event.start_time).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    {event.venue_name}, {event.city}
                  </span>
                  {event.dress_code && (
                    <span className="text-amber-300 font-medium">Dress: {event.dress_code}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Event Description */}
              <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
                <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold">About the Experience</h4>
                <p>{event.description || event.tagline}</p>
              </div>

              {/* Select Ticket Tier */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold">Select Ticket Tier</h4>
                  <span className="text-xs text-amber-400 font-medium">Nigerian Naira (₦)</span>
                </div>

                <div className="space-y-2">
                  {eventTiers.map(tier => {
                    const isSelected = tier.id === selectedTierId;
                    const price = tier.price_kobo / 100;
                    const isPatronRestricted = tier.is_patron_only && !userHasPatron;

                    return (
                      <div
                        key={tier.id}
                        onClick={() => {
                          if (!isPatronRestricted) setSelectedTierId(tier.id);
                        }}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400/10 border-amber-400 shadow-md shadow-amber-400/10'
                            : isPatronRestricted
                            ? 'bg-slate-950/40 border-slate-800/60 opacity-60 cursor-not-allowed'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{tier.name}</span>
                            {tier.is_patron_only && (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                Patron Only
                              </span>
                            )}
                          </div>
                          {tier.perks && tier.perks.length > 0 && (
                            <p className="text-xs text-slate-400">
                              {tier.perks.join(' • ')}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-black text-amber-400">
                            ₦{price.toLocaleString('en-NG')}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {tier.capacity - tier.sold_count} passes left
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Attendee Form */}
              <div className="space-y-3 border-t border-slate-800 pt-5">
                <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold">Attendee Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={attendeeEmail}
                      onChange={(e) => setAttendeeEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Phone (SMS Ticket)</label>
                    <input
                      type="text"
                      value={attendeePhone}
                      onChange={(e) => setAttendeePhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3 border-t border-slate-800 pt-5">
                <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold">Select Payment Channel</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setPaymentMethod('wallet')}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      paymentMethod === 'wallet'
                        ? 'bg-amber-400/10 border-amber-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      <div>
                        <p className="text-xs font-bold text-white">EVVEX Wallet</p>
                        <p className="text-[11px] text-slate-400">Balance: ₦{currentUser.balance.toLocaleString('en-NG')}</p>
                      </div>
                    </div>
                    {paymentMethod === 'wallet' && <Check className="w-4 h-4 text-amber-400" />}
                  </div>

                  <div
                    onClick={() => setPaymentMethod('paystack')}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      paymentMethod === 'paystack'
                        ? 'bg-amber-400/10 border-amber-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-amber-400" />
                      <div>
                        <p className="text-xs font-bold text-white">Paystack Direct</p>
                        <p className="text-[11px] text-slate-400">Debit Card / Bank Transfer</p>
                      </div>
                    </div>
                    {paymentMethod === 'paystack' && <Check className="w-4 h-4 text-amber-400" />}
                  </div>
                </div>
              </div>

              {/* Order Summary Footer */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <span className="text-xs text-slate-400 block">Total Due ({quantity} pass)</span>
                  <span className="text-2xl font-black text-amber-400">
                    ₦{totalPriceNaira.toLocaleString('en-NG')}
                  </span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-black px-8 py-3 rounded-xl transition-all shadow-lg shadow-amber-400/20 flex items-center gap-2 cursor-pointer text-sm"
                >
                  {isProcessing ? (
                    <span>Issuing Official Pass...</span>
                  ) : (
                    <>
                      <span>Complete Reservation</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
