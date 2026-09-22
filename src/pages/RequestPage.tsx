import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../AuthContext';
import { MessageSquare, Send, CheckCircle2, AlertCircle, CreditCard, RefreshCw, History, Clock } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../supabase';

export const RequestPage: React.FC = () => {
  const { user, isAdmin, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeForm, setActiveForm] = useState<'support' | 'payment' | 'history'>('support');

  // Support Form State
  const [supportType, setSupportType] = useState('General');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [network, setNetwork] = useState('MTN');
  const [dataAmount, setDataAmount] = useState('500');
  
  const [txType, setTxType] = useState('ebook_purchase');
  const [refId, setRefId] = useState('');
  const [amount, setAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [txRef, setTxRef] = useState('');
  const [bankName, setBankName] = useState('');
  const [accName, setAccName] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // History State
  const [supportHistory, setSupportHistory] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Auth Protection
  useEffect(() => {
    if (isAuthReady) {
      if (!user) {
        navigate('/login');
      } else if (isAdmin) {
        // Admins go to their management area
        navigate('/admin/requests');
      }
    }
  }, [isAuthReady, user, isAdmin, navigate]);

  // Pre-fill query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get('type');
    const bookIdParam = params.get('bookId');
    const bookTitleParam = params.get('bookTitle');

    if (typeParam === 'Take Down Request' || typeParam === 'takedown' || typeParam === 'Take_Down_Request') {
      setSupportType('Take Down Request');
      setSubject('Take Down Request');
      setMessage(`Take Down Request for ${bookTitleParam || ''}`);
    }
  }, [location.search]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      
      const [supportRes, paymentRes] = await Promise.all([
        supabase
          .from('support_requests')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('payment_verifications')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
      ]);

      if (supportRes.error) throw supportRes.error;
      if (paymentRes.error) throw paymentRes.error;

      setSupportHistory(supportRes.data || []);
      setPaymentHistory(paymentRes.data || []);
    } catch (err: any) {
      console.error('History fetch failed:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeForm === 'history') {
      fetchHistory();
    }
  }, [activeForm]);

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalSubject = subject;
    let finalMessage = message;

    if (supportType === 'Data Reward') {
      if (!phoneNumber) {
        setError('Please fill in your Mobile Line Number');
        return;
      }
      if (!dataAmount) {
        setError('Please specify the Data Amount');
        return;
      }
      finalSubject = subject.trim() || `Data Reward Request (${network} - ${phoneNumber})`;
      finalMessage = `Phone: ${phoneNumber}\nNetwork: ${network}\nAmount: ${dataAmount} MB\n\nNotes: ${message}`;
    } else {
      if (!subject || !message) {
        setError('Please fill in all required fields');
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.user?.id) throw new Error("No user session found");

      const { error: insertErr } = await supabase
        .from('support_requests')
        .insert({
          user_id: session.data.session.user.id,
          type: supportType,
          subject: finalSubject,
          message: finalMessage,
          status: 'pending'
        });

      if (insertErr) throw insertErr;

      setSuccess(true);
      setSubject('');
      setMessage('');
      setPhoneNumber('');
      setNetwork('MTN');
      setDataAmount('500');
    } catch (err: any) {
      console.error('Support Request Submission Failed:', err);
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txType || !amount || !payMethod || !txRef || !proofFile) {
      setError('Please fill in all required fields and upload proof');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      // 1. Upload Proof Image with auto-create and Base64 fallback
      let publicUrl = '';
      try {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
        let { data: uploadData, error: uploadError } = await supabase.storage
          .from('proofs')
          .upload(fileName, proofFile);

        // Auto-create bucket if missing
        if (uploadError && (uploadError.message?.toLowerCase().includes('bucket') || (uploadError as any).status === 404)) {
          console.warn("[Storage] Bucket 'proofs' not found. Attempting auto-creation...");
          try {
            await supabase.storage.createBucket('proofs', { public: true });
            const retryRes = await supabase.storage.from('proofs').upload(fileName, proofFile);
            uploadData = retryRes.data;
            uploadError = retryRes.error;
          } catch (createErr) {
            console.error("[Storage] Failed to auto-create bucket 'proofs':", createErr);
          }
        }

        if (uploadError) throw uploadError;

        if (uploadData?.path) {
          const { data: { publicUrl: url } } = supabase.storage
            .from('proofs')
            .getPublicUrl(uploadData.path);
          publicUrl = url;
        } else {
          throw new Error("No upload data path returned.");
        }
      } catch (uploadErr) {
        console.warn("[Storage] Bucket Upload failed. Falling back to Base64 encoding for payment proof:", uploadErr);
        const base64Url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(proofFile);
        });
        publicUrl = base64Url;
      }

      // 2. Submit Verification
      const { error: insertErr } = await supabase
        .from('payment_verifications')
        .insert({
          user_id: session.data.session?.user?.id,
          transaction_type: txType,
          reference_id: refId || null,
          amount: parseFloat(amount),
          payment_method: payMethod,
          transaction_ref: txRef,
          bank_name: bankName || null,
          account_name: accName || null,
          account_number: accNumber || null,
          proof_image_url: publicUrl,
          status: 'pending'
        });

      if (insertErr) throw insertErr;

      setSuccess(true);
      setRefId('');
      setAmount('');
      setTxRef('');
      setBankName('');
      setAccName('');
      setAccNumber('');
      setProofFile(null);
    } catch (err: any) {
      console.error('Payment Submission Failed:', err);
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthReady || isAdmin) return null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Help & Billing Hub</h1>
          <p className="text-gray-500 font-medium mt-1">Submit a support request or verify a manual payment.</p>
        </div>

        <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit">
          <button 
            onClick={() => { setActiveForm('support'); setSuccess(false); setError(''); }}
            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeForm === 'support' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}
          >
            <MessageSquare className="w-4 h-4" /> Support Request
          </button>
          <button 
            onClick={() => { setActiveForm('payment'); setSuccess(false); setError(''); }}
            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeForm === 'payment' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}
          >
            <CreditCard className="w-4 h-4" /> Payment Verification
          </button>
          <button 
            onClick={() => { setActiveForm('history'); setSuccess(false); setError(''); }}
            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeForm === 'history' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}
          >
            <History className="w-4 h-4" /> My Request History
          </button>
        </div>

        {success ? (
          <Card className="border-none shadow-2xl rounded-[32px] p-12 text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-sm">
              <CheckCircle2 className="w-10 h-10 text-green-700" />
            </div>
            <h3 className="text-3xl font-black text-gray-900">Submission Successful!</h3>
            <p className="text-gray-500 font-medium max-w-sm mx-auto italic">
              "Your request has been sent to our desk. We'll respond within 24 hours."
            </p>
            <div className="pt-4">
              <Button onClick={() => setSuccess(false)} variant="outline" className="rounded-2xl h-12 px-10 font-black">
                Send Another Request
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="border-none shadow-xl rounded-[32px] overflow-hidden">
            <CardHeader className="bg-slate-50 border-b p-8">
              <CardTitle className="flex items-center gap-3 text-2xl font-black">
                {activeForm === 'support' ? <MessageSquare className="w-6 h-6 text-green-700" /> : <CreditCard className="w-6 h-6 text-indigo-700" />}
                <span>{activeForm === 'support' ? 'Contact Support' : 'Manual Payment Proof'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              {activeForm === 'support' ? (
                <form onSubmit={handleSupportSubmit} className="space-y-6">
                  {/* Auto-populated User Email */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Your Account Email</Label>
                    <Input value={user?.email || ''} disabled className="h-12 rounded-xl bg-gray-50 border-gray-200 font-bold text-gray-700 cursor-not-allowed" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Request Type</Label>
                      <Select value={supportType} onValueChange={setSupportType}>
                        <SelectTrigger className="h-12 rounded-xl border-gray-200">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="General">General Inquiry</SelectItem>
                          <SelectItem value="Payment">Payment Issue</SelectItem>
                          <SelectItem value="Bug">Report a Bug</SelectItem>
                          <SelectItem value="Feature">Feature Request</SelectItem>
                          <SelectItem value="Withdrawal">Withdrawal Issue</SelectItem>
                          <SelectItem value="Data Reward">Data Reward</SelectItem>
                          <SelectItem value="Take Down Request">Take Down Request</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Subject</Label>
                       <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={supportType === 'Data Reward' ? 'Auto-generated or custom topic' : 'Topic of request'} className="h-12 rounded-xl" />
                    </div>
                  </div>

                  {supportType === 'Data Reward' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-green-50/50 p-6 rounded-3xl border border-green-100">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-green-700">Phone Number</Label>
                        <Input 
                          placeholder="e.g. 08031234567"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="bg-white border-green-200 rounded-xl font-bold h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-green-700">Mobile Network</Label>
                        <Select value={network} onValueChange={setNetwork}>
                          <SelectTrigger className="bg-white border-green-200 rounded-xl font-bold h-12">
                            <SelectValue placeholder="Select Network" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MTN">MTN</SelectItem>
                            <SelectItem value="Glo">Glo</SelectItem>
                            <SelectItem value="Airtel">Airtel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-green-700">Data Amount (MB)</Label>
                        <Input 
                          type="number"
                          placeholder="e.g. 500 or 1000"
                          value={dataAmount}
                          onChange={(e) => setDataAmount(e.target.value)}
                          className="bg-white border-green-200 rounded-xl font-bold h-12"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">
                      {supportType === 'Data Reward' ? 'Notes / Additional Context (Optional)' : 'Message Detail'}
                    </Label>
                    <div className="relative">
                      <Textarea 
                        value={message} 
                        onChange={(e) => setMessage(e.target.value)} 
                        placeholder="Explain your request in detail..." 
                        className="min-h-[180px] rounded-2xl" 
                      />
                    </div>
                  </div>

                  {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl font-bold flex items-center gap-2"><AlertCircle className="w-5 h-5"/>{error}</div>}

                  <Button type="submit" disabled={loading} className="w-full h-14 bg-green-700 hover:bg-green-800 font-black text-lg rounded-2xl">
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5 mr-3" />Submit Support Request</>}
                  </Button>
                </form>
              ) : activeForm === 'payment' ? (
                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Transaction For</Label>
                      <Select value={txType} onValueChange={setTxType}>
                        <SelectTrigger className="h-12 rounded-xl border-gray-200">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ebook_purchase">E-book Purchase</SelectItem>
                          <SelectItem value="premium_upgrade">Premium Upgrade</SelectItem>
                          <SelectItem value="author_upgrade">Author Account Upgrade</SelectItem>
                          <SelectItem value="trivia_entry">Trivia Contest Entry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Amount Paid (₦)</Label>
                       <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Reference ID (Optional)</Label>
                       <Input value={refId} onChange={(e) => setRefId(e.target.value)} placeholder="Book ID/Upgrade ID" className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Payment Method</Label>
                      <Select value={payMethod} onValueChange={setPayMethod}>
                        <SelectTrigger className="h-12 rounded-xl border-gray-200">
                          <SelectValue placeholder="Method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="card">Global Card</SelectItem>
                          <SelectItem value="ussd">USSD Payment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-6">
                    <h4 className="font-black text-sm uppercase tracking-widest text-slate-400">Transaction Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Transaction Reference</Label>
                          <Input value={txRef} onChange={(e) => setTxRef(e.target.value)} placeholder="ABC-REF-123" className="h-12 rounded-xl" />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Bank Name</Label>
                          <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Zenith/Access/etc" className="h-12 rounded-xl" />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Account Holder Name</Label>
                          <Input value={accName} onChange={(e) => setAccName(e.target.value)} placeholder="Name on receipt" className="h-12 rounded-xl" />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Account Number</Label>
                          <Input value={accNumber} onChange={(e) => setAccNumber(e.target.value)} placeholder="10 Digits" className="h-12 rounded-xl" />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Proof of Payment (Image)</Label>
                    <div className="flex items-center gap-4">
                      <Input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        className="rounded-xl border-dashed border-2 p-2 h-auto"
                      />
                    </div>
                  </div>

                  {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl font-bold flex items-center gap-2"><AlertCircle className="w-5 h-5"/>{error}</div>}

                  <Button type="submit" disabled={loading} className="w-full h-14 bg-indigo-700 hover:bg-indigo-800 font-black text-lg rounded-2xl shadow-xl shadow-indigo-100 transition-all">
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-3" />Submit Verification Proof</>}
                  </Button>
                </form>
              ) : (
                <div className="space-y-8 min-h-[400px]">
                  {historyLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-4">
                      <RefreshCw className="w-10 h-10 animate-spin" />
                      <p className="font-black uppercase tracking-widest text-xs">Loading History...</p>
                    </div>
                  ) : (
                    <>
                      {/* Support History */}
                      <section className="space-y-4">
                        <h3 className="text-xl font-black flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-green-600" /> Support History
                        </h3>
                        {supportHistory.length === 0 ? (
                           <div className="p-10 border-2 border-dashed rounded-3xl text-center text-slate-400 font-medium">
                             No support requests yet.
                           </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4">
                            {supportHistory.map(req => {
                              const isDataReward = req.type === 'Data Reward';
                              const parsed = isDataReward ? (() => {
                                const phone = req.message?.match(/Phone:\s*(.+)/)?.[1]?.trim() || '';
                                const net = req.message?.match(/Network:\s*(.+)/)?.[1]?.trim() || '';
                                const amt = req.message?.match(/Amount:\s*(.+)/)?.[1]?.trim() || '';
                                const notes = req.message?.split('Notes:')?.[1]?.trim() || req.message || '';
                                return { phone, net, amt, notes };
                              })() : null;

                              return (
                                <div key={req.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                      <Badge className={
                                        req.status === 'pending' || req.status === 'open' ? 'bg-amber-500' :
                                        (req.status === 'resolved' || req.status === 'completed' || req.status === 'granted') ? 'bg-green-600' : 'bg-red-600'
                                      }>
                                        {req.status?.toUpperCase()}
                                      </Badge>
                                      {isDataReward && (
                                        <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">
                                          DATA REWARD
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                      {new Date(req.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div>
                                    <h4 className="font-extrabold text-slate-900">{req.subject}</h4>
                                    {isDataReward && parsed ? (
                                      <div className="my-2 bg-white border border-green-100 p-4 rounded-2xl text-xs space-y-1.5 font-bold text-gray-700">
                                        <div>📞 Mobile Line: <span className="text-gray-900 font-extrabold">{parsed.phone}</span></div>
                                        <div>🌐 Network: <span className="text-gray-950 font-black">{parsed.net}</span></div>
                                        <div>📦 Package Volume: <span className="text-green-700 font-extrabold">{parsed.amt} MB</span></div>
                                        {parsed.notes && parsed.notes !== req.message && <div className="text-gray-400 mt-2 border-t pt-1 font-normal">Notes: {parsed.notes}</div>}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-slate-500 mt-1">{req.message}</p>
                                    )}
                                  </div>
                                  {req.admin_response && (
                                    <div className="mt-4 p-4 bg-white rounded-2xl border border-green-100 italic text-sm text-slate-700">
                                      <span className="font-black text-[10px] uppercase text-green-700 block mb-1">Admin Response:</span>
                                      "{req.admin_response}"
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </section>

                      {/* Payment History */}
                      <section className="space-y-4 pt-8 border-t border-slate-100">
                        <h3 className="text-xl font-black flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-indigo-600" /> Payment Verifications
                        </h3>
                        {paymentHistory.length === 0 ? (
                           <div className="p-10 border-2 border-dashed rounded-3xl text-center text-slate-400 font-medium">
                             No payment verifications yet.
                           </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4">
                            {paymentHistory.map(pv => (
                              <div key={pv.id} className="p-6 bg-indigo-50/30 rounded-3xl border border-indigo-100 space-y-3">
                                <div className="flex justify-between items-center">
                                  <Badge className={
                                    pv.status === 'pending' ? 'bg-amber-500' :
                                    pv.status === 'approved' ? 'bg-green-600' : 'bg-red-600'
                                  }>
                                    {pv.status?.toUpperCase()}
                                  </Badge>
                                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                    ₦{pv.amount} • {new Date(pv.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-slate-900">{pv.transaction_type?.replace(/_/g, ' ').toUpperCase()}</h4>
                                  <p className="text-sm text-slate-500 mt-1">Ref: {pv.transaction_ref}</p>
                                </div>
                                {pv.admin_note && (
                                  <div className="mt-4 p-4 bg-white rounded-2xl border border-indigo-100 italic text-sm text-slate-700">
                                    <span className="font-black text-[10px] uppercase text-indigo-700 block mb-1">Admin Note:</span>
                                    "{pv.admin_note}"
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};
