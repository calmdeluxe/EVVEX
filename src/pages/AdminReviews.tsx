import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { supabase } from '../supabase';
import { 
  Check, 
  X, 
  Trash2, 
  Eye, 
  Calendar, 
  MapPin, 
  Clock, 
  Search, 
  AlertCircle,
  MessageSquare,
  Sparkles,
  Ticket
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const AdminReviews: React.FC = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('pending_review');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [eventToDelete, setEventToDelete] = useState<{ id: string; title: string } | null>(null);
  const [selectedEventForPreview, setSelectedEventForPreview] = useState<any | null>(null);

  // Request Changes Modal
  const [changeModal, setChangeModal] = useState<{ open: boolean; event: any | null; note: string }>({
    open: false,
    event: null,
    note: ''
  });

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      // Query events from Supabase
      const { data: dbEvents, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (dbEvents) {
        const organizerIds = [...new Set(dbEvents.map((v: any) => v.organizer_id))].filter(Boolean);
        let userMap: Record<string, any> = {};
        if (organizerIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, email, full_name, username')
            .in('id', organizerIds);
          if (profilesData) {
            userMap = profilesData.reduce((acc: any, u: any) => {
              acc[u.id] = u;
              return acc;
            }, {});
          }
        }
        const mappedEvents = dbEvents.map((e: any) => ({
          ...e,
          organizer: userMap[e.organizer_id] || { email: 'Unknown Host', full_name: 'Unknown Host' }
        }));
        setSubmissions(mappedEvents);
      }
    } catch (err) {
      console.error('[AdminReviews] Error fetching events for review:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleEventReview = async (eventId: string, newStatus: 'published' | 'draft', adminNote?: string) => {
    setActionLoading(eventId);
    try {
      const updateData: any = { status: newStatus };
      if (adminNote !== undefined) {
        updateData.admin_note = adminNote;
      }

      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', eventId);

      if (error) throw error;

      // Log into admin_audit_log
      try {
        const { data: session } = await supabase.auth.getSession();
        const actor = session.session?.user;
        await supabase.from('admin_audit_log').insert({
          actor_id: actor?.id || null,
          actor_email: actor?.email || null,
          category: 'event_moderation',
          severity: 'audit',
          action: newStatus === 'published' ? 'event_approved' : 'event_rejected',
          target_type: 'event',
          target_id: eventId,
          metadata: { new_status: newStatus, admin_note: adminNote || null }
        });
      } catch (e) {}

      alert(`Event status updated to "${newStatus.toUpperCase()}"!`);
      fetchSubmissions();
    } catch (err: any) {
      alert(`Error updating event review: ${err.message}`);
    } finally {
      setActionLoading(null);
      if (changeModal.open) {
        setChangeModal({ open: false, event: null, note: '' });
      }
    }
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    setActionLoading(eventToDelete.id);
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: 'cancelled' })
        .eq('id', eventToDelete.id);

      if (error) throw error;

      // Log into admin_audit_log
      try {
        const { data: session } = await supabase.auth.getSession();
        const actor = session.session?.user;
        await supabase.from('admin_audit_log').insert({
          actor_id: actor?.id || null,
          actor_email: actor?.email || null,
          category: 'event_moderation',
          severity: 'audit',
          action: 'event_cancelled',
          target_type: 'event',
          target_id: eventToDelete.id,
          metadata: { title: eventToDelete.title }
        });
      } catch (e) {}

      alert('Event successfully cancelled.');
      setEventToDelete(null);
      fetchSubmissions();
    } catch (err: any) {
      alert(`Error cancelling event: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredEvents = submissions.filter(e => {
    const matchesSearch = 
      e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.organizer?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.organizer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.venue_name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    return e.status === filterStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Ticket className="w-8 h-8 text-indigo-600" />
            Event Submissions & Moderation
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Review host submissions, approve events for the public directory, or request modifications.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <Input 
              placeholder="Search title, venue, or host..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-2xl border-slate-200"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {['pending_review', 'published', 'draft', 'cancelled', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  filterStatus === status 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold">Loading submissions from database...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-100">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 font-bold">No events matching status filter "{filterStatus}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((evt) => (
              <div 
                key={evt.id} 
                className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div className="space-y-4">
                  {/* Status & Date */}
                  <div className="flex items-center justify-between">
                    <Badge className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                      evt.status === 'published' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : evt.status === 'pending_review' 
                        ? 'bg-amber-100 text-amber-800 animate-pulse' 
                        : evt.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {evt.status || 'draft'}
                    </Badge>
                    <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(evt.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Title & Organizer */}
                  <div>
                    <h3 className="text-lg font-black text-slate-900 line-clamp-1">{evt.title}</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      Host: {evt.organizer?.full_name || evt.organizer?.email || 'Unknown'}
                    </p>
                  </div>

                  {/* Venue & Time */}
                  <div className="space-y-1 text-xs text-slate-600 font-medium">
                    {evt.venue_name && (
                      <p className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {evt.venue_name}
                      </p>
                    )}
                    {evt.start_time && (
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {new Date(evt.start_time).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Description preview */}
                  {evt.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 italic">
                      "{evt.description}"
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-6 border-t border-slate-50 mt-6 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm"
                      onClick={() => handleEventReview(evt.id, 'published')}
                      disabled={actionLoading === evt.id || evt.status === 'published'}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 px-3 font-bold text-xs"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>

                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => setChangeModal({ open: true, event: evt, note: evt.admin_note || '' })}
                      disabled={actionLoading === evt.id}
                      className="border-amber-200 text-amber-800 hover:bg-amber-50 rounded-xl h-9 px-3 font-bold text-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1" /> Changes
                    </Button>
                  </div>

                  <Button 
                    size="sm"
                    variant="ghost"
                    onClick={() => setEventToDelete(evt)}
                    disabled={actionLoading === evt.id}
                    className="text-red-500 hover:bg-red-50 rounded-xl h-9 px-2.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Changes Note Modal */}
        {changeModal.open && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <h3 className="text-lg font-black text-slate-900">Request Changes / Feedback</h3>
              <p className="text-xs text-slate-500 font-medium">
                Provide notes to the host for "{changeModal.event?.title}". The event will be placed into "draft" status.
              </p>
              <textarea 
                rows={4}
                value={changeModal.note}
                onChange={(e) => setChangeModal({ ...changeModal, note: e.target.value })}
                placeholder="Specify what needs to be changed before approval..."
                className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:ring-indigo-600 font-medium"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setChangeModal({ open: false, event: null, note: '' })}
                  className="rounded-xl font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleEventReview(changeModal.event.id, 'draft', changeModal.note)}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black"
                >
                  Submit & Set to Draft
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel/Delete Confirmation Modal */}
        {eventToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-lg font-black text-slate-900">Cancel Event</h3>
              </div>
              <p className="text-sm text-slate-600 font-medium">
                Are you sure you want to cancel <span className="font-bold text-slate-900">"{eventToDelete.title}"</span>?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setEventToDelete(null)}
                  className="rounded-xl font-bold"
                >
                  No, Keep
                </Button>
                <Button 
                  onClick={confirmDeleteEvent}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-black"
                >
                  Yes, Cancel Event
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
