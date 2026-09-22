import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Zap, Check, AlertCircle, Info } from 'lucide-react';
import axios from 'axios';

declare const PaystackPop: any;

export const PremiumUpgrade: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paystackKey, setPaystackKey] = useState('');
  
  const fromMessage = location.state?.message;
  const redirectPath = location.state?.redirectAfter || '/dashboard';

  useEffect(() => {
    const fetchKey = async () => {
      // 1. Try Environment Variable first (VITE_PAYSTACK_PUBLIC_KEY)
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

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleSuccess = async (ref: string) => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await axios.post('/api/upgrade/premium', { reference: ref }, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      navigate(redirectPath, { state: { message: 'Premium Upgrade Successful!' } });
    } catch (err) {
      setError('Failed to record upgrade. Please contact support with reference: ' + ref);
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = () => {
    if (!user) {
      localStorage.setItem('redirectAfterLogin', window.location.pathname);
      navigate('/login');
      return;
    }

    if (!paystackKey) {
      setError('Payment gateway configuration missing. Try "Mock Success" for testing.');
      return;
    }

    setProcessing(true);
    const handler = PaystackPop.setup({
      key: paystackKey,
      email: user.email,
      amount: 1500 * 100, // ₦1,500
      currency: 'NGN',
      ref: 'PREM_' + Math.floor((Math.random() * 1000000000) + 1),
      callback: (response: any) => handleSuccess(response.reference),
      onClose: () => setProcessing(false)
    });
    handler.openIframe();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 py-24">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          {fromMessage && (
            <div className="bg-amber-100/50 border border-amber-200 p-6 rounded-3xl flex items-start gap-4 text-amber-900 shadow-sm animate-in slide-in-from-top-4 duration-500">
               <Info className="w-6 h-6 shrink-0 mt-0.5" />
               <p className="font-bold text-sm leading-relaxed">{fromMessage}</p>
            </div>
          )}
          <Zap className="w-16 h-16 text-amber-500 fill-current" />
          <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none">Level up your <span className="text-amber-500">Reader</span> Experience</h1>
          <p className="text-xl text-slate-500 font-medium">Join our premium circle for exclusive access and enhanced reading features.</p>
          
          <ul className="space-y-4">
            {[
              "Access all Premium Library content",
              "Priority support and early access",
              "Double referral rewards (₦200 per sign-up)",
              "Exclusive badge on author profiles"
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 font-bold text-slate-700">
                <div className="bg-green-100 p-1 rounded-full"><Check className="w-4 h-4 text-green-600" /></div>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <Card className="rounded-[48px] border-none shadow-2xl overflow-hidden bg-white">
          <div className="bg-amber-500 p-10 text-center text-white">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">One-Time Payment</h3>
            <p className="text-6xl font-black tracking-tighter">₦1,500</p>
          </div>
          <CardContent className="p-10 space-y-8">
            <div className="space-y-4">
              <Button 
                onClick={handlePayment}
                disabled={processing}
                className="w-full h-16 bg-amber-500 hover:bg-amber-600 rounded-2xl text-lg font-black shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
              >
                {processing ? 'Processing...' : 'Upgrade Instantly'}
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3 text-red-600 text-xs font-bold border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" /> Secure Payment via Paystack
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
