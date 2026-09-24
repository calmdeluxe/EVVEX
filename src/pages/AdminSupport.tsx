import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '../AuthContext';
import { RefreshCw, CheckCircle2, MessageSquare, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../supabase';

export const AdminSupport: React.FC = () => {
  const { isAdmin, isAuthReady, profile } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [supportPage, setSupportPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState('');

  const isMarketingPartner = profile?.account_tier === 'marketing_partner' || profile?.role === 'marketing_partner';

  useEffect(() => {
    if (isAuthReady) {
      if (!isAdmin && !isMarketingPartner) {
        navigate('/dashboard');
      } else {
        fetchRequests();
      }
    }
  }, [isAuthReady, isAdmin, isMarketingPartner, navigate]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let allRequests = [];
      const { data: directReqs, error: directErr } = await supabase
        .from('support_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!directErr && directReqs) {
        console.log("[AdminSupport] Direct database query succeeded, loading requests:", directReqs.length);
        
        // Manual join user profiles on the client side
        const userIds = [...new Set(directReqs.map((r: any) => r.user_id))].filter(Boolean);
        let userMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);
          
          if (profilesData) {
            userMap = profilesData.reduce((acc: any, u: any) => {
              acc[u.id] = u;
              return acc;
            }, {});
          }
        }
        
        allRequests = directReqs.map((r: any) => ({
          ...r,
          profiles: userMap[r.user_id] || { email: 'Unknown', full_name: 'Deleted User' },
          users: userMap[r.user_id] || { email: 'Unknown', full_name: 'Deleted User' }
        }));
      } else {
        throw directErr || new Error("Failed to fetch requests from Supabase");
      }

      // Filter to only show pending/open requests in the inbox
      setRequests(allRequests.filter((r: any) => r.status === 'pending' || r.status === 'open' || r.status === 0 || r.status === '0' || r.status === null));
    } catch (err: any) {
      setError('Failed to fetch requests: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (requestId: string) => {
    if (!responseText) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const adminId = session?.user?.id;
      const status = 'resolved'; // resolving request

      // 1. Update support request
      const { error: updateError } = await supabase
        .from("support_requests")
        .update({ status, admin_response: responseText })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // 2. Audit response
      if (adminId) {
        try {
          await supabase.from("admin_responses").insert({
            request_id: requestId,
            admin_id: adminId,
            response: responseText,
            status_after: status,
          });
        } catch (e) {
          console.warn("Audit log insert failed:", e);
        }
      }

      setRespondingTo(null);
      setResponseText('');
      fetchRequests();
    } catch (err: any) {
      alert('Failed to send response: ' + err.message);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!confirm('Are you sure you want to reject this request?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const adminId = session?.user?.id;
      const status = 'rejected';

      // 1. Update support request
      const { error: updateError } = await supabase
        .from("support_requests")
        .update({ status, admin_response: 'Rejected by admin.' })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // 2. Audit response
      if (adminId) {
        try {
          await supabase.from("admin_responses").insert({
            request_id: requestId,
            admin_id: adminId,
            response: 'Rejected by admin.',
            status_after: status,
          });
        } catch (e) {
          console.warn("Audit log insert failed:", e);
        }
      }

      fetchRequests();
    } catch (err: any) {
      alert('Failed to reject request: ' + err.message);
    }
  };

  if (!isAuthReady || (!isAdmin && !isMarketingPartner)) return null;

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
               Support Inbox
            </h1>
            <p className="text-gray-500 font-medium">Manage and respond to user assistance requests.</p>
          </div>
          <Button 
            onClick={() => navigate('/admin/requests/history')}
            className="rounded-2xl h-12 px-6 font-black bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2 shadow-xl shadow-slate-100"
          >
             View Request History <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-4">
             <RefreshCw className="w-10 h-10 animate-spin" />
             <p className="font-black uppercase tracking-widest text-xs">Loading Inbox...</p>
          </div>
        ) : requests.length === 0 ? (
          <Card className="p-20 text-center border-dashed border-2 text-slate-400 italic font-medium">
            No support requests found in the database.
          </Card>
        ) : (
          <div className="space-y-6">
            {(() => {
              const paginated = requests.slice((supportPage - 1) * 5, supportPage * 5);
              const totalPages = Math.ceil(requests.length / 5);

              return (
                <>
                  <div className="grid grid-cols-1 gap-6">
                    {paginated.map((req) => (
                      <Card key={req.id} className="border-none shadow-sm rounded-[32px] overflow-hidden hover:shadow-md transition-all">
                        <CardContent className="p-8">
                           <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                              <div className="flex-1 space-y-4">
                                 <div className="flex items-center gap-3">
                                    <Badge className={
                                      req.status === 'pending' ? 'bg-amber-500 hover:bg-amber-600' : 
                                      req.status === 'resolved' ? 'bg-emerald-600' : 
                                      'bg-red-600'
                                    }>
                                       {req.status?.toUpperCase()}
                                    </Badge>
                                    <h3 className="text-xl font-extrabold text-slate-900">{req.subject}</h3>
                                 </div>
                                 <div className="p-6 bg-slate-50 rounded-2xl text-slate-700 leading-relaxed font-semibold border border-slate-100">
                                    {req.message?.replace(/^\[Type: .*?\] /, '')}
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
                              
                              {req.status === 'pending' ? (
                                <div className="w-full md:w-96 space-y-4">
                                   {respondingTo === req.id ? (
                                     <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                       <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block pl-1">Your response</Label>
                                       <Textarea 
                                         placeholder="Type resolution message..." 
                                         className="rounded-xl min-h-[120px] focus:ring-green-500"
                                         value={responseText}
                                         onChange={(e) => setResponseText(e.target.value)}
                                       />
                                       <div className="flex gap-2">
                                         <Button 
                                           variant="outline"
                                           onClick={() => setRespondingTo(null)}
                                           className="flex-1 h-12 rounded-xl font-bold"
                                         >
                                           Cancel
                                         </Button>
                                         <Button 
                                           onClick={() => handleRespond(req.id)}
                                           disabled={!responseText}
                                           className="flex-[2] h-12 bg-green-700 hover:bg-green-800 font-black rounded-xl text-white"
                                         >
                                            Send Response
                                         </Button>
                                       </div>
                                     </div>
                                   ) : isMarketingPartner ? (
                                     <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                                       <p className="text-xs font-bold text-amber-800">
                                         Support replies are restricted to admins.
                                       </p>
                                     </div>
                                   ) : (
                                     <div className="flex flex-col gap-3">
                                       <Button 
                                         onClick={() => setRespondingTo(req.id)}
                                         className="w-full h-12 bg-green-700 hover:bg-green-800 font-extrabold rounded-xl text-white shadow-lg shadow-green-100 flex items-center justify-center gap-2"
                                       >
                                          <MessageSquare className="w-4 h-4" /> Attend to Request
                                       </Button>
                                       <Button 
                                         onClick={() => handleReject(req.id)}
                                         variant="outline"
                                         className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-extrabold rounded-xl"
                                       >
                                          Reject Request
                                       </Button>
                                     </div>
                                   )}
                                </div>
                              ) : (
                                <div className="w-full md:w-96 bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center justify-center">
                                   <CheckCircle2 className="w-8 h-8 text-green-600 mb-2" />
                                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Response sent</p>
                                   <p className="text-xs text-slate-800 italic font-bold">"{req.admin_response}"</p>
                                </div>
                              )}
                           </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={supportPage === 1}
                        onClick={() => setSupportPage(prev => Math.max(prev - 1, 1))}
                        className="rounded-xl font-bold h-10 px-4"
                      >
                        Previous
                      </Button>
                      <span className="text-xs font-black text-slate-500">
                        Page {supportPage} of {totalPages} ({requests.length} requests)
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={supportPage === totalPages}
                        onClick={() => setSupportPage(prev => Math.min(prev + 1, totalPages))}
                        className="rounded-xl font-bold h-10 px-4"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
