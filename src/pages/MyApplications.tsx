import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Clock, AlertCircle, CheckCircle2, XCircle, Loader2, ExternalLink, UserPlus } from 'lucide-react';

interface ApplicationWithEvent {
  id: string;
  event_id: string;
  application_type: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  bio: string;
  portfolio_url: string | null;
  proposed_fee_kobo: number;
  requirements: string | null;
  status: string;
  review_notes: string | null;
  admin_fee_kobo: number;
  application_fee_paid: boolean;
  application_fee_kobo: number;
  paystack_reference: string | null;
  created_at: string;
  updated_at: string;
  events: {
    id: string;
    title: string;
    cover_image: string | null;
    venue_name: string | null;
    city: string | null;
    start_time: string;
    category: string | null;
    status: string;
  } | null;
}

const APPLICATION_TYPE_LABELS: Record<string, string> = {
  catering: 'Caterer',
  mc: 'Host / MC',
  dj: 'DJ',
  photography: 'Photographer / Videographer',
  decor: 'Decorator',
  ushers: 'Usher Team',
  security: 'Security / Bouncer',
  gate_scanner: 'Gate Scanner',
  usher: 'Usher',
  stage_manager: 'Stage Manager',
  artist_performer: 'Artist / Performer',
  speaker: 'Speaker',
  exhibitor: 'Exhibitor',
  event_partner: 'Event Partner',
  ambassador: 'Ambassador',
  sponsor: 'Sponsor',
  volunteer: 'Volunteer',
  contestant: 'Contestant',
  other: 'Other',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Review',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  needs_revision: 'Needs Revision',
  withdrawn: 'Withdrawn',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  under_review: 'bg-blue-100 text-blue-800 border-blue-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  needs_revision: 'bg-purple-100 text-purple-800 border-purple-200',
  withdrawn: 'bg-gray-100 text-gray-800 border-gray-200',
};

const formatPrice = (kobo: number) => `NGN ${(Number(kobo || 0) / 100).toLocaleString()}`;

export const MyApplications: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('event_applications')
          .select(`
            *,
            events:event_id (
              id, title, cover_image, venue_name, city, start_time, category, status
            )
          `)
          .eq('applicant_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setApplications(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;

  const pendingCount = applications.filter(a => a.status === 'pending' || a.status === 'under_review').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  return (
    <DashboardLayout>
      <div className="page-container max-w-6xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black">My Applications</h1>
              <p className="mt-1 text-slate-300">Track your event participation applications</p>
            </div>
            <Link to="/events" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl text-sm font-black text-white">
              <UserPlus className="w-4 h-4" /> Browse Events
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl text-center">
              <p className="text-2xl font-black text-amber-400">{pendingCount}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Pending</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl text-center">
              <p className="text-2xl font-black text-emerald-400">{approvedCount}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Approved</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl text-center">
              <p className="text-2xl font-black text-red-400">{rejectedCount}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Rejected</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <p className="font-bold text-sm">{error}</p>
          </div>
        )}

        {applications.length === 0 ? (
          <Card className="border-none shadow-xl bg-gradient-to-br from-slate-50 to-white">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">No Applications Yet</h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">Browse events and apply to participate as a performer, vendor, speaker, volunteer, or staff member.</p>
              <Link to="/events">
                <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black">
                  <UserPlus className="w-4 h-4 mr-2" /> Browse Events & Apply
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const event = app.events;
              const typeLabel = APPLICATION_TYPE_LABELS[app.application_type] || app.application_type;
              const statusLabel = STATUS_LABELS[app.status] || app.status;
              const statusColor = STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-800 border-gray-200';
              
              return (
                <Card key={app.id} className="border-none shadow-xl overflow-hidden">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      {/* Event Info */}
                      <div className="flex gap-4 flex-1 min-w-0">
                        {event?.cover_image && (
                          <img 
                            src={event.cover_image} 
                            alt="" 
                            className="w-20 h-20 md:w-24 md:h-24 rounded-xl object-cover flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-lg text-slate-900 truncate">{event?.title || 'Unknown Event'}</h3>
                            <Badge className={statusColor} variant="outline">
                              {statusLabel}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm font-medium text-amber-600">{typeLabel}</p>
                          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                            {event && (
                              <>
                                <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{new Date(event.start_time).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.venue_name}, {event.city}</span>
                              </>
                            )}
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Applied {new Date(app.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                        {app.status === 'approved' && event && (
                          <Link to={`/events/${event.id}`}>
                            <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black">
                              <ExternalLink className="w-4 h-4 mr-1" /> View Event
                            </Button>
                          </Link>
                        )}
                        {app.status === 'pending' || app.status === 'under_review' ? (
                          <Button variant="outline" className="w-full sm:w-auto" disabled>
                            <Loader2 className="w-4 h-4 mr-1" /> Under Review
                          </Button>
                        ) : app.status === 'rejected' ? (
                          <Button variant="outline" className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50" disabled>
                            <XCircle className="w-4 h-4 mr-1" /> Rejected
                          </Button>
                        ) : app.status === 'needs_revision' ? (
                          <Button variant="outline" className="w-full sm:w-auto text-purple-600 border-purple-200 hover:bg-purple-50" disabled>
                            <AlertCircle className="w-4 h-4 mr-1" /> Needs Revision
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {/* Details Expandable */}
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 text-sm">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <p className="text-slate-400 uppercase tracking-wider">Proposed Fee</p>
                          <p className="font-bold text-slate-900">{formatPrice(app.proposed_fee_kobo)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 uppercase tracking-wider">Application Fee</p>
                          <p className="font-bold text-slate-900">{app.application_fee_paid ? `Paid: ${formatPrice(app.application_fee_kobo)}` : 'Free'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 uppercase tracking-wider">Final Fee</p>
                          <p className="font-bold text-slate-900">{app.admin_fee_kobo > 0 ? formatPrice(app.admin_fee_kobo) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 uppercase tracking-wider">Reference</p>
                          <p className="font-mono text-slate-900 truncate max-w-xs">{app.paystack_reference || '—'}</p>
                        </div>
                      </div>

                      {app.review_notes && (
                        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                          <p className="text-xs font-bold text-amber-900 mb-1">Organizer Feedback:</p>
                          <p className="text-xs text-amber-800">{app.review_notes}</p>
                        </div>
                      )}

                      {app.requirements && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-xs font-bold text-slate-700 mb-1">Your Requirements:</p>
                          <p className="text-xs text-slate-600">{app.requirements}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyApplications;