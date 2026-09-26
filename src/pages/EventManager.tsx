import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Edit3, Plus, Ticket } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { FrameworkBackground } from '../components/FrameworkBackground';

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
    <FrameworkBackground overlayOpacity="from-[#A84C27]/30 via-transparent to-[#576B57]/50">
      <main className="min-h-screen p-6 md:p-10 text-white">
        <div className="mx-auto max-w-6xl space-y-8">
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#F5EEDB]">EVVEX Operations</p>
              <h1 className="mt-2 text-4xl font-serif font-black text-white">Events & Ticket Tiers</h1>
              <p className="mt-2 text-white/80 text-sm">Manage your event records and the admission tiers attached to them.</p>
            </div>
            <div className="flex gap-3">
              <Link to="/create-event" className="inline-flex items-center gap-2 rounded-full bg-[#B15332] hover:bg-[#8F3B1D] px-5 py-3 text-xs font-bold text-white shadow transition active:scale-95">
                <Plus className="h-4 w-4" />Create event
              </Link>
              <Link to="/create-ticket" className="inline-flex items-center gap-2 rounded-full bg-[#DEB887] hover:bg-[#C9A272] px-5 py-3 text-xs font-bold text-[#2C2216] shadow transition active:scale-95">
                <Plus className="h-4 w-4" />Create tier
              </Link>
            </div>
          </header>
          {loading && <p className="rounded-3xl bg-[#FAF7F2] p-8 font-bold text-[#2C2216] border border-[#DEB887]/60 shadow-lg text-center">Loading event operations...</p>}
          {error && <p className="rounded-3xl bg-red-50 p-4 font-bold text-red-800 border border-red-200">{error}</p>}
          {!loading && !events.length && (
            <div className="rounded-3xl bg-[#FAF7F2] p-8 text-[#2C2216] border border-[#DEB887]/60 shadow-lg text-center">
              <p className="font-bold text-base">No events found.</p>
              <p className="text-xs text-stone-500 mt-1">Get started by creating your first event!</p>
            </div>
          )}
          <div className="space-y-5">
            {events.map((event) => (
              <section key={event.id} className="rounded-3xl bg-[#FAF7F2] text-[#2C2216] p-6 shadow-xl border border-[#DEB887]/60">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold">{event.title}</h2>
                      <span className="rounded-full bg-[#B15332]/10 text-[#933D1E] px-3 py-1 text-xs font-bold uppercase">
                        {event.status}
                      </span>
                    </div>
                    <p className="mt-2 flex items-center gap-2 text-xs font-bold text-stone-600">
                      <CalendarDays className="h-4 w-4 text-[#B15332]" />
                      {new Date(event.start_time).toLocaleString()} • {event.venue_name}
                    </p>
                    <p className="mt-2 text-xs font-bold uppercase text-stone-500">
                      {event.category || 'other'} • {event.age_restriction || '18+'} • {event.admission_mode === 'free' ? 'Free admission' : 'Ticketed'} • Capacity {event.max_capacity ?? event.capacity ?? 'Open'}
                    </p>
                  </div>
                  <Link
                    to={`/edit/${event.id}?type=event`}
                    className="inline-flex items-center gap-2 rounded-full border border-[#DEB887] bg-white px-4 py-2.5 text-xs font-bold text-[#2C2216] hover:bg-stone-50 shadow-xs transition active:scale-95"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-[#B15332]" />
                    Edit event
                  </Link>
                </div>
                <div className="mt-6 space-y-3 pt-4 border-t border-stone-200">
                  {(tiers[event.id] || []).map((tier) => (
                    <div
                      key={tier.id}
                      className="flex flex-col gap-3 rounded-2xl border border-[#DEB887]/50 bg-white p-4 md:flex-row md:items-center md:justify-between shadow-xs"
                    >
                      <div>
                        <p className="flex items-center gap-2 font-bold text-sm text-[#2C2216]">
                          <Ticket className="h-4 w-4 text-[#B15332]" />
                          {tier.name}
                        </p>
                        <p className="text-xs font-medium text-stone-500 mt-0.5">
                          {tier.tier_type} • {tier.sold_count}/{tier.capacity} sold • NGN {(Number(tier.price_kobo || 0) / 100).toLocaleString()} • {(tier.perks || []).length} perks
                        </p>
                      </div>
                      <Link
                        to={`/edit/${tier.id}?type=ticket`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B15332] hover:underline"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit tier
                      </Link>
                    </div>
                  ))}
                  {!(tiers[event.id] || []).length && (
                    <p className="rounded-xl bg-stone-100 p-3 text-xs text-stone-500">No ticket tiers yet.</p>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </FrameworkBackground>
  );
};

export default EventManager;
