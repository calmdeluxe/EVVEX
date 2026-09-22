import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../AuthContext';
import { RefreshCw, CreditCard, ChevronLeft, History, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../supabase';

export const AdminPaymentHistory: React.FC = () => {
  const { isAdmin, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthReady && !isAdmin) {
      navigate('/dashboard');
    } else if (isAuthReady && isAdmin) {
      fetchHistory();
    }
  }, [isAuthReady, isAdmin, navigate]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let allVerifications = [];
      const { data: directVers, error: directErr } = await supabase
        .from('payment_verifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (!directErr && directVers) {
        // Manual join user profiles on the client side
        const userIds = [...new Set(directVers.map((v: any) => v.user_id))].filter(Boolean);
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
        
        allVerifications = directVers.map((v: any) => ({
          ...v,
          users: userMap[v.user_id] || { email: 'Unknown', full_name: 'Deleted User' }
        }));
      } else {
        throw directErr || new Error("Failed to fetch payment verifications from Supabase");
      }

      setVerifications(allVerifications.filter((v: any) => v.status !== 'pending'));
    } catch (err: any) {
      setError('Failed to fetch history: ' + err.message);
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
               <History className="w-10 h-10 text-slate-400" /> Payment History
            </h1>
            <p className="text-gray-500 font-medium">Archive of processed manual verification requests.</p>
          </div>
          <Button 
            onClick={() => navigate('/admin/payments')}
            variant="outline"
            className="rounded-2xl h-12 px-6 font-black border-slate-200 text-slate-600 flex items-center gap-2"
          >
             <ChevronLeft className="w-5 h-5" /> Back to Queue
          </Button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-4">
             <RefreshCw className="w-10 h-10 animate-spin" />
             <p className="font-black uppercase tracking-widest text-xs">Loading Archive...</p>
          </div>
        ) : verifications.length === 0 ? (
          <Card className="p-20 text-center border-dashed border-2 text-slate-400 italic font-medium">
            No history records found.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {verifications.map((pv) => (
              <Card key={pv.id} className="border-none shadow-sm rounded-[32px] overflow-hidden opacity-90 transition-all hover:opacity-100">
                <CardContent className="p-8">
                   <div className="flex flex-col lg:flex-row gap-8">
                      <div className="lg:w-32 h-32 rounded-2xl overflow-hidden bg-slate-100 shrink-0 relative group">
                        {pv.proof_image_url ? (
                          <>
                            <img src={pv.proof_image_url} className="w-full h-full object-cover" alt="Proof" />
                            <a href={pv.proof_image_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                               <ExternalLink className="w-5 h-5" />
                            </a>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                             <CreditCard className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-4">
                         <div className="flex flex-wrap justify-between items-start gap-4">
                            <div className="space-y-1">
                               <div className="flex items-center gap-2">
                                  <Badge className={
                                     pv.status === 'approved' ? 'bg-emerald-600' : 'bg-red-600'
                                  }>
                                     {pv.status?.toUpperCase()}
                                  </Badge>
                                  <h3 className="text-xl font-extrabold text-slate-900">₦{pv.amount?.toLocaleString()}</h3>
                               </div>
                               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                 REF: {pv.transaction_ref} • {pv.payment_method?.toUpperCase()}
                               </p>
                            </div>
                            <div className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">
                               PROCESSED ON: {pv.approved_at ? new Date(pv.approved_at).toLocaleDateString() : 'N/A'}
                            </div>
                         </div>

                         <div className={`p-6 rounded-2xl border-l-4 ${pv.status === 'approved' ? 'bg-emerald-50/50 border-emerald-500' : 'bg-red-50/50 border-red-500'}`}>
                            <div className="flex items-center gap-2 mb-2">
                               {pv.status === 'approved' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                               <p className={`text-[10px] font-black uppercase tracking-widest ${pv.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>Admin Resolution Note:</p>
                            </div>
                            <p className="text-sm font-bold italic text-slate-800">"{pv.admin_note || 'No resolution note provided.'}"</p>
                         </div>

                         <div className="flex flex-wrap items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span className="bg-slate-100 px-3 py-1 rounded-full">USER: {pv.profiles?.email || pv.users?.email || 'Unknown'}</span>
                            <span className="bg-slate-100 px-3 py-1 rounded-full">{pv.bank_name} • {pv.account_number}</span>
                            <span>{new Date(pv.created_at).toLocaleString()}</span>
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
