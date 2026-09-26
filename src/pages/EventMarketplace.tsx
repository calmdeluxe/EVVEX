import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin, Ticket, Users } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { FrameworkBackground } from '../components/FrameworkBackground';
import { EvvexLogo } from '../components/EvvexLogo';

interface PaystackHandler {
  openIframe: () => void;
}

declare global {
  interface Window {
    PaystackPop?: { setup: (options: Record<string, unknown>) => PaystackHandler };
  }
}

const formatPrice = (kobo: number) => `NGN ${(Number(kobo || 0) / 100).toLocaleString()}`;

export const EventMarketplace: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [event, setEvent] = useState<any | null>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paystackKey, setPaystackKey] = useState('');
  const [attendee, setAttendee] = useState({ name: '', email: user?.email || '', phone: '' });

  useEffect(() => {
    const scriptId = 'paystack-inline-js';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }

    const load = async () => {
      setLoading(true);
      setError('');
      const configPromise = supabase.from('config').select('value').eq('key', 'paystack_public_key').maybeSingle();
      if (id) {
        const [{ data: eventData, error: eventError }, { data: tierData, error: tierError }, { data: config }] = await Promise.all([
          supabase.from('events').select('*').eq('id', id).eq('status', 'published').maybeSingle(),
          supabase.from('event_ticket_tiers').select('*').eq('event_id', id).order('price_kobo', { ascending: true }),
          configPromise,
        ]);
        if (eventError || tierError) setError(eventError?.message || tierError?.message || 'Unable to load this event.');
        setEvent(eventData);
        setTiers(tierData || []);
        setPaystackKey(config?.value || '');
      } else {
        const [{ data: eventData, error: eventError }, { data: config }] = await Promise.all([
          supabase.from('events').select('id, title, description, cover_image, venue_name, city, state, start_time, end_time, max_capacity, category, age_restriction, admission_mode, slug').eq('status', 'published').order('start_time', { ascending: true }),
          configPromise,
        ]);
        if (eventError) setError(eventError.message);
        setEvents(eventData || []);
        setPaystackKey(config?.value || '');
      }
      setLoading(false);
    };
    load();
  }, [id]);

  useEffect(() => {
    if (user?.email) setAttendee((current) => ({ ...current, email: current.email || user.email || '' }));
  }, [user?.email]);

  const purchase = (tier: any) => {
    if (!user) {
      setError('Please sign in before purchasing a ticket.');
      return;
    }
    if (!event || !paystackKey || !window.PaystackPop) {
      setError('Ticket payments are temporarily unavailable.');
      return;
    }
    if (!attendee.name.trim() || !attendee.email.trim() || !attendee.phone.trim()) {
      setError('Attendee name, email, and phone are required.');
      return;
    }
    const amountKobo = Number(tier.price_kobo || 0);
    if (!Number.isSafeInteger(amountKobo) || amountKobo <= 0) {
      setError('Free-ticket claiming is not enabled in this payment flow yet.');
      return;
    }
    if (Number(tier.sold_count || 0) >= Number(tier.capacity || 0)) {
      setError('This ticket tier is sold out.');
      return;
    }
    // Validate sales window
    const now = new Date();
    if (tier.sales_start && new Date(tier.sales_start) > now) {
      setError('Ticket sales have not started yet.');
      return;
    }
    if (tier.sales_end && new Date(tier.sales_end) < now) {
      setError('Ticket sales have ended.');
      return;
    }
    // Validate patron-only tier
    if (tier.is_patron_only) {
      // The user's patron status is checked via the auth context
      // For now we allow the attempt; the webhook will validate
      console.warn('Patron-only tier purchase attempted - webhook will validate entitlement');
    }

    const ticketNumber = `EVX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    setError('');
    setSuccess('Opening secure payment...');
    const handler = window.PaystackPop.setup({
      key: paystackKey,
      email: attendee.email.trim(),
      amount: amountKobo,
      currency: 'NGN',
      ref: ticketNumber,
      metadata: {
        type: 'event_ticket',
        event_id: event.id,
        tier_id: tier.id,
        user_id: user.id,
        attendee_name: attendee.name.trim(),
        attendee_email: attendee.email.trim(),
        attendee_phone: attendee.phone.trim(),
        ticket_number: ticketNumber,
      },
      callback: () => setSuccess('Payment received. Your ticket will appear in My Tickets after confirmation.'),
      onClose: () => setSuccess('Payment window closed.'),
    });
    handler.openIframe();
  };

  if (loading) return <div className="p-8 text-center font-bold">Loading events...</div>;
  if (error && !event && id) return <div className="p-8 text-center text-red-700 font-bold">{error}</div>;

  if (!id) {
    return (
      <FrameworkBackground overlayOpacity="from-[#A84C27]/30 via-transparent to-[#576B57]/50">
        <main className="min-h-screen p-6 md:p-10 text-white">
          <div className="mx-auto max-w-6xl space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[#F5EEDB]">EVVEX Experiences</p>
                <h1 className="mt-2 text-4xl font-serif font-black text-white">Find your next gathering</h1>
              </div>
              <Link to="/" className="self-start sm:self-auto text-xs font-bold text-white/90 hover:text-white px-4 py-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 transition active:scale-95">
                ← Back to Home
              </Link>
            </header>
            {events.length === 0 ? (
              <div className="rounded-3xl bg-[#FAF7F2] p-8 text-[#2C2216] border border-[#DEB887]/60 shadow-lg text-center">
                <p className="font-bold text-base">No published events are available yet.</p>
                <p className="text-xs text-stone-500 mt-1">Check back soon or create your own gathering!</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map((item) => (
                  <Link
                    key={item.id}
                    to={`/events/${item.id}`}
                    className="overflow-hidden rounded-3xl border border-[#DEB887]/60 bg-[#FAF7F2] text-[#2C2216] shadow-md transition hover:-translate-y-1 hover:shadow-xl group"
                  >
                    <div className="aspect-[16/9] bg-stone-900 overflow-hidden relative">
                      {item.cover_image ? (
                        <img src={item.cover_image} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#A84C27] to-[#431407]">
                          <EvvexLogo size="md" variant="light" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-sm bg-[#F8F3E6] text-[#4A3B2C] text-[10px] font-bold uppercase tracking-wider shadow-sm border border-[#E2D8C3]">
                        {item.category || 'Event'}
                      </div>
                    </div>
                    <div className="space-y-3 p-5">
                      <h2 className="text-xl font-bold leading-snug">{item.title}</h2>
                      <p className="line-clamp-2 text-xs text-stone-600 leading-relaxed">{item.description}</p>
                      <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
                        <CalendarDays className="h-4 w-4 text-[#B15332]" />
                        {new Date(item.start_time).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
                        <MapPin className="h-4 w-4 text-[#B15332]" />
                        {item.venue_name}, {item.city}
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase text-stone-500">
                        <span>{item.category || 'other'}</span>
                        <span>•</span>
                        <span>{item.age_restriction || '18+'}</span>
                        <span>•</span>
                        <span>{item.admission_mode === 'free' ? 'Free admission' : 'Ticketed'}</span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#B15332] pt-2 border-t border-stone-200">
                        View event & passes <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </FrameworkBackground>
    );
  }

  return (
    <FrameworkBackground overlayOpacity="from-[#A84C27]/30 via-transparent to-[#576B57]/50">
      <main className="min-h-screen p-6 md:p-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <Link to="/events" className="inline-flex items-center gap-1 text-xs font-bold text-white/90 hover:text-white px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 transition active:scale-95">
            ← Back to events
          </Link>
          <section className="overflow-hidden rounded-3xl bg-[#FAF7F2] text-[#2C2216] border border-[#DEB887]/60 shadow-xl">
            <div className="aspect-[21/8] bg-stone-900">
              {event?.cover_image && <img src={event.cover_image} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="space-y-4 p-6 md:p-8">
              <h1 className="text-3xl sm:text-4xl font-serif font-black text-[#2C2216]">{event?.title}</h1>
              <p className="text-stone-700 leading-relaxed text-sm">{event?.description}</p>
              <div className="flex flex-wrap gap-2 text-xs font-black uppercase text-stone-500">
                <span>{event?.category || 'other'}</span>
                <span>•</span>
                <span>{event?.age_restriction || '18+'}</span>
                <span>•</span>
                <span>{event?.admission_mode === 'free' ? 'Free admission' : 'Ticketed event'}</span>
              </div>
              <div className="grid gap-3 text-xs sm:text-sm font-bold text-stone-700 md:grid-cols-3 pt-2 border-t border-stone-200">
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#B15332]" />
                  {new Date(event?.start_time).toLocaleString()}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#B15332]" />
                  {event?.venue_name}, {event?.city}
                </span>
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#B15332]" />
                  Capacity: {event?.max_capacity ?? event?.capacity ?? 'Open'}
                </span>
              </div>
              {(event?.contact_email || event?.contact_phone || event?.contact_instructions) && (
                <div className="rounded-2xl bg-[#F5EEDB] p-4 text-xs font-bold text-[#2C2216] border border-[#DEB887]/60">
                  <p className="uppercase text-[10px] text-[#933D1E] tracking-wider mb-1">Host Contact Information</p>
                  {event.contact_email && <p>Email: {event.contact_email}</p>}
                  {event.contact_phone && <p>Phone / WhatsApp: {event.contact_phone}</p>}
                  {event.contact_instructions && <p className="mt-1 font-medium">{event.contact_instructions}</p>}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-[#FAF7F2] text-[#2C2216] p-6 shadow-xl border border-[#DEB887]/60 md:p-8">
            <h2 className="mb-5 text-2xl font-serif font-black">Choose a ticket</h2>
            <div className="mb-6 grid gap-3 md:grid-cols-3">
              <input
                aria-label="Attendee name"
                placeholder="Attendee name"
                value={attendee.name}
                onChange={(e) => setAttendee({ ...attendee, name: e.target.value })}
                className="h-12 rounded-xl border border-[#DEB887]/60 bg-white px-4 text-sm text-[#2C2216] focus:outline-none focus:ring-2 focus:ring-[#B15332]"
              />
              <input
                aria-label="Attendee email"
                placeholder="Email"
                type="email"
                value={attendee.email}
                onChange={(e) => setAttendee({ ...attendee, email: e.target.value })}
                className="h-12 rounded-xl border border-[#DEB887]/60 bg-white px-4 text-sm text-[#2C2216] focus:outline-none focus:ring-2 focus:ring-[#B15332]"
              />
              <input
                aria-label="Attendee phone"
                placeholder="Phone / WhatsApp"
                value={attendee.phone}
                onChange={(e) => setAttendee({ ...attendee, phone: e.target.value })}
                className="h-12 rounded-xl border border-[#DEB887]/60 bg-white px-4 text-sm text-[#2C2216] focus:outline-none focus:ring-2 focus:ring-[#B15332]"
              />
            </div>
            {success && <p className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800">{success}</p>}
            {error && <p className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-800">{error}</p>}
            <div className="space-y-3">
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="flex flex-col gap-4 rounded-2xl border border-[#DEB887]/60 bg-white p-4 md:flex-row md:items-center md:justify-between shadow-xs"
                >
                  <div>
                    <h3 className="font-bold text-base text-[#2C2216]">{tier.name}</h3>
                    <p className="text-xs text-stone-500">
                      {tier.tier_type} • {tier.capacity - tier.sold_count} passes remaining
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <strong className="text-lg font-black text-[#B15332]">{formatPrice(tier.price_kobo)}</strong>
                    <button
                      onClick={() => purchase(tier)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#B15332] px-5 py-3 text-xs font-bold text-white hover:bg-[#8F3B1D] shadow transition active:scale-95 cursor-pointer"
                    >
                      <Ticket className="h-4 w-4" />
                      Buy ticket
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </FrameworkBackground>
  );
};

export default EventMarketplace;
