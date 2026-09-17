import React, { useState } from 'react';
import { EventItem, TicketTier, PayoutRequest, User, EventVendor } from '../../types';
import { NIGERIAN_BANKS } from '../../data';
import { Plus, Calendar, MapPin, DollarSign, Users, Building, CheckCircle2, Clock, AlertCircle, ArrowUpRight, Sparkles } from 'lucide-react';

interface HostHubProps {
  currentUser: User;
  events: EventItem[];
  ticketTiers: TicketTier[];
  payoutRequests: PayoutRequest[];
  onAddEvent: (newEvent: EventItem, newTiers: TicketTier[]) => void;
  onRequestPayout: (payout: PayoutRequest) => void;
  onToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const HostHub: React.FC<HostHubProps> = ({
  currentUser,
  events,
  ticketTiers,
  payoutRequests,
  onAddEvent,
  onRequestPayout,
  onToast
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'create' | 'payouts'>('events');

  // New Event Form State
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('concert');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [city, setCity] = useState('Lagos');
  const [startTime, setStartTime] = useState('2026-11-20T19:00');
  const [endTime, setEndTime] = useState('2026-11-21T02:00');
  const [dressCode, setDressCode] = useState('Smart Chic / Glam');
  const [maxCapacity, setMaxCapacity] = useState(500);
  const [isPatronOnly, setIsPatronOnly] = useState(false);
  const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200');

  // Custom Ticket Tiers for Event Creation
  const [standardPrice, setStandardPrice] = useState('10000');
  const [vipPrice, setVipPrice] = useState('35000');
  const [tablePrice, setTablePrice] = useState('250000');

  // Payout Form State
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutBank, setPayoutBank] = useState(NIGERIAN_BANKS[0]);
  const [payoutAccountNum, setPayoutAccountNum] = useState('');
  const [payoutAccountName, setPayoutAccountName] = useState('ENTERTAINMENT SOLUTIONS LTD');
  const [payoutAmountNaira, setPayoutAmountNaira] = useState('500000');

  // Host events calculation
  const hostEvents = events.filter(e => e.created_by === currentUser.id || currentUser.appRole === 'admin');
  
  // Calculate total ticket revenue
  const totalHostRevenueNaira = ticketTiers
    .filter(t => hostEvents.some(e => e.id === t.event_id))
    .reduce((acc, t) => acc + (t.sold_count * (t.price_kobo / 100)), 0);

  const totalTicketsSold = ticketTiers
    .filter(t => hostEvents.some(e => e.id === t.event_id))
    .reduce((acc, t) => acc + t.sold_count, 0);

  const handleCreateEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !venueName.trim()) {
      onToast('Please provide event title and venue name', 'warning');
      return;
    }

    const eventId = `ev_${Date.now()}`;
    const newEvent: EventItem = {
      id: eventId,
      created_by: currentUser.id,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      tagline,
      description,
      category,
      cover_image: coverImage,
      venue_name: venueName,
      venue_address: venueAddress,
      city,
      state: city === 'Lagos' ? 'Lagos State' : city === 'Abuja' ? 'FCT' : 'Rivers State',
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      dress_code: dressCode,
      is_patron_only: isPatronOnly,
      max_capacity: Number(maxCapacity),
      status: currentUser.appRole === 'admin' ? 'published' : 'submitted',
      created_at: new Date().toISOString()
    };

    const newTiers: TicketTier[] = [
      {
        id: `tier_${Date.now()}_std`,
        event_id: eventId,
        name: 'Standard Pass',
        tier_type: 'standard',
        price_kobo: Math.max(0, parseInt(standardPrice, 10) || 10000) * 100,
        capacity: Math.floor(Number(maxCapacity) * 0.7),
        sold_count: 0,
        perks: ['General Admission Entry', 'Access to Main Floor']
      },
      {
        id: `tier_${Date.now()}_vip`,
        event_id: eventId,
        name: 'VIP Lounge Pass',
        tier_type: 'vip',
        price_kobo: Math.max(0, parseInt(vipPrice, 10) || 35000) * 100,
        capacity: Math.floor(Number(maxCapacity) * 0.25),
        sold_count: 0,
        perks: ['Fast-track VIP Gate', 'Complimentary Cocktail', 'Elevated Viewing Area']
      },
      {
        id: `tier_${Date.now()}_table`,
        event_id: eventId,
        name: 'VVIP Royal Table of 5',
        tier_type: 'table',
        price_kobo: Math.max(0, parseInt(tablePrice, 10) || 250000) * 100,
        capacity: 10,
        sold_count: 0,
        perks: ['Table for 5', '2 Premium Champagne Bottles', 'Dedicated Waiter & Valet']
      }
    ];

    onAddEvent(newEvent, newTiers);
    setActiveTab('events');
    onToast(
      currentUser.appRole === 'admin'
        ? `Event "${title}" published immediately to live directory!`
        : `Event "${title}" submitted to MPR / Admin compliance queue for review.`,
      'success'
    );
  };

  const handlePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(payoutAmountNaira, 10);
    if (!amount || amount < 50000) {
      onToast('Minimum payout request is ₦50,000', 'warning');
      return;
    }
    if (!payoutAccountNum.trim() || payoutAccountNum.length < 10) {
      onToast('Please enter a valid 10-digit NUBAN account number', 'warning');
      return;
    }

    const newPayout: PayoutRequest = {
      id: `payout_${Date.now()}`,
      event_id: hostEvents[0]?.id || 'ev_general',
      event_title: hostEvents[0]?.title || 'Event Ticket Sales',
      host_id: currentUser.id,
      host_name: currentUser.username || 'Host',
      gross_revenue_kobo: amount * 100,
      platform_fee_kobo: Math.round(amount * 0.05 * 100),
      net_payout_kobo: Math.round(amount * 0.95 * 100),
      bank_name: payoutBank,
      account_number: payoutAccountNum,
      account_name: payoutAccountName,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    onRequestPayout(newPayout);
    setIsPayoutModalOpen(false);
    onToast(`Payout request of ₦${amount.toLocaleString('en-NG')} submitted to finance compliance.`, 'success');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header & Metric Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Organizer Command Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Event Host Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your experiences, configure Paystack ticket tiers, and request bank payouts.
          </p>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Total Sales</span>
            <span className="text-lg font-black text-amber-400">₦{totalHostRevenueNaira.toLocaleString('en-NG')}</span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Tickets Sold</span>
            <span className="text-lg font-black text-white">{totalTicketsSold}</span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Live Events</span>
            <span className="text-lg font-black text-emerald-400">{hostEvents.length}</span>
          </div>
        </div>
      </div>

      {/* Hub Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'events'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            My Managed Events ({hostEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Create New Event
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'payouts'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            Bank Payouts ({payoutRequests.length})
          </button>
        </div>

        <button
          onClick={() => setIsPayoutModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Request Payout</span>
        </button>
      </div>

      {/* Tab: Events List */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {hostEvents.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Hosted Events Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Ready to organize an unforgettable experience? Create an event, configure Paystack ticket tiers, and issue passes.
              </p>
              <button
                onClick={() => setActiveTab('create')}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Launch First Event
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hostEvents.map(event => {
                const eventTiers = ticketTiers.filter(t => t.event_id === event.id);
                const sold = eventTiers.reduce((acc, t) => acc + t.sold_count, 0);
                const grossRev = eventTiers.reduce((acc, t) => acc + (t.sold_count * (t.price_kobo / 100)), 0);

                return (
                  <div
                    key={event.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${
                          event.status === 'published'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : event.status === 'under_review'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}>
                          {event.status.replace('_', ' ')}
                        </span>
                        <h4 className="text-base font-bold text-white font-['Syne']">{event.title}</h4>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          {event.venue_name}, {event.city}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Revenue</span>
                        <span className="text-base font-black text-amber-400">₦{grossRev.toLocaleString('en-NG')}</span>
                      </div>
                    </div>

                    {/* Tier Breakdowns */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1.5 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Tier Sales Status</span>
                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        {eventTiers.slice(0, 3).map(tier => (
                          <div key={tier.id} className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-slate-400 block truncate">{tier.name}</span>
                            <span className="text-xs font-bold text-white">{tier.sold_count}/{tier.capacity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Create Event Form */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreateEventSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-xl font-bold text-white font-['Syne']">Publish an Event Experience</h3>
            <p className="text-xs text-slate-400 mt-1">
              Events submitted by Hosts are sent to MPR/Admin reviewers for verification before going live.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-300 block mb-1 font-semibold">Event Title *</label>
              <input
                type="text"
                placeholder="e.g. Lagos Island Rooftop Sunset Session"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs text-slate-300 block mb-1 font-semibold">Short Catchy Tagline</label>
              <input
                type="text"
                placeholder="e.g. Exclusive culinary crafts, live DJ set and Afrobeat groove"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              >
                <option value="concert">Concert & Live Stage</option>
                <option value="party">VIP Party / Rave</option>
                <option value="mixer">Tech & Business Mixer</option>
                <option value="food">Food Festival & Grills</option>
                <option value="auction">Gala & Art Auction</option>
                <option value="birthday">Private Celebration</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">Host City</label>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              >
                <option value="Lagos">Lagos State</option>
                <option value="Abuja">Abuja (FCT)</option>
                <option value="Port Harcourt">Port Harcourt (Rivers)</option>
                <option value="Ibadan">Ibadan (Oyo)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">Venue Name *</label>
              <input
                type="text"
                placeholder="e.g. Landmark Centre / The Civic Centre"
                value={venueName}
                onChange={e => setVenueName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">Venue Street Address</label>
              <input
                type="text"
                placeholder="e.g. Water Corporation Drive, Victoria Island"
                value={venueAddress}
                onChange={e => setVenueAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">Start Date & Time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">Dress Code</label>
              <input
                type="text"
                value={dressCode}
                onChange={e => setDressCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs text-slate-300 block mb-1 font-semibold">Cover Image URL</label>
              <input
                type="url"
                value={coverImage}
                onChange={e => setCoverImage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs text-slate-300 block mb-1 font-semibold">Full Event Description</label>
              <textarea
                rows={3}
                placeholder="Give guests full details on what to expect, special performances, drink menus, and parking."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Ticket Tier Pricing Config */}
          <div className="border-t border-slate-800 pt-5 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-['Syne']">
              Configure Ticket Tier Prices (₦ NGN)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Standard Entry</span>
                <input
                  type="number"
                  value={standardPrice}
                  onChange={e => setStandardPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-bold"
                />
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">VIP Lounge Pass</span>
                <input
                  type="number"
                  value={vipPrice}
                  onChange={e => setVipPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-bold"
                />
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">VVIP Table of 5</span>
                <input
                  type="number"
                  value={tablePrice}
                  onChange={e => setTablePrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-bold"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('events')}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-amber-400/20 cursor-pointer"
            >
              Submit Event For Review
            </button>
          </div>
        </form>
      )}

      {/* Tab: Payouts */}
      {activeTab === 'payouts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-['Syne']">Nigerian Bank Payout History</h3>
            <span className="text-xs text-slate-400">All disbursements processed directly to verified NUBAN accounts</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5 font-semibold">Event</th>
                  <th className="p-3.5 font-semibold">Bank & Account</th>
                  <th className="p-3.5 font-semibold">Net Payout</th>
                  <th className="p-3.5 font-semibold">Status</th>
                  <th className="p-3.5 font-semibold">Requested Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {payoutRequests.map(p => (
                  <tr key={p.id} className="hover:bg-slate-850/50">
                    <td className="p-3.5 font-bold text-white">{p.event_title}</td>
                    <td className="p-3.5">
                      <p className="font-semibold text-white">{p.bank_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{p.account_number} • {p.account_name}</p>
                    </td>
                    <td className="p-3.5 font-black text-amber-400">
                      ₦{(p.net_payout_kobo / 100).toLocaleString('en-NG')}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.status === 'disbursed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : p.status === 'approved'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payout Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <h3 className="text-xl font-bold text-white font-['Syne']">Request Host Revenue Payout</h3>
            <p className="text-xs text-slate-400">
              Funds are disbursed in Nigerian Naira directly to your commercial bank or fintech account.
            </p>

            <form onSubmit={handlePayoutSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Select Bank</label>
                <select
                  value={payoutBank}
                  onChange={e => setPayoutBank(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  {NIGERIAN_BANKS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Account Number (NUBAN)</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="0123456789"
                  value={payoutAccountNum}
                  onChange={e => setPayoutAccountNum(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Account Name</label>
                <input
                  type="text"
                  value={payoutAccountName}
                  onChange={e => setPayoutAccountName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Payout Amount (₦ NGN)</label>
                <input
                  type="number"
                  value={payoutAmountNaira}
                  onChange={e => setPayoutAmountNaira(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">5% platform payment fee deducted automatically at settlement</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
