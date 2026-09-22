import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ArrowLeft, Clock, CheckCircle2, CreditCard } from 'lucide-react';
import axios from 'axios';

export const SupportHistory: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [paymentVerifications, setPaymentVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    try {
      const session = await supabase.auth.getSession();
      const currentUserId = session.data.session?.user?.id;
      if (!currentUserId) return;

      const [supportRes, paymentsRes] = await Promise.all([
        supabase
          .from('support_requests')
          .select('*')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false }),
        supabase
          .from('payment_verifications')
          .select('*')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false })
      ]);

      setSupportRequests(supportRes.data || []);
      setPaymentVerifications(paymentsRes.data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Request History</h1>
            <p className="text-slate-500 font-medium font-mono text-xs uppercase tracking-widest">Archive of your interactions & verifications</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Support History */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-slate-900">Support Requests</h2>
            </div>
            
            <div className="space-y-4">
              {supportRequests.length === 0 ? (
                <Card className="border-dashed border-2"><CardContent className="p-12 text-center text-slate-400 italic">No request history found.</CardContent></Card>
              ) : (
                supportRequests.map(req => (
                  <Card key={req.id} className="border-none shadow-md rounded-[2.5rem] overflow-hidden hover:shadow-xl transition-shadow">
                    <CardContent className="p-8">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest mb-1">{req.type || 'General'}</Badge>
                          <h4 className="text-xl font-black text-slate-900 leading-tight">{req.subject}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(req.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge className={`${
                          (req.status === 'resolved' || req.status === 'granted') ? 'bg-emerald-600' : 
                          (req.status === 'pending' || req.status === 'open') ? 'bg-amber-500' : 'bg-slate-400'
                        } text-white px-3 py-1 rounded-full uppercase text-[10px] font-black`}>
                          {req.status?.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="bg-slate-50 p-6 rounded-2xl text-slate-600 text-sm font-medium leading-relaxed mb-6">
                        {req.message}
                      </div>

                      {req.admin_response && (
                        <div className="p-6 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-2xl">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Admin Response</p>
                          </div>
                          <p className="text-sm text-emerald-900 italic font-medium">"{req.admin_response}"</p>
                          {req.resolved_at && (
                            <p className="text-[9px] text-emerald-600/60 mt-2 font-bold uppercase">Resolved on {new Date(req.resolved_at).toLocaleDateString()}</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Payment Verification History */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                <CreditCard className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-slate-900">Payment Verifications</h2>
            </div>

            <div className="space-y-4">
              {paymentVerifications.length === 0 ? (
                <Card className="border-dashed border-2"><CardContent className="p-12 text-center text-slate-400 italic">No verification history found.</CardContent></Card>
              ) : (
                paymentVerifications.map(pv => (
                  <Card key={pv.id} className="border-none shadow-md rounded-[2.5rem] overflow-hidden hover:shadow-xl transition-shadow">
                    <CardContent className="p-8">
                       <div className="flex justify-between items-start mb-6">
                          <div>
                             <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest mb-2">{pv.transaction_type.replace('_', ' ')}</Badge>
                             <h4 className="text-2xl font-black text-slate-900 tracking-tight">₦{pv.amount?.toLocaleString()}</h4>
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ref: {pv.transaction_ref}</p>
                          </div>
                          <Badge className={`${
                             pv.status === 'approved' ? 'bg-emerald-600' : 
                             pv.status === 'pending' ? 'bg-amber-500' : 'bg-red-600'
                          } text-white px-3 py-1 rounded-full uppercase text-[10px] font-black`}>
                             {pv.status?.toUpperCase()}
                          </Badge>
                       </div>

                       <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="p-4 bg-slate-50 rounded-2xl">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Method</p>
                             <p className="text-xs font-bold text-slate-700">{pv.payment_method?.toUpperCase()}</p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-2xl">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                             <p className="text-xs font-bold text-slate-700">{new Date(pv.created_at).toLocaleDateString()}</p>
                          </div>
                       </div>

                       {pv.admin_note && (
                          <div className={`p-6 rounded-2xl border-l-4 ${pv.status === 'approved' ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
                             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${pv.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>Admin Note</p>
                             <p className={`text-sm italic font-medium ${pv.status === 'approved' ? 'text-emerald-900' : 'text-red-900'}`}>"{pv.admin_note}"</p>
                          </div>
                       )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
