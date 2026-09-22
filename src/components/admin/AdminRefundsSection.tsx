import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Search, ShieldCheck, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';

export const AdminRefundsSection: React.FC = () => {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<{ id: string; status: 'approved' | 'rejected' } | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/refund-requests');
      if (res.data && res.data.success) {
        setRefunds(res.data.refundRequests || []);
      } else {
        throw new Error(res.data?.error || 'Failed to load refund requests');
      }
    } catch (err: any) {
      console.error('[AdminRefunds] Fetch error:', err);
      setError(err.response?.data?.error || err.message || 'Could not fetch refund requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const handleUpdateStatus = async () => {
    if (!activeModal) return;
    try {
      setProcessingId(activeModal.id);
      const res = await axios.put(`/api/refund-requests/${activeModal.id}`, {
        status: activeModal.status,
        admin_note: adminNote.trim(),
      });

      if (res.data && res.data.success) {
        setRefunds(prev => prev.map(r => r.id === activeModal.id ? { ...r, status: activeModal.status, admin_note: adminNote.trim() } : r));
        setActiveModal(null);
        setAdminNote('');
      } else {
        alert(res.data?.error || 'Failed to update refund status');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to process refund decision');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = refunds.filter(r => {
    const matchesSearch = 
      r.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-amber-600" />
            Refund Requests Queue
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Review buyer refund claims, inspect transaction IDs, and issue approvals/rejections.
          </p>
        </div>

        <Button onClick={fetchRefunds} disabled={loading} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Requests
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
            placeholder="Search email, txn ID, reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs rounded-lg"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {['all', 'pending', 'approved', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                filterStatus === st
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0d0d15] rounded-xl border border-gray-200 dark:border-white/10 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 font-bold">
                <th className="p-3.5 pl-6">Buyer Email</th>
                <th className="p-3.5">Txn ID</th>
                <th className="p-3.5">Reason & Details</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Requested At</th>
                <th className="p-3.5 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                    Loading refund requests...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3.5 pl-6 font-semibold text-gray-900 dark:text-white">
                      {r.user_email || 'Anonymous'}
                    </td>
                    <td className="p-3.5 font-mono text-gray-500 dark:text-gray-400 text-[11px]">
                      {r.transaction_id || 'N/A'}
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <p className="text-gray-800 dark:text-gray-200 line-clamp-2">{r.reason}</p>
                      {r.admin_note && (
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 bg-amber-50 dark:bg-amber-950/40 p-1 rounded border border-amber-200 dark:border-amber-800">
                          <strong>Admin Note:</strong> {r.admin_note}
                        </p>
                      )}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        className={`capitalize font-bold text-[10px] px-2.5 py-0.5 rounded-full ${
                          r.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : r.status === 'rejected'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {r.status || 'pending'}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-gray-500 dark:text-gray-400 text-[11px]">
                      {new Date(r.created_at || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 pr-6 text-right">
                      {r.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => { setActiveModal({ id: r.id, status: 'approved' }); setAdminNote(''); }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-[11px] gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => { setActiveModal({ id: r.id, status: 'rejected' }); setAdminNote(''); }}
                            className="h-8 text-[11px] gap-1 font-bold"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px]">Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No refund requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Confirmation Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0d0d15] border border-gray-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
              Confirm Refund {activeModal.status}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Provide an optional note to record for this refund decision.
            </p>

            <Textarea
              rows={3}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="e.g. Verified technical glitch, refund approved..."
              className="text-xs rounded-xl"
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpdateStatus}
                disabled={processingId === activeModal.id}
                className={activeModal.status === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : 'bg-red-600 hover:bg-red-700 text-white font-bold'}
              >
                {processingId === activeModal.id ? 'Processing...' : `Confirm ${activeModal.status}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
