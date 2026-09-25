import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin, Ticket, Users } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';

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
      <main className="min-h-screen bg-slate-50 p-6 md:p-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <header><p className="text-xs font-black uppercase tracking-widest text-emerald-700">EVEX Live</p><h1 className="mt-2 text-4xl font-black text-slate-950">Find your next event</h1></header>
          {events.length === 0 ? <p className="rounded-2xl bg-white p-8 text-slate-500">No published events are available yet.</p> : <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{events.map((item) => <Link key={item.id} to={`/events/${item.id}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="aspect-[16/9] bg-slate-100">{item.cover_image && <img src={item.cover_image} alt="" className="h-full w-full object-cover" />}</div><div className="space-y-3 p-5"><h2 className="text-xl font-black text-slate-950">{item.title}</h2><p className="line-clamp-2 text-sm text-slate-500">{item.description}</p><div className="flex items-center gap-2 text-xs font-bold text-slate-500"><CalendarDays className="h-4 w-4" />{new Date(item.start_time).toLocaleString()}</div><div className="flex items-center gap-2 text-xs font-bold text-slate-500"><MapPin className="h-4 w-4" />{item.venue_name}, {item.city}</div><div className="flex flex-wrap gap-2 text-[10px] font-black uppercase text-slate-500"><span>{item.category || 'other'}</span><span>{item.age_restriction || '18+'}</span><span>{item.admission_mode === 'free' ? 'Free admission' : 'Ticketed'}</span></div><span className="inline-flex items-center gap-2 text-sm font-black text-emerald-700">View event <ArrowRight className="h-4 w-4" /></span></div></Link>)}</div>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link to="/events" className="text-sm font-bold text-emerald-700">Back to events</Link>
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm"><div className="aspect-[21/8] bg-slate-100">{event?.cover_image && <img src={event.cover_image} alt="" className="h-full w-full object-cover" />}</div><div className="space-y-4 p-6 md:p-8"><h1 className="text-4xl font-black text-slate-950">{event?.title}</h1><p className="text-slate-600">{event?.description}</p><div className="flex flex-wrap gap-2 text-xs font-black uppercase text-slate-500"><span>{event?.category || 'other'}</span><span>{event?.age_restriction || '18+'}</span><span>{event?.admission_mode === 'free' ? 'Free admission' : 'Ticketed event'}</span></div><div className="grid gap-3 text-sm font-bold text-slate-600 md:grid-cols-3"><span className="flex gap-2"><CalendarDays className="h-5 w-5 text-emerald-700" />{new Date(event?.start_time).toLocaleString()}</span><span className="flex gap-2"><MapPin className="h-5 w-5 text-emerald-700" />{event?.venue_name}, {event?.city}</span><span className="flex gap-2"><Users className="h-5 w-5 text-emerald-700" />Capacity {event?.max_capacity ?? event?.capacity ?? 'Open'}</span></div>{(event?.contact_email || event?.contact_phone || event?.contact_instructions) && <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-900"><p>Event contact</p>{event.contact_email && <p>{event.contact_email}</p>}{event.contact_phone && <p>{event.contact_phone}</p>}{event.contact_instructions && <p className="mt-1 font-medium">{event.contact_instructions}</p>}</div>}</div></section>
        <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8"><h2 className="mb-5 text-2xl font-black">Choose a ticket</h2><div className="mb-6 grid gap-3 md:grid-cols-3"><input aria-label="Attendee name" placeholder="Attendee name" value={attendee.name} onChange={(e) => setAttendee({ ...attendee, name: e.target.value })} className="h-12 rounded-xl border border-slate-200 px-4" /><input aria-label="Attendee email" placeholder="Email" type="email" value={attendee.email} onChange={(e) => setAttendee({ ...attendee, email: e.target.value })} className="h-12 rounded-xl border border-slate-200 px-4" /><input aria-label="Attendee phone" placeholder="Phone" value={attendee.phone} onChange={(e) => setAttendee({ ...attendee, phone: e.target.value })} className="h-12 rounded-xl border border-slate-200 px-4" /></div>{success && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{success}</p>}{error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}<div className="space-y-3">{tiers.map((tier) => <div key={tier.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"><div><h3 className="font-black">{tier.name}</h3><p className="text-sm text-slate-500">{tier.tier_type} · {tier.capacity - tier.sold_count} remaining</p></div><div className="flex items-center gap-4"><strong className="text-lg">{formatPrice(tier.price_kobo)}</strong><button onClick={() => purchase(tier)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white hover:bg-emerald-800"><Ticket className="h-4 w-4" />Buy ticket</button></div></div>)}</div></section>
      </div>
    </main>
  );
};

export default EventMarketplace;
