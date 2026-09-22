import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../AuthContext';
import { RefreshCw, CheckCircle2, CreditCard, XCircle, ExternalLink, ShieldCheck, ChevronRight, ChevronLeft } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../supabase';

export const AdminPayments: React.FC = () => {
  const { isAdmin, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthReady && !isAdmin) {
      navigate('/dashboard');
    } else if (isAuthReady && isAdmin) {
      fetchVerifications();
    }
  }, [isAuthReady, isAdmin, navigate]);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      let allVerifications = [];
      const { data: directVers, error: directErr } = await supabase
        .from('payment_verifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (!directErr && directVers) {
        console.log("[AdminPayments] Direct database query Succeeded, loading verifications:", directVers.length);
        
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

      // Filter to only show pending in the queue
      setVerifications(allVerifications.filter((v: any) => v.status === 'pending'));
    } catch (err: any) {
      setError('Failed to fetch payment verifications: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string, action: 'approve' | 'reject') => {
    try {
      const session = await supabase.auth.getSession();
      const adminUserId = session.data.session?.user?.id;
      const status = action === 'approve' ? 'approved' : 'rejected';
      const resolvedNote = note || (action === 'approve' ? 'Payment confirmed.' : 'Payment proof rejected.');

      // 1. Fetch current verification
      const { data: pv, error: fetchErr } = await supabase
        .from("payment_verifications")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr || !pv) throw new Error(fetchErr?.message || "Verification record not found");

      // 2. Update payment_verifications
      const { error: updateErr } = await supabase
        .from("payment_verifications")
        .update({
          status,
          admin_note: resolvedNote,
          approved_by: action === 'approve' ? adminUserId : null,
          approved_at: action === 'approve' ? new Date().toISOString() : null
        })
        .eq("id", id);

      if (updateErr) throw updateErr;

      // 3. If approved, apply consequences
      if (action === "approve") {
        const { data: user } = await supabase
          .from("users")
          .select("email")
          .eq("id", pv.user_id)
          .maybeSingle();

        if (user) {
          if (pv.transaction_type === "premium_upgrade") {
            await supabase.rpc("admin_set_user_tier", {
              p_email: user.email,
              p_new_tier: "premium",
            });
          } else if (pv.transaction_type === "author_upgrade") {
            await supabase.rpc("admin_set_user_tier", {
              p_email: user.email,
              p_new_tier: "author",
            });
          } else if (pv.transaction_type === "ebook_purchase" && pv.reference_id) {
            await supabase.from("transactions").insert({
              user_id: pv.user_id,
              book_id: pv.reference_id,
              buyer_email: user.email,
              amount: Math.round(pv.amount || 0),
              type: "purchase",
              status: "successful",
              paystack_reference: pv.transaction_ref || `MANUAL-${pv.id}`,
            });

            try {
              const { data: existingEpic } = await supabase
                .from("ebook_purchases")
                .select("*")
                .eq("user_id", pv.user_id)
                .eq("ebook_id", pv.reference_id)
                .maybeSingle();

              if (!existingEpic) {
                await supabase.from("ebook_purchases").insert({
                  user_id: pv.user_id,
                  ebook_id: pv.reference_id
                });
              }
            } catch (e: any) {
              console.warn("ebook_purchases insert failed in verify:", e);
            }
          }
        }
      }

      setNote('');
      fetchVerifications();
    } catch (err: any) {
      alert('Failed to resolve payment: ' + err.message);
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

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
               Payment Verification Queue
            </h1>
            <p className="text-gray-500 font-medium">Review manual payment proofs and credit user accounts.</p>
          </div>
          <Button 
            onClick={() => navigate('/admin/payments/history')}
            variant="outline" 
            className="rounded-2xl h-12 px-6 font-black flex items-center gap-2 border-slate-200 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm"
          >
            History <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-4">
             <RefreshCw className="w-10 h-10 animate-spin" />
             <p className="font-black uppercase tracking-widest text-xs">Loading Payments...</p>
          </div>
        ) : verifications.length === 0 ? (
          <Card className="p-20 text-center border-dashed border-2 text-slate-400 italic font-medium">
            No payment verifications in queue.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {verifications.map((pv) => (
              <Card key={pv.id} className="border-none shadow-2xl rounded-[40px] overflow-hidden bg-white">
                <CardContent className="p-0 flex flex-col lg:row h-full lg:flex-row">
                   <div className="lg:w-2/5 aspect-square lg:aspect-auto bg-slate-100 relative group overflow-hidden border-r border-slate-100">
                      {pv.proof_image_url ? (
                         <img src={pv.proof_image_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Payment Proof" />
                      ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                           <CreditCard className="w-12 h-12 opacity-20" />
                           <p className="italic font-bold">No image provided</p>
                         </div>
                      )}
                      {pv.proof_image_url && (
                        <a href={pv.proof_image_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white font-black uppercase text-xs gap-3 backdrop-blur-sm">
                           <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                             <ExternalLink className="w-6 h-6" />
                           </div>
                           View Full Receipt
                        </a>
                      )}
                   </div>
                   <div className="flex-1 p-10 flex flex-col justify-between space-y-8">
                      <div className="space-y-6">
                        <div className="flex justify-between items-start">
                           <div className="space-y-1">
                              <h3 className="text-3xl font-black text-slate-900 leading-tight">
                                {pv.transaction_type?.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </h3>
                              <p className="text-sm font-extrabold text-green-700 flex items-center gap-2">
                                <span className="opacity-50">BY:</span> {pv.profiles?.email || pv.users?.email || 'Unknown User'}
                              </p>
                           </div>
                           <Badge className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest ${
                             pv.status === 'pending' ? 'bg-amber-400 text-amber-900' : 
                             pv.status === 'approved' ? 'bg-emerald-500 text-white' : 
                             'bg-red-500 text-white'
                           }`}>
                              {pv.status?.toUpperCase()}
                           </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                           <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</p>
                              <p className="font-black text-xl text-slate-900">₦{pv.amount?.toLocaleString()}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tx Ref</p>
                              <p className="text-xs font-black font-mono text-slate-600 truncate">{pv.transaction_ref}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Method</p>
                              <p className="text-xs font-extrabold uppercase text-slate-600">{pv.payment_method?.replace('_', ' ')}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Submitted</p>
                              <p className="text-xs font-extrabold text-slate-600">{new Date(pv.created_at).toLocaleDateString()}</p>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Bank Information</p>
                           <p className="text-sm font-bold text-slate-800">
                             {pv.bank_name} • {pv.account_name} ({pv.account_number})
                           </p>
                        </div>
                      </div>

                      {pv.status === 'pending' && (
                         <div className="space-y-4 pt-6 border-t border-slate-100">
                            <div className="flex flex-col gap-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Resolution Note (Shared with user)</Label>
                              <Input 
                                placeholder="Optional rejection reason or approval note..." 
                                className="h-12 rounded-xl focus:ring-green-500"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                              />
                            </div>
                            <div className="flex gap-4">
                               <Button 
                                 onClick={() => handleResolve(pv.id, 'reject')}
                                 variant="outline" 
                                 className="flex-1 h-14 rounded-2xl font-black text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 shadow-sm"
                               >
                                  <XCircle className="w-5 h-5 mr-2" /> REJECT
                               </Button>
                               <Button 
                                 onClick={() => handleResolve(pv.id, 'approve')}
                                 className="flex-[2] h-14 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-100"
                               >
                                  <CheckCircle2 className="w-5 h-5 mr-3" /> APPROVE & CREDIT USER
                               </Button>
                            </div>
                         </div>
                      )}

                      {pv.status !== 'pending' && pv.admin_note && (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Admin Resolution Note</p>
                           <p className="text-sm font-bold italic text-slate-700">"{pv.admin_note}"</p>
                        </div>
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
