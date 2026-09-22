import React, { useState, useEffect } from 'react';
import { RefreshCw, MessageSquare, Bug, Lightbulb, CheckCircle, ExternalLink, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';

export const AdminFeedbackSection: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeModal, setActiveModal] = useState<any | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [newStatus, setNewStatus] = useState<'in_progress' | 'completed'>('completed');
  const [updating, setUpdating] = useState(false);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/user-feedback');
      if (res.data && res.data.success) {
        setFeedbackList(res.data.feedback || []);
      } else {
        throw new Error(res.data?.error || 'Failed to load user feedback');
      }
    } catch (err: any) {
      console.error('[AdminFeedback] Fetch error:', err);
      setError(err.response?.data?.error || err.message || 'Could not fetch user feedback.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleUpdateFeedback = async () => {
    if (!activeModal) return;
    try {
      setUpdating(true);
      const res = await axios.put(`/api/user-feedback/${activeModal.id}`, {
        status: newStatus,
        admin_response: adminResponse.trim(),
      });

      if (res.data && res.data.success) {
        setFeedbackList(prev => prev.map(f => f.id === activeModal.id ? { ...f, status: newStatus, admin_response: adminResponse.trim() } : f));
        setActiveModal(null);
        setAdminResponse('');
      } else {
        alert(res.data?.error || 'Failed to update feedback status');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Error updating feedback');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = feedbackList.filter(f => {
    const matchesSearch =
      f.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || f.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-indigo-600" />
            User Feedback & Suggestions
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Review bug reports, feature requests, and general suggestions from readers and authors.
          </p>
        </div>

        <Button onClick={fetchFeedback} disabled={loading} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Feedback
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-[#0d0d15] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Search subject, description, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs rounded-lg"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {['all', 'bug', 'feature', 'general'].map((tp) => (
            <button
              key={tp}
              onClick={() => setFilterType(tp)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                filterType === tp
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              {tp}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Feedback Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-12 text-center text-gray-400 bg-white dark:bg-[#0d0d15] rounded-xl border border-gray-200 dark:border-white/10">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
            Loading feedback messages...
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#0d0d15] rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    className={`capitalize text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      item.type === 'bug'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        : item.type === 'feature'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                    }`}
                  >
                    {item.type === 'bug' && <Bug className="w-3 h-3 inline mr-1" />}
                    {item.type === 'feature' && <Lightbulb className="w-3 h-3 inline mr-1" />}
                    {item.type}
                  </Badge>

                  <Badge
                    className={`capitalize text-[10px] font-medium px-2 py-0.5 ${
                      item.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : item.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                    }`}
                  >
                    {item.status || 'new'}
                  </Badge>
                </div>

                <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                  {item.subject}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {item.description}
                </p>

                {item.screenshot_url && (
                  <a
                    href={item.screenshot_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline mt-1"
                  >
                    <ExternalLink className="w-3 h-3" /> View Attached Screenshot
                  </a>
                )}

                {item.admin_response && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-3 text-xs text-indigo-950 dark:text-indigo-200 mt-2">
                    <span className="font-bold block text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Admin Response:</span>
                    {item.admin_response}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                <span>From: {item.user_email || 'Anonymous'}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setActiveModal(item);
                    setAdminResponse(item.admin_response || '');
                    setNewStatus(item.status === 'completed' ? 'completed' : 'in_progress');
                  }}
                  className="text-xs font-bold gap-1"
                >
                  <MessageSquare className="w-3 h-3" /> Respond
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 p-12 text-center text-gray-400 bg-white dark:bg-[#0d0d15] rounded-xl border border-gray-200 dark:border-white/10">
            No feedback entries match your filter.
          </div>
        )}
      </div>

      {/* Response Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0d0d15] border border-gray-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Respond to Feedback
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Subject: <strong>{activeModal.subject}</strong>
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={newStatus}
                onChange={(e: any) => setNewStatus(e.target.value)}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white"
              >
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed / Addressed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Admin Response Note
              </label>
              <Textarea
                rows={4}
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Write resolution notes or instructions..."
                className="text-xs rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpdateFeedback}
                disabled={updating}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {updating ? 'Saving...' : 'Save & Respond'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
