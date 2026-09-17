import React, { useState, useMemo } from 'react';
import { EventItem, TicketTier } from '../../types';
import { Search, MapPin, Calendar, Clock, Users, Crown, Sparkles, Filter, ArrowRight } from 'lucide-react';

interface EventsExplorerProps {
  events: EventItem[];
  ticketTiers: TicketTier[];
  isPatron: boolean;
  onSelectEvent: (event: EventItem) => void;
  onOpenCreateEvent?: () => void;
}

const CITIES = ['All Cities', 'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan'];
const CATEGORIES = [
  { key: 'all', label: 'All Categories' },
  { key: 'concert', label: 'Concerts & Shows' },
  { key: 'mixer', label: 'Tech & Mixers' },
  { key: 'food', label: 'Food & Fiesta' },
  { key: 'auction', label: 'Galas & Art' },
  { key: 'patron_only', label: 'Patron Exclusive' }
];

export const EventsExplorer: React.FC<EventsExplorerProps> = ({
  events,
  ticketTiers,
  isPatron,
  onSelectEvent,
  onOpenCreateEvent
}) => {
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      // Must be published (or allow host to preview)
      if (ev.status !== 'published') return false;

      if (selectedCity !== 'All Cities' && ev.city !== selectedCity) {
        return false;
      }

      if (selectedCategory === 'patron_only') {
        if (!ev.is_patron_only) return false;
      } else if (selectedCategory !== 'all') {
        if (ev.category !== selectedCategory) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(query);
        const matchesVenue = ev.venue_name.toLowerCase().includes(query);
        const matchesDesc = (ev.description || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesVenue && !matchesDesc) return false;
      }

      return true;
    });
  }, [events, selectedCity, selectedCategory, searchQuery]);

  const getLowestPrice = (eventId: string): number => {
    const tiers = ticketTiers.filter(t => t.event_id === eventId);
    if (!tiers.length) return 0;
    return Math.min(...tiers.map(t => t.price_kobo / 100));
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Nigeria's Live Experience Ecosystem
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight font-['Syne'] leading-tight">
            Discover Unforgettable <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200">Experiences</span> & VIP Passes.
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            From exclusive rooftop galas in Victoria Island to Afrobeat live arenas and tech mixers in Maitama. Verified gate passes and instant Paystack checkouts.
          </p>
          <div className="pt-2 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                const el = document.getElementById('events-grid');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-amber-400/20 flex items-center gap-2 cursor-pointer text-sm"
            >
              <span>Explore Live Events</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {onOpenCreateEvent && (
              <button
                onClick={onOpenCreateEvent}
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-5 py-3 rounded-xl transition-all border border-slate-700 text-sm cursor-pointer"
              >
                Host an Event
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by event title, performer, or venue in Lagos, Abuja..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60 transition-all"
            />
          </div>

          {/* City Dropdown */}
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/60 cursor-pointer appearance-none"
            >
              {CITIES.map(c => (
                <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.key
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm shadow-amber-400/30'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      <div id="events-grid" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 font-['Syne']">
            <span>Live Events</span>
            <span className="text-xs bg-slate-800 text-amber-300 px-2 py-0.5 rounded-full font-mono">
              {filteredEvents.length} Active
            </span>
          </h2>
          <span className="text-xs text-slate-400">All prices in Nigerian Naira (₦)</span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Events Found</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              We couldn't find any events matching your search or filters. Try choosing another city or category.
            </p>
            <button
              onClick={() => { setSelectedCity('All Cities'); setSelectedCategory('all'); setSearchQuery(''); }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => {
              const lowestPrice = getLowestPrice(event.id);
              const eventDate = new Date(event.start_time).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              });
              const eventTime = new Date(event.start_time).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className="group bg-slate-900 border border-slate-800 hover:border-amber-400/50 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer flex flex-col"
                >
                  {/* Cover Photo */}
                  <div className="relative aspect-video overflow-hidden bg-slate-950">
                    <img
                      src={event.cover_image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800'}
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

                    {/* Patron Exclusive Badge */}
                    {event.is_patron_only && (
                      <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[11px] font-black tracking-wider uppercase px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md">
                        <Crown className="w-3.5 h-3.5" />
                        Patron Only
                      </div>
                    )}

                    {/* City Tag */}
                    <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md text-slate-200 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      {event.city}
                    </div>

                    {/* Date Pill Bottom Left */}
                    <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-md text-amber-300 text-xs font-bold px-2.5 py-1 rounded-lg border border-amber-400/30 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{eventDate} • {eventTime}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1 font-['Syne']">
                        {event.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {event.tagline || event.description}
                      </p>
                    </div>

                    {/* Venue & Capacity Info */}
                    <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{event.venue_name}, {event.city}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-500" />
                          Capacity: {event.max_capacity || 500} guests
                        </span>
                        {event.dress_code && (
                          <span className="text-amber-400/80 truncate max-w-[130px] font-medium">
                            {event.dress_code}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price and CTA */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Tickets From</span>
                        <span className="text-lg font-black text-amber-400">
                          {lowestPrice > 0 ? `₦${lowestPrice.toLocaleString('en-NG')}` : 'Free Access'}
                        </span>
                      </div>
                      <button className="bg-slate-800 group-hover:bg-amber-400 text-white group-hover:text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer">
                        <span>Get Passes</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
