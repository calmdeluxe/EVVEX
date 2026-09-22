import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import { 
  History, 
  Search, 
  ChevronLeft, 
  RefreshCw, 
  ShieldAlert, 
  User, 
  Clock, 
  Activity,
  FileText
} from 'lucide-react';

export const AdminActivityLog: React.FC = () => {
  const { isAdmin, isAuthReady, profile } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const isMarketingPartner = profile?.account_tier === 'marketing_partner' || profile?.role === 'marketing_partner';

  useEffect(() => {
    if (isAuthReady) {
      if (!isAdmin && !isMarketingPartner) {
        navigate('/dashboard');
      } else {
        fetchLogs();
      }
    }
  }, [isAuthReady, isAdmin, isMarketingPartner, navigate]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setLogs(data);
      }
    } catch (err: any) {
      console.error("[AdminActivityLog] Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(item => {
    const term = search.toLowerCase();
    const actionMatch = item.action?.toLowerCase().includes(term);
    const targetMatch = item.target_type?.toLowerCase().includes(term) || item.target_id?.toLowerCase().includes(term);
    const adminMatch = item.admin_id?.toLowerCase().includes(term);
    return actionMatch || targetMatch || adminMatch;
  });

  if (!isAuthReady || (!isAdmin && !isMarketingPartner)) return null;

  return (
    <AdminLayout>
      <div className="page-container space-y-6 sm:space-y-8 w-full min-w-0 overflow-x-hidden">
        <div className="flex items-center justify-between gap-4">
          <Button 
            onClick={() => navigate('/admin')}
            variant="ghost" 
            className="rounded-xl h-10 px-3 flex items-center gap-2 text-slate-500 hover:text-green-700 transition-all font-black"
          >
            <ChevronLeft className="w-5 h-5" /> Back to Admin
          </Button>

          <Button 
            onClick={fetchLogs}
            variant="outline"
            className="rounded-2xl h-11 px-4 font-bold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Log
          </Button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              Activity & Audit Log
              {isMarketingPartner && (
                <span className="text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-full uppercase tracking-wider">
                  Marketing Partner
                </span>
              )}
            </h1>
            <p className="text-gray-500 font-medium mt-1">Audit log of administrative and marketing partner actions.</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-4 top-4 text-slate-400" />
            <Input 
              placeholder="Search actions or target IDs..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 rounded-2xl border-slate-200 focus:ring-green-700 font-medium bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-green-700" />
            <p className="font-bold text-xs uppercase tracking-widest">Loading Activity Log...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <Card className="p-16 text-center text-slate-400 italic border-dashed border-2 rounded-[32px]">
            No activity log records found.
          </Card>
        ) : (
          <Card className="rounded-2xl sm:rounded-[32px] border-none shadow-sm overflow-hidden bg-white p-3 sm:p-6">
            <div className="overflow-x-auto w-full min-w-0">
              <table className="w-full text-left border-collapse responsive-table">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Target Type</th>
                    <th className="p-4">Target ID</th>
                    <th className="p-4">Actor ID</th>
                    <th className="p-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-700">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-4 font-extrabold text-slate-900">
                        <Badge className="bg-slate-900 text-white font-black rounded-lg px-2.5 py-0.5 text-xs">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-600">
                        {log.target_type || 'N/A'}
                      </td>
                      <td className="p-4 text-xs font-mono text-slate-500 max-w-[150px] truncate">
                        {log.target_id || '—'}
                      </td>
                      <td className="p-4 text-xs font-mono text-slate-500 max-w-[150px] truncate">
                        {log.admin_id || 'System'}
                      </td>
                      <td className="p-4 text-xs text-slate-600 font-mono">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};
