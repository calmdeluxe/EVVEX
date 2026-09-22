import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../AuthContext';
import { RefreshCw, CheckCircle2, MessageSquare, ChevronLeft, History, XCircle } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../supabase';

export const AdminSupportHistory: React.FC = () => {
  const { isAdmin, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthReady && !isAdmin) {
      navigate('/dashboard');
    } else if (isAuthReady && isAdmin) {
      fetchRequests();
    }
  }, [isAuthReady, isAdmin, navigate]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let allRequests = [];
      const { data: directReqs, error: directErr } = await supabase
        .from('support_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!directErr && directReqs) {
        console.log("[AdminSupportHistory] Direct database query succeeded, loading requests:", directReqs.length);
        
        // Manual join user profiles on the client side
        const userIds = [...new Set(directReqs.map((r: any) => r.user_id))].filter(Boolean);
        let userMap: Record<string, any> = {};
        if (userIds.length > 0) {
          let usersData = null;
          const { data: viewData, error: viewErr } = await supabase
            .from('user_profiles_public')
            .select('id, email, full_name')
            .in('id', userIds);
          
          if (!viewErr && viewData) {
            usersData = viewData;
          } else {
            const { data: fbData } = await supabase
              .from('users')
              .select('id, email, full_name')
              .in('id', userIds);
            usersData = fbData;
          }
          
          if (usersData) {
            userMap = usersData.reduce((acc: any, u: any) => {
              acc[u.id] = u;
              return acc;
            }, {});
          }
        }
        
        allRequests = directReqs.map((r: any) => ({
          ...r,
          users: userMap[r.user_id] || { email: 'Unknown', full_name: 'Deleted User' }
        }));
      } else {
        throw directErr || new Error("Failed to fetch requests from Supabase");
      }

      // Filter to only show handled requests (resolved or rejected)
      setRequests(allRequests.filter((r: any) => r.status !== 'pending'));
    } catch (err: any) {
      setError('Failed to fetch requests: ' + (err.response?.data?.error || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthReady || !isAdmin) return null;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => navigate('/admin')}
            variant="ghost" 
            className="rounded-xl h-10 px-3 flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-all font-black"
          >
             <ChevronLeft className="w-5 h-5" /> Back to Admin Panel
          </Button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
               <History className="w-10 h-10 text-slate-400" /> Support History
            </h1>
            <p className="text-gray-500 font-medium">Archive of resolved and rejected user requests.</p>
          </div>
          <Button 
            onClick={() => navigate('/admin/requests')}
            variant="outline"
            className="rounded-2xl h-12 px-6 font-black border-slate-200 text-slate-600 flex items-center gap-2"
          >
             <ChevronLeft className="w-5 h-5" /> Back to Inbox
          </Button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-4">
             <RefreshCw className="w-10 h-10 animate-spin" />
             <p className="font-black uppercase tracking-widest text-xs">Loading Archive...</p>
          </div>
        ) : requests.length === 0 ? (
          <Card className="p-20 text-center border-dashed border-2 text-slate-400 italic font-medium">
            No history records found.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {requests.map((req) => (
              <Card key={req.id} className="border-none shadow-sm rounded-[32px] overflow-hidden opacity-90 transition-all hover:opacity-100">
                <CardContent className="p-8">
                   <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                      <div className="flex-1 space-y-4">
                         <div className="flex items-center gap-3">
                            <Badge className={
                              req.status === 'resolved' ? 'bg-emerald-600' : 'bg-red-600'
                            }>
                               {req.status?.toUpperCase()}
                            </Badge>
                            <h3 className="text-xl font-extrabold text-slate-900">{req.subject}</h3>
                         </div>
                         <div className="p-6 bg-slate-50 rounded-2xl text-slate-500 leading-relaxed font-semibold border border-slate-100 text-sm">
                            <p className="mb-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Original Message:</p>
                            {req.message?.replace(/^\[Type: .*?\] /, '')}
                         </div>
                         
                         <div className="p-6 bg-green-50/50 rounded-2xl text-slate-800 leading-relaxed font-bold border border-green-100">
                            <div className="flex items-center gap-2 mb-2">
                               {req.status === 'resolved' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                               <p className="text-[10px] font-black uppercase text-green-700 tracking-widest">Admin Resolution:</p>
                            </div>
                            <p className="italic">"{req.admin_response || 'No response note provided.'}"</p>
                         </div>

                          <div className="flex flex-wrap items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" /> 
                              FROM: {req.profiles?.email || req.users?.email || 'Unknown User'}
                            </span>
                            <span>•</span>
                            <span>{new Date(req.created_at).toLocaleString()}</span>
                            <span>•</span>
                            <span>TYPE: {req.type?.toUpperCase() || 'GENERAL'}</span>
                          </div>
                      </div>
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
