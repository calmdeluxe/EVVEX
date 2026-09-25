import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Edit3, Plus, Ticket } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';

export const EventManager: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [tiers, setTiers] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const eventQuery = supabase.from('events').select('*').order('created_at', { ascending: false });
      const { data: eventData, error: eventError } = isAdmin
        ? await eventQuery
        : await eventQuery.eq('created_by', profile?.id || user?.id);
      if (eventError) {
        setError(eventError.message);
        setLoading(false);
        return;
      }
      const eventRows = eventData || [];
      setEvents(eventRows);
      if (eventRows.length) {
        const { data: tierData, error: tierError } = await supabase
          .from('event_ticket_tiers')
          .select('*')
          .in('event_id', eventRows.map((event) => event.id))
          .order('price_kobo', { ascending: true });
        if (tierError) setError(tierError.message);
        const grouped = (tierData || []).reduce((result: Record<string, any[]>, tier: any) => {
          result[tier.event_id] = [...(result[tier.event_id] || []), tier];
          return result;
        }, {});
        setTiers(grouped);
      }
      setLoading(false);
    };
    if (user?.id) load();
  }, [isAdmin, profile?.id, user?.id]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-emerald-700">EVEX operations</p><h1 className="mt-2 text-4xl font-black text-slate-950">Events and ticket tiers</h1><p className="mt-2 text-slate-500">Manage your event records and the tiers attached to them.</p></div><div className="flex gap-3"><Link to="/create-event" className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white"><Plus className="h-4 w-4" />Create event</Link><Link to="/create-ticket" className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-black text-white"><Plus className="h-4 w-4" />Create tier</Link></div></header>
        {loading && <p className="rounded-2xl bg-white p-8 font-bold">Loading event operations...</p>}
        {error && <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-800">{error}</p>}
        {!loading && !events.length && <p className="rounded-2xl bg-white p-8 text-slate-500">No events found.</p>}
        <div className="space-y-5">{events.map((event) => <section key={event.id} className="rounded-3xl bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-black">{event.title}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase">{event.status}</span></div><p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-500"><CalendarDays className="h-4 w-4" />{new Date(event.start_time).toLocaleString()} · {event.venue_name}</p><p className="mt-2 text-xs font-black uppercase text-slate-500">{event.category || 'other'} · {event.age_restriction || '18+'} · {event.admission_mode === 'free' ? 'Free admission' : 'Ticketed'} · Capacity {event.max_capacity ?? event.capacity ?? 'Open'}</p></div><Link to={`/edit/${event.id}?type=event`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black"><Edit3 className="h-4 w-4" />Edit event</Link></div><div className="mt-6 space-y-3">{(tiers[event.id] || []).map((tier) => <div key={tier.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"><div><p className="flex items-center gap-2 font-black"><Ticket className="h-4 w-4 text-amber-600" />{tier.name}</p><p className="text-xs font-bold uppercase text-slate-500">{tier.tier_type} · {tier.sold_count}/{tier.capacity} sold · NGN {(Number(tier.price_kobo || 0) / 100).toLocaleString()} · {(tier.perks || []).length} perks</p></div><Link to={`/edit/${tier.id}?type=ticket`} className="inline-flex items-center gap-2 text-sm font-black text-emerald-700"><Edit3 className="h-4 w-4" />Edit tier</Link></div>)}{!(tiers[event.id] || []).length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No ticket tiers yet.</p>}</div></section>)}</div>
      </div>
    </main>
  );
};

export default EventManager;
