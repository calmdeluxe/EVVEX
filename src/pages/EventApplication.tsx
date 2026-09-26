import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, CheckCircle2, CreditCard, User, Mail, Phone, Globe, FileText, Zap, CalendarDays, MapPin } from 'lucide-react';

declare const PaystackPop: any;

const formatPrice = (kobo: number) => `NGN ${(Number(kobo || 0) / 100).toLocaleString()}`;

interface ApplicationTypeOption {
  value: string;
  label: string;
  description: string;
  requiresFee: boolean;
  category: 'vendor' | 'staff' | 'participation';
}

const APPLICATION_TYPES: ApplicationTypeOption[] = [
  // Vendor/Service categories
  { value: 'catering', label: 'Caterer', description: 'Food & beverage services', requiresFee: true, category: 'vendor' },
  { value: 'mc', label: 'Host / MC', description: 'Master of ceremonies, hosting', requiresFee: true, category: 'vendor' },
  { value: 'dj', label: 'DJ', description: 'Music & entertainment', requiresFee: true, category: 'vendor' },
  { value: 'photography', label: 'Photographer / Videographer', description: 'Photo & video coverage', requiresFee: true, category: 'vendor' },
  { value: 'decor', label: 'Decorator', description: 'Venue decoration & styling', requiresFee: true, category: 'vendor' },
  { value: 'ushers', label: 'Usher Team', description: 'Guest guidance & seating', requiresFee: false, category: 'vendor' },
  { value: 'security', label: 'Security / Bouncer', description: 'Event security services', requiresFee: false, category: 'vendor' },
  
  // Staff roles
  { value: 'gate_scanner', label: 'Gate Scanner', description: 'Ticket scanning & check-in', requiresFee: false, category: 'staff' },
  { value: 'usher', label: 'Usher', description: 'Guest assistance & directions', requiresFee: false, category: 'staff' },
  { value: 'stage_manager', label: 'Stage Manager', description: 'Stage coordination & timing', requiresFee: false, category: 'staff' },
  
  // Participation types
  { value: 'artist_performer', label: 'Artist / Performer', description: 'Live performance, music, dance', requiresFee: true, category: 'participation' },
  { value: 'speaker', label: 'Speaker', description: 'Keynote, panelist, workshop leader', requiresFee: false, category: 'participation' },
  { value: 'exhibitor', label: 'Exhibitor', description: 'Showcase products/services', requiresFee: true, category: 'participation' },
  { value: 'event_partner', label: 'Event Partner', description: 'Strategic partnership', requiresFee: true, category: 'participation' },
  { value: 'ambassador', label: 'Ambassador', description: 'Promote & represent the event', requiresFee: false, category: 'participation' },
  { value: 'sponsor', label: 'Sponsor', description: 'Financial or in-kind sponsorship', requiresFee: true, category: 'participation' },
  { value: 'volunteer', label: 'Volunteer', description: 'General event support', requiresFee: false, category: 'participation' },
  { value: 'contestant', label: 'Contestant', description: 'Competition participant', requiresFee: false, category: 'participation' },
  { value: 'other', label: 'Other', description: 'Custom participation type', requiresFee: false, category: 'participation' },
];

export const EventApplication: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paystackKey, setPaystackKey] = useState('');
  const [existingApplication, setExistingApplication] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    application_type: '',
    applicant_name: user?.user_metadata?.full_name || '',
    applicant_email: user?.email || '',
    applicant_phone: '',
    bio: '',
    portfolio_url: '',
    proposed_fee_kobo: 0,
    requirements: '',
  });
  
  const [selectedType, setSelectedType] = useState<ApplicationTypeOption | null>(null);

  useEffect(() => {
    const scriptId = 'paystack-inline-js';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Load event details
        if (id) {
          const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .eq('status', 'published')
            .maybeSingle();
          
          if (eventError) throw eventError;
          if (!eventData) throw new Error('Event not found or not published');
          setEvent(eventData);
        }

        // Load paystack key
        const configPromise = supabase.from('config').select('value').eq('key', 'paystack_public_key').maybeSingle();
        const { data: config } = await configPromise;
        setPaystackKey(config?.value || '');

        // Check for existing application
        if (user?.id && id) {
          const { data: existing } = await supabase
            .from('event_applications')
            .select('*')
            .eq('event_id', id)
            .eq('applicant_id', user.id)
            .maybeSingle();
          setExistingApplication(existing);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load event');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) load();
  }, [id, user?.id]);

  useEffect(() => {
    if (user?.email) setFormData(prev => ({ ...prev, applicant_email: user.email }));
  }, [user?.email]);

  const handleTypeChange = (typeValue: string) => {
    const type = APPLICATION_TYPES.find(t => t.value === typeValue);
    setSelectedType(type || null);
    setFormData(prev => ({ ...prev, application_type: typeValue }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.application_type) {
      setError('Please select a participation type');
      return false;
    }
    if (!formData.applicant_name.trim()) {
      setError('Your name is required');
      return false;
    }
    if (!formData.applicant_email.trim()) {
      setError('Your email is required');
      return false;
    }
    if (!formData.applicant_phone.trim()) {
      setError('Your phone number is required');
      return false;
    }
    if (!formData.bio.trim()) {
      setError('Please tell us why you want to participate');
      return false;
    }
    if (selectedType?.requiresFee && (!paystackKey || !window.PaystackPop)) {
      setError('Payment gateway not configured');
      return false;
    }
    return true;
  };

  const handleSuccess = async (ref: string) => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        localStorage.setItem('pendingEventApp', JSON.stringify({ ...formData, ref, event_id: id }));
        navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
        return;
      }

      const amountKobo = Number(formData.proposed_fee_kobo || 0);
      
      await supabase.from('event_applications').insert({
        event_id: id,
        applicant_id: user.id,
        application_type: formData.application_type,
        applicant_name: formData.applicant_name.trim(),
        applicant_email: formData.applicant_email.trim(),
        applicant_phone: formData.applicant_phone.trim(),
        bio: formData.bio.trim(),
        portfolio_url: formData.portfolio_url.trim() || null,
        proposed_fee_kobo: amountKobo,
        requirements: formData.requirements.trim() || null,
        paystack_reference: ref,
        application_fee_paid: amountKobo > 0,
        application_fee_kobo: amountKobo,
        status: 'pending',
      });

      setSuccess('Application submitted successfully! The organizer will review and get back to you.');
      setTimeout(() => navigate('/events/' + id), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    if (!user) {
      localStorage.setItem('pendingEventApp', JSON.stringify(formData));
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    const amountKobo = Number(formData.proposed_fee_kobo || 0);
    
    // Free application - submit directly
    if (amountKobo === 0 || !selectedType?.requiresFee) {
      setProcessing(true);
      try {
        await supabase.from('event_applications').insert({
          event_id: id,
          applicant_id: user.id,
          application_type: formData.application_type,
          applicant_name: formData.applicant_name.trim(),
          applicant_email: formData.applicant_email.trim(),
          applicant_phone: formData.applicant_phone.trim(),
          bio: formData.bio.trim(),
          portfolio_url: formData.portfolio_url.trim() || null,
          proposed_fee_kobo: amountKobo,
          requirements: formData.requirements.trim() || null,
          application_fee_paid: false,
          application_fee_kobo: 0,
          status: 'pending',
        });
        setSuccess('Application submitted successfully! The organizer will review and get back to you.');
        setTimeout(() => navigate('/events/' + id), 3000);
      } catch (err: any) {
        setError(err.message || 'Failed to submit application');
      } finally {
        setProcessing(false);
      }
      return;
    }

    // Paid application - open Paystack
    if (!paystackKey || !window.PaystackPop) {
      setError('Payment gateway temporarily unavailable');
      return;
    }

    setProcessing(true);
    const handler = window.PaystackPop.setup({
      key: paystackKey,
      email: formData.applicant_email.trim(),
      amount: amountKobo,
      currency: 'NGN',
      ref: `EVTAPP_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      metadata: {
        type: 'event_application',
        event_id: id,
        application_type: formData.application_type,
        user_id: user.id,
        applicant_name: formData.applicant_name.trim(),
        applicant_email: formData.applicant_email.trim(),
        applicant_phone: formData.applicant_phone.trim(),
      },
      callback: (response: any) => handleSuccess(response.reference),
      onClose: () => setProcessing(false),
    });
    handler.openIframe();
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;
  if (error && !event) return <DashboardLayout><div className="p-8 text-center text-red-700 font-bold">{error}</div></DashboardLayout>;
  if (!event) return <DashboardLayout><div className="p-8 text-center font-bold">Event not found</div></DashboardLayout>;

  // Check if user already has an application for this event
  if (existingApplication) {
    const statusLabels: Record<string, string> = {
      pending: 'Pending Review',
      under_review: 'Under Review',
      approved: 'Approved',
      rejected: 'Rejected',
      needs_revision: 'Needs Revision',
      withdrawn: 'Withdrawn',
    };
    
    const statusColors: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      under_review: 'bg-blue-100 text-blue-800 border-blue-200',
      approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      needs_revision: 'bg-purple-100 text-purple-800 border-purple-200',
      withdrawn: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    return (
      <DashboardLayout>
        <div className="page-container max-w-3xl mx-auto space-y-6 pb-20">
          <div className="bg-slate-900 text-white p-6 rounded-3xl">
            <h1 className="text-2xl font-black mb-2">Application Status</h1>
            <p className="text-slate-300">Your application for <strong>{event.title}</strong></p>
          </div>

          <Card className="border-none shadow-xl">
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-4">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-black text-sm border ${statusColors[existingApplication.status]}`}>
                  <CheckCircle2 className="w-4 h-4" />
                  {statusLabels[existingApplication.status] || existingApplication.status}
                </div>
                <p className="text-slate-500">Applied as <strong>{APPLICATION_TYPES.find(t => t.value === existingApplication.application_type)?.label || existingApplication.application_type}</strong></p>
                <p className="text-sm text-slate-400">Submitted: {new Date(existingApplication.created_at).toLocaleDateString()}</p>
              </div>

              {existingApplication.review_notes && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-sm font-bold text-slate-700 mb-1">Organizer Feedback:</p>
                  <p className="text-sm text-slate-600">{existingApplication.review_notes}</p>
                </div>
              )}

              {existingApplication.status === 'rejected' && (
                <Button variant="outline" onClick={() => navigate('/events/' + id)} className="w-full">
                  View Event
                </Button>
              )}

              {existingApplication.status === 'pending' && (
                <Button variant="outline" onClick={() => navigate('/events/' + id)} className="w-full">
                  Back to Event
                </Button>
              )}

              {existingApplication.status === 'approved' && (
                <Button onClick={() => navigate('/events/' + id)} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  View Event Details
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-container max-w-3xl mx-auto space-y-6 pb-20">
        {/* Event Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-green-400/80 mb-2 block">Apply to Participate</span>
              <h1 className="text-2xl md:text-3xl font-black">{event.title}</h1>
              <p className="mt-2 text-slate-300 flex flex-wrap items-center gap-3 text-sm">
                <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" />{new Date(event.start_time).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{event.venue_name}, {event.city}</span>
              </p>
            </div>
            {event.cover_image && (
              <img src={event.cover_image} alt="" className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover hidden md:block" />
            )}
          </div>
        </div>

        {/* Application Form */}
        <Card className="border-none shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-black">Participation Application</CardTitle>
            <CardDescription className="text-slate-500">
              Choose how you'd like to participate in this event. Some roles may require an application fee.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3 text-red-600 text-sm font-medium border border-red-100">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-50 p-4 rounded-xl flex items-start gap-3 text-green-600 text-sm font-medium border border-green-100">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Participation Type Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-black text-slate-700 block">How would you like to participate?</Label>
              <Select value={formData.application_type} onValueChange={handleTypeChange}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select participation type" />
                </SelectTrigger>
                <SelectContent>
                  <div className="space-y-1">
                    <div className="px-2 py-1 text-xs font-black uppercase text-slate-500">Services & Vendors</div>
                    {APPLICATION_TYPES.filter(t => t.category === 'vendor').map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{type.label}</span>
                          <span className="text-xs text-slate-500">{type.description}{type.requiresFee ? ' · Fee applies' : ''}</span>
                        </div>
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1 text-xs font-black uppercase text-slate-500">Event Staff</div>
                    {APPLICATION_TYPES.filter(t => t.category === 'staff').map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{type.label}</span>
                          <span className="text-xs text-slate-500">{type.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1 text-xs font-black uppercase text-slate-500">Participation</div>
                    {APPLICATION_TYPES.filter(t => t.category === 'participation').map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{type.label}</span>
                          <span className="text-xs text-slate-500">{type.description}{type.requiresFee ? ' · Fee applies' : ''}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
              {selectedType && (
                <p className="text-xs text-slate-500 mt-1">
                  {selectedType.description}
                  {selectedType.requiresFee && <span className="text-amber-600 font-bold ml-2">Application fee applies</span>}
                </p>
              )}
            </div>

            {/* Personal Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Full Name
                </Label>
                <Input
                  value={formData.applicant_name}
                  onChange={e => handleInputChange('applicant_name', e.target.value)}
                  placeholder="Your full name"
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Email
                </Label>
                <Input
                  type="email"
                  value={formData.applicant_email}
                  onChange={e => handleInputChange('applicant_email', e.target.value)}
                  placeholder="your@email.com"
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Phone Number
                </Label>
                <Input
                  type="tel"
                  value={formData.applicant_phone}
                  onChange={e => handleInputChange('applicant_phone', e.target.value)}
                  placeholder="+234 80X XXX XXXX"
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> Portfolio / Social Media / Website (Optional)
                </Label>
                <Input
                  value={formData.portfolio_url}
                  onChange={e => handleInputChange('portfolio_url', e.target.value)}
                  placeholder="https://instagram.com/yourhandle or portfolio link"
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2 pt-4 border-t">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Why do you want to participate? *</Label>
              <Textarea
                value={formData.bio}
                onChange={e => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about your experience, what you'll bring to the event, and why you're a great fit..."
                className="rounded-xl min-h-[120px] h-12"
                rows={4}
              />
            </div>

            {/* Requirements */}
            <div className="space-y-2 pt-4 border-t">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Special Requirements (Optional)</Label>
              <Textarea
                value={formData.requirements}
                onChange={e => handleInputChange('requirements', e.target.value)}
                placeholder="Equipment needs, space requirements, technical specs, dietary restrictions, etc."
                className="rounded-xl min-h-[80px] h-12"
                rows={3}
              />
            </div>

            {/* Proposed Fee */}
            {(selectedType?.requiresFee || formData.application_type === 'other') && (
              <div className="space-y-2 pt-4 border-t bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" /> Proposed Fee / Budget (NGN)
                </Label>
                <Input
                  type="number"
                  value={formData.proposed_fee_kobo / 100}
                  onChange={e => handleInputChange('proposed_fee_kobo', Math.round(Number(e.target.value || 0) * 100))}
                  placeholder="0"
                  className="h-12 rounded-xl text-right font-mono text-xl"
                  min="0"
                  step="100"
                />
                <p className="text-xs text-slate-500">Enter amount in Naira. Application fee: {formatPrice(selectedType?.requiresFee ? 500000 : 0)}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4 border-t space-y-3">
              <Button
                onClick={handleSubmit}
                disabled={processing || !formData.application_type}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-100 active:scale-[0.98] transition-all"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : selectedType?.requiresFee ? (
                  `Apply & Pay ${formatPrice(500000)}`
                ) : (
                  'Submit Application'
                )}
              </Button>
              <p className="text-center text-xs text-slate-500">
                By submitting, you agree to be contacted by the event organizer regarding your application.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EventApplication;