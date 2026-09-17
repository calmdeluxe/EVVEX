import React from 'react';
import { 
  Compass, CalendarPlus, LogIn, ArrowRight, Sparkles, CheckCircle2, 
  MapPin, Calendar, Users, ShieldCheck, Ticket, QrCode
} from 'lucide-react';
import { EventItem, EventCategoryType } from '../../types';
import { EVENT_CATEGORIES } from '../../data';

interface EvexLandingPageProps {
  events: EventItem[];
  onExploreEvents: (category?: EventCategoryType) => void;
  onCreateEvent: () => void;
  onSignIn: () => void;
  onSelectEvent: (event: EventItem) => void;
}

export const EvexLandingPage: React.FC<EvexLandingPageProps> = ({
  events,
  onExploreEvents,
  onCreateEvent,
  onSignIn,
  onSelectEvent
}) => {
  // Published events
  const publishedEvents = events.filter(e => e.status === 'published');
  const featuredEvents = publishedEvents.slice(0, 3);
  const upcomingEvents = publishedEvents.slice(3, 7);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-400 selection:text-slate-950">
      {/* 1. HERO SECTION — Clean, High-Impact & Direct */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-slate-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(245,158,11,0.15),rgba(255,255,255,0))] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Nigeria's Live Event Ticketing & Experience Platform
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-4">
            EVEX
          </h1>
          
          <p className="text-xl sm:text-2xl md:text-3xl font-medium text-amber-400 mb-6 tracking-wide">
            Discover. Plan. Connect. Experience.
          </p>

          <p className="text-slate-300 max-w-2xl mx-auto text-base sm:text-lg mb-10 leading-relaxed">
            The modern gateway for concerts, masterclasses, dining festivals, private galas, and live experiences across Lagos, Abuja, Port Harcourt, and beyond.
          </p>

          {/* Primary Actions: Explore Events, Create an Event, Sign In */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
            <button
              id="hero-btn-explore"
              onClick={() => onExploreEvents('all')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-base shadow-xl shadow-amber-400/20 transition flex items-center justify-center gap-2"
            >
              <Compass className="w-5 h-5 text-slate-950" />
              Explore Events
            </button>

            <button
              id="hero-btn-create"
              onClick={onCreateEvent}
              className="w-full sm:w-auto px-7 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-base border border-slate-700 transition flex items-center justify-center gap-2"
            >
              <CalendarPlus className="w-5 h-5 text-amber-400" />
              Create an Event
            </button>

            <button
              id="hero-btn-signin"
              onClick={onSignIn}
              className="w-full sm:w-auto px-6 py-4 rounded-xl text-slate-300 hover:text-white font-medium text-base hover:bg-slate-900/60 transition flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4 text-slate-400" />
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* 2. EVENT CATEGORIES BROWSER */}
      <section className="py-12 border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Browse by Category</h2>
              <p className="text-xs sm:text-sm text-slate-400">Discover events tailored to what you love</p>
            </div>
            <button
              onClick={() => onExploreEvents('all')}
              className="text-xs sm:text-sm font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {EVENT_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => onExploreEvents(cat.id)}
                className="group text-left p-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-400/40 transition flex flex-col justify-between"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-amber-400/20 text-amber-400 flex items-center justify-center mb-2 transition">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200 group-hover:text-white line-clamp-1">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. FEATURED EVENTS SECTION */}
      <section className="py-14 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">Handpicked Highlights</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">Featured Events</h2>
            </div>
            <button
              onClick={() => onExploreEvents('all')}
              className="text-sm font-semibold text-amber-400 hover:underline flex items-center gap-1"
            >
              Explore all events <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredEvents.map(event => (
              <div
                key={event.id}
                onClick={() => onSelectEvent(event)}
                className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-400/50 overflow-hidden shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-800">
                  <img
                    src={event.cover_image}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-amber-300 border border-amber-400/30 capitalize">
                    {event.category.replace('_', ' ')}
                  </div>
                  {event.is_vip_only && (
                    <div className="absolute top-3 right-3 bg-amber-400 text-slate-950 px-2.5 py-1 rounded-full text-xs font-black shadow-md">
                      VIP ONLY
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold mb-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(event.start_time)}</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-amber-400 transition line-clamp-1 mb-1.5">
                    {event.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {event.tagline || event.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                    <span className="flex items-center gap-1 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {event.city || 'Lagos'}
                    </span>

                    <span className="font-bold text-amber-400 text-sm">
                      Get Tickets
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. UPCOMING EVENTS SHOWCASE */}
      {upcomingEvents.length > 0 && (
        <section className="py-14 border-b border-slate-800/80 bg-slate-900/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">On The Calendar</span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">Upcoming Events</h2>
              </div>
              <button
                onClick={() => onExploreEvents('all')}
                className="text-sm font-semibold text-amber-400 hover:underline flex items-center gap-1"
              >
                Browse directory <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {upcomingEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className="cursor-pointer rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400/40 p-4 transition group"
                >
                  <div className="h-36 rounded-lg overflow-hidden bg-slate-800 mb-3.5">
                    <img
                      src={event.cover_image}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block mb-1">
                    {event.category.replace('_', ' ')}
                  </span>
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition line-clamp-1 mb-1">
                    {event.title}
                  </h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-2">
                    <Calendar className="w-3 h-3" /> {formatDate(event.start_time)} • {event.city}
                  </p>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 text-slate-300">
                    <span>{event.venue_name}</span>
                    <span className="font-semibold text-amber-400">View</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. HOW EVEX WORKS — 3 Simple Pillars */}
      <section className="py-16 bg-slate-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">Simple & Transparent</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 mb-3">
            How EVEX Works
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto mb-12">
            No endless hoops. A frictionless gateway from initial discovery to live gate entry.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-white mb-2">Discover & Inspect</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Browse verified events across Nigeria. Review transparent ticket tiers, rules, dress codes, and full expectations before you decide.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-white mb-2">Instant Ticket & Pass</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Check out via Paystack or wallet in seconds. Immediately receive a tamper-proof digital pass with QR code and private access notes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-purple-400/10 text-purple-400 flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-white mb-2">Seamless Live Entry</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Show your digital pass at the entrance. Authorized scanners validate your admission in half a second with zero duplicate pass fraud.
              </p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Event Hosts
            </span>
            <span className="flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-amber-400" />
              Direct Paystack Settlement
            </span>
            <span className="flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-blue-400" />
              Real-time Gate Check-in
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
