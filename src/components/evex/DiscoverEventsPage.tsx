import React, { useState, useMemo } from 'react';
import { 
  Search, MapPin, Calendar, Filter, Sparkles, ArrowRight,
  SlidersHorizontal, X, Tag
} from 'lucide-react';
import { EventItem, TicketTier, EventCategoryType } from '../../types';
import { EVENT_CATEGORIES } from '../../data';

interface DiscoverEventsPageProps {
  events: EventItem[];
  ticketTiers: TicketTier[];
  selectedCategory?: EventCategoryType;
  onSelectEvent: (event: EventItem) => void;
  onBackToLanding: () => void;
}

export const DiscoverEventsPage: React.FC<DiscoverEventsPageProps> = ({
  events,
  ticketTiers,
  selectedCategory = 'all',
  onSelectEvent,
  onBackToLanding
}) => {
  const [activeCategory, setActiveCategory] = useState<EventCategoryType>(selectedCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');

  const cities = ['all', 'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Enugu'];

  // Helper to get minimum starting price for an event
  const getStartingPrice = (eventId: string): string => {
    const eventTiers = ticketTiers.filter(t => t.event_id === eventId);
    if (eventTiers.length === 0) return 'Free RSVP';
    const prices = eventTiers.map(t => t.price_kobo);
    const minPrice = Math.min(...prices);
    if (minPrice === 0) return 'Free RSVP';
    return `From ₦${(minPrice / 100).toLocaleString('en-NG')}`;
  };

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Must be published or live for public discovery
      if (event.status !== 'published' && event.status !== 'live') return false;

      // Category filter
      if (activeCategory !== 'all' && event.category !== activeCategory) {
        return false;
      }

      // City filter
      if (selectedCity !== 'all' && event.city?.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }

      // Search query (title, venue, description)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = event.title.toLowerCase().includes(q);
        const matchVenue = event.venue_name.toLowerCase().includes(q);
        const matchDesc = event.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchVenue && !matchDesc) return false;
      }

      // Price filter
      if (priceFilter !== 'all') {
        const eventTiers = ticketTiers.filter(t => t.event_id === event.id);
        const isFree = eventTiers.some(t => t.price_kobo === 0) || eventTiers.length === 0;
        if (priceFilter === 'free' && !isFree) return false;
        if (priceFilter === 'paid' && isFree) return false;
      }

      return true;
    });
  }, [events, ticketTiers, activeCategory, selectedCity, searchQuery, priceFilter]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Top Header & Search Banner */}
      <div className="bg-slate-900/80 border-b border-slate-800 pt-6 pb-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>PAGE 2 • DISCOVER & EXPLORE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Upcoming Events in Nigeria
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Showing {filteredEvents.length} live verified events
              </p>
            </div>

            {/* City Selector Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                City:
              </span>
              {cities.map(city => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition capitalize whitespace-nowrap ${
                    selectedCity === city
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {city === 'all' ? 'All Nigeria' : city}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar & Quick Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="input-event-search"
                type="text"
                placeholder="Search by event title, venue, or artist..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Price Filter Toggle */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-700 w-full sm:w-auto justify-center">
              <button
                onClick={() => setPriceFilter('all')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  priceFilter === 'all' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                All Prices
              </button>
              <button
                onClick={() => setPriceFilter('free')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  priceFilter === 'free' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Free Only
              </button>
              <button
                onClick={() => setPriceFilter('paid')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  priceFilter === 'paid' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Ticketed
              </button>
            </div>
          </div>

          {/* Category Pills Slider */}
          <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-1 scrollbar-none">
            {EVENT_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                    : 'bg-slate-950/70 border border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white'
                }`}
              >
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Events Grid — Mobile First */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No events match your search</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
              Try adjusting your city filter, category selection, or search keywords to find other live experiences.
            </p>
            <button
              onClick={() => {
                setActiveCategory('all');
                setSelectedCity('all');
                setSearchQuery('');
                setPriceFilter('all');
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEvents.map(event => {
              const startingPrice = getStartingPrice(event.id);
              return (
                <div
                  key={event.id}
                  id={`event-card-${event.id}`}
                  onClick={() => onSelectEvent(event)}
                  className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-400/50 overflow-hidden flex flex-col justify-between transition-all hover:-translate-y-1 shadow-md hover:shadow-xl hover:shadow-amber-400/5"
                >
                  <div>
                    {/* Event Cover Image */}
                    <div className="relative h-44 sm:h-48 overflow-hidden bg-slate-800">
                      <img
                        src={event.cover_image}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-amber-300 border border-amber-400/30 capitalize">
                        {event.category.replace('_', ' ')}
                      </div>
                      
                      <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                        {event.status.toUpperCase()}
                      </div>
                    </div>

                    {/* Event Metadata */}
                    <div className="p-4 sm:p-5">
                      <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold mb-2">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{formatDate(event.start_time)}</span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition line-clamp-1 mb-1.5">
                        {event.title}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                        {event.tagline || event.description}
                      </p>

                      <div className="flex items-center gap-1 text-xs text-slate-300 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="line-clamp-1">{event.venue_name}, {event.city}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Footer */}
                  <div className="p-4 sm:p-5 pt-0">
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Tickets
                        </span>
                        <span className="text-sm font-extrabold text-amber-400">
                          {startingPrice}
                        </span>
                      </div>

                      <button
                        className="px-3.5 py-1.5 rounded-lg bg-slate-800 group-hover:bg-amber-400 group-hover:text-slate-950 text-xs font-bold text-slate-200 transition flex items-center gap-1"
                      >
                        Details <ArrowRight className="w-3 h-3" />
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
