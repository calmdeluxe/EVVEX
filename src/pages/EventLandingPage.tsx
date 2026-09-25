import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Menu, Ticket, X } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';

type LandingEvent = {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  venue_name: string | null;
  city: string | null;
  start_time: string;
  category: string | null;
  age_restriction: string | null;
  admission_mode: 'free' | 'ticketed' | null;
  max_capacity: number | null;
  event_ticket_tiers?: Array<{
    id: string;
    name: string;
    tier_type: string;
    price_kobo: number;
    capacity: number;
    sold_count: number;
  }>;
};

const dateLabel = (value: string) => new Intl.DateTimeFormat(undefined, {
  weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
}).format(new Date(value));

const priceLabel = (priceKobo: number) => Number(priceKobo) <= 0
  ? 'Free'
  : `NGN ${(Number(priceKobo) / 100).toLocaleString()}`;

export const EventLandingPage: React.FC = () => {
  const { user, isAdmin, isMpr } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<LandingEvent[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const canCreateEvents = isAdmin || isMpr;

  useEffect(() => {
    let cancelled = false;
    const loadEvents = async () => {
      setLoading(true);
      setLoadError('');
      const { data, error } = await supabase
        .from('events')
        .select('id, title, description, cover_image, venue_name, city, start_time, category, age_restriction, admission_mode, max_capacity, event_ticket_tiers(id, name, tier_type, price_kobo, capacity, sold_count)')
        .eq('status', 'published')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(8);

      if (cancelled) return;
      if (error) {
        setLoadError('Published events are temporarily unavailable. Please try again shortly.');
        setEvents([]);
      } else {
        setEvents((data || []) as LandingEvent[]);
      }
      setLoading(false);
    };

    loadEvents();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeEvent = events[activeIndex] || events[0] || null;
  const hasTicketsAvailable = events.some((event) =>
    (event.event_ticket_tiers || []).some((tier) => tier.price_kobo > 0 && tier.sold_count < tier.capacity),
  );
  const remaining = activeEvent ? Math.max(0, new Date(activeEvent.start_time).getTime() - now) : 0;
  const countdown = {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining / 3_600_000) % 24),
    minutes: Math.floor((remaining / 60_000) % 60),
    seconds: Math.floor((remaining / 1000) % 60),
  };
  const hostHref = canCreateEvents ? '/create-event' : !user ? '/login?redirect=%2Fcreate-event' : '/dashboard';
  const hostLabel = canCreateEvents ? 'Create Event' : !user ? 'Sign In' : 'Dashboard';

  const moveEvent = (direction: -1 | 1) => {
    if (events.length < 2) return;
    setActiveIndex((current) => (current + direction + events.length) % events.length);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#f2ecdf] text-[#101d35] selection:bg-[#c9a45d]/30">
      <header className="relative z-20 border-b border-[#10203a]/10 bg-[#f2ecdf]/90 backdrop-blur-md">
        <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="EVVEX home">
            <span className="grid size-9 place-items-center rounded-xl bg-[#10203a] text-[#e3c581]"><Ticket className="size-5" /></span>
            <span className="text-xl font-black tracking-[0.08em]">EVVEX</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-semibold text-[#10203a]/65 md:flex">
            <Link className="transition hover:text-[#ad8543]" to="/events">Events</Link>
            <a className="transition hover:text-[#ad8543]" href="#upcoming">Upcoming</a>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <Link to="/dashboard" className="rounded-full px-4 py-2 text-sm font-bold text-[#10203a] hover:bg-[#10203a]/5">Dashboard</Link>
            ) : (
              <Link to="/login" className="rounded-full px-4 py-2 text-sm font-bold text-[#10203a] hover:bg-[#10203a]/5">Sign in</Link>
            )}
            <Link to={hostHref} className="rounded-full border border-[#b49151]/65 px-5 py-2.5 text-sm font-bold text-[#10203a] transition hover:bg-[#10203a] hover:text-[#f6e6bf]">{hostLabel}</Link>
          </div>
          <button type="button" onClick={() => setMobileMenuOpen((open) => !open)} className="grid size-10 place-items-center rounded-full text-[#10203a] hover:bg-[#10203a]/5 md:hidden" aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}>
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </nav>
        {mobileMenuOpen && <div className="absolute left-0 right-0 top-full border-b border-[#10203a]/10 bg-[#f2ecdf] px-5 py-4 shadow-lg md:hidden">
          <div className="flex flex-col gap-1 text-sm font-semibold">
            <Link onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-[#10203a]/5" to="/events">Browse Events</Link>
            <a onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-[#10203a]/5" href="#upcoming">Upcoming</a>
            <Link onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-[#10203a]/5" to={hostHref}>{hostLabel}</Link>
          </div>
        </div>}
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-12 pt-10 sm:px-8 md:min-h-[620px] md:grid-cols-[1.05fr_0.95fr] md:gap-12 md:py-16">
        <div className="relative z-10 order-1 md:order-1">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#b49151]/35 bg-white/45 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#84652e]">
            <span className="size-1.5 rounded-full bg-[#b49151]" /> Moments worth showing up for
          </span>
          <h1 className="max-w-2xl font-serif text-[clamp(3rem,9vw,6.25rem)] font-semibold leading-[0.94] text-[#10203a]">Where Moments Become Memories</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[#263650]/75 sm:text-lg">Discover, book, and experience events that matter.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/events" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#c5a15d] px-6 text-sm font-black text-[#10203a] shadow-[0_10px_28px_rgba(150,113,48,0.2)] transition hover:-translate-y-0.5 hover:bg-[#d6b875]">Browse Events <ArrowRight className="size-4" /></Link>
            <Link to={hostHref} className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#a98748]/70 bg-transparent px-6 text-sm font-black text-[#10203a] transition hover:bg-[#10203a] hover:text-[#f6e6bf]">{hostLabel}</Link>
          </div>
          <p className="mt-8 text-xs font-semibold text-[#263650]/60">Gather for what moves you.</p>
        </div>
        <div className="relative order-2 mx-auto w-full max-w-[520px] md:order-2">
          <div className="absolute -inset-5 rounded-[38%] bg-[#c9a45d]/20 blur-3xl" />
          <div className="relative aspect-[4/4.25] overflow-hidden rounded-[32px] border border-white/65 bg-[#d9d0c1] shadow-[0_28px_70px_rgba(16,32,58,0.2)] sm:rounded-[42px]">
            <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1100&q=85" alt="A guest dressed for an evening event" className="absolute inset-0 size-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#101d35]/70 via-transparent to-[#101d35]/5" />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-white sm:bottom-7 sm:left-7 sm:right-7">
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ead39a]">Your evening starts here</p><p className="mt-1 font-serif text-2xl">Make room for wonder.</p></div>
              <span className="grid size-11 place-items-center rounded-full border border-white/50 bg-white/15 backdrop-blur"><ArrowRight className="size-5" /></span>
            </div>
          </div>
          <div className="absolute -bottom-5 left-4 right-4 h-8 rounded-[50%] bg-[#b9914d]/25 blur-xl sm:-bottom-7 sm:left-12 sm:right-12" />
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-5 pb-16 pt-5 sm:px-8 sm:pt-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9a773a]">Live on EVVEX</p><h2 className="mt-2 font-serif text-3xl font-semibold text-[#10203a] sm:text-4xl">Find your next moment</h2></div>
          <Link to="/events" className="hidden items-center gap-1 text-sm font-bold text-[#84652e] hover:text-[#10203a] sm:inline-flex">All events <ArrowRight className="size-4" /></Link>
        </div>

        {loadError ? <p role="status" className="rounded-2xl border border-[#10203a]/10 bg-white/55 p-6 text-sm font-medium text-[#263650]/70">{loadError}</p> : loading ? <p role="status" className="rounded-2xl border border-[#10203a]/10 bg-white/55 p-6 text-sm font-medium text-[#263650]/70">Loading published events...</p> : events.length === 0 ? <div className="rounded-2xl border border-[#10203a]/10 bg-white/55 p-8 text-center"><p className="font-serif text-2xl text-[#10203a]">The calendar is open.</p><p className="mt-2 text-sm text-[#263650]/65">No upcoming published events yet. Check back soon.</p></div> : <>
          <div className="relative mx-auto max-w-4xl">
            <div className="pointer-events-none absolute inset-x-8 bottom-0 h-10 rounded-full bg-[#c7a35f]/30 blur-2xl" />
                  <div className="relative flex items-center justify-center gap-3 overflow-hidden px-1 py-5 sm:gap-5 sm:px-5">
              {events.length > 1 && <button type="button" onClick={() => moveEvent(-1)} aria-label="Previous event" className="absolute left-2 z-20 grid size-10 shrink-0 place-items-center rounded-full border border-white/20 bg-[#10203a]/85 text-white shadow-lg backdrop-blur transition hover:bg-[#203657]"><ChevronLeft className="size-5" /></button>}
                {events.map((event, index) => {
                const distance = (index - activeIndex + events.length) % events.length;
                const isFeatured = distance === 0;
                  const eventTier = event.event_ticket_tiers?.find((tier) => tier.price_kobo > 0 && tier.sold_count < tier.capacity)
                    || null;
                  const allEventTiersSoldOut = event.admission_mode !== 'free'
                    && Boolean(event.event_ticket_tiers?.length)
                    && event.event_ticket_tiers?.every((tier) => tier.sold_count >= tier.capacity);
                  const carouselOrder = isFeatured ? 'order-2' : distance === events.length - 1 ? 'order-1' : 'order-3';
                if (events.length > 3 && distance > 1 && distance < events.length - 1) return null;
                return <article key={event.id} className={`${carouselOrder} ${isFeatured ? 'z-10 w-full max-w-[540px] scale-100 opacity-100' : 'hidden min-w-[120px] w-[16%] max-w-[150px] scale-[0.92] opacity-55 sm:block'} relative shrink-0 overflow-hidden rounded-[24px] border border-white/70 bg-[#10203a] text-white shadow-[0_18px_48px_rgba(16,32,58,0.22)] transition-all duration-500`}>
                  <Link to={`/events/${event.id}`} className="block">
                    <div className="relative aspect-[16/9] overflow-hidden bg-[#243651]">
                      {event.cover_image && <img src={event.cover_image} alt="" className="absolute inset-0 size-full object-cover" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#101d35] via-[#101d35]/10 to-transparent" />
                      <div className="absolute left-5 top-5 flex gap-2"><span className="rounded-full bg-[#e5c77f] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#10203a]">{event.category || 'Event'}</span><span className="rounded-full border border-white/30 bg-[#10203a]/45 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur">{event.age_restriction || 'All ages'}</span></div>
                      <div className="absolute bottom-4 left-5 right-5"><h3 className="font-serif text-2xl font-semibold sm:text-3xl">{event.title}</h3><p className="mt-1 line-clamp-1 text-xs font-medium text-white/75">{event.venue_name}{event.city ? ` · ${event.city}` : ''}</p></div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 p-4 sm:p-5">
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-white/75"><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5 text-[#e5c77f]" />{dateLabel(event.start_time)}</span><span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5 text-[#e5c77f]" />{event.venue_name}{event.city ? ` · ${event.city}` : ''}</span>{eventTier && <span className="inline-flex items-center gap-1.5"><Ticket className="size-3.5 text-[#e5c77f]" />{eventTier.name} · {priceLabel(eventTier.price_kobo)}</span>}{allEventTiersSoldOut && <span className="inline-flex items-center gap-1.5 text-[#efc9bb]"><Ticket className="size-3.5" />Sold out</span>}{event.admission_mode === 'free' && <span className="inline-flex items-center gap-1.5"><Ticket className="size-3.5 text-[#e5c77f]" />Free admission</span>}</div>
                      <span className="grid size-10 place-items-center rounded-full bg-[#e5c77f] text-[#10203a]"><ArrowRight className="size-4" /></span>
                    </div>
                  </Link>
                </article>;
              })}
              {events.length > 1 && <button type="button" onClick={() => moveEvent(1)} aria-label="Next event" className="absolute right-2 z-20 grid size-10 shrink-0 place-items-center rounded-full border border-white/20 bg-[#10203a]/85 text-white shadow-lg backdrop-blur transition hover:bg-[#203657]"><ChevronRight className="size-5" /></button>}
            </div>
          </div>

          <div className="mt-7 grid gap-6 md:grid-cols-[0.75fr_1.25fr] md:items-stretch">
            <div className="flex flex-col items-center justify-center rounded-[24px] border border-[#10203a]/10 bg-white/50 p-6 text-center sm:p-8">
              <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#9a773a]"><Clock3 className="size-3.5" />{activeEvent ? 'The next event begins in' : 'Countdown'}</p>
              {activeEvent ? <>
                <div className="relative mt-5 grid size-40 place-items-center rounded-full border border-[#b49151]/40 bg-[#fffaf0] shadow-[inset_0_0_0_8px_rgba(201,164,93,0.08),0_12px_30px_rgba(16,32,58,0.08)]">
                  <div className="absolute inset-2 rounded-full border border-dashed border-[#b49151]/45" />
                  <div><p className="font-serif text-5xl font-semibold text-[#10203a]">{String(countdown.days).padStart(2, '0')}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#9a773a]">Days</p></div>
                </div>
                <div className="mt-4 flex gap-3 text-xs font-black tabular-nums text-[#10203a]"><span>{String(countdown.hours).padStart(2, '0')}h</span><span>{String(countdown.minutes).padStart(2, '0')}m</span><span>{String(countdown.seconds).padStart(2, '0')}s</span></div>
                <p className="mt-3 max-w-xs text-xs font-semibold text-[#263650]/60">{activeEvent.title}</p>
              </> : <p className="mt-5 max-w-xs text-sm text-[#263650]/65">A live countdown appears when an upcoming published event is available.</p>}
            </div>
            <div id="upcoming" className="min-w-0 rounded-[24px] border border-[#10203a]/10 bg-white/40 p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between"><h3 className="font-serif text-2xl font-semibold text-[#10203a]">Upcoming events</h3></div>
              {events.length > 0 ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {events.slice(0, 3).map((event) => <Link key={event.id} to={`/events/${event.id}`} className="group min-w-0 overflow-hidden rounded-2xl border border-[#10203a]/10 bg-[#fffdf8] transition hover:-translate-y-0.5 hover:shadow-lg">
                  {event.cover_image && <div className="aspect-[16/9] overflow-hidden bg-[#10203a]/10"><img src={event.cover_image} alt="" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" /></div>}
                  <div className="p-4"><p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#9a773a]">{dateLabel(event.start_time)}</p><h4 className="mt-2 line-clamp-2 font-bold text-[#10203a]">{event.title}</h4><p className="mt-1 line-clamp-1 text-xs text-[#263650]/65">{event.venue_name}{event.city ? ` · ${event.city}` : ''}</p></div>
                </Link>)}
              </div> : <p className="rounded-xl bg-white/70 p-5 text-sm text-[#263650]/65">No published events are available to show right now.</p>}
              {hasTicketsAvailable && <p className="mt-5 border-t border-[#10203a]/10 pt-4 text-xs font-semibold text-[#263650]/65">Limited tickets available — book before they’re gone.</p>}
            </div>
          </div>
        </>}
      </section>
      <footer className="border-t border-[#10203a]/10 px-5 py-6 text-center text-xs font-semibold text-[#263650]/55 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row"><span>© {new Date().getFullYear()} EVVEX</span><div className="flex gap-5"><Link to="/terms" className="hover:text-[#84652e]">Terms</Link><Link to="/privacy" className="hover:text-[#84652e]">Privacy</Link><Link to="/support" className="hover:text-[#84652e]">Support</Link></div></div>
      </footer>
    </main>
  );
};
