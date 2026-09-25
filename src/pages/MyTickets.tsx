import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, MapPin, Ticket as TicketIcon } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';

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
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Your access</p><h1 className="mt-2 text-4xl font-black text-slate-950">My Tickets</h1><p className="mt-2 text-slate-500">Your confirmed EVEX event tickets and check-in codes.</p></header>
        {loading && <p className="rounded-2xl bg-white p-8 font-bold">Loading tickets...</p>}
        {error && <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-800">{error}</p>}
        {!loading && !tickets.length && <div className="rounded-3xl bg-white p-8 text-slate-500">No tickets yet. <Link className="font-black text-emerald-700" to="/events">Browse events</Link></div>}
        <div className="grid gap-5">{tickets.map((ticket) => { const event = ticket.events; const tier = ticket.event_ticket_tiers; return <article key={ticket.id} className="rounded-3xl bg-white p-6 shadow-sm"><div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between"><div><h2 className="text-2xl font-black">{event?.title || 'EVEX Event'}</h2><p className="mt-1 font-bold text-emerald-700">{tier?.name || 'Ticket'} · {tier?.tier_type || ''}</p><div className="mt-4 space-y-2 text-sm font-bold text-slate-500"><p className="flex gap-2"><CalendarDays className="h-4 w-4" />{event?.start_time ? new Date(event.start_time).toLocaleString() : 'Date pending'}</p><p className="flex gap-2"><MapPin className="h-4 w-4" />{event?.venue_name}, {event?.city}</p></div></div><span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black uppercase ${ticket.checked_in ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}><CheckCircle2 className="h-4 w-4" />{ticket.checked_in ? 'Checked in' : ticket.payment_status || 'Valid'}</span></div><div className="mt-6 grid gap-3 rounded-2xl bg-slate-950 p-5 text-white md:grid-cols-2"><p className="flex items-center gap-2 text-sm font-black"><TicketIcon className="h-4 w-4 text-emerald-400" />Ticket number: {ticket.ticket_number}</p><p className="break-all text-xs font-bold text-slate-300">QR code hash: {ticket.qr_code_hash || 'Pending confirmation'}</p></div></article>; })}</div>
      </div>
    </main>
  );
};

export default MyTickets;
