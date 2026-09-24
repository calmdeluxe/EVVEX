import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import { 
  ArrowLeft, 
  CheckCircle2, 
  ShieldAlert, 
  BookOpen, 
  User, 
  Coins, 
  Info, 
  Loader2, 
  Search,
  BadgeAlert,
  CreditCard,
  UserCheck,
  RefreshCw,
  Layers,
  Sparkles
} from 'lucide-react';
import axios from 'axios';

export const AdminContentUnlock: React.FC = () => {
  const { isAdmin, isAuthReady, user: loggedUser } = useAuth();
  const navigate = useNavigate();

  // Database lists
  const [books, setBooks] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [authorsList, setAuthorsList] = useState<any[]>([]);
  
  // Section 1: Content Unlock Selections & Inputs
  const [selectedBookId, setSelectedBookId] = useState('');
  const [userIdentifier, setUserIdentifier] = useState('');
  const [contentType, setContentType] = useState<'ebook' | 'trivia' | 'pdf' | 'all'>('ebook');
  const [manualAmount, setManualAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('Paid Manually / Paystack Transfer Verification');

  // Section 2: Reassign Book to Author Selections & Inputs
  const [reassignBookId, setReassignBookId] = useState('');
  const [reassignAuthorId, setReassignAuthorId] = useState('');
  const [reassignPenName, setReassignPenName] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [reassignSuccess, setReassignSuccess] = useState('');
  const [reassignError, setReassignError] = useState('');

  // Search/Filters for quick lookup
  const [bookSearch, setBookSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [authorSearch, setAuthorSearch] = useState('');

  // Interface states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isAuthReady && !isAdmin) {
      navigate('/dashboard');
    } else if (isAuthReady && isAdmin) {
      loadInitialData();
    }
  }, [isAuthReady, isAdmin, navigate]);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const loadInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch available events
      const { data: eventsData, error: eventsErr } = await supabase
        .from('events')
        .select('id, title, organizer_id, status, created_at')
        .order('title', { ascending: true });

      if (eventsErr) throw eventsErr;

      // 2. Fetch profiles for event hosts and users
      const { data: profilesData, error: profilesErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, username, app_role')
        .order('full_name', { ascending: true });

      if (profilesErr) throw profilesErr;

      const userList = profilesData || [];
      setUsersList(userList);
      setAuthorsList(userList.filter((u: any) => u.app_role === 'event_host' || u.app_role === 'admin'));

      // Build author lookup map by user_id
      const userMap: Record<string, string> = {};
      userList.forEach((u: any) => {
        if (u && u.id) {
          userMap[u.id] = u.full_name || u.username || u.email?.split('@')[0] || '';
        }
      });

      const formattedEvents = (eventsData || []).map((b: any) => {
        return {
          ...b,
          author_name: b.organizer_id ? userMap[b.organizer_id] || 'Event Host' : 'Verified Host'
        };
      });

      setBooks(formattedEvents);

    } catch (err: any) {
      console.error("[AdminContentUnlock] Failed to load data:", err);
      setError('Failed to populate events or user profiles: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Section 1: Handle Manual Unlock
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userIdentifier.trim()) {
      setError('Please provide a User Email or User UUID.');
      return;
    }
    if (!selectedBookId) {
      setError('Please select an event / pass item to unlock.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const identifier = userIdentifier.trim();
      let targetUser = usersList.find((u: any) => u.id === identifier || u.email?.toLowerCase() === identifier.toLowerCase());

      if (!targetUser) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        const { data: fetchedUser } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq(isUuid ? 'id' : 'email', identifier)
          .maybeSingle();

        if (!fetchedUser) throw new Error(`User not found for identifier: ${identifier}`);
        targetUser = fetchedUser;
      }

      // Insert into event_tickets
      const { error: ticketErr } = await supabase.from('event_tickets').insert({
        user_id: targetUser.id,
        event_id: selectedBookId,
        status: 'valid'
      });

      if (ticketErr) throw ticketErr;

      // Log into admin_audit_log
      try {
        const { data: session } = await supabase.auth.getSession();
        const actor = session.session?.user;
        await supabase.from('admin_audit_log').insert({
          actor_id: actor?.id || null,
          actor_email: actor?.email || null,
          category: 'event_moderation',
          severity: 'audit',
          action: 'manual_ticket_unlock',
          target_type: 'event',
          target_id: selectedBookId,
          metadata: { user_id: targetUser.id, email: targetUser.email, notes: paymentNotes }
        });
      } catch (e) {}

      setSuccess(`Ticket successfully granted to ${targetUser.email}!`);
      setSelectedBookId('');
      setUserIdentifier('');
      setManualAmount('');
    } catch (err: any) {
      console.error("[AdminContentUnlock] Save error:", err);
      setError(err.message || 'An error occurred while unlocking');
    } finally {
      setSubmitting(false);
    }
  };

  // Section 2: Handle Reassign Event to Host
  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignBookId) {
      setReassignError('Please select an event to reassign.');
      return;
    }
    if (!reassignAuthorId) {
      setReassignError('Please select the new host who should own this event.');
      return;
    }

    setReassigning(true);
    setReassignError('');
    setReassignSuccess('');

    try {
      const { error: updateErr } = await supabase
        .from('events')
        .update({ organizer_id: reassignAuthorId })
        .eq('id', reassignBookId);

      if (updateErr) throw updateErr;

      // Log into admin_audit_log
      try {
        const { data: session } = await supabase.auth.getSession();
        const actor = session.session?.user;
        await supabase.from('admin_audit_log').insert({
          actor_id: actor?.id || null,
          actor_email: actor?.email || null,
          category: 'event_moderation',
          severity: 'audit',
          action: 'reassign_event_organizer',
          target_type: 'event',
          target_id: reassignBookId,
          metadata: { new_organizer_id: reassignAuthorId }
        });
      } catch (e) {}

      setReassignSuccess('Event successfully reassigned to new host!');
      setBooks(prev => prev.map(b => b.id === reassignBookId ? { ...b, organizer_id: reassignAuthorId } : b));
      setReassignBookId('');
      setReassignAuthorId('');
      setReassignPenName('');
    } catch (err: any) {
      console.error("[AdminContentUnlock] Reassign error:", err);
      setReassignError(err.message || 'Failed to reassign event');
    } finally {
      setReassigning(false);
    }
  };

  // Auto-populate pen name when reassign author changes
  const handleAuthorSelect = (authorId: string) => {
    setReassignAuthorId(authorId);
    const author = authorsList.find(a => a.id === authorId);
    if (author) {
      setReassignPenName(author.full_name || author.username || author.email?.split('@')[0] || '');
    }
  };

  // Filter books based on search term
  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(bookSearch.toLowerCase()) || 
    (b.author_name && b.author_name.toLowerCase().includes(bookSearch.toLowerCase()))
  );

  // Filter users based on search term
  const filteredUsers = usersList.filter(u => 
    (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) || 
    (u.full_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  // Filter authors based on search term
  const filteredAuthors = authorsList.filter(a =>
    (a.email || '').toLowerCase().includes(authorSearch.toLowerCase()) ||
    (a.full_name || '').toLowerCase().includes(authorSearch.toLowerCase()) ||
    (a.username || '').toLowerCase().includes(authorSearch.toLowerCase())
  );

  const selectedReassignBook = books.find(b => b.id === reassignBookId);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
        <p className="font-mono text-sm tracking-wider text-slate-400">Loading Secure Admin Directories...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030308] text-white selection:bg-amber-500/10 font-sans pb-24">
      {/* Ambient background decoration */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#030308]/80 backdrop-blur-xl border-b border-white/5 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </div>
          <span className="font-sans font-black text-lg tracking-tight text-white uppercase font-mono">CalmReader</span>
          <span className="bg-amber-500/15 text-amber-400 text-[9px] px-2 py-0.5 rounded-full font-bold ml-1 font-mono uppercase border border-amber-500/20">ADMIN TOOLS</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => loadInitialData()}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-xs font-black text-white/50 hover:text-white flex items-center gap-2 transition-colors uppercase tracking-wider font-mono bg-white/5 px-4 h-9 rounded-xl border border-white/5 hover:border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 relative z-10 space-y-12">
        
        {/* TOP INTRO */}
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold font-mono uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Admin Control Hub
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2 font-sans">
            Content Access & Author Management
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
            Manually unlock eBook & Trivia access for users who paid via offline transfers, and reassign published books to their rightful authors.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: MANUAL CONTENT UNLOCK */}
        {/* ========================================================================= */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <Coins className="w-6 h-6 text-amber-500" />
            <div>
              <h2 className="text-xl font-bold text-white">1. Manual Content Unlock</h2>
              <p className="text-xs text-slate-400">Grant permanent eBook, Trivia, or PDF access to any user account.</p>
            </div>
          </div>

          {/* Feedback Section 1 */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3 text-xs animate-in slide-in-from-top-4 duration-300">
              <BadgeAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1 font-medium">
                <span className="font-black">Unlock Failed:</span> {error}
              </div>
            </div>
          )}

          {success && (
            <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-start gap-4 text-xs animate-in slide-in-from-top-4 duration-300">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-green-500 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                <span className="font-bold text-sm block mb-1">Access Granted Successfully!</span>
                {success}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* CONTROL FORM */}
            <div className="md:col-span-7 flex flex-col gap-6">
              <Card className="bg-[#030308]/60 border border-white/10 rounded-[2rem] shadow-2xl backdrop-blur-md">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-500" /> Unlock Configuration
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Specify the user and target content to generate immediate database transaction records.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUnlock} className="space-y-5">
                    
                    {/* USER IDENTIFIER */}
                    <div className="space-y-2">
                      <Label htmlFor="userId" className="text-xs font-bold uppercase text-slate-300 font-mono tracking-wider">User Identifier (Email or UUID)</Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          id="userId"
                          required
                          value={userIdentifier}
                          onChange={(e) => setUserIdentifier(e.target.value)}
                          placeholder="e.g. samuelchukwuemeke05@gmail.com"
                          className="bg-white/5 border-white/10 h-11 pl-10 text-white rounded-xl focus:border-amber-500/50"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Enter the user's registered email or select one from the directory on the right.
                      </p>
                    </div>

                    {/* CONTENT TYPE SELECTOR */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-slate-300 font-mono tracking-wider">Access Type to Unlock</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'ebook', label: 'eBook Reader' },
                          { id: 'trivia', label: 'Trivia Play' },
                          { id: 'pdf', label: 'PDF Download' },
                          { id: 'all', label: 'All-in-One' }
                        ].map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setContentType(t.id as any)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                              contentType === t.id
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ACTIVE BOOK / CONTENT */}
                    <div className="space-y-2">
                      <Label htmlFor="bookId" className="text-xs font-bold uppercase text-slate-300 font-mono tracking-wider">Select eBook / Content</Label>
                      <div className="relative">
                        <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <select
                          id="bookId"
                          required
                          value={selectedBookId}
                          onChange={(e) => setSelectedBookId(e.target.value)}
                          className="w-full bg-[#030308]/90 border border-white/10 h-11 pl-10 pr-4 text-white rounded-xl focus:border-amber-500/50 text-sm focus:outline-none appearance-none"
                        >
                          <option value="">-- Choose an eBook --</option>
                          <option value="general">-- General Trivia Challenge (Global) --</option>
                          {filteredBooks.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.title} {b.price ? `(₦${Number(b.price).toLocaleString()})` : '(Free)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* CUSTOM PRICE OVERRIDE */}
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-xs font-bold uppercase text-slate-300 font-mono tracking-wider">Custom Price Override (₦ - Optional)</Label>
                      <div className="relative">
                        <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          id="amount"
                          type="number"
                          value={manualAmount}
                          onChange={(e) => setManualAmount(e.target.value)}
                          placeholder="Default is book's normal price (or 0 for free)"
                          className="bg-white/5 border-white/10 h-11 pl-10 text-white rounded-xl focus:border-amber-500/50"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Leave empty to record the catalog price. Enter 0 to unlock completely free.
                      </p>
                    </div>

                    {/* PAYMENT NOTES */}
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-xs font-bold uppercase text-slate-300 font-mono tracking-wider">Payment / Admin Notes</Label>
                      <div className="relative">
                        <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          id="notes"
                          required
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                          placeholder="e.g. Bank Transfer Verified / Client Request"
                          className="bg-white/5 border-white/10 h-11 pl-10 text-white rounded-xl focus:border-amber-500/50"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black h-12 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/15 focus:outline-none transition-all mt-4"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing Unlock...
                        </>
                      ) : (
                        `Perform Manual Unlock (${contentType.toUpperCase()})`
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* INFORMATION CARD */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-slate-400 flex gap-3 text-xs leading-relaxed">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-300 block mb-1">Automated System Triggers</strong>
                  This action writes an authorized transaction record to Supabase, unlocks reading and trivia access flags, and triggers an automated confirmation email to the user.
                </div>
              </div>
            </div>

            {/* LOOKUP DIRECTORIES */}
            <div className="md:col-span-5 flex flex-col gap-6">
              
              {/* USERS DIRECTORY */}
              <Card className="bg-[#030308]/40 border border-white/5 rounded-[2rem] shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black uppercase text-slate-400 font-mono tracking-wider">User Directory</CardTitle>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <Input
                      placeholder="Search users by name or email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="bg-white/5 border-white/5 h-8 pl-8 text-xs rounded-lg focus:border-amber-500/50"
                    />
                  </div>
                </CardHeader>
                <CardContent className="max-h-[200px] overflow-y-auto pt-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
                  {filteredUsers.length === 0 ? (
                    <p className="text-[10px] text-slate-500 text-center py-4">No users found.</p>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setUserIdentifier(u.email || u.id)}
                        className={`w-full text-left p-2.5 rounded-xl transition-colors border flex flex-col gap-0.5 ${
                          userIdentifier === u.email || userIdentifier === u.id
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'hover:bg-white/5 border-transparent hover:border-white/5'
                        }`}
                      >
                        <span className="text-xs font-bold text-white truncate">{u.full_name || u.username || 'Unnamed'}</span>
                        <span className="text-[9px] font-mono text-slate-400 truncate">{u.email}</span>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* CATALOGUE LOOKUP */}
              <Card className="bg-[#030308]/40 border border-white/5 rounded-[2rem] shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black uppercase text-slate-400 font-mono tracking-wider">eBooks Catalogue</CardTitle>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <Input
                      placeholder="Filter eBook titles..."
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                      className="bg-white/5 border-white/5 h-8 pl-8 text-xs rounded-lg focus:border-amber-500/50"
                    />
                  </div>
                </CardHeader>
                <CardContent className="max-h-[220px] overflow-y-auto pt-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
                  {filteredBooks.length === 0 ? (
                    <p className="text-[10px] text-slate-500 text-center py-4">No eBooks matching search.</p>
                  ) : (
                    filteredBooks.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBookId(b.id)}
                        className={`w-full text-left p-2 rounded-xl transition-all border flex items-center gap-2.5 ${
                          selectedBookId === b.id 
                            ? 'bg-amber-500/15 border-amber-500/50' 
                            : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
                        }`}
                      >
                        {b.cover_image ? (
                          <img 
                            src={b.cover_image} 
                            alt="" 
                            className="w-7 h-10 object-cover rounded shadow shrink-0" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-7 h-10 rounded bg-white/5 flex items-center justify-center shrink-0">
                            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-white block truncate">{b.title}</span>
                          <span className="text-[9px] text-slate-400 block truncate">by {b.author_name || 'Author'}</span>
                        </div>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>

            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: REASSIGN BOOK TO AUTHOR */}
        {/* ========================================================================= */}
        <div className="space-y-6 pt-6 border-t border-white/10">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <UserCheck className="w-6 h-6 text-indigo-400" />
            <div>
              <h2 className="text-xl font-bold text-white">2. Reassign Book to Author</h2>
              <p className="text-xs text-slate-400">Reassign ownership of a published book from admin account to its rightful author.</p>
            </div>
          </div>

          {/* Feedback Section 2 */}
          {reassignError && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3 text-xs animate-in slide-in-from-top-4 duration-300">
              <BadgeAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1 font-medium">
                <span className="font-black">Reassign Failed:</span> {reassignError}
              </div>
            </div>
          )}

          {reassignSuccess && (
            <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-start gap-4 text-xs animate-in slide-in-from-top-4 duration-300">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-indigo-400 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                <span className="font-bold text-sm block mb-1 text-white">Book Ownership Updated!</span>
                {reassignSuccess}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* REASSIGN FORM */}
            <div className="md:col-span-7 flex flex-col gap-6">
              <Card className="bg-[#030308]/60 border border-white/10 rounded-[2rem] shadow-2xl backdrop-blur-md">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-400" /> Ownership Assignment
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Select a book and the destination author to transfer ownership (`user_id`).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleReassign} className="space-y-5">
                    
                    {/* SELECT BOOK */}
                    <div className="space-y-2">
                      <Label htmlFor="reassignBook" className="text-xs font-bold uppercase text-slate-300 font-mono tracking-wider">Select Book to Reassign</Label>
                      <div className="relative">
                        <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <select
                          id="reassignBook"
                          required
                          value={reassignBookId}
                          onChange={(e) => setReassignBookId(e.target.value)}
                          className="w-full bg-[#030308]/90 border border-white/10 h-11 pl-10 pr-4 text-white rounded-xl focus:border-indigo-500/50 text-sm focus:outline-none appearance-none"
                        >
                          <option value="">-- Choose Book --</option>
                          {books.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.title} (Current Author: {b.author_name || 'None'})
                            </option>
                          ))}
                        </select>
                      </div>
                      {selectedReassignBook && (
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3 text-xs">
                          {selectedReassignBook.cover_image && (
                            <img src={selectedReassignBook.cover_image} alt="" className="w-8 h-10 object-cover rounded shrink-0" referrerPolicy="no-referrer" />
                          )}
                          <div>
                            <span className="font-bold text-white block">{selectedReassignBook.title}</span>
                            <span className="text-[10px] text-slate-400">Current Pen Name: {selectedReassignBook.author_name || 'None'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SELECT NEW AUTHOR */}
                    <div className="space-y-2">
                      <Label htmlFor="reassignAuthor" className="text-xs font-bold uppercase text-slate-300 font-mono tracking-wider">Select New Author (Owner)</Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <select
                          id="reassignAuthor"
                          required
                          value={reassignAuthorId}
                          onChange={(e) => handleAuthorSelect(e.target.value)}
                          className="w-full bg-[#030308]/90 border border-white/10 h-11 pl-10 pr-4 text-white rounded-xl focus:border-indigo-500/50 text-sm focus:outline-none appearance-none"
                        >
                          <option value="">-- Choose Author --</option>
                          {authorsList.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.full_name || a.username || 'Unnamed'} ({a.email}) [{a.account_tier || 'user'}]
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* PEN NAME OVERRIDE */}
                    <div className="space-y-2">
                      <Label htmlFor="penName" className="text-xs font-bold uppercase text-slate-300 font-mono tracking-wider">Author Pen Name (Displayed on Book)</Label>
                      <Input
                        id="penName"
                        value={reassignPenName}
                        onChange={(e) => setReassignPenName(e.target.value)}
                        placeholder="e.g. Dr. Samuel Chukwuemeka"
                        className="bg-white/5 border-white/10 h-11 text-white rounded-xl focus:border-indigo-500/50 text-xs"
                      />
                      <p className="text-[10px] text-slate-500">
                        This updates the visible author name on the book cards and reader views.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={reassigning}
                      className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black h-12 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 focus:outline-none transition-all mt-4"
                    >
                      {reassigning ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Reassigning Ownership...
                        </>
                      ) : (
                        'Reassign Book to Author'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* REGISTERED AUTHORS DIRECTORY */}
            <div className="md:col-span-5 flex flex-col gap-6">
              <Card className="bg-[#030308]/40 border border-white/5 rounded-[2rem] shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black uppercase text-indigo-400 font-mono tracking-wider">Registered Authors Directory</CardTitle>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <Input
                      placeholder="Search authors..."
                      value={authorSearch}
                      onChange={(e) => setAuthorSearch(e.target.value)}
                      className="bg-white/5 border-white/5 h-8 pl-8 text-xs rounded-lg focus:border-indigo-500/50"
                    />
                  </div>
                </CardHeader>
                <CardContent className="max-h-[300px] overflow-y-auto pt-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
                  {filteredAuthors.length === 0 ? (
                    <p className="text-[10px] text-slate-500 text-center py-4">No authors matching search.</p>
                  ) : (
                    filteredAuthors.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => handleAuthorSelect(a.id)}
                        className={`w-full text-left p-2.5 rounded-xl transition-colors border flex flex-col gap-0.5 ${
                          reassignAuthorId === a.id
                            ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                            : 'hover:bg-white/5 border-transparent hover:border-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white truncate">{a.full_name || a.username || 'Unnamed'}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono">
                            {a.account_tier || 'author'}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 truncate">{a.email}</span>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>

              <div className="p-4 rounded-2xl bg-indigo-500/[0.03] border border-indigo-500/10 text-slate-400 text-xs space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold">
                  <Layers className="w-4 h-4" /> Author Access & Royalties
                </div>
                <p className="leading-relaxed text-[11px]">
                  When a book is reassigned, the author will immediately see the book on their Author Dashboard, be able to edit or review it, and receive platform royalties for future sales.
                </p>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
};
export default AdminContentUnlock;
