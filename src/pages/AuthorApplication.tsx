import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck, BookOpen, Check, AlertCircle, FileText, Zap } from 'lucide-react';
import axios from 'axios';

declare const PaystackPop: any;

export const AuthorApplication: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paystackKey, setPaystackKey] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    account_name: '',
    writing_sample_url: '',
    bio: ''
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const fetchKey = async () => {
      // 1. Try Environment Variable first
      const envKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      if (envKey) {
        setPaystackKey(envKey);
        return;
      }

      // 2. Fallback to Database config
      const { data } = await supabase.from('config').select('*').eq('key', 'paystack_public_key').maybeSingle();
      if (data) setPaystackKey(data.value);
    };
    fetchKey();

    // Recover pending data if exists
    const storedData = localStorage.getItem('pendingAuthorApp_Data');
    if (storedData) {
      try {
        setFormData(JSON.parse(storedData));
        localStorage.removeItem('pendingAuthorApp_Data');
      } catch (e) {
        console.error("Failed to parse stored author app data", e);
      }
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleSuccess = async (ref: string) => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        localStorage.setItem('pendingAuthorApp', JSON.stringify({ ...formData, ref }));
        navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
        return;
      }

      // 1. Submit Application
      await axios.post('/api/apply/author', { 
        reference: ref,
        ...formData
      }, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });

      navigate('/dashboard', { 
        state: { message: 'Application Submitted! Admin will review your details soon.' } 
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit application. Reference: ' + ref);
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    // 1. Check existing user from context first
    if (!user) {
      console.warn("[AuthorApp] No user context found. Checking explicit session...");
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        localStorage.setItem('pendingAuthorApp_Data', JSON.stringify(formData));
        navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
        return;
      }
    }

    // Basic validation
    if (!formData.bank_name || !formData.account_number || !formData.writing_sample_url) {
      setError('Please fill in all required fields before payment.');
      return;
    }

    if (!paystackKey) {
      setError('Payment gateway configuration missing. Try "Mock Test" below.');
      return;
    }

    setProcessing(true);
    const handler = PaystackPop.setup({
      key: paystackKey,
      email: user.email,
      amount: 5000 * 100, // ₦5,000
      currency: 'NGN',
      ref: 'AUTH_' + Math.floor((Math.random() * 1000000000) + 1),
      callback: (response: any) => handleSuccess(response.reference),
      onClose: () => setProcessing(false)
    });
    handler.openIframe();
  };

  return (
    <DashboardLayout>
      <div className="bg-white py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div className="space-y-10">
          <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-200">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-serif font-black text-slate-900 tracking-tight leading-[0.9]">
              Become a <span className="italic text-indigo-600">Curator</span>
            </h1>
            <p className="text-xl text-slate-500 font-medium leading-relaxed">
              Join the elite circle of authors publishing interactive card books. Earn 90% royalties on every sale.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: Zap, title: "90% Royalties", desc: "Keep almost everything you earn." },
              { icon: ShieldCheck, title: "Secure Payouts", desc: "Automated monthly bank transfers." },
              { icon: FileText, title: "AI Magic", desc: "Build card books in seconds with AI." },
              { icon: Check, title: "Lifetime Access", desc: "One-time fee, publish forever." }
            ].map((item, i) => (
              <div key={i} className="p-6 bg-slate-50 rounded-3xl space-y-3">
                <item.icon className="w-6 h-6 text-indigo-600" />
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">{item.title}</h3>
                <p className="text-sm text-slate-500 font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="rounded-[48px] border-none shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] overflow-hidden bg-white ring-1 ring-slate-100">
          <div className="bg-slate-900 p-10 text-center text-white">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-2">Architect License Fee</h3>
            <p className="text-6xl font-black tracking-tighter">₦5,000</p>
          </div>
          <CardContent className="p-10 space-y-8">
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Bank Name</Label>
                    <Input 
                      placeholder="e.g. Access Bank"
                      value={formData.bank_name}
                      onChange={e => setFormData({...formData, bank_name: e.target.value})}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Account Number</Label>
                    <Input 
                      placeholder="0123456789"
                      value={formData.account_number}
                      onChange={e => setFormData({...formData, account_number: e.target.value})}
                      className="h-12 rounded-xl"
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Account Name</Label>
                  <Input 
                    placeholder="Exact name on bank account"
                    value={formData.account_name}
                    onChange={e => setFormData({...formData, account_name: e.target.value})}
                    className="h-12 rounded-xl"
                  />
               </div>

               <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Writing Sample / Portfolio URL</Label>
                  <Input 
                    placeholder="Link to your work (Drive, Blog, Social)"
                    value={formData.writing_sample_url}
                    onChange={e => setFormData({...formData, writing_sample_url: e.target.value})}
                    className="h-12 rounded-xl"
                  />
               </div>

               <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Brief Bio (Optional)</Label>
                  <Textarea 
                    placeholder="Tell us about your creative journey..."
                    value={formData.bio}
                    onChange={e => setFormData({...formData, bio: e.target.value})}
                    className="rounded-xl min-h-[100px]"
                  />
               </div>
            </div>

            {error && (
              <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3 text-red-600 text-xs font-bold border border-red-100 italic">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <Button 
                onClick={handlePayment}
                disabled={processing}
                className="w-full h-16 bg-indigo-600 hover:bg-slate-900 rounded-2xl text-lg font-black shadow-xl shadow-indigo-100 active:scale-95 transition-all"
              >
                {processing ? 'Submitting Application...' : 'Apply & Pay ₦5,000'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </DashboardLayout>
  );
};
