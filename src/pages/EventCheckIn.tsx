import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Search, ShieldAlert, Users } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { canScanEventTickets as checkCanScanEventTickets } from '../lib/authorization';
import { FrameworkBackground } from '../components/FrameworkBackground';

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

  if (loading) {
    return (
      <FrameworkBackground overlayOpacity="from-[#A84C27]/30 via-transparent to-[#576B57]/50">
        <div className="p-12 text-center text-white font-bold">Loading gate check-in...</div>
      </FrameworkBackground>
    );
  }

  if (!allowed) {
    return (
      <FrameworkBackground overlayOpacity="from-[#A84C27]/30 via-transparent to-[#576B57]/50">
        <div className="mx-auto mt-16 max-w-xl rounded-3xl bg-[#FAF7F2] p-8 text-center text-[#2C2216] border border-[#DEB887]/60 shadow-xl">
          <ShieldAlert className="mx-auto h-10 w-10 text-[#B15332]" />
          <h1 className="mt-3 text-2xl font-serif font-black">Check-in access denied</h1>
          <p className="mt-2 text-sm text-stone-600">Only the event owner, assigned event staff, or an Admin can check tickets for this event.</p>
          <Link to="/events" className="inline-block mt-4 text-xs font-bold text-[#B15332] hover:underline">
            Back to Events
          </Link>
        </div>
      </FrameworkBackground>
    );
  }

  return (
    <FrameworkBackground overlayOpacity="from-[#A84C27]/30 via-transparent to-[#576B57]/50">
      <main className="min-h-screen p-6 md:p-10 text-white">
        <div className="mx-auto max-w-5xl space-y-8">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#F5EEDB]">Gate Operations</p>
              <h1 className="mt-2 text-4xl font-serif font-black text-white">{event?.title} Check-in</h1>
              <p className="mt-2 flex items-center gap-2 text-white/80 text-sm">
                <Users className="h-4 w-4" />
                {tickets.filter((ticket) => ticket.checked_in).length}/{tickets.length} attendees checked in
              </p>
            </div>
            <Link
              to={`/events/${eventId}`}
              className="self-start sm:self-auto text-xs font-bold text-white/90 hover:text-white px-4 py-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 transition active:scale-95"
            >
              Event Page →
            </Link>
          </header>

          <div className="flex items-center gap-3 rounded-2xl bg-[#FAF7F2] text-[#2C2216] p-4 shadow-xl border border-[#DEB887]/60">
            <Search className="h-5 w-5 text-stone-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Scan or enter ticket number / QR hash / attendee name"
              className="h-12 flex-1 border-0 text-sm font-bold text-[#2C2216] bg-transparent outline-none placeholder:text-stone-400"
            />
          </div>

          {message && <p className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800">{message}</p>}
          {error && <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-800">{error}</p>}

          <div className="space-y-3">
            {visibleTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex flex-col gap-4 rounded-2xl bg-[#FAF7F2] text-[#2C2216] p-5 shadow-xl border border-[#DEB887]/60 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-bold text-base text-[#2C2216]">{ticket.ticket_number}</p>
                  <p className="text-xs text-stone-600 mt-0.5">{ticket.attendee_name} • {ticket.attendee_email}</p>
                  <p className="text-[10px] font-black uppercase text-stone-400 mt-1">{ticket.payment_status}</p>
                </div>
                <button
                  disabled={busy === ticket.id}
                  onClick={() => toggleCheckIn(ticket)}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold transition active:scale-95 cursor-pointer ${
                    ticket.checked_in
                      ? 'bg-stone-200 text-stone-800 hover:bg-stone-300'
                      : 'bg-[#B15332] text-white hover:bg-[#8F3B1D] shadow-sm'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {busy === ticket.id ? 'Saving...' : ticket.checked_in ? 'Reverse check-in' : 'Check in Pass'}
                </button>
              </div>
            ))}
            {!visibleTickets.length && (
              <p className="rounded-2xl bg-[#FAF7F2] text-[#2C2216] p-8 text-center text-sm font-bold border border-[#DEB887]/60">
                No matching tickets found.
              </p>
            )}
          </div>
        </div>
      </main>
    </FrameworkBackground>
  );
};

export default EventCheckIn;
