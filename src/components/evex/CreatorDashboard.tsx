import React, { useState } from 'react';
import { 
  CalendarPlus, Ticket, Users, DollarSign, Sparkles, CheckCircle2, 
  Clock, Plus, Filter, QrCode, ArrowRight, ShieldCheck, Download, 
  Building, AlertCircle, ChevronRight, BarChart3, Bot, Settings
} from 'lucide-react';
import { 
  EventItem, TicketTier, PurchasedTicket, User, EventLifecycleStatus, 
  EventCategoryType, PayoutRequest, AiEventPlan
} from '../../types';
import { EVENT_CATEGORIES, NIGERIAN_BANKS } from '../../data';

interface CreatorDashboardProps {
  currentUser: User;
  events: EventItem[];
  ticketTiers: TicketTier[];
  purchasedTickets: PurchasedTicket[];
  onCreateEvent: (newEvent: Partial<EventItem>, tiers: Partial<TicketTier>[]) => void;
  onRequestPayout: (payout: Partial<PayoutRequest>) => void;
  onOpenGateScanner?: (eventId: string) => void;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({
  currentUser,
  events,
  ticketTiers,
  purchasedTickets,
  onCreateEvent,
  onRequestPayout
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'create' | 'ai_planner' | 'analytics' | 'payouts'>('events');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');

  // Creation Wizard Form State
  const [newTitle, setNewTitle] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<EventCategoryType>('concerts');
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');
  const [newCity, setNewCity] = useState('Lagos');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newCapacity, setNewCapacity] = useState(500);
  const [newCoverImage, setNewCoverImage] = useState('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200');
  const [tierName, setTierName] = useState('Regular Access');
  const [tierPriceNaira, setTierPriceNaira] = useState('10000');
  const [tierCapacity, setTierCapacity] = useState(250);

  // AI Planner State
  const [aiBudgetNaira, setAiBudgetNaira] = useState('5000000'); // ₦5,000,000
  const [aiEventType, setAiEventType] = useState('High-End Wedding / Gala');
  const [aiGuestCount, setAiGuestCount] = useState(300);
  const [aiGeneratedPlan, setAiGeneratedPlan] = useState<AiEventPlan | null>(null);
  const [isAiPlanning, setIsAiPlanning] = useState(false);

  // Payout Form State
  const [payoutBank, setPayoutBank] = useState(NIGERIAN_BANKS[0]);
  const [payoutAccountNum, setPayoutAccountNum] = useState('0123456789');
  const [payoutAccountName, setPayoutAccountName] = useState('EVEX ENTERTAINMENT SERVICES');
  const [payoutAmountNaira, setPayoutAmountNaira] = useState('500000');
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState('');

  // Calculations for selected event
  const selectedEvent = events.find(e => e.id === selectedEventId) || events[0];
  const eventTickets = purchasedTickets.filter(t => t.event_id === selectedEventId);
  const grossRevenueKobo = eventTickets.reduce((acc, t) => acc + t.price_paid_kobo, 0);
  const checkedInCount = eventTickets.filter(t => t.checked_in).length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newVenueName.trim()) return;

    const newEvent: Partial<EventItem> = {
      title: newTitle,
      tagline: newTagline,
      description: newDescription,
      category: newCategory,
      venue_name: newVenueName,
      venue_address: newVenueAddress,
      city: newCity,
      start_time: newStartTime || new Date(Date.now() + 86400000 * 7).toISOString(),
      end_time: newEndTime,
      max_capacity: newCapacity,
      cover_image: newCoverImage,
      status: 'under_review',
      organizer_name: currentUser.username,
      organizer_email: currentUser.email
    };

    const initialTier: Partial<TicketTier> = {
      name: tierName,
      price_kobo: (parseFloat(tierPriceNaira) || 0) * 100,
      capacity: tierCapacity,
      tier_type: 'standard',
      perks: ['Standard Venue Admission', 'Digital QR Ticket']
    };

    onCreateEvent(newEvent, [initialTier]);
    setActiveTab('events');
    alert('Event created and submitted for platform review!');
  };

  const handleGenerateAiPlan = () => {
    setIsAiPlanning(true);
    setTimeout(() => {
      setIsAiPlanning(false);
      const budgetTotal = parseFloat(aiBudgetNaira) || 5000000;
      setAiGeneratedPlan({
        suggestedBudgetBreakdown: [
          { category: 'Venue & Staging (35%)', allocatedKobo: budgetTotal * 0.35 * 100, notes: 'Main hall rental, basic sound truss, stage risers' },
          { category: 'Catering & Drinks (30%)', allocatedKobo: budgetTotal * 0.30 * 100, notes: 'Small chops, 2 buffet stations, mocktail/cocktail service' },
          { category: 'Sound, Lighting & DJ (15%)', allocatedKobo: budgetTotal * 0.15 * 100, notes: 'Line array speakers, moving heads, wireless mic kit' },
          { category: 'Security & Logistics (10%)', allocatedKobo: budgetTotal * 0.10 * 100, notes: '6 certified bouncers, crowd barricades, valet parking' },
          { category: 'Contingency & Permits (10%)', allocatedKobo: budgetTotal * 0.10 * 100, notes: 'LASAA branding permit, emergency backup generator' }
        ],
        tasks: [
          { id: 't1', title: 'Lock Down Venue Contract & Pay 50% Deposit', status: 'pending', priority: 'high', dueDate: '30 Days Before' },
          { id: 't2', title: 'Finalize Artisanal Grill & Drinks Menu with Vendor', status: 'pending', priority: 'high', dueDate: '21 Days Before' },
          { id: 't3', title: 'Launch Early Bird Ticket Tiers on EVEX', status: 'completed', priority: 'high', dueDate: '14 Days Before' },
          { id: 't4', title: 'Conduct Sound Check & Gate Scanner Testing', status: 'pending', priority: 'medium', dueDate: '2 Days Before' }
        ],
        recommendedVendorCategories: ['Caterer', 'Sound Engineer', 'Lighting Designer', 'Certified Security Bouncers']
      });
    }, 1200);
  };

  const handleRequestPayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(payoutAmountNaira);
    if (!amount || amount <= 0) return;

    onRequestPayout({
      event_id: selectedEvent?.id,
      event_title: selectedEvent?.title,
      host_id: currentUser.id,
      host_name: currentUser.username,
      gross_revenue_kobo: amount * 100,
      platform_fee_kobo: amount * 0.05 * 100,
      net_payout_kobo: amount * 0.95 * 100,
      bank_name: payoutBank,
      account_number: payoutAccountNum,
      account_name: payoutAccountName,
      status: 'pending'
    });

    setPayoutSuccessMsg(`Payout request for ₦${amount.toLocaleString('en-NG')} submitted for admin clearance.`);
    setTimeout(() => setPayoutSuccessMsg(''), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* Top Banner */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 pt-6 pb-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>LAYER 3 • EVENT CREATOR & HOST HUB</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Creator Management Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Manage your live events, scan attendee tickets, plan budgets, and request revenue payouts.
              </p>
            </div>

            <button
              onClick={() => setActiveTab('create')}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-400/20 transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <CalendarPlus className="w-4 h-4 text-slate-950" />
              + Create New Event
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-6 pb-1 scrollbar-none border-t border-slate-800/80 mt-6">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'events' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              My Events & Overview
            </button>

            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'create' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Event Wizard
            </button>

            <button
              onClick={() => setActiveTab('ai_planner')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'ai_planner' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-amber-400" />
              AI Event Planner
            </button>

            <button
              onClick={() => setActiveTab('payouts')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'payouts' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Bank Payouts (NUBAN)
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {/* TAB 1: MY EVENTS & OVERVIEW */}
        {activeTab === 'events' && (
          <div className="space-y-8">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Status:
              </span>
              {['all', 'published', 'under_review', 'draft', 'live', 'completed'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition ${
                    statusFilter === status
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Events Selector Column (1/3) */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Select Event to Inspect
                </h3>
                {events.map(ev => {
                  const isSelected = selectedEventId === ev.id;
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition ${
                        isSelected
                          ? 'bg-amber-400/10 border-amber-400 shadow'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-white line-clamp-1">{ev.title}</span>
                        <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                          {ev.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{ev.venue_name} • {ev.city}</p>
                    </div>
                  );
                })}
              </div>

              {/* Event Deep Dive & Analytics (2/3) */}
              {selectedEvent && (
                <div className="lg:col-span-2 space-y-6">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">Tickets Sold</span>
                      <p className="text-2xl font-black text-white">{eventTickets.length}</p>
                      <span className="text-[11px] text-slate-400">
                        Cap: {selectedEvent.max_capacity || 1000} passes
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">Gross Sales</span>
                      <p className="text-2xl font-black font-mono text-emerald-400">
                        ₦{(grossRevenueKobo / 100).toLocaleString('en-NG')}
                      </p>
                      <span className="text-[11px] text-slate-400">Direct Paystack & Wallet</span>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">Gate Check-ins</span>
                      <p className="text-2xl font-black text-amber-400">
                        {checkedInCount} <span className="text-xs text-slate-400 font-normal">/ {eventTickets.length}</span>
                      </p>
                      <span className="text-[11px] text-slate-400">Live scanners active</span>
                    </div>
                  </div>

                  {/* Gate Scanner Launch Box */}
                  <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-amber-400" />
                        Gate Check-in Scanner
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 max-w-md">
                        Equip your security and usher team with real-time QR camera validation for this event.
                      </p>
                    </div>

                    <button
                      onClick={() => alert(`Gate scanner camera stream activated for event: ${selectedEvent.title}`)}
                      className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow flex items-center gap-2"
                    >
                      <QrCode className="w-4 h-4" />
                      Launch Scanner
                    </button>
                  </div>

                  {/* Attendees Guestlist Table */}
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                    <h4 className="text-base font-bold text-white mb-4">
                      Attendee Guestlist ({eventTickets.length})
                    </h4>

                    {eventTickets.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">
                        No ticket sales recorded yet. Share your event link to start selling.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400">
                              <th className="pb-3 font-semibold">Attendee</th>
                              <th className="pb-3 font-semibold">Tier</th>
                              <th className="pb-3 font-semibold">Pass ID</th>
                              <th className="pb-3 font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {eventTickets.map(t => (
                              <tr key={t.id} className="py-2.5">
                                <td className="py-2.5">
                                  <span className="font-bold text-white block">{t.attendee_name}</span>
                                  <span className="text-[11px] text-slate-400">{t.attendee_email}</span>
                                </td>
                                <td className="py-2.5 text-amber-400 font-semibold">{t.tier_name}</td>
                                <td className="py-2.5 font-mono text-slate-300">{t.ticket_number}</td>
                                <td className="py-2.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    t.checked_in ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-300'
                                  }`}>
                                    {t.checked_in ? 'Checked In' : 'Not Arrived'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: EVENT CREATION WIZARD */}
        {activeTab === 'create' && (
          <div className="max-w-3xl mx-auto bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-2">Create a New Event</h2>
            <p className="text-xs text-slate-400 mb-6">
              Complete the required event parameters. Events are submitted to the EVEX review queue for publication.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lagos Island Rooftop Jazz & Wine Night"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Event Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as EventCategoryType)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 capitalize"
                  >
                    {EVENT_CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={e => setNewCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Venue Name & Address *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Venue Name (e.g. Civic Centre)"
                    value={newVenueName}
                    onChange={e => setNewVenueName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Street Address (e.g. Ozumba Mbadiwe Ave)"
                    value={newVenueAddress}
                    onChange={e => setNewVenueAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Description & Expectations
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe the experience, headline performers, dress code, and what attendees should expect..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Initial Ticket Tier Definition */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-amber-400 block">Initial Ticket Tier Setup</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Tier Name</label>
                    <input
                      type="text"
                      value={tierName}
                      onChange={e => setTierName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Price (₦)</label>
                    <input
                      type="number"
                      value={tierPriceNaira}
                      onChange={e => setTierPriceNaira(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Quantity / Capacity</label>
                    <input
                      type="number"
                      value={tierCapacity}
                      onChange={e => setTierCapacity(parseInt(e.target.value) || 100)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-lg shadow-amber-400/20 transition"
              >
                Submit Event For Review
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: AI EVENT PLANNER */}
        {activeTab === 'ai_planner' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 p-6 sm:p-8 rounded-3xl border border-amber-400/30">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Bot className="w-4 h-4" />
                <span>EVEX Intelligent Event Assistant</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
                AI Budget Estimator & Task Checklist Generator
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mb-6">
                Tell EVEX your event scope and target budget. Our engine calculates industry-standard allocations for Nigerian venues, caterers, security, and sound engineers.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Total Budget (₦)</label>
                  <input
                    type="number"
                    value={aiBudgetNaira}
                    onChange={e => setAiBudgetNaira(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Event Type</label>
                  <select
                    value={aiEventType}
                    onChange={e => setAiEventType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option>High-End Wedding / Gala</option>
                    <option>Live Music Concert / Festival</option>
                    <option>Tech Product Launch / Conference</option>
                    <option>Intimate 30th Birthday Soirée</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Estimated Guests</label>
                  <input
                    type="number"
                    value={aiGuestCount}
                    onChange={e => setAiGuestCount(parseInt(e.target.value) || 100)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateAiPlan}
                disabled={isAiPlanning}
                className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow transition flex items-center gap-2"
              >
                {isAiPlanning ? 'Generating Structured Plan...' : 'Generate AI Plan & Budget'}
              </button>
            </div>

            {/* Generated AI Results */}
            {aiGeneratedPlan && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Budget Allocations */}
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Recommended Budget Allocation
                  </h3>
                  <div className="space-y-3">
                    {aiGeneratedPlan.suggestedBudgetBreakdown.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                        <div className="flex justify-between font-bold text-white mb-1">
                          <span>{item.category}</span>
                          <span className="font-mono text-emerald-400">
                            ₦{(item.allocatedKobo / 100).toLocaleString('en-NG')}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px]">{item.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Milestone Checklist */}
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    Recommended Action Milestones
                  </h3>
                  <div className="space-y-2.5">
                    {aiGeneratedPlan.tasks.map(task => (
                      <div key={task.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{task.title}</p>
                          <span className="text-[10px] text-slate-400">Timeline: {task.dueDate}</span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                          {task.priority.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BANK PAYOUTS */}
        {activeTab === 'payouts' && (
          <div className="max-w-2xl mx-auto bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-2">Request Bank Settlement</h2>
            <p className="text-xs text-slate-400 mb-6">
              Transfer your verified ticket revenue directly to your Nigerian commercial bank account via NUBAN rails.
            </p>

            {payoutSuccessMsg && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{payoutSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleRequestPayoutSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Destination Commercial Bank *
                </label>
                <select
                  value={payoutBank}
                  onChange={e => setPayoutBank(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                >
                  {NIGERIAN_BANKS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  10-Digit NUBAN Account Number *
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={payoutAccountNum}
                  onChange={e => setPayoutAccountNum(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Account Name (Verified on NIBSS) *
                </label>
                <input
                  type="text"
                  value={payoutAccountName}
                  onChange={e => setPayoutAccountName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payout Amount (₦) *
                </label>
                <input
                  type="number"
                  value={payoutAmountNaira}
                  onChange={e => setPayoutAmountNaira(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-emerald-400 font-bold"
                  required
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Platform Processing Fee (5%):</span>
                  <span>₦{((parseFloat(payoutAmountNaira) || 0) * 0.05).toLocaleString('en-NG')}</span>
                </div>
                <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800">
                  <span>Net Expected in Bank:</span>
                  <span className="text-emerald-400">
                    ₦{((parseFloat(payoutAmountNaira) || 0) * 0.95).toLocaleString('en-NG')}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow transition"
              >
                Submit Payout Request
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
