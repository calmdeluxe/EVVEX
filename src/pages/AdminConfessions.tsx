import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { 
  ShieldCheck, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Filter,
  Eye,
  EyeOff,
  ArrowLeft,
  Search,
  BookOpen,
  MessageSquare,
  BarChart3,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AdminLayout } from '../components/AdminLayout';

interface Confession {
  id: string;
  content: string;
  is_approved: boolean;
  expires_at: string;
  created_at: string;
}

export const AdminConfessions: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [pipelineRequests, setPipelineRequests] = useState<any[]>([]);
  const [loadingPipeline, setLoadingPipeline] = useState(false);

  const stats = {
    total: confessions.length,
    pending: confessions.filter(c => !c.is_approved).length,
    approved: confessions.filter(c => c.is_approved).length,
    expired: confessions.filter(c => new Date(c.expires_at) < new Date()).length
  };

  useEffect(() => {
    if (isAdmin) {
      fetchConfessions();
      fetchPipeline();
    }
  }, [isAdmin, filter]);

  const fetchPipeline = async () => {
    try {
      setLoadingPipeline(true);
      const { data, error } = await supabase
        .from('support_requests')
        .select('*')
        .eq('type', 'anonymous_story')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPipelineRequests(data || []);
    } catch (err) {
      console.error('Error fetching pipeline:', err);
    } finally {
      setLoadingPipeline(false);
    }
  };

  const handlePipelinePost = async (req: any) => {
    try {
      setIsPublishing(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      // Auto-post to confessions
      const { error: postError } = await supabase
        .from('anonymous_confessions')
        .insert([{ 
          content: req.message,
          is_approved: true,
          user_id: authUser?.id
        }]);

      if (postError) throw postError;

      // Mark request as resolved
      const { error: resError } = await supabase
        .from('support_requests')
        .update({ status: 'resolved', admin_response: 'Published to Hub' })
        .eq('id', req.id);

      if (resError) throw resError;

      fetchPipeline();
      fetchConfessions();
      alert('Legacy published successfully!');
    } catch (err) {
      console.error('Error publishing from pipeline:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  const fetchConfessions = async () => {
    try {
      setLoading(true);
      let query = supabase.from('anonymous_confessions').select('*');
      
      if (filter === 'pending') {
        query = query.eq('is_approved', false);
      } else if (filter === 'approved') {
        query = query.eq('is_approved', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setConfessions(data || []);
    } catch (err) {
      console.error('Error fetching admin confessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      setIsPublishing(true);
      const { error } = await supabase
        .from('anonymous_confessions')
        .insert([{ 
          content: newContent.trim(),
          is_approved: true,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (error) throw error;
      setNewContent('');
      fetchConfessions();
      alert('Successfully published to the confessions hub!');
    } catch (err) {
      console.error('Error manual posting:', err);
      alert('Failed to publish stories. Check console.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('anonymous_confessions')
        .update({ is_approved: true })
        .eq('id', id);

      if (error) throw error;
      setConfessions(prev => prev.filter(c => c.id !== id || filter !== 'pending'));
      if (filter === 'all') {
        setConfessions(prev => prev.map(c => c.id === id ? { ...c, is_approved: true } : c));
      }
    } catch (err) {
      console.error('Error approving confession:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this confession?')) return;
    try {
      const { error } = await supabase
        .from('anonymous_confessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setConfessions(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting confession:', err);
    }
  };

  const handleDeleteAllExpired = async () => {
    const expiredIds = confessions
      .filter(c => new Date(c.expires_at) < new Date())
      .map(c => c.id);

    if (expiredIds.length === 0) {
      alert('No expired confessions found.');
      return;
    }

    if (!window.confirm(`Delete all ${expiredIds.length} expired confessions?`)) return;

    try {
      const { error } = await supabase
        .from('anonymous_confessions')
        .delete()
        .in('id', expiredIds);

      if (error) throw error;
      setConfessions(prev => prev.filter(c => !expiredIds.includes(c.id)));
      alert('Successfully deleted all expired confessions.');
    } catch (err) {
      console.error('Error deleting expired confessions:', err);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-gray-900 uppercase">Unauthorized</h1>
          <p className="text-gray-500 font-medium">This area is for platform administrators only.</p>
        </div>
      </div>
    );
  }

  const filteredConfessions = confessions.filter(c => 
    c.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Studio Header */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
               <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/admin')}
                className="rounded-2xl hover:bg-slate-100"
               >
                 <ArrowLeft className="w-6 h-6" />
               </Button>
               <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Studio Management</span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">Confessions Studio</h1>
               </div>
            </div>
            <p className="text-slate-500 font-medium max-w-xl">
              Control the anonymous heartbeat of your platform. Review, approve, or purge confessions at will.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
             <Button 
               variant="outline" 
               className="h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 bg-white/50 border-slate-200"
               onClick={() => navigate('/dashboard')}
             >
               <BookOpen className="w-4 h-4" /> App Home
             </Button>
             <Button 
               variant="destructive" 
               className="h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-lg shadow-red-100"
               onClick={handleDeleteAllExpired}
             >
               <AlertTriangle className="w-4 h-4" /> Purge Expired
             </Button>
          </div>
        </header>

        {/* Manual Posting Form */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-indigo-600 p-8 md:p-12 rounded-[40px] shadow-2xl relative overflow-hidden group"
        >
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <MessageSquare className="w-32 h-32 rotate-12" />
           </div>
           <div className="relative z-10 space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tight">Post New Story</h2>
                <p className="text-indigo-100 text-sm font-medium">Type or paste the stories you've gathered to publish them instantly.</p>
              </div>
              <form onSubmit={handleManualPost} className="space-y-4">
                 <textarea 
                   value={newContent}
                   onChange={(e) => setNewContent(e.target.value)}
                   className="w-full h-40 bg-white/10 border border-white/20 rounded-3xl p-6 text-white placeholder:text-indigo-300 font-serif italic text-lg focus:outline-none focus:ring-2 focus:ring-white/30 transition-all resize-none"
                   placeholder="Once upon a time in Lagos..."
                   required
                 />
                 <div className="flex justify-end">
                    <Button 
                      disabled={isPublishing || !newContent.trim()}
                      className="h-14 px-10 rounded-2xl bg-white text-indigo-600 hover:bg-slate-50 font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50"
                    >
                      {isPublishing ? 'Publishing...' : 'Publish to Hub'}
                    </Button>
                 </div>
              </form>
           </div>
        </motion.div>

        {/* Pipeline Section */}
        <div className="space-y-6">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Incoming Request Pipeline</h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadingPipeline ? (
                 <div className="col-span-full py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing pipeline...</div>
              ) : pipelineRequests.length === 0 ? (
                 <div className="col-span-full py-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px]">
                   <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Pipeline Clear</p>
                 </div>
              ) : (
                pipelineRequests.map((req) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group"
                  >
                     <p className="text-sm font-medium text-slate-600 italic line-clamp-3 mb-6 leading-relaxed">"{req.message}"</p>
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requested By Profile</span>
                        <Button 
                          onClick={() => handlePipelinePost(req)}
                          disabled={isPublishing}
                          size="sm" 
                          className="rounded-xl h-10 px-6 bg-slate-950 text-white font-black text-[10px] uppercase tracking-widest"
                        >
                          Push to Hub
                        </Button>
                     </div>
                  </motion.div>
                ))
              )}
           </div>
        </div>

        {/* Studio Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
           {[
             { label: 'Total Posts', value: stats.total, icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
             { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
             { label: 'Approved', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
             { label: 'Expired', value: stats.expired, icon: Calendar, color: 'text-red-600', bg: 'bg-red-50' },
           ].map((s, i) => (
             <motion.div 
               key={i}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.1 }}
               className={`${s.bg} p-6 rounded-[32px] border border-white/20 shadow-sm`}
             >
                <div className="flex items-center justify-between mb-4">
                   <div className={`p-2 rounded-xl bg-white/50`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                   </div>
                   <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">LIVE</span>
                </div>
                <p className="text-3xl font-black text-slate-900 leading-none mb-1">{s.value}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{s.label}</p>
             </motion.div>
           ))}
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-100/50 p-6 rounded-[40px]">
           <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 gap-1 w-full md:w-auto">
            {(['pending', 'approved', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === t 
                    ? 'bg-slate-950 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative flex-1 w-full">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <Input 
               placeholder="Search confession content..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="h-14 pl-12 pr-6 bg-white border-slate-200 rounded-2xl font-medium"
             />
          </div>
        </div>

        {/* Confessions List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredConfessions.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[40px] border-2 border-dashed border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
               <Filter className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No results match your workspace filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
            <AnimatePresence mode="popLayout">
              {filteredConfessions.map((confession) => (
                <motion.div
                  key={confession.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative group hover:shadow-xl hover:scale-[1.02] transition-all duration-500"
                >
                  <div className="flex flex-col h-full space-y-6">
                    <div className="flex justify-between items-start">
                       <Badge className={
                         confession.is_approved ? 'bg-emerald-600' : 'bg-amber-500'
                       }>
                         {confession.is_approved ? 'APPROVED' : 'PENDING'}
                       </Badge>
                       <div className="flex gap-2">
                          {!confession.is_approved && (
                            <button
                              onClick={() => handleApprove(confession.id)}
                              className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                              title="Approve"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(confession.id)}
                            className="w-10 h-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                       </div>
                    </div>

                    <div className="flex-1">
                      <p className="text-slate-800 text-lg font-serif font-medium leading-relaxed italic line-clamp-4 group-hover:line-clamp-none transition-all duration-500">
                        "{confession.content}"
                      </p>
                    </div>

                    <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                       <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <Clock className="w-3 h-3 mr-1.5" />
                          {formatDistanceToNow(new Date(confession.created_at))} ago
                       </div>
                       <div className={`flex items-center text-[10px] font-black uppercase tracking-tighter ${
                         new Date(confession.expires_at) < new Date() ? 'text-red-500' : 'text-slate-400'
                       }`}>
                          {new Date(confession.expires_at) < new Date() ? 'EXPIRED' : `EXPIRES: ${formatDistanceToNow(new Date(confession.expires_at))}`}
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};


// End of file
