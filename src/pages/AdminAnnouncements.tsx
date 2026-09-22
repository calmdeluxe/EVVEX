import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import { 
  Megaphone, 
  Send, 
  ChevronLeft, 
  RefreshCw, 
  CheckCircle2, 
  Trash2, 
  Clock, 
  Users, 
  Sparkles,
  FileText
} from 'lucide-react';

export const AdminAnnouncements: React.FC = () => {
  const { isAdmin, isAuthReady, user, profile } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    target_audience: 'all',
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isMarketingPartner = profile?.account_tier === 'marketing_partner' || profile?.role === 'marketing_partner';

  useEffect(() => {
    if (isAuthReady) {
      if (!isAdmin && !isMarketingPartner) {
        navigate('/dashboard');
      } else {
        fetchAnnouncements();
      }
    }
  }, [isAuthReady, isAdmin, isMarketingPartner, navigate]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAnnouncements(data);
      }
    } catch (err: any) {
      console.error("[AdminAnnouncements] Failed to fetch announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = (templateType: string) => {
    if (templateType === 'welcome') {
      setForm({
        title: '🎉 Welcome to CalmReader Platform Update',
        content: 'We are thrilled to launch new features including offline reading, instant eBook bookshelf sync, and audio features.',
        target_audience: 'all',
      });
    } else if (templateType === 'premium_perk') {
      setForm({
        title: '⭐ New Exclusive Content Unlocked for Premium Members',
        content: 'Check out the new premium library catalog with full offline caching and priority support access.',
        target_audience: 'premium',
      });
    } else if (templateType === 'author_tip') {
      setForm({
        title: '📚 Author Guide: Maximizing eBook Sales and Royalties',
        content: 'Explore tips on optimizing your cover artwork, writing compelling descriptions, and leveraging promo links.',
        target_audience: 'authors',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setErrorMsg('Please enter both a title and content for the announcement.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          title: form.title.trim(),
          content: form.content.trim(),
          target_audience: form.target_audience,
          is_active: true,
          created_by: user?.id || null,
          sent_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setSuccessMsg('Announcement broadcasted successfully!');
      setForm({ title: '', content: '', target_audience: 'all' });
      fetchAnnouncements();
    } catch (err: any) {
      setErrorMsg('Failed to create announcement: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert('Failed to delete announcement: ' + err.message);
    }
  };

  if (!isAuthReady || (!isAdmin && !isMarketingPartner)) return null;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Button 
            onClick={() => navigate('/admin')}
            variant="ghost" 
            className="rounded-xl h-10 px-3 flex items-center gap-2 text-slate-500 hover:text-green-700 transition-all font-black"
          >
            <ChevronLeft className="w-5 h-5" /> Back to Admin
          </Button>

          <Button 
            onClick={fetchAnnouncements}
            variant="outline"
            className="rounded-2xl h-11 px-4 font-bold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            Announcements Broadcast
            {isMarketingPartner && (
              <span className="text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-full uppercase tracking-wider">
                Marketing Partner
              </span>
            )}
          </h1>
          <p className="text-gray-500 font-medium mt-1">Create and broadcast platform announcements to target audiences.</p>
        </div>

        {/* Create Announcement Form */}
        <Card className="rounded-[32px] border-none shadow-md overflow-hidden bg-white p-8">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-green-700" />
              Create Broadcast Message
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Quick Templates */}
            <div className="mb-6 space-y-2">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Pre-Approved Templates</Label>
              <div className="flex flex-wrap gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleApplyTemplate('welcome')}
                  className="rounded-xl text-xs font-bold border-slate-200"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" /> General Welcome
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleApplyTemplate('premium_perk')}
                  className="rounded-xl text-xs font-bold border-slate-200"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Premium Perks
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleApplyTemplate('author_tip')}
                  className="rounded-xl text-xs font-bold border-slate-200"
                >
                  <FileText className="w-3.5 h-3.5 mr-1 text-blue-500" /> Author Update
                </Button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {successMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" /> {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm font-bold">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">Announcement Title</Label>
                  <Input 
                    placeholder="E.g., Welcome to CalmReader 2.0" 
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="h-12 rounded-2xl border-slate-200 focus:ring-green-700 font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">Target Audience</Label>
                  <Select 
                    value={form.target_audience} 
                    onValueChange={(val) => setForm({ ...form, target_audience: val })}
                  >
                    <SelectTrigger className="h-12 rounded-2xl border-slate-200 font-bold">
                      <SelectValue placeholder="Select Audience" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="free">Free Users</SelectItem>
                      <SelectItem value="premium">Premium Users</SelectItem>
                      <SelectItem value="authors">Authors</SelectItem>
                      <SelectItem value="marketing_partners">Marketing Partners</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">Message Content</Label>
                <Textarea 
                  placeholder="Write message content here..." 
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="rounded-2xl border-slate-200 focus:ring-green-700 font-medium"
                />
              </div>

              <Button 
                type="submit" 
                disabled={submitting}
                className="h-12 px-8 bg-green-700 hover:bg-green-800 text-white font-black rounded-2xl shadow-lg shadow-green-100 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Broadcasting...' : 'Broadcast Announcement'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Announcements History */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">Announcement History</h2>

          {loading ? (
            <div className="py-12 flex flex-col items-center text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-green-700" />
              <p className="font-bold text-xs">Loading past announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 italic border-dashed border-2 rounded-[28px]">
              No past announcements found.
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {announcements.map((item) => (
                <Card key={item.id} className="rounded-[28px] border-slate-100 shadow-sm p-6 hover:shadow-md transition-all">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-emerald-600 text-white font-bold rounded-lg px-3 py-1">
                          Audience: {item.target_audience?.toUpperCase() || 'ALL'}
                        </Badge>
                        <h3 className="text-lg font-black text-slate-900">{item.title}</h3>
                      </div>
                      <p className="text-slate-600 font-medium leading-relaxed">{item.content}</p>
                      <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest pt-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Sent: {new Date(item.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {isAdmin && (
                      <Button 
                        onClick={() => handleDelete(item.id)}
                        variant="ghost" 
                        size="icon"
                        className="rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
