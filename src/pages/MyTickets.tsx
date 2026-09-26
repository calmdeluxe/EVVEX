import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, MapPin, Ticket as TicketIcon } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { FrameworkBackground } from '../components/FrameworkBackground';

export const MyTickets: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data, error: ticketError } = await supabase
        .from('event_tickets')
        .select('*, events(title, venue_name, start_time, city), event_ticket_tiers(name, tier_type)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (ticketError) setError(ticketError.message);
      setTickets(data || []);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  return (
    <FrameworkBackground overlayOpacity="from-[#A84C27]/30 via-transparent to-[#576B57]/50">
      <main className="min-h-screen p-6 md:p-10 text-white">
        <div className="mx-auto max-w-5xl space-y-8">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#F5EEDB]">Your Access</p>
              <h1 className="mt-2 text-4xl font-serif font-black text-white">My Passes & Tickets</h1>
              <p className="mt-2 text-white/80 text-sm">Your confirmed EVVEX event tickets and gate check-in passes.</p>
            </div>
            <Link
              to="/events"
              className="self-start sm:self-auto text-xs font-bold text-white/90 hover:text-white px-4 py-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 transition active:scale-95"
            >
              Browse Gatherings →
            </Link>
          </header>

          {loading && (
            <p className="rounded-3xl bg-[#FAF7F2] p-8 font-bold text-[#2C2216] border border-[#DEB887]/60 shadow-lg text-center">
              Loading passes...
            </p>
          )}

          {error && (
            <p className="rounded-3xl bg-red-50 p-4 font-bold text-red-800 border border-red-200">
              {error}
            </p>
          )}

          {!loading && !tickets.length && (
            <div className="rounded-3xl bg-[#FAF7F2] p-8 text-[#2C2216] border border-[#DEB887]/60 shadow-lg text-center">
              <p className="font-bold text-base">No tickets yet.</p>
              <p className="text-xs text-stone-500 mt-1">Discover pop-ups, music, and gatherings near you.</p>
              <Link className="inline-block mt-4 px-5 py-2.5 rounded-full bg-[#B15332] text-white text-xs font-bold shadow hover:bg-[#8F3B1D] transition" to="/events">
                Explore Event Marketplace
              </Link>
            </div>
          )}

          <div className="grid gap-5">
            {tickets.map((ticket) => {
              const event = ticket.events;
              const tier = ticket.event_ticket_tiers;
              return (
                <article
                  key={ticket.id}
                  className="rounded-3xl bg-[#FAF7F2] text-[#2C2216] p-6 shadow-xl border border-[#DEB887]/60 relative overflow-hidden"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-2xl font-serif font-black">{event?.title || 'EVVEX Event'}</h2>
                      <p className="mt-1 font-bold text-[#B15332]">
                        {tier?.name || 'Admission Pass'} {tier?.tier_type ? `• ${tier.tier_type}` : ''}
                      </p>
                      <div className="mt-4 space-y-2 text-xs font-bold text-stone-600">
                        <p className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-[#B15332]" />
                          {event?.start_time ? new Date(event.start_time).toLocaleString() : 'Date pending'}
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#B15332]" />
                          {event?.venue_name}, {event?.city}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-black uppercase ${
                        ticket.checked_in
                          ? 'bg-stone-200 text-stone-600'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {ticket.checked_in ? 'Checked in' : ticket.payment_status || 'Valid Pass'}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-3 rounded-2xl bg-[#1C160C] p-5 text-white md:grid-cols-2 shadow-inner">
                    <p className="flex items-center gap-2 text-xs font-bold">
                      <TicketIcon className="h-4 w-4 text-[#DEB887]" />
                      Pass Number: <span className="font-mono text-emerald-400 font-bold">{ticket.ticket_number}</span>
                    </p>
                    <p className="break-all text-xs font-mono text-stone-400">
                      QR Reference: {ticket.qr_code_hash || 'Confirmed'}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>
    </FrameworkBackground>
  );
};

export default MyTickets;
