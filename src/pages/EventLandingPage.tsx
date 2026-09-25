import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Download,
  Heart,
  MapPin,
  Menu,
  Search,
  Smartphone,
  Star,
  Ticket,
  X,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';

export type LandingEvent = {
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
  min_price_kobo?: number | null;
  event_ticket_tiers?: Array<{
    id: string;
    name: string;
    tier_type: string;
    price_kobo: number;
    capacity: number;
    sold_count: number;
  }>;
};

const dateLabel = (value: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const priceLabel = (priceKobo?: number | null) => {
  if (priceKobo === undefined || priceKobo === null || Number(priceKobo) <= 0) return 'Free';
  return `NGN ${(Number(priceKobo) / 100).toLocaleString()}`;
};

export const EventLandingPage: React.FC = () => {
  const { user, isAdmin, isMpr } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<LandingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [likedEvents, setLikedEvents] = useState<Record<string, boolean>>({});

  const canCreateEvents = isAdmin || isMpr;
  const hostHref = canCreateEvents ? '/create-event' : !user ? '/login?redirect=%2Fcreate-event' : '/dashboard';

  // Step 6: Query real published events from Supabase events table
  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      setLoading(true);
      setLoadError('');

      try {
        // Query published events from Supabase ordered by start_time
        const { data, error } = await supabase
          .from('events')
          .select('*, event_ticket_tiers(*)')
          .eq('status', 'published')
          .order('start_time', { ascending: true })
          .limit(6);

        if (cancelled) return;

        if (error) {
          // Fallback query without relation if join fails
          const fallback = await supabase
            .from('events')
            .select('*')
            .eq('status', 'published')
            .order('start_time', { ascending: true })
            .limit(6);

          if (fallback.error) {
            setLoadError('Published events are temporarily unavailable.');
            setEvents([]);
          } else {
            setEvents((fallback.data || []) as LandingEvent[]);
          }
        } else {
          setEvents((data || []) as LandingEvent[]);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError('Failed to load events. Please try again.');
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live timer tick
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Compute next upcoming event for countdown
  const nextEvent = useMemo(() => {
    const upcoming = events.filter((e) => new Date(e.start_time).getTime() > now);
    return upcoming[0] || events[0] || null;
  }, [events, now]);

  const countdown = useMemo(() => {
    if (!nextEvent) return null;
    const diff = Math.max(0, new Date(nextEvent.start_time).getTime() - now);
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff / 3_600_000) % 24);
    const minutes = Math.floor((diff / 60_000) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, minutes, seconds, totalMs: diff };
  }, [nextEvent, now]);

  const toggleLike = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLikedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Middle ticket showcase data
  const showcaseEvent = nextEvent || events[0] || null;
  const showcaseTier = showcaseEvent?.event_ticket_tiers?.[0];
  const showcasePrice = showcaseTier ? showcaseTier.price_kobo : showcaseEvent?.min_price_kobo;

  // Circular gauge tick marks calculation (48 ticks)
  const totalTicks = 48;
  const activeTicksCount = countdown ? Math.max(8, Math.min(38, Math.floor((countdown.hours / 24) * totalTicks))) : 24;

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white selection:bg-[#F4E4BC]/30 font-sans">
      {/* ── HEADER / NAVIGATION ── */}
      <header className="sticky top-0 z-50 border-b border-[rgba(244,228,188,0.15)] bg-[#0A0F1E]/90 backdrop-blur-md">
        <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 sm:px-8">
          {/* Left: EVEX Logo */}
          <Link to="/" className="flex items-center gap-3 group" aria-label="EVEX Home">
            <span className="grid size-10 place-items-center rounded-xl border border-[rgba(244,228,188,0.3)] bg-[#0F1A2E] text-[#F5E6C8] shadow-[0_0_20px_rgba(244,228,188,0.15)] group-hover:border-[#F4E4BC] transition">
              <Ticket className="size-5" />
            </span>
            <span className="font-serif text-2xl font-bold tracking-[0.14em] text-white">
              EVVEX
            </span>
          </Link>

          {/* Center: Nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link to="/events" className="hover:text-[#F5E6C8] transition">
              Discover
            </Link>
            <Link to="/events" className="hover:text-[#F5E6C8] transition">
              Marketplace
            </Link>
            <a href="#about" className="hover:text-[#F5E6C8] transition">
              About Us
            </a>
          </div>

          {/* Right: Download App + Search icon + Sign In pill */}
          <div className="hidden md:flex items-center gap-3.5">
            <Link
              to="/download"
              className="inline-flex items-center gap-2 rounded-full border border-[#F4E4BC]/40 bg-[rgba(244,228,188,0.08)] px-4 py-2 text-xs sm:text-sm font-medium text-[#F5E6C8] hover:bg-[rgba(244,228,188,0.18)] hover:border-[#F4E4BC] transition shadow-[0_0_20px_rgba(244,228,188,0.1)] active:scale-95"
              title="Download EVVEX for Android"
            >
              <Download className="size-3.5 text-[#D4B483]" />
              <span>Download App</span>
            </Link>

            <Link
              to="/events"
              className="grid size-10 place-items-center rounded-full text-slate-300 hover:text-white hover:bg-white/5 transition"
              aria-label="Search events"
            >
              <Search className="size-4" />
            </Link>
            {user ? (
              <Link
                to="/dashboard"
                className="border border-[#F4E4BC]/40 text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-white/5 transition"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="border border-[#F4E4BC]/40 text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-white/5 transition"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile actions: Download + Hamburger */}
          <div className="flex md:hidden items-center gap-2.5">
            <Link
              to="/download"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#F4E4BC]/35 bg-[rgba(244,228,188,0.08)] px-3 py-1.5 text-xs font-medium text-[#F5E6C8] hover:bg-white/5 transition"
              aria-label="Download App"
            >
              <Download className="size-3.5 text-[#D4B483]" />
              <span>App</span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="grid size-10 place-items-center rounded-full text-white hover:bg-white/5"
              aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
            >
              {mobileMenuOpen ? <X className="size-6 text-[#F5E6C8]" /> : <Menu className="size-6" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[rgba(244,228,188,0.15)] bg-[#0A0F1E] px-6 py-5 shadow-2xl">
            <div className="flex flex-col gap-3 text-sm font-medium">
              <Link
                onClick={() => setMobileMenuOpen(false)}
                to="/download"
                className="flex items-center gap-2.5 rounded-xl border border-[rgba(244,228,188,0.25)] bg-[rgba(244,228,188,0.08)] px-3.5 py-2.5 text-sm font-semibold text-[#F5E6C8] hover:bg-[rgba(244,228,188,0.15)] transition"
              >
                <Smartphone className="size-4 text-[#D4B483]" />
                <span>Download Mobile App (Android APK)</span>
              </Link>

              <Link
                onClick={() => setMobileMenuOpen(false)}
                to="/events"
                className="py-2 text-slate-200 hover:text-[#F5E6C8]"
              >
                Discover Events
              </Link>
              <Link
                onClick={() => setMobileMenuOpen(false)}
                to="/events"
                className="py-2 text-slate-200 hover:text-[#F5E6C8]"
              >
                Marketplace
              </Link>
              <a
                onClick={() => setMobileMenuOpen(false)}
                href="#about"
                className="py-2 text-slate-200 hover:text-[#F5E6C8]"
              >
                About Us
              </a>
              <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                <Link
                  onClick={() => setMobileMenuOpen(false)}
                  to="/events"
                  className="rounded-full bg-[#F5E6C8] text-[#0A0F1E] py-2.5 text-center font-medium"
                >
                  Browse Events
                </Link>
                <Link
                  onClick={() => setMobileMenuOpen(false)}
                  to={hostHref}
                  className="rounded-full border border-[#F4E4BC]/40 text-white py-2.5 text-center font-medium"
                >
                  Create Event
                </Link>
                {!user && (
                  <Link
                    onClick={() => setMobileMenuOpen(false)}
                    to="/login"
                    className="text-center py-2 text-xs text-slate-400"
                  >
                    Sign In to your account
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── SECTION 1 — HERO ── */}
      <section className="relative overflow-hidden bg-[#0A0F1E] pt-12 pb-20 md:py-24">
        {/* Soft luxury background glow */}
        <div className="pointer-events-none absolute -top-40 right-0 w-[550px] h-[550px] rounded-full bg-[radial-gradient(circle,rgba(244,228,188,0.12)_0%,transparent_70%)] blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(212,180,131,0.08)_0%,transparent_70%)] blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column (60%): Headline, Subtext, Buttons, Carousel dots */}
          <div className="lg:col-span-7 flex flex-col items-start z-10">
            <h1 className="font-serif font-medium tracking-tight text-white leading-[1.08] text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
              Where Moments
              <br />
              Become Memories
            </h1>

            <p className="mt-6 text-base sm:text-lg md:text-xl text-slate-300 max-w-xl font-sans leading-relaxed">
              Discover, book, and experience events that matter.
            </p>

            {/* Buttons side by side */}
            <div className="mt-8 flex flex-wrap items-center gap-4 sm:gap-5">
              {/* Button A (Primary, cream) */}
              <Link
                to="/events"
                className="bg-[#F5E6C8] text-[#0A0F1E] rounded-full px-7 py-3.5 font-medium hover:bg-[#F4E4BC] shadow-[0_0_40px_rgba(244,228,188,0.2)] transition inline-flex items-center gap-2 text-sm sm:text-base active:scale-95"
              >
                Browse Events
              </Link>

              {/* Button B (Outlined, gold border) */}
              <Link
                to={hostHref}
                className="border border-[#F4E4BC]/40 text-white rounded-full px-7 py-3.5 font-medium hover:bg-white/5 transition inline-flex items-center gap-2 text-sm sm:text-base active:scale-95"
              >
                Create Event
              </Link>
            </div>

            {/* Decorative 3-dot carousel indicator below buttons */}
            <div className="mt-10 flex items-center gap-2" aria-hidden="true">
              <span className="size-2 rounded-full bg-[#F4E4BC]/40" />
              <span className="size-2 rounded-full bg-[#F4E4BC]" />
              <span className="size-2 rounded-full bg-[#F4E4BC]/40" />
            </div>
          </div>

          {/* Right Column (40%): Dark luxury portrait aesthetic */}
          <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[420px] aspect-[4/5] rounded-[32px] overflow-hidden border border-[rgba(244,228,188,0.2)] bg-gradient-to-br from-[#0F1A2E] to-[#1A2540] shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
              <img
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1100&q=85"
                alt="Sophisticated evening guest"
                className="size-full object-cover object-top filter brightness-95 contrast-105"
              />
              {/* Subtle luxury vignette & rim-lighting overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1E] via-[#0A0F1E]/20 to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(244,228,188,0.18)_0%,transparent_60%)]" />

              {/* Bottom caption badge */}
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-white/90">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4B483]">
                    Premier Live Access
                  </p>
                  <p className="font-serif text-lg font-medium text-white">Experience EVVEX</p>
                </div>
                <div className="grid size-9 place-items-center rounded-full border border-white/20 bg-white/10 backdrop-blur-sm">
                  <ArrowRight className="size-4 text-[#F5E6C8]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2 — TICKET SHOWCASE ── */}
      <section className="relative overflow-hidden bg-[#0F1A2E] py-20 md:py-28 border-y border-[rgba(244,228,188,0.1)]">
        {/* Subtle bokeh light streaks */}
        <div className="pointer-events-none absolute -top-24 left-1/3 size-80 rounded-full bg-[#F4E4BC]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 size-96 rounded-full bg-[#D4B483]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 flex flex-col items-center">
          {/* Floating ticket cards composition */}
          <div className="relative w-full max-w-4xl flex items-center justify-center min-h-[460px] py-6">
            {/* Left background card (tilted -5deg) */}
            <div
              className="hidden sm:block absolute left-8 md:left-16 z-0 w-64 md:w-72 bg-[#EFDFB8]/60 backdrop-blur-md rounded-2xl p-5 shadow-xl border border-[#F4E4BC]/30 text-[#0A0F1E] transform -rotate-6 scale-90 opacity-70 pointer-events-none select-none transition-all duration-300"
              aria-hidden="true"
            >
              <div className="aspect-[16/9] w-full rounded-xl bg-[#0A0F1E]/20 overflow-hidden mb-3">
                <img
                  src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80"
                  alt=""
                  className="size-full object-cover filter blur-[0.5px]"
                />
              </div>
              <h4 className="font-serif text-lg font-medium text-[#0A0F1E]/80">Linear Events</h4>
              <p className="text-[11px] text-[#4A4A4A]">Secret Garden · Lagos</p>
              <div className="mt-4 pt-3 border-t border-[#0A0F1E]/15 flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1 text-[#0A0F1E]/70">★ 4.9</span>
                <span>NGN 20,000</span>
              </div>
            </div>

            {/* Right background card (tilted +5deg) */}
            <div
              className="hidden sm:block absolute right-8 md:right-16 z-0 w-64 md:w-72 bg-[#EFDFB8]/60 backdrop-blur-md rounded-2xl p-5 shadow-xl border border-[#F4E4BC]/30 text-[#0A0F1E] transform rotate-6 scale-90 opacity-70 pointer-events-none select-none transition-all duration-300"
              aria-hidden="true"
            >
              <div className="aspect-[16/9] w-full rounded-xl bg-[#0A0F1E]/20 overflow-hidden mb-3">
                <img
                  src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=600&q=80"
                  alt=""
                  className="size-full object-cover filter blur-[0.5px]"
                />
              </div>
              <h4 className="font-serif text-lg font-medium text-[#0A0F1E]/80">VIP Afterdark</h4>
              <p className="text-[11px] text-[#4A4A4A]">Skyline Terrace · Abuja</p>
              {/* Barcode simulation */}
              <div className="mt-4 pt-3 border-t border-[#0A0F1E]/15 flex items-center justify-between">
                <div className="flex gap-[3px] h-6 items-end opacity-40">
                  <span className="w-1 bg-[#0A0F1E] h-full" />
                  <span className="w-0.5 bg-[#0A0F1E] h-4" />
                  <span className="w-1.5 bg-[#0A0F1E] h-full" />
                  <span className="w-0.5 bg-[#0A0F1E] h-5" />
                  <span className="w-1 bg-[#0A0F1E] h-full" />
                  <span className="w-0.5 bg-[#0A0F1E] h-3" />
                  <span className="w-1 bg-[#0A0F1E] h-full" />
                </div>
                <span className="text-xs font-semibold">NGN 35,000</span>
              </div>
            </div>

            {/* Middle elevated showcase card (Cream #F5E6C8 with high glow) */}
            <div className="relative z-10 w-full max-w-[340px] sm:max-w-[370px] bg-[#F5E6C8] text-[#0A0F1E] rounded-2xl p-6 shadow-2xl border border-[#F4E4BC]/80 shadow-[0_0_60px_rgba(244,228,188,0.3)] transition transform hover:scale-[1.02] duration-300">
              {/* Event thumbnail */}
              <div className="aspect-[16/10] w-full rounded-xl overflow-hidden bg-[#0A0F1E]/10 mb-4 shadow-sm relative">
                <img
                  src={
                    showcaseEvent?.cover_image ||
                    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80'
                  }
                  alt={showcaseEvent?.title || 'Featured Event'}
                  className="size-full object-cover"
                />
                <span className="absolute top-2.5 left-2.5 rounded-full bg-[#0A0F1E] px-2.5 py-0.5 text-[10px] font-bold text-[#F5E6C8] uppercase tracking-wider">
                  {showcaseEvent?.category || 'VIP Experience'}
                </span>
              </div>

              {/* Title & info */}
              <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#0A0F1E] line-clamp-1">
                {showcaseEvent?.title || 'Ethereal Horizons Live'}
              </h3>
              <p className="mt-1 text-xs text-[#4A4A4A] line-clamp-1">
                {showcaseEvent ? `${showcaseEvent.venue_name || 'Eko Hotel Convention'} · ${showcaseEvent.city || 'Lagos'}` : 'Grand Pavilion · Victoria Island, Lagos'}
              </p>
              <p className="mt-1 text-[11px] text-[#4A4A4A]/80 font-medium">
                {showcaseEvent ? dateLabel(showcaseEvent.start_time) : 'Saturday, Oct 24 · 7:00 PM'}
              </p>

              {/* Ticket perforation dashed line */}
              <div className="relative my-4 flex items-center justify-between">
                <span className="absolute -left-6 size-4 rounded-r-full bg-[#0F1A2E]" />
                <div className="w-full border-b border-dashed border-[#0A0F1E]/25" />
                <span className="absolute -right-6 size-4 rounded-l-full bg-[#0F1A2E]" />
              </div>

              {/* Barcode strip & bottom row */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => showcaseEvent && toggleLike(e, showcaseEvent.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#0A0F1E] hover:text-red-600 transition"
                  >
                    <Heart
                      className={`size-4 ${
                        showcaseEvent && likedEvents[showcaseEvent.id]
                          ? 'fill-red-500 text-red-500'
                          : 'fill-[#0A0F1E]/20 text-[#0A0F1E]'
                      }`}
                    />
                    <span>494</span>
                  </button>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#4A4A4A] block leading-none">
                    Admission
                  </span>
                  <span className="font-serif text-lg font-bold text-[#0A0F1E]">
                    {priceLabel(showcasePrice ?? 2500000)}
                  </span>
                </div>
              </div>

              {/* Barcode graphic footer */}
              <div className="mt-3 flex items-center justify-center gap-1 py-1 opacity-60">
                <div className="flex gap-[2px] h-7 items-end">
                  {[3, 5, 2, 4, 1, 6, 3, 2, 5, 4, 2, 6, 3, 4, 2, 5, 3].map((h, i) => (
                    <span
                      key={i}
                      className="bg-[#0A0F1E]"
                      style={{
                        width: i % 3 === 0 ? '3px' : '1.5px',
                        height: `${h * 4 + 4}px`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pagination dot indicators */}
          <div className="mt-8 flex items-center gap-2" aria-hidden="true">
            <span className="size-2 rounded-full bg-[#F4E4BC]/30" />
            <span className="h-2 w-5 rounded-full bg-[#F4E4BC]" />
            <span className="size-2 rounded-full bg-[#F4E4BC]/30" />
          </div>
        </div>
      </section>

      {/* ── SECTION 3 — LIMITED TICKETS / EVENT GRID ── */}
      <section id="upcoming" className="relative overflow-hidden bg-[#0A0F1E] py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-start">
            {/* Left Column (~35%): Circular countdown graphic */}
            <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left">
              <div className="relative size-60 sm:size-72 flex items-center justify-center">
                {/* SVG Radial Tick Gauge */}
                <svg className="size-full" viewBox="0 0 260 260">
                  <defs>
                    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F5E6C8" />
                      <stop offset="50%" stopColor="#D4B483" />
                      <stop offset="100%" stopColor="#F4E4BC" />
                    </linearGradient>
                    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* 48 radial tick marks */}
                  {Array.from({ length: totalTicks }).map((_, i) => {
                    const angle = (i * 360) / totalTicks;
                    const rad = (angle * Math.PI) / 180;
                    const r1 = i % 4 === 0 ? 102 : 108;
                    const r2 = 120;
                    const x1 = 130 + r1 * Math.sin(rad);
                    const y1 = 130 - r1 * Math.cos(rad);
                    const x2 = 130 + r2 * Math.sin(rad);
                    const y2 = 130 - r2 * Math.cos(rad);
                    const isActive = i <= activeTicksCount;

                    return (
                      <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={isActive ? '#F5E6C8' : 'rgba(255, 255, 255, 0.15)'}
                        strokeWidth={i % 4 === 0 ? 2 : 1}
                        strokeLinecap="round"
                      />
                    );
                  })}

                  {/* Glowing progress arc */}
                  <circle
                    cx="130"
                    cy="130"
                    r="90"
                    fill="none"
                    stroke="url(#goldGradient)"
                    strokeWidth="4"
                    strokeDasharray="565"
                    strokeDashoffset="180"
                    strokeLinecap="round"
                    filter="url(#goldGlow)"
                  />
                </svg>

                {/* Center countdown value */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="font-serif text-4xl sm:text-5xl font-medium text-white tracking-tight">
                    {countdown ? `${countdown.days}:${countdown.hours}` : '--:--'}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4B483] mt-1">
                    {nextEvent ? 'Next Live Gate' : 'Awaiting Gate'}
                  </p>
                </div>
              </div>

              {/* Tagline below countdown */}
              <p className="mt-6 text-sm text-slate-400 max-w-xs leading-relaxed">
                Limited tickets available — book before they're gone.
              </p>
            </div>

            {/* Right Column (~65%): Grid of Real Published Events */}
            <div className="lg:col-span-8">
              {loadError ? (
                <div className="rounded-2xl border border-[rgba(244,228,188,0.2)] bg-[#0F1A2E] p-8 text-center">
                  <p className="font-serif text-lg text-white">{loadError}</p>
                </div>
              ) : loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="animate-pulse rounded-2xl border border-white/10 bg-[#0F1A2E] p-4 h-64"
                    />
                  ))}
                </div>
              ) : events.length === 0 ? (
                /* Step 6: Empty state when 0 events exist */
                <div className="rounded-2xl border border-dashed border-[rgba(244,228,188,0.25)] bg-[#0F1A2E]/60 p-10 sm:p-14 text-center">
                  <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-[rgba(244,228,188,0.1)] text-[#F5E6C8]">
                    <Ticket className="size-6" />
                  </div>
                  <h3 className="font-serif text-2xl font-medium text-white">
                    No events yet. Be the first to create one.
                  </h3>
                  <p className="mt-2 text-sm text-[#B8B8B8] max-w-md mx-auto">
                    Publish your concert, masterclass, or VIP gala on EVVEX and reach attendees instantly.
                  </p>
                  <Link
                    to={hostHref}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#F5E6C8] px-6 py-3 text-sm font-medium text-[#0A0F1E] hover:bg-[#E5C88F] shadow-[0_0_40px_rgba(244,228,188,0.15)] transition"
                  >
                    Create Event
                  </Link>
                </div>
              ) : (
                /* Grid of real event cards matching reference dark card styling */
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {events.map((event) => {
                    const tier = event.event_ticket_tiers?.[0];
                    const price = tier ? tier.price_kobo : event.min_price_kobo;
                    const isLiked = likedEvents[event.id];

                    return (
                      <Link
                        key={event.id}
                        to={`/events/${event.id}`}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0F1A2E] transition-all duration-300 hover:border-[rgba(244,228,188,0.35)] hover:shadow-[0_0_30px_rgba(244,228,188,0.1)]"
                      >
                        {/* Cover Image */}
                        <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                          {event.cover_image ? (
                            <img
                              src={event.cover_image}
                              alt={event.title}
                              loading="lazy"
                              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="size-full flex items-center justify-center bg-gradient-to-br from-[#0F1A2E] to-[#1A2540] text-slate-500">
                              <Ticket className="size-8 text-[#D4B483]/40" />
                            </div>
                          )}

                          {/* Heart icon button top-right */}
                          <button
                            type="button"
                            onClick={(e) => toggleLike(e, event.id)}
                            className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-[#0A0F1E]/60 text-white backdrop-blur hover:bg-[#0A0F1E] transition"
                            aria-label="Like event"
                          >
                            <Heart
                              className={`size-4 ${
                                isLiked ? 'fill-red-500 text-red-500' : 'text-white'
                              }`}
                            />
                          </button>

                          {/* Category badge */}
                          <span className="absolute bottom-3 left-3 rounded-full bg-[#0A0F1E]/80 backdrop-blur px-2.5 py-0.5 text-[9px] font-bold text-[#F5E6C8] uppercase tracking-wider">
                            {event.category || 'Live Event'}
                          </span>
                        </div>

                        {/* Card body */}
                        <div className="flex flex-1 flex-col justify-between p-4">
                          <div>
                            <h4 className="font-semibold text-white group-hover:text-[#F5E6C8] transition line-clamp-1 text-base">
                              {event.title}
                            </h4>
                            <p className="mt-1 text-xs text-slate-400 line-clamp-1">
                              {dateLabel(event.start_time)} · {event.venue_name || event.city || 'Nigeria'}
                            </p>
                          </div>

                          {/* Bottom row: Star rating + count & Price */}
                          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                            <span className="flex items-center gap-1 text-xs text-[#D4B483]">
                              <Star className="size-3.5 fill-[#D4B483]" />
                              <span className="font-medium text-white/90">4.9</span>
                              <span className="text-slate-500 text-[10px]">(128)</span>
                            </span>
                            <span className="font-serif text-sm font-medium text-[#F5E6C8]">
                              {priceLabel(price)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER (with subtle live timer status bar) ── */}
      <footer className="border-t border-[rgba(244,228,188,0.15)] bg-[#0A0F1E] px-6 py-8 text-xs text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-serif font-bold text-white tracking-wider">EVVEX</span>
            <span>© {new Date().getFullYear()} EVVEX. All rights reserved.</span>
          </div>

          {/* Embedded live countdown indicator badge at footer */}
          {countdown && nextEvent && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(244,228,188,0.2)] bg-[#0F1A2E] px-3.5 py-1 text-[11px] text-[#F5E6C8]">
              <Clock3 className="size-3.5 text-[#D4B483]" />
              <span>Next Gate in {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s</span>
            </div>
          )}

          <div className="flex items-center gap-6 font-medium">
            <Link to="/terms" className="hover:text-[#F5E6C8] transition">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-[#F5E6C8] transition">
              Privacy
            </Link>
            <Link to="/support" className="hover:text-[#F5E6C8] transition">
              Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
