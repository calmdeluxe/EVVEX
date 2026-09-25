import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Search, ShieldAlert, Users } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { canScanEventTickets as checkCanScanEventTickets } from '../lib/authorization';

export const EventCheckIn: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, profile, isAdmin } = useAuth();
  const [event, setEvent] = useState<any | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [staffRole, setStaffRole] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!eventId) return;
    const [{ data: eventData, error: eventError }, { data: ticketData, error: ticketError }, { data: staffData }] = await Promise.all([
      supabase.from('events').select('id, title, created_by, start_time, venue_name').eq('id', eventId).maybeSingle(),
      supabase.from('event_tickets').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
      user?.id ? supabase.from('event_staff').select('role_title').eq('event_id', eventId).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (eventError || ticketError) setError(eventError?.message || ticketError?.message || 'Unable to load check-in data.');
    setEvent(eventData);
    setTickets(ticketData || []);
    setStaffRole(staffData?.role_title || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [eventId]);

  const normalizedStaffRole = staffRole === 'gate_scanner' ? 'EVENT_SCANNER' : staffRole === 'stage_manager' ? 'EVENT_STAFF' : staffRole === 'usher' ? 'EVENT_HOST' : undefined;
  const allowed = !!user && !!event && checkCanScanEventTickets({ ...(profile || {}), id: user.id, is_admin: isAdmin }, event, normalizedStaffRole as any);
  const visibleTickets = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return tickets;
    return tickets.filter((ticket) => [ticket.ticket_number, ticket.qr_code_hash, ticket.attendee_name, ticket.attendee_email].some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [search, tickets]);

  const toggleCheckIn = async (ticket: any) => {
    setBusy(ticket.id);
    setMessage('');
    setError('');
    const nextCheckedIn = !ticket.checked_in;
    const { error: updateError } = await supabase.from('event_tickets').update({
      checked_in: nextCheckedIn,
      checked_in_at: nextCheckedIn ? new Date().toISOString() : null,
      checked_in_by: nextCheckedIn ? user?.id : null,
    }).eq('id', ticket.id).eq('event_id', eventId);
    if (updateError) setError(updateError.message);
    else {
      setMessage(nextCheckedIn ? `${ticket.ticket_number} checked in.` : `${ticket.ticket_number} check-in reversed.`);
      await load();
    }
    setBusy(null);
  };

  if (loading) return <div className="p-8 text-center font-bold">Loading gate check-in...</div>;
  if (!allowed) return <div className="mx-auto mt-16 max-w-xl rounded-3xl bg-red-50 p-8 text-center text-red-800"><ShieldAlert className="mx-auto h-10 w-10" /><h1 className="mt-3 text-2xl font-black">Check-in access denied</h1><p className="mt-2 font-semibold">Only the event owner, assigned event staff, or an Admin can check tickets for this event.</p></div>;

  return <main className="min-h-screen bg-slate-50 p-6 md:p-10"><div className="mx-auto max-w-5xl space-y-8"><header><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Gate operations</p><h1 className="mt-2 text-4xl font-black text-slate-950">{event?.title} check-in</h1><p className="mt-2 flex items-center gap-2 text-slate-500"><Users className="h-4 w-4" />{tickets.filter((ticket) => ticket.checked_in).length}/{tickets.length} checked in</p></header><div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"><Search className="h-5 w-5 text-slate-400" /><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Scan or enter ticket number / QR hash" className="h-12 flex-1 border-0 text-sm font-bold outline-none" /></div>{message && <p className="rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">{message}</p>}{error && <p className="rounded-xl bg-red-50 p-3 font-bold text-red-800">{error}</p>}<div className="space-y-3">{visibleTickets.map((ticket) => <div key={ticket.id} className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"><div><p className="font-black">{ticket.ticket_number}</p><p className="text-sm text-slate-500">{ticket.attendee_name} · {ticket.attendee_email}</p><p className="text-xs font-bold uppercase text-slate-400">{ticket.payment_status}</p></div><button disabled={busy === ticket.id} onClick={() => toggleCheckIn(ticket)} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black ${ticket.checked_in ? 'bg-slate-100 text-slate-700' : 'bg-emerald-700 text-white'}`}><CheckCircle2 className="h-4 w-4" />{busy === ticket.id ? 'Saving...' : ticket.checked_in ? 'Reverse check-in' : 'Check in'}</button></div>)}{!visibleTickets.length && <p className="rounded-2xl bg-white p-8 text-slate-500">No matching tickets.</p>}</div></div></main>;
};

export default EventCheckIn;
