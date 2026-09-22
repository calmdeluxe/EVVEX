import React, { useState, useEffect } from 'react';
import { RefreshCw, FileText, Mail, CheckCircle, AlertCircle, Search, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import axios from 'axios';

export const AdminEmailLogsSection: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/admin/email-logs');
      if (res.data && res.data.success) {
        setLogs(res.data.logs || []);
      } else {
        throw new Error(res.data?.error || 'Failed to load email logs');
      }
    } catch (err: any) {
      console.error('[AdminEmailLogs] Fetch error:', err);
      setError(err.response?.data?.error || err.message || 'Could not fetch email audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(l =>
    l.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.template_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Mail className="w-7 h-7 text-emerald-600" />
            Transactional Email History Logs
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time audit log of all outgoing verification, sale alerts, and purchase emails.
          </p>
        </div>

        <Button onClick={fetchLogs} disabled={loading} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Audit Trail
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="bg-white dark:bg-[#0d0d15] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Filter recipient, subject, template..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs rounded-lg"
          />
        </div>
      </div>

      {/* Email Audit Log Table */}
      <div className="bg-white dark:bg-[#0d0d15] rounded-xl border border-gray-200 dark:border-white/10 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 font-bold">
                <th className="p-3.5 pl-6">Recipient Email</th>
                <th className="p-3.5">Subject</th>
                <th className="p-3.5">Template</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-6">Sent At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading email transaction history...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3.5 pl-6 font-semibold text-gray-900 dark:text-white">
                      {log.recipient_email}
                    </td>
                    <td className="p-3.5 text-gray-800 dark:text-gray-200 font-medium">
                      {log.subject}
                    </td>
                    <td className="p-3.5 font-mono text-gray-500 text-[11px]">
                      {log.template_name || 'custom'}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        className={`capitalize font-bold text-[10px] px-2.5 py-0.5 rounded-full ${
                          log.status === 'sent'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}
                      >
                        {log.status || 'sent'}
                      </Badge>
                    </td>
                    <td className="p-3.5 pr-6 text-gray-500 dark:text-gray-400 text-[11px] font-mono">
                      {new Date(log.sent_at || Date.now()).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    No email logs found matching search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
