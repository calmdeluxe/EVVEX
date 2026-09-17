import React, { useState } from 'react';
import { 
  ArrowLeft, ShieldCheck, CreditCard, Wallet, CheckCircle2, 
  AlertCircle, Tag, Sparkles, Lock, User as UserIcon, Mail, Phone
} from 'lucide-react';
import { EventItem, TicketTier, User } from '../../types';

interface CheckoutPageProps {
  event: EventItem;
  selection: {
    tier: TicketTier;
    quantity: number;
    addOns: { id: string; name: string; priceKobo: number }[];
    totalKobo: number;
  };
  currentUser: User | null;
  onPaymentComplete: (ticketData: {
    attendeeName: string;
    attendeeEmail: string;
    attendeePhone: string;
    paymentMethod: 'wallet' | 'paystack';
    mprCode?: string;
  }) => void;
  onBack: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  event,
  selection,
  currentUser,
  onPaymentComplete,
  onBack
}) => {
  const [attendeeName, setAttendeeName] = useState(currentUser?.username ? 'Samuel Chukwuemeka' : '');
  const [attendeeEmail, setAttendeeEmail] = useState(currentUser?.email || '');
  const [attendeePhone, setAttendeePhone] = useState(currentUser?.phone || '+234 803 123 4567');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'paystack'>('paystack');
  const [mprCode, setMprCode] = useState('');
  const [mprApplied, setMprApplied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const walletBalanceKobo = (currentUser?.balance || 0) * 100;
  const canPayWithWallet = walletBalanceKobo >= selection.totalKobo;

  const handleApplyMpr = () => {
    if (!mprCode.trim()) return;
    // Simulate referral validation
    setMprApplied(true);
  };

  const handleSubmitPayment = () => {
    setErrorMsg('');
    if (!attendeeName.trim()) {
      setErrorMsg('Please enter attendee full name.');
      return;
    }
    if (!attendeeEmail.trim()) {
      setErrorMsg('Please enter a valid email address to receive your ticket pass.');
      return;
    }

    if (paymentMethod === 'wallet' && !canPayWithWallet) {
      setErrorMsg('Insufficient wallet balance. Please top up or choose Paystack.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onPaymentComplete({
        attendeeName,
        attendeeEmail,
        attendeePhone,
        paymentMethod,
        mprCode: mprApplied ? mprCode : undefined
      });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* Top Header */}
      <div className="sticky top-16 z-20 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            Back to Ticket Selection
          </button>

          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            PAGE 5 • CHECKOUT & ATTENDEE DETAILS
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Details & Form (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Attendee Form */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-base sm:text-lg font-bold text-white mb-1">
                Attendee Information
              </h2>
              <p className="text-xs text-slate-400 mb-5">
                The admission QR pass and private gate instructions will be sent to this email address.
              </p>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Primary Attendee Full Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      id="input-attendee-name"
                      type="text"
                      placeholder="e.g. Samuel Chukwuemeka"
                      value={attendeeName}
                      onChange={e => setAttendeeName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email Address (For Ticket Delivery) *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        id="input-attendee-email"
                        type="email"
                        placeholder="you@domain.com"
                        value={attendeeEmail}
                        onChange={e => setAttendeeEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Mobile Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        id="input-attendee-phone"
                        type="tel"
                        placeholder="+234 803 000 0000"
                        value={attendeePhone}
                        onChange={e => setAttendeePhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MPR / Promoter Code */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  Have an MPR Promo or Referral Code?
                </span>
                {mprApplied && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                    Partner Code Applied
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  id="input-mpr-code"
                  type="text"
                  placeholder="e.g. EVEX_VIP99"
                  value={mprCode}
                  onChange={e => setMprCode(e.target.value.toUpperCase())}
                  disabled={mprApplied}
                  className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs uppercase font-mono text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={handleApplyMpr}
                  disabled={mprApplied || !mprCode.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-bold text-amber-400 transition"
                >
                  {mprApplied ? 'Applied ✓' : 'Apply'}
                </button>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h3 className="text-base font-bold text-white mb-3">
                Select Payment Method
              </h3>

              <div className="space-y-3">
                {/* Paystack Option */}
                <div
                  onClick={() => setPaymentMethod('paystack')}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    paymentMethod === 'paystack'
                      ? 'bg-amber-400/10 border-amber-400'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Paystack Direct Gateway</p>
                      <p className="text-xs text-slate-400">Debit Card, Bank Transfer, USSD, OPay, Palmpay</p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    paymentMethod === 'paystack' ? 'bg-amber-400 border-amber-400 text-slate-950' : 'border-slate-600'
                  }`}>
                    {paymentMethod === 'paystack' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* EVEX Naira Wallet Option */}
                <div
                  onClick={() => setPaymentMethod('wallet')}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    paymentMethod === 'wallet'
                      ? 'bg-amber-400/10 border-amber-400'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">EVEX Naira Wallet</p>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded">
                          Instant 1-Click
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Available Balance: ₦{(currentUser?.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    paymentMethod === 'wallet' ? 'bg-amber-400 border-amber-400 text-slate-950' : 'border-slate-600'
                  }`}>
                    {paymentMethod === 'wallet' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Order Summary (1/3) */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">
                Order Summary
              </h3>

              {/* Event Context */}
              <div className="text-xs text-slate-300 pb-3 border-b border-slate-800/80">
                <span className="font-bold text-white block mb-0.5">{event.title}</span>
                <span className="text-slate-400">{event.venue_name}, {event.city}</span>
              </div>

              {/* Passes */}
              <div className="flex justify-between text-xs text-slate-300">
                <span>{selection.quantity}× {selection.tier.name}</span>
                <span className="font-mono font-bold text-white">
                  ₦{((selection.tier.price_kobo * selection.quantity) / 100).toLocaleString('en-NG')}
                </span>
              </div>

              {/* Addons */}
              {selection.addOns.map(add => (
                <div key={add.id} className="flex justify-between text-xs text-slate-400">
                  <span className="truncate pr-2">+ {add.name}</span>
                  <span className="font-mono text-white flex-shrink-0">
                    ₦{(add.priceKobo / 100).toLocaleString('en-NG')}
                  </span>
                </div>
              ))}

              {/* Total */}
              <div className="pt-3 border-t border-slate-800 flex items-baseline justify-between">
                <span className="text-sm font-bold text-white">Grand Total</span>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-amber-400 font-mono">
                    ₦{(selection.totalKobo / 100).toLocaleString('en-NG')}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                id="btn-confirm-payment"
                onClick={handleSubmitPayment}
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold text-base shadow-lg shadow-amber-400/20 transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Processing Payment...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Pay ₦{(selection.totalKobo / 100).toLocaleString('en-NG')}
                  </span>
                )}
              </button>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                By confirming, you agree to the event host's policies and EVEX terms of service.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
