import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DashboardLayout } from '../components/DashboardLayout';
import { supabase } from '../supabase';
import { APPLICATION_TYPES } from '../lib/eventApplications';

interface ReviewApplication {
  id: string;
  event_id: string;
  applicant_id: string;
  application_type: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  bio: string | null;
  portfolio_url: string | null;
  proposed_fee_kobo: number;
  requirements: string | null;
  status: string;
  review_notes: string | null;
  admin_fee_kobo: number;
  application_fee_paid: boolean;
  application_fee_kobo: number;
  created_at: string;
  events: { id: string; title: string; start_time: string; venue_name: string | null; city: string | null } | null;
}

interface ReviewDraft {
  status: string;
  reviewNotes: string;
  finalFeeNaira: string;
}

const REVIEW_STATUSES = [
  ['pending', 'Pending'],
  ['under_review', 'Under Review'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['needs_revision', 'Needs Revision'],
] as const;

const formatPrice = (kobo: number) => `NGN ${(Number(kobo || 0) / 100).toLocaleString()}`;

export const ApplicationReview: React.FC = () => {
  const [applications, setApplications] = useState<ReviewApplication[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Your session has expired. Please sign in again.');
      const response = await fetch('/api/admin/applications', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Applications could not be loaded');
      const records: ReviewApplication[] = result?.applications || [];
      setApplications(records);
      setDrafts(Object.fromEntries(records.map((application) => [application.id, {
        status: application.status,
        reviewNotes: application.review_notes || '',
        finalFeeNaira: String(Number(application.admin_fee_kobo || 0) / 100),
      }])));
    } catch (loadError: any) {
      setError(loadError.message || 'Applications could not be loaded');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApplications();
  }, []);

  const updateDraft = (id: string, changes: Partial<ReviewDraft>) => {
    setDrafts((previous) => ({
      ...previous,
      [id]: { ...previous[id], ...changes },
    }));
  };

  const saveReview = async (application: ReviewApplication) => {
    const draft = drafts[application.id];
    if (!draft) return;

    setSavingId(application.id);
    setError('');
    setSuccess('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Your session has expired. Please sign in again.');
      const applicationType = APPLICATION_TYPES.find((type) => type.value === application.application_type);
      const body: Record<string, unknown> = {
        status: draft.status,
        review_notes: draft.reviewNotes,
      };
      if (applicationType?.category === 'service_provider') {
        body.final_fee_kobo = Math.round(Number(draft.finalFeeNaira || 0) * 100);
      }

      const response = await fetch(`/api/admin/applications/${encodeURIComponent(application.id)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Review could not be saved');

      setApplications((previous) => previous.map((record) => record.id === application.id ? result.application : record));
      setSuccess(result.fulfillment_warning
        ? `Review saved, but fulfillment needs attention: ${result.fulfillment_warning}`
        : 'Application review saved.');
    } catch (saveError: any) {
      setError(saveError.message || 'Review could not be saved');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-container mx-auto max-w-6xl space-y-5 pb-20">
        <header className="border-b border-stone-200 pb-4">
          <h1 className="text-2xl font-black text-stone-900">Event Applications</h1>
          <p className="mt-1 text-sm text-stone-600">Review applicant details, proposed compensation, and processing-fee status.</p>
        </header>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
          </div>
        )}
        {success && (
          <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-40 items-center justify-center text-stone-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading applications
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-stone-600">No event applications found.</CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => {
              const draft = drafts[application.id];
              const type = APPLICATION_TYPES.find((option) => option.value === application.application_type);
              const event = Array.isArray(application.events) ? application.events[0] : application.events;
              const paymentLabel = Number(application.application_fee_kobo) === 0
                ? 'No fee'
                : application.application_fee_paid
                  ? `Paid ${formatPrice(application.application_fee_kobo)}`
                  : `Due ${formatPrice(application.application_fee_kobo)}`;

              return (
                <Card key={application.id} className="overflow-hidden rounded-lg">
                  <CardHeader className="border-b border-stone-100 bg-stone-50 px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-lg">{event?.title || 'Unknown event'}</CardTitle>
                        <CardDescription className="mt-1">
                          {type?.label || application.application_type} · {event?.city || event?.venue_name || 'Location not listed'} · Applied {new Date(application.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <span className="rounded-full border border-stone-300 px-2.5 py-1 text-xs font-bold capitalize text-stone-700">
                        {application.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <section className="min-w-0 space-y-1 text-sm">
                        <h2 className="font-bold text-stone-900">Applicant</h2>
                        <p className="break-words">{application.applicant_name}</p>
                        <p className="break-all text-stone-600">{application.applicant_email}</p>
                        <p className="text-stone-600">{application.applicant_phone || 'No phone provided'}</p>
                        {application.portfolio_url && (
                          <a className="block break-all text-amber-800 underline" href={application.portfolio_url} target="_blank" rel="noreferrer">Portfolio</a>
                        )}
                      </section>
                      <section className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs font-bold uppercase text-stone-500">Proposed compensation</p>
                          <p className="mt-1 font-semibold">{formatPrice(application.proposed_fee_kobo)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase text-stone-500">Application fee</p>
                          <p className="mt-1 font-semibold">{paymentLabel}</p>
                        </div>
                      </section>
                    </div>

                    <div className="space-y-3 border-t border-stone-100 pt-4 text-sm">
                      <div>
                        <h2 className="font-bold text-stone-900">Application details</h2>
                        <p className="mt-1 whitespace-pre-wrap break-words text-stone-700">{application.bio || 'No details supplied'}</p>
                      </div>
                      {application.requirements && (
                        <div>
                          <h3 className="text-xs font-bold uppercase text-stone-500">Requirements</h3>
                          <p className="mt-1 whitespace-pre-wrap break-words text-stone-700">{application.requirements}</p>
                        </div>
                      )}
                    </div>

                    {draft && (
                      <div className="grid gap-4 border-t border-stone-100 pt-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`status-${application.id}`}>Review status</Label>
                          <select
                            id={`status-${application.id}`}
                            value={draft.status}
                            onChange={(event) => updateDraft(application.id, { status: event.target.value })}
                            className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm"
                          >
                            {REVIEW_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </div>
                        {type?.category === 'service_provider' && (
                          <div className="space-y-2">
                            <Label htmlFor={`fee-${application.id}`}>Approved contract fee (NGN)</Label>
                            <Input
                              id={`fee-${application.id}`}
                              type="number"
                              min="0"
                              step="100"
                              value={draft.finalFeeNaira}
                              onChange={(event) => updateDraft(application.id, { finalFeeNaira: event.target.value })}
                            />
                          </div>
                        )}
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`notes-${application.id}`}>Feedback for applicant</Label>
                          <Textarea
                            id={`notes-${application.id}`}
                            rows={3}
                            maxLength={3000}
                            value={draft.reviewNotes}
                            onChange={(event) => updateDraft(application.id, { reviewNotes: event.target.value })}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Button onClick={() => void saveReview(application)} disabled={savingId === application.id}>
                            {savingId === application.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save review
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ApplicationReview;