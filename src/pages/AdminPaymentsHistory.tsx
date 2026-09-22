import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../AuthContext';
import { RefreshCw, ArrowLeft, ExternalLink, CreditCard } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../supabase';

export const AdminPaymentsHistory: React.FC = () => {
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
      const { data: { session } } = await supabase.auth.getSession();
      const res = await axios.get('/api/admin/payment-verifications', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      // Filter to only show NON-pending in history
      const allVerifications = res.data.verifications || [];
      setVerifications(allVerifications.filter((v: any) => v.status !== 'pending'));
    } catch (err: any) {
      setError('Failed to fetch payment history: ' + (err.response?.data?.error || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthReady || !isAdmin) return null;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/admin/payments')}
            variant="ghost" 
            className="rounded-full w-12 h-12 p-0"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Payment Resolution History</h1>
            <p className="text-gray-500 font-medium">Archive of all approved and rejected payment proofs.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-4">
             <RefreshCw className="w-10 h-10 animate-spin" />
             <p className="font-black uppercase tracking-widest text-xs">Loading History...</p>
          </div>
        ) : verifications.length === 0 ? (
          <Card className="p-20 text-center border-dashed border-2 text-slate-400 italic font-medium">
            No resolved payments yet.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {verifications.map((pv) => (
              <Card key={pv.id} className="border border-slate-100 rounded-[32px] overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6 flex flex-col md:flex-row gap-6">
                   <div className="w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0">
                      {pv.proof_image_url ? (
                        <img src={pv.proof_image_url} className="w-full h-full object-cover" alt="Proof" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <CreditCard className="w-8 h-8" />
                        </div>
                      )}
                   </div>
                   <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-start">
                         <div>
                            <h3 className="text-xl font-black text-slate-900">
                              {pv.transaction_type?.replace(/_/g, ' ').toUpperCase()}
                            </h3>
                            <p className="text-sm font-bold text-indigo-600">
                               {pv.profiles?.email || pv.users?.email || 'Unknown User'}
                            </p>
                         </div>
                         <Badge className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest ${
                           pv.status === 'approved' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                         }`}>
                            {pv.status?.toUpperCase()}
                         </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold text-slate-500">
                         <div>
                            <p className="uppercase tracking-widest text-[9px] mb-1">Amount</p>
                            <p className="text-slate-900">₦{pv.amount?.toLocaleString()}</p>
                         </div>
                         <div>
                            <p className="uppercase tracking-widest text-[9px] mb-1">Method</p>
                            <p className="text-slate-900 uppercase">{pv.payment_method?.replace('_', ' ')}</p>
                         </div>
                         <div>
                            <p className="uppercase tracking-widest text-[9px] mb-1">Date</p>
                            <p className="text-slate-900">{new Date(pv.created_at).toLocaleDateString()}</p>
                         </div>
                         <div>
                            <p className="uppercase tracking-widest text-[9px] mb-1">Reference</p>
                            <p className="text-slate-900 truncate">{pv.transaction_ref}</p>
                         </div>
                      </div>
                      {pv.admin_note && (
                        <div className="p-3 bg-slate-50 rounded-xl italic text-slate-600 text-sm border-l-4 border-indigo-200">
                          "{pv.admin_note}"
                        </div>
                      )}
                   </div>
                   <div className="flex items-center">
                     {pv.proof_image_url && (
                        <Button asChild variant="outline" className="rounded-xl border-slate-200">
                           <a href={pv.proof_image_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" /> View Receipt
                           </a>
                        </Button>
                     )}
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
