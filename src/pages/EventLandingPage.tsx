import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Search,
  Ticket,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  Heart,
  Share2,
  Download,
  CalendarDays,
  Plus,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import { EvvexLogo } from '../components/EvvexLogo';

// Generated framework background assets
import corkboardBgMobile from '../assets/images/evvex_corkboard_bg_1790420198845.jpg';
import corkboardBgDesktop from '../assets/images/evvex_corkboard_desktop_1790420212259.jpg';
import artFriends from '../assets/images/evvex_art_friends_1790420229014.jpg';
import artMusic from '../assets/images/evvex_art_music_1790420243767.jpg';
import artFood from '../assets/images/evvex_art_food_1790420257765.jpg';

export type CorkboardEvent = {
  id: string;
  title: string;
  displayTag: string; // e.g. "Food", "Music", "Workshop", "Festival"
  cardTheme: 'terracotta' | 'cream' | 'sage';
  cursiveHeadline: string; // e.g. "Free", "Music", "Community", "Workshop"
  bottomPrimary: string; // e.g. "Free", "NGN 1,200", "Sat 22 Feb", "Lagos"
  bottomSecondary?: string;
  image: string;
  venue?: string;
  city?: string;
  dateStr?: string;
  startTimeRaw?: string | null;
  priceKobo?: number;
  description?: string;
  ticketTiers?: Array<{ id: string; name: string; price_kobo: number; capacity: number }>;
  isRealEvent: boolean;
};

export const EventLandingPage: React.FC = () => {
  const { user, isAdmin, isMpr } = useAuth();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbEvents, setDbEvents] = useState<CorkboardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedEvents, setLikedEvents] = useState<Record<string, boolean>>({});
  const [selectedEventModal, setSelectedEventModal] = useState<CorkboardEvent | null>(null);

  // Live clock state
  const [now, setNow] = useState(Date.now());
  const boardRef = useRef<HTMLDivElement>(null);

  // Determine host action destination
  const hostHref = (isAdmin || isMpr) ? '/create-event' : user ? '/create-book' : '/login?redirect=%2Fcreate-book';

  // Tick clock every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real, published events from Supabase
  useEffect(() => {
    let isMounted = true;
    const fetchPublishedEvents = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('events')
          .select('*, event_ticket_tiers(*)')
          .eq('status', 'published')
          .order('start_time', { ascending: true })
          .limit(20);

        if (!isMounted) return;

        if (!error && data && data.length > 0) {
          const themes: Array<'terracotta' | 'cream' | 'sage'> = ['terracotta', 'cream', 'sage', 'cream', 'sage', 'terracotta'];
          const mapped: CorkboardEvent[] = data
            .filter((ev: any) => ev.title && ev.title.trim().length > 0)
            .map((ev: any, idx: number) => {
              const theme = themes[idx % themes.length];
              const price = ev.min_price_kobo ?? ev.event_ticket_tiers?.[0]?.price_kobo ?? 0;
              const priceText = price === 0 ? 'Free' : `NGN ${(price / 100).toLocaleString()}`;
              const cat = ev.category || 'Gathering';
              let tag = 'Event';
              if (/food|dining|brunch|suya|grill|bbq/i.test(cat)) tag = 'Food';
              else if (/music|concert|acoustic|dj|party/i.test(cat)) tag = 'Music';
              else if (/workshop|masterclass|course|tech|training/i.test(cat)) tag = 'Workshop';
              else if (/festival|community|fair|carnival/i.test(cat)) tag = 'Festival';

              // Fallback illustration based on category if no custom event cover is uploaded
              const defaultImg = tag === 'Music' ? artMusic : tag === 'Food' ? artFood : artFriends;

              return {
                id: ev.id,
                title: ev.title,
                displayTag: tag,
                cardTheme: theme,
                cursiveHeadline: price === 0 ? 'Free' : tag,
                bottomPrimary: priceText,
                bottomSecondary: ev.city || 'Nigeria',
                image: ev.cover_image || defaultImg,
                venue: ev.venue_name || 'Location details inside',
                city: ev.city || 'Lagos',
                dateStr: ev.start_time
                  ? new Date(ev.start_time).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })
                  : 'Upcoming',
                startTimeRaw: ev.start_time,
                priceKobo: price,
                description: ev.description,
                ticketTiers: ev.event_ticket_tiers,
                isRealEvent: true
              };
            });

          setDbEvents(mapped);
        } else {
          setDbEvents([]);
        }
      } catch (err) {
        console.warn('Could not load live events from Supabase:', err);
        setDbEvents([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPublishedEvents();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter ONLY published real events (zero dummy items)
  const displayEvents = useMemo(() => {
    let source = [...dbEvents];

    if (selectedCategory !== 'All') {
      source = source.filter((ev) => {
        if (selectedCategory === 'Food & Dining') return ev.displayTag === 'Food';
        if (selectedCategory === 'Live Music') return ev.displayTag === 'Music';
        if (selectedCategory === 'Workshops') return ev.displayTag === 'Workshop';
        if (selectedCategory === 'Community') return ev.displayTag === 'Festival' || ev.displayTag === 'Community';
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      source = source.filter(
        (ev) =>
          ev.title.toLowerCase().includes(q) ||
          (ev.venue && ev.venue.toLowerCase().includes(q)) ||
          (ev.city && ev.city.toLowerCase().includes(q)) ||
          ev.displayTag.toLowerCase().includes(q)
      );
    }

    return source;
  }, [dbEvents, selectedCategory, searchQuery]);

  // Live countdown to the next real published event
  const nextGatheringInfo = useMemo(() => {
    const upcoming = dbEvents
      .filter((ev) => ev.startTimeRaw && new Date(ev.startTimeRaw).getTime() > now)
      .sort((a, b) => new Date(a.startTimeRaw!).getTime() - new Date(b.startTimeRaw!).getTime());

    if (upcoming.length === 0) {
      return {
        label: 'Next Gathering',
        countdown: 'Announcing Soon',
        hasUpcoming: false
      };
    }

    const nextEvent = upcoming[0];
    const diffMs = Math.max(0, new Date(nextEvent.startTimeRaw!).getTime() - now);
    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    let countdownStr = '';
    if (days > 0) {
      countdownStr = `${days}d ${String(hours).padStart(2, '0')}h`;
    } else {
      countdownStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return {
      label: nextEvent.title,
      countdown: countdownStr,
      hasUpcoming: true
    };
  }, [dbEvents, now]);

  const scrollToBoard = () => {
    boardRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLikedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen relative w-full overflow-x-hidden selection:bg-[#F5EEDB] selection:text-[#933D1E] font-sans">
      {/* ── 1. ABSOLUTE MAIN BACKGROUND FRAMEWORK LAYER ── */}
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: `url(${corkboardBgDesktop})`,
          backgroundColor: '#A84C27'
        }}
      >
        {/* Mobile portrait asset overlay */}
        <div
          className="absolute inset-0 sm:hidden bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${corkboardBgMobile})` }}
        />

        {/* Soft atmospheric gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#A84C27]/40 via-transparent to-[#576B57]/50" />
      </div>

      {/* ── 2. FOREGROUND CONTENT WRAPPER ── */}
      <div className="relative z-10 flex flex-col min-h-screen text-white">
        {/* ── HEADER / BRAND BAR ── */}
        <header className="w-full pt-6 pb-4 px-6 sm:px-12 max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <EvvexLogo size="md" variant="light" withTagline={false} />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold tracking-wide">
            <button onClick={scrollToBoard} className="text-white/90 hover:text-white transition-colors cursor-pointer">
              Explore Events
            </button>
            <Link to={hostHref} className="text-white/90 hover:text-white transition-colors">
              Host an Event
            </Link>
            <Link to="/events" className="text-white/90 hover:text-white transition-colors">
              Marketplace
            </Link>
            {user && (
              <Link to="/my-tickets" className="text-white/90 hover:text-white transition-colors">
                My Tickets
              </Link>
            )}
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Install / Download App Button */}
            <Link
              to="/download"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-semibold border border-white/20 transition-all active:scale-95 shadow-sm"
              title="Download EVVEX Native App"
            >
              <Download className="w-3.5 h-3.5" />
              <span>App</span>
            </Link>

            {/* Auth Button */}
            {user ? (
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#933D1E] hover:bg-[#FDFBF7] text-xs font-bold shadow transition-all active:scale-95"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#933D1E] hover:bg-[#FDFBF7] text-xs font-bold shadow transition-all active:scale-95"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white hover:text-white/80 focus:outline-none transition-transform active:scale-95"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
            </button>
          </div>
        </header>

        {/* ── MOBILE SLIDE-DOWN DRAWER ── */}
        {mobileMenuOpen && (
          <div className="md:hidden mx-6 p-6 rounded-3xl bg-[#933D1E]/95 backdrop-blur-xl border border-white/20 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex flex-col space-y-3 font-semibold text-base">
              <button
                onClick={() => {
                  scrollToBoard();
                  setMobileMenuOpen(false);
                }}
                className="text-left text-white/90 hover:text-white py-2 border-b border-white/10"
              >
                Explore Events
              </button>
              <Link
                to={hostHref}
                onClick={() => setMobileMenuOpen(false)}
                className="text-white/90 hover:text-white py-2 border-b border-white/10"
              >
                Host an Event
              </Link>
              <Link
                to="/events"
                onClick={() => setMobileMenuOpen(false)}
                className="text-white/90 hover:text-white py-2 border-b border-white/10"
              >
                Event Marketplace
              </Link>
              {user && (
                <Link
                  to="/my-tickets"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white/90 hover:text-white py-2 border-b border-white/10"
                >
                  My Tickets
                </Link>
              )}
              <Link
                to="/download"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between text-white/90 hover:text-white py-2 border-b border-white/10"
              >
                <span>Download Android App</span>
                <Download className="w-4 h-4" />
              </Link>
            </div>

            <div className="pt-2">
              {user ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full py-3 text-center rounded-full bg-white text-[#933D1E] font-bold text-sm shadow"
                >
                  Go to Host Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full py-3 text-center rounded-full bg-white text-[#933D1E] font-bold text-sm shadow"
                >
                  Sign In / Create Account
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── 3. HERO SECTION ── */}
        <section className="px-6 pt-10 sm:pt-16 pb-8 max-w-4xl mx-auto text-center flex flex-col items-center">
          {/* Main Editorial Headline */}
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-normal text-white leading-[1.08] tracking-tight drop-shadow-md">
            Gather near,<br />
            book easily
          </h1>

          {/* Subheading */}
          <p className="text-white/90 text-lg sm:text-xl font-medium tracking-wide mt-4 max-w-lg mx-auto">
            Find local experiences, pop-ups, and gatherings
          </p>

          {/* Two Hero Action Pills */}
          <div className="flex flex-row items-center justify-center gap-4 mt-7 w-full max-w-md">
            {/* Explore Events Button */}
            <button
              onClick={scrollToBoard}
              className="flex-1 max-w-[200px] h-12 rounded-full bg-white text-[#1C160C] hover:bg-[#FDFBF7] font-semibold text-sm sm:text-base flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              Explore Events
            </button>

            {/* Host an Event Button */}
            <Link
              to={hostHref}
              className="flex-1 max-w-[200px] h-12 rounded-full border border-white/80 text-white hover:bg-white/10 font-semibold text-sm sm:text-base flex items-center justify-center transition-all active:scale-95"
            >
              Host an Event
            </Link>
          </div>
        </section>

        {/* ── 4. CORK BULLETIN BOARD SHOWCASE ── */}
        <section ref={boardRef} className="px-4 sm:px-8 pb-20 max-w-5xl mx-auto w-full">
          {/* Category Switcher & Search Bar */}
          <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Category Segment Pills */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 rounded-full bg-[#1C160C]/25 backdrop-blur-md border border-white/10 shadow-inner">
              {['All', 'Food & Dining', 'Live Music', 'Workshops', 'Community'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-white text-[#933D1E] shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input Pill */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search experiences..."
                className="w-full pl-9 pr-4 py-1.5 rounded-full bg-[#1C160C]/25 backdrop-blur-md border border-white/15 text-xs text-white placeholder-white/60 focus:outline-none focus:ring-1 focus:ring-white/40"
              />
            </div>
          </div>

          {/* ── THE CORKBOARD FRAME CONTAINER ── */}
          <div className="relative rounded-[2.2rem] sm:rounded-[3rem] border-[10px] sm:border-[16px] border-[#DEB887]/85 bg-[#CA9E6B] shadow-[0_30px_70px_rgba(0,0,0,0.5)] p-4 sm:p-8 overflow-hidden min-h-[360px]">
            {/* Cork Surface Natural Texture Overlay */}
            <div
              className="absolute inset-0 opacity-25 pointer-events-none mix-blend-multiply"
              style={{
                backgroundImage: `radial-gradient(#5C3A1E 1px, transparent 1px), radial-gradient(#3B200E 1px, #CA9E6B 1px)`,
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 12px 12px'
              }}
            />

            {/* Bottom-left Green Pushpin Accent */}
            <div className="absolute bottom-4 left-4 z-20 w-4 h-4 rounded-full bg-[#3F5E4D] border-2 border-[#2A4234] shadow-md pointer-events-none" />

            {/* Pinned Items or Empty State */}
            {loading ? (
              <div className="relative z-10 flex flex-col items-center justify-center py-20 text-white">
                <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin mb-4" />
                <p className="text-sm font-bold opacity-80">Loading live gatherings...</p>
              </div>
            ) : displayEvents.length === 0 ? (
              <div className="relative z-10 max-w-md mx-auto my-8 p-8 rounded-3xl bg-[#F5EEDB] text-[#2C2216] shadow-xl border-2 border-dashed border-[#DEB887] text-center flex flex-col items-center justify-center">
                {/* Red pushpin at top */}
                <div className="w-5 h-5 rounded-full bg-[#B15332] border-2 border-[#82351A] shadow-md -mt-12 mb-4" />

                <CalendarDays className="w-12 h-12 text-[#B15332] mb-3 stroke-[1.5]" />
                <h3 className="font-serif text-2xl font-black text-[#2C2216]">
                  No Posted Gatherings Yet
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                  Only authentic, published events appear on this board. Be the first to create and publish an experience for your city!
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to={hostHref}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#B15332] text-white font-bold text-xs hover:bg-[#8F3B1D] shadow transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Post an Event</span>
                  </Link>

                  {selectedCategory !== 'All' && (
                    <button
                      onClick={() => {
                        setSelectedCategory('All');
                        setSearchQuery('');
                      }}
                      className="px-4 py-2.5 rounded-full bg-stone-200/80 text-stone-800 font-bold text-xs hover:bg-stone-300 transition"
                    >
                      Show All Categories
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {displayEvents.map((ev) => {
                  const themeBg =
                    ev.cardTheme === 'terracotta'
                      ? 'bg-[#B15332] text-white'
                      : ev.cardTheme === 'sage'
                      ? 'bg-[#6B8B7B] text-white'
                      : 'bg-[#F5EEDB] text-[#2C2216]';

                  const bottomBg =
                    ev.cardTheme === 'cream' ? 'text-[#2C2216]' : 'text-white';

                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEventModal(ev)}
                      className={`group relative rounded-2xl p-4 sm:p-5 shadow-[0_8px_20px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_30px_rgba(0,0,0,0.3)] cursor-pointer flex flex-col justify-between ${themeBg}`}
                    >
                      {/* Top Pinned String Loop */}
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-stone-800/40 bg-transparent flex items-center justify-center pointer-events-none">
                        <div className="w-1.5 h-1.5 rounded-full bg-stone-900/60" />
                      </div>

                      {/* Angled Kraft Paper Tag in Top-Right Corner */}
                      <div className="absolute top-2 right-2.5 z-10 px-2 py-0.5 rounded-sm bg-[#F8F3E6] text-[#4A3B2C] text-[10px] font-bold uppercase tracking-wider shadow-sm rotate-6 border border-[#E2D8C3] flex items-center gap-0.5">
                        <span>{ev.displayTag}</span>
                      </div>

                      {/* Card Upper: Cursive Title & Cover Artwork */}
                      <div className="space-y-3">
                        {/* Cursive Headline */}
                        <div className="pt-2 pr-12">
                          <span className="font-serif italic text-2xl sm:text-3xl font-normal tracking-tight block">
                            {ev.cursiveHeadline}
                          </span>
                        </div>

                        {/* Artwork Frame */}
                        <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-black/10 relative">
                          <img
                            src={ev.image}
                            alt={ev.title}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        </div>

                        {/* Event Title & Venue Details */}
                        <div>
                          <h3 className="font-bold text-sm leading-snug line-clamp-1">
                            {ev.title}
                          </h3>
                          <p className="text-xs opacity-80 mt-0.5 line-clamp-1">
                            {ev.venue} • {ev.city}
                          </p>
                        </div>
                      </div>

                      {/* Card Bottom Bar */}
                      <div className={`mt-4 pt-2 border-t border-black/10 flex items-center justify-between ${bottomBg}`}>
                        <span className="text-xs sm:text-sm font-black tracking-tight">
                          {ev.bottomPrimary}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => toggleFavorite(e, ev.id)}
                            className="p-1 rounded-full hover:bg-black/10 transition-colors"
                            title="Save to favorites"
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                likedEvents[ev.id] ? 'fill-red-500 text-red-500' : 'opacity-70'
                              }`}
                            />
                          </button>

                          <div className="w-6 h-6 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center group-hover:bg-white group-hover:text-[#933D1E] transition-all">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>

                          <Link
                            to={`/events/${ev.id}/apply`}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Apply to participate in ${ev.title}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#933D1E] text-white text-[10px] font-bold hover:bg-[#7D3218] transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Apply</span>
                          </Link>

                          {/* Category badge */}
                          <span className="absolute bottom-3 left-3 rounded-full bg-[#0A0F1E]/80 backdrop-blur px-2.5 py-0.5 text-[9px] font-bold text-[#F5E6C8] uppercase tracking-wider">
                            {ev.displayTag}
                          </span>
                        </div>
                      </div>
                    </div>
                    );
                  })}
              </div>
            )}
          </div>
        </section>

        {/* ── 5. FLOATING CIRCULAR COUNTDOWN BADGE ── */}
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={scrollToBoard}
            className="group flex items-center gap-3 px-4 py-3 rounded-full bg-[#F5EEDB] text-[#2C2216] shadow-[0_10px_25px_rgba(0,0,0,0.35)] hover:scale-105 active:scale-95 transition-all border border-[#DEB887]/60 cursor-pointer"
            title="Next upcoming gathering"
          >
            <div className="w-7 h-7 rounded-full bg-[#B15332] text-white flex items-center justify-center font-bold text-xs">
              →
            </div>
            <div className="text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#933D1E] max-w-[120px] truncate">
                {nextGatheringInfo.label}
              </div>
              <div className="text-xs sm:text-sm font-black tracking-tight">
                {nextGatheringInfo.hasUpcoming ? `in ${nextGatheringInfo.countdown}` : nextGatheringInfo.countdown}
              </div>
            </div>
          </button>
        </div>

        {/* ── 6. BRAND FOOTER ── */}
        <footer className="w-full py-8 text-center text-xs text-white/70">
          <p>© {new Date().getFullYear()} EVVEX — Nigeria’s Premier Live Experiences & Gathering Platform.</p>
        </footer>
      </div>

      {/* ── 7. EVENT DETAILS & TICKET RESERVATION MODAL ── */}
      {selectedEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FAF7F2] text-[#2C2216] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-[#DEB887]/80 flex flex-col max-h-[90vh]">
            {/* Modal Header Cover */}
            <div className="relative h-48 w-full bg-stone-900">
              <img
                src={selectedEventModal.image}
                alt={selectedEventModal.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedEventModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-4 px-2.5 py-0.5 rounded-full bg-[#B15332] text-white text-xs font-bold">
                {selectedEventModal.displayTag}
              </div>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <h3 className="text-2xl font-serif font-black text-[#2C2216]">
                  {selectedEventModal.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 mt-2">
                  <span className="flex items-center gap-1 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-[#B15332]" />
                    {selectedEventModal.dateStr || 'Upcoming'}
                  </span>
                  <span className="flex items-center gap-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-[#B15332]" />
                    {selectedEventModal.venue}, {selectedEventModal.city}
                  </span>
                </div>
              </div>

              {selectedEventModal.description && (
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  {selectedEventModal.description}
                </p>
              )}

              {/* Ticket Tiers */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <span className="text-xs font-black uppercase tracking-wider text-stone-500">
                  Admission Options
                </span>
                {selectedEventModal.ticketTiers && selectedEventModal.ticketTiers.length > 0 ? (
                  selectedEventModal.ticketTiers.map((tier) => (
                    <div
                      key={tier.id}
                      className="p-3 rounded-xl border border-stone-200 bg-white flex items-center justify-between shadow-xs"
                    >
                      <div>
                        <div className="font-bold text-xs">{tier.name}</div>
                        <div className="text-[10px] text-stone-500">{tier.capacity} passes total</div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-[#B15332]">
                          {tier.price_kobo === 0 ? 'Free' : `₦${(tier.price_kobo / 100).toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl border border-stone-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs">Standard Admission Pass</div>
                      <div className="text-[10px] text-stone-500">General access to gathering</div>
                    </div>
                    <span className="text-xs font-black text-[#B15332]">
                      {selectedEventModal.bottomPrimary}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom CTA */}
            <div className="p-4 bg-[#F2EDE4] border-t border-stone-200 flex items-center gap-3">
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator
                      .share({
                        title: selectedEventModal.title,
                        text: `Check out ${selectedEventModal.title} on EVVEX!`,
                        url: window.location.href
                      })
                      .catch(() => {});
                  }
                }}
                className="p-3 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-200 transition cursor-pointer"
                title="Share event"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setSelectedEventModal(null);
                  navigate(`/events/${selectedEventModal.id}`);
                }}
                className="flex-1 py-3 px-5 rounded-full bg-[#B15332] text-white hover:bg-[#974325] font-bold text-sm text-center shadow transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Ticket className="w-4 h-4" />
                <span>Get Tickets</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventLandingPage;
