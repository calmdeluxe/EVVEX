import React, { useState } from 'react';
import { 
  ArrowLeft, Ticket, Crown, Check, Plus, Minus, ShieldCheck, 
  Sparkles, ArrowRight, Car, Coffee, Star
} from 'lucide-react';
import { EventItem, TicketTier } from '../../types';

interface TicketSelectionPageProps {
  event: EventItem;
  ticketTiers: TicketTier[];
  onProceedToCheckout: (selection: {
    tier: TicketTier;
    quantity: number;
    addOns: { id: string; name: string; priceKobo: number }[];
    totalKobo: number;
  }) => void;
  onBack: () => void;
}

export const TicketSelectionPage: React.FC<TicketSelectionPageProps> = ({
  event,
  ticketTiers,
  onProceedToCheckout,
  onBack
}) => {
  const eventTiers = ticketTiers.filter(t => t.event_id === event.id);
  const [selectedTierId, setSelectedTierId] = useState<string>(eventTiers[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  const addOnOptions = [
    { id: 'addon_valet', name: 'Reserved Valet Parking Pass', priceKobo: 500000, icon: Car, desc: 'Guaranteed VIP drop-off and sheltered secure parking' },
    { id: 'addon_lanyard', name: 'Commemorative VIP Fabric Lanyard', priceKobo: 350000, icon: Star, desc: 'Collector souvenir badge delivered at gate check-in' },
    { id: 'addon_voucher', name: 'Artisan Food & Cocktail Credit (₦10k voucher)', priceKobo: 850000, icon: Coffee, desc: 'Enjoy 15% discount on food village tokens' }
  ];

  const selectedTier = eventTiers.find(t => t.id === selectedTierId) || eventTiers[0];

  const toggleAddOn = (id: string) => {
    if (selectedAddOns.includes(id)) {
      setSelectedAddOns(selectedAddOns.filter(a => a !== id));
    } else {
      setSelectedAddOns([...selectedAddOns, id]);
    }
  };

  // Total Calculation
  const tierTotalKobo = selectedTier ? selectedTier.price_kobo * quantity : 0;
  const addOnsTotalKobo = selectedAddOns.reduce((acc, id) => {
    const item = addOnOptions.find(o => o.id === id);
    return acc + (item ? item.priceKobo : 0);
  }, 0);
  const grandTotalKobo = tierTotalKobo + addOnsTotalKobo;

  const handleContinue = () => {
    if (!selectedTier) return;
    const activeAddOns = addOnOptions
      .filter(o => selectedAddOns.includes(o.id))
      .map(o => ({ id: o.id, name: o.name, priceKobo: o.priceKobo }));

    onProceedToCheckout({
      tier: selectedTier,
      quantity,
      addOns: activeAddOns,
      totalKobo: grandTotalKobo
    });
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
            Back to Event
          </button>

          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            PAGE 4 • SELECT TICKET & QUANTITY
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        {/* Event Quick Context Bar */}
        <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 mb-8">
          <img
            src={event.cover_image}
            alt={event.title}
            className="w-16 h-16 rounded-xl object-cover border border-slate-700 flex-shrink-0"
          />
          <div>
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
              {event.category.replace('_', ' ')}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white line-clamp-1">{event.title}</h2>
            <p className="text-xs text-slate-400">{event.venue_name} • {event.city}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Tier Selection & Add-ons */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Choose Tier */}
            <div>
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-amber-400" />
                1. Select Admission Tier
              </h3>

              <div className="space-y-3">
                {eventTiers.map(tier => {
                  const isSelected = selectedTier?.id === tier.id;
                  const isSoldOut = tier.capacity > 0 && tier.sold_count >= tier.capacity;
                  const isVipTier = tier.tier_type === 'vip' || tier.tier_type === 'table' || tier.is_patron_only;

                  return (
                    <div
                      key={tier.id}
                      onClick={() => !isSoldOut && setSelectedTierId(tier.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-400/10 border-amber-400 shadow-md shadow-amber-400/5'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      } ${isSoldOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-white">{tier.name}</span>
                            {isVipTier && (
                              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Crown className="w-2.5 h-2.5" /> VIP
                              </span>
                            )}
                          </div>
                          {tier.perks && tier.perks.length > 0 && (
                            <p className="text-xs text-slate-400 mt-1">
                              {tier.perks.map((p, i) => (
                                <span key={i} className="inline-block mr-3">✓ {p}</span>
                              ))}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-lg font-extrabold text-amber-400 block">
                            {tier.price_kobo === 0 ? 'FREE' : `₦${(tier.price_kobo / 100).toLocaleString('en-NG')}`}
                          </span>
                          <span className="text-[10px] text-slate-400">per person</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                        <span className="text-slate-400">
                          {isSoldOut ? 'Sold Out' : tier.capacity ? `${tier.capacity - tier.sold_count} remaining` : 'Instant Access'}
                        </span>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'bg-amber-400 border-amber-400 text-slate-950' : 'border-slate-600'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Select Quantity */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">2. Number of Passes</h4>
                <p className="text-xs text-slate-400">Max 10 passes per checkout</p>
              </div>

              <div className="flex items-center gap-3 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="w-8 h-8 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono text-base font-bold text-white px-2">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(10, quantity + 1))}
                  disabled={quantity >= 10}
                  className="w-8 h-8 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3. Optional Add-ons */}
            <div>
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                3. Optional Experience Add-ons
              </h3>

              <div className="space-y-3">
                {addOnOptions.map(addon => {
                  const isChecked = selectedAddOns.includes(addon.id);
                  const Icon = addon.icon;

                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddOn(addon.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isChecked
                          ? 'bg-amber-400/5 border-amber-400/60'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          isChecked ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-white">{addon.name}</p>
                          <p className="text-[11px] text-slate-400">{addon.desc}</p>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <span className="text-xs sm:text-sm font-extrabold text-amber-400">
                          +₦{(addon.priceKobo / 100).toLocaleString('en-NG')}
                        </span>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                          isChecked ? 'bg-amber-400 border-amber-400 text-slate-950' : 'border-slate-700'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Col: Order Summary & Checkout CTA */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">
                Order Breakdown
              </h3>

              {/* Tier line item */}
              <div className="flex items-start justify-between text-xs text-slate-300">
                <div>
                  <span className="font-bold text-white block">{selectedTier?.name}</span>
                  <span className="text-slate-400">
                    {quantity} pass{quantity > 1 ? 'es' : ''} × ₦{((selectedTier?.price_kobo || 0) / 100).toLocaleString('en-NG')}
                  </span>
                </div>
                <span className="font-mono font-bold text-white">
                  ₦{(tierTotalKobo / 100).toLocaleString('en-NG')}
                </span>
              </div>

              {/* Addons breakdown */}
              {selectedAddOns.map(id => {
                const item = addOnOptions.find(o => o.id === id);
                if (!item) return null;
                return (
                  <div key={id} className="flex items-center justify-between text-xs text-slate-300">
                    <span className="truncate pr-2">{item.name}</span>
                    <span className="font-mono font-bold text-white flex-shrink-0">
                      ₦{(item.priceKobo / 100).toLocaleString('en-NG')}
                    </span>
                  </div>
                );
              })}

              <div className="pt-3 border-t border-slate-800 flex items-baseline justify-between">
                <span className="text-sm font-bold text-white">Total Payable</span>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-amber-400 font-mono">
                    ₦{(grandTotalKobo / 100).toLocaleString('en-NG')}
                  </span>
                  <span className="text-[10px] text-slate-400 block">VAT included</span>
                </div>
              </div>

              <button
                id="btn-continue-checkout"
                onClick={handleContinue}
                className="w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-base shadow-lg shadow-amber-400/20 transition flex items-center justify-center gap-2"
              >
                Continue to Checkout <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Protected by Paystack 256-bit encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
