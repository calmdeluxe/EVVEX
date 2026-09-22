import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck, AlertCircle, Loader2, PartyPopper, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

export const RedeemToken: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, isAuthReady, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [newTier, setNewTier] = useState('');

  useEffect(() => {
    if (isAuthReady && !user) {
      // If not logged in, redirect to login but keep the token
      navigate(`/login?redirect=/redeem?token=${token}`);
    }
  }, [isAuthReady, user, navigate, token]);

  const handleRedeem = async () => {
    if (!token) {
      setStatus('error');
      setError('No token provided in the link.');
      return;
    }

    setStatus('loading');
    try {
      const session = await supabase.auth.getSession();
      const res = await axios.post('/api/redeem-token', { token }, {
        headers: { Authorization: `Bearer ${session.data.session?.access_token}` }
      });
      
      setNewTier(res.data.new_tier);
      setStatus('success');
      
      // Force refresh the user profile in Auth context
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to redeem token. It may be invalid or expired.');
      setStatus('error');
    }
  };

  if (!isAuthReady) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-emerald-50">
      <Card className="w-full max-w-lg border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white/80 backdrop-blur-xl">
        <CardContent className="p-12 text-center">
          <AnimatePresence mode="wait">
            {status === 'idle' && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl rotate-3">
                   <ShieldCheck className="w-12 h-12 text-white" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic">Direct Upgrade Portal</h1>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    Access granted by Owner. Click below to apply your instant account upgrade (<b>{user?.email}</b>).
                  </p>
                </div>
                <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200">
                   <code className="text-indigo-600 font-black tracking-widest text-lg">{token}</code>
                </div>
                <Button 
                  onClick={handleRedeem}
                  className="w-full h-16 bg-slate-900 hover:bg-black text-white font-black rounded-2xl text-xl shadow-xl shadow-slate-200 transition-all hover:scale-105"
                >
                  REDEEM UPGRADE
                </Button>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Single-use token • Non-transferable</p>
              </motion.div>
            )}

            {status === 'loading' && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-20 space-y-6"
              >
                <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto" />
                <p className="text-xl font-black text-slate-900 tracking-tight uppercase italic animate-pulse">Verifying temporal link...</p>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-emerald-100 animate-bounce">
                   <PartyPopper className="w-12 h-12 text-white" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic">Welcome to {newTier.toUpperCase()}!</h1>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    Your account has been successfully upgraded. You now have full access to {newTier} features.
                  </p>
                </div>
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                   <div className="flex items-center justify-center gap-3 text-emerald-700 font-black uppercase text-sm tracking-widest">
                      <ShieldCheck className="w-5 h-5" /> Active Tier: {newTier}
                   </div>
                </div>
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xl shadow-xl shadow-emerald-100 flex gap-3"
                >
                  ENTER DASHBOARD <ArrowRight className="w-6 h-6" />
                </Button>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="w-24 h-24 bg-red-100 rounded-[2rem] flex items-center justify-center mx-auto shadow-lg -rotate-3">
                   <AlertCircle className="w-12 h-12 text-red-600" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic">Invalid Link</h1>
                  <p className="text-red-500 font-bold bg-red-50 p-4 rounded-2xl border border-red-100">
                    {error}
                  </p>
                </div>
                <div className="pt-4">
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/dashboard')}
                    className="w-full h-14 border-slate-200 text-slate-500 font-black rounded-2xl"
                  >
                    RETURN HOME
                  </Button>
                </div>
                <p className="text-xs text-slate-400 font-medium italic">If you believe this is an error, contact support with your token reference.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};
