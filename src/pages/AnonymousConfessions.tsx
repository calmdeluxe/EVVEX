// LEGACY: CalmReader file, not part of EVEX product. To be unmounted in a later pass.
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { 
  MessageSquareQuote, 
  Clock, 
  Send, 
  ShieldAlert, 
  CheckCircle2, 
  X,
  Lock,
  Ghost,
  ArrowLeft,
  Home,
  RefreshCw,
  VenetianMask,
  PenLine,
  Sparkles,
  Share2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../components/ui/button';

interface Confession {
  id: string;
  content: string;
  created_at: string;
  expires_at: string;
}

export const AnonymousConfessions: React.FC = () => {
  const { user, profile, isAdmin, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(location.state?.message || null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // SHARE FIX: added share link for confession with ref parameter
  const handleShareConfession = async (confession: Confession) => {
    if (!user) {
      alert("Sign in to share and earn rewards!");
      return;
    }
    const shareUrl = `${window.location.origin}/anonymous?id=${confession.id}&ref=${user.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Anonymous Confession',
          url: shareUrl
        });
      } catch (e) {
        console.warn("Web Share failed:", e);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopiedId(confession.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const isAuthorizedToRead = isAdmin || profile?.is_premium || profile?.account_tier === 'author';

  useEffect(() => {
    if (isAuthReady && !user) {
      // Allow viewing the teaser/unauthorized state instead of immediate redirect
      // This satisfies the request for a "teaser or read only thumbnail"
      return;
    }

    if (isAuthReady && user && !isAuthorizedToRead) {
      // Don't redirect, let the component render the unauthorized state
      return;
    }
  }, [isAuthReady, user, isAuthorizedToRead, navigate]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    fetchConfessions();
  }, [isAuthorizedToRead]);

  const fetchConfessions = async () => {
    if (!isAuthorizedToRead) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('anonymous_confessions')
        .select('*')
        .eq('is_approved', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfessions(data || []);
    } catch (err) {
      console.error('Error fetching confessions:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] pb-24 px-4 overflow-hidden relative">
       {/* Ambient Background */}
       <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px]" />
       </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-6"
          >
            <div className="bg-purple-600/90 backdrop-blur-xl border border-white/20 p-6 rounded-3xl shadow-2xl flex items-center justify-between gap-6">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-bold text-white tracking-tight">{message}</p>
               </div>
               <button onClick={() => setMessage(null)} className="text-white/50 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="max-w-6xl mx-auto py-8 flex items-center justify-between relative z-50">
         <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/dashboard')} 
              className="rounded-full hover:bg-white/5 text-white/50 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                  <Ghost className="w-5 h-5 text-purple-400" />
                </div>
                <span className="font-black text-xl uppercase tracking-tighter text-white">Ghost Hub</span>
            </div>
         </div>
         <div className="hidden md:flex gap-8">
            <button onClick={() => navigate('/dashboard')} className="text-[10px] font-black uppercase text-white/30 hover:text-white transition-colors tracking-widest bg-transparent border-none cursor-pointer">Dashboard</button>
            <button onClick={() => navigate('/dashboard')} className="text-[10px] font-black uppercase text-white/30 hover:text-white transition-colors tracking-widest bg-transparent border-none cursor-pointer text-indigo-400">Home</button>
         </div>
      </nav>

      {/* Header */}
      <header className="max-w-4xl mx-auto text-center mt-12 mb-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-purple-500/5 border border-purple-500/10 px-4 py-2 rounded-full mb-8 shadow-[0_0_15px_rgba(168,85,247,0.05)]"
          >
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.25em]">Verified Realities Only</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-5xl md:text-8xl font-black text-white mb-6 uppercase tracking-tighter italic leading-[0.9]"
          >
            Phantom <br />
            <span className="text-purple-400/50">Voices.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/40 font-medium max-w-lg mx-auto leading-relaxed"
          >
            Unfiltered anonymous legacies, curated by our studio for an elite reading experience. Stories fade into the void every 24 hours.
          </motion.p>
        </header>

      <div className="max-w-4xl mx-auto relative z-10">
        {!isAuthorizedToRead ? (
          <div className="space-y-12">
            <div className="text-center py-20 bg-white/5 backdrop-blur-md rounded-[50px] border border-white/5 p-12 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5"><Ghost className="w-32 h-32" /></div>
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-[30px] flex items-center justify-center mx-auto mb-8 border border-white/10 relative z-10">
                <Lock className="w-10 h-10 text-purple-400" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase mb-4 tracking-tight relative z-10">The Veil is Closed</h2>
              <p className="text-white/40 font-medium max-w-sm mx-auto mb-10 leading-relaxed relative z-10">
                Legacies this raw are reserved for our verified members. Elevate your status to Premium to unlock the full library of curated realities.
              </p>
              <Button onClick={() => user ? navigate('/upgrade/premium') : navigate('/login')} className="rounded-2xl px-12 bg-white text-black hover:bg-gray-100 font-black uppercase tracking-widest text-xs h-16 shadow-[0_20px_50px_rgba(255,255,255,0.1)] relative z-10">
                {user ? 'Unlock Full Access' : 'Sign In to View'}
              </Button>
            </div>

            {/* Teaser Ghost Cards (Blurred) */}
            <div className="grid gap-8 overflow-hidden relative">
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/50 to-slate-950 z-20" />
               {[1, 2, 3].map((i) => (
                 <div 
                   key={i} 
                   className="bg-white/5 p-10 rounded-[50px] border border-white/5 space-y-6 blur-[8px] select-none pointer-events-none transition-all"
                   style={{ 
                     opacity: 0.4 - (i * 0.1),
                     transform: `scale(${1 - (i * 0.02)})` 
                   }}
                 >
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-white/10" />
                       <div className="w-32 h-2 bg-white/10 rounded-full" />
                    </div>
                    <div className="space-y-3">
                       <div className="h-4 bg-white/10 rounded-full w-full" />
                       <div className="h-4 bg-white/10 rounded-full w-5/6" />
                       <div className="h-4 bg-white/10 rounded-full w-4/6" />
                    </div>
                    <div className="flex items-center justify-between pt-6">
                       <div className="flex gap-4">
                          <div className="w-12 h-4 bg-white/10 rounded-full" />
                          <div className="w-12 h-4 bg-white/10 rounded-full" />
                       </div>
                       <div className="w-10 h-10 rounded-full bg-white/10" />
                    </div>
                 </div>
               ))}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-full backdrop-blur-md mb-4">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">New Secrets Dropping Daily</span>
                  </div>
               </div>
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-24">
            <RefreshCw className="w-10 h-10 animate-spin text-purple-500" />
          </div>
        ) : confessions.length === 0 ? (
          <div className="text-center py-24 bg-white/5 rounded-[50px] border-2 border-dashed border-white/5 shadow-inner">
            <MessageSquareQuote className="mx-auto w-12 h-12 text-white/10 mb-4" />
            <p className="text-white/20 font-bold uppercase tracking-widest text-xs">The void is silent tonight</p>
            <p className="text-[10px] text-white/10 mt-1 uppercase tracking-widest italic">New stories arrive with the dawn</p>
          </div>
        ) : (
          <div className="grid gap-12">
            {confessions.map((confession, idx) => (
              <motion.div
                key={confession.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-[#0a0a0f] p-12 md:p-16 rounded-[60px] border border-white/5 shadow-2xl group relative overflow-hidden flex flex-col md:flex-row gap-12 hover:border-purple-500/20 transition-colors"
              >
                <div className="flex-1 space-y-8 relative z-10">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-1 bg-purple-500/30 rounded-full group-hover:w-20 transition-all duration-500" />
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Entry #{confession.id.slice(0,4).toUpperCase()}</span>
                   </div>
                   <p className="text-white/90 text-2xl md:text-3xl leading-[1.3] font-serif font-medium italic tracking-tight">
                    "{confession.content}"
                  </p>
                  <div className="pt-8 border-t border-white/5 flex flex-wrap gap-4 items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                           <VenetianMask className="w-4 h-4 text-white/30" />
                        </div>
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Story of interest</span>
                     </div>
                     <div className="flex items-center gap-6">
                        <Button
                          onClick={() => handleShareConfession(confession)}
                          variant="ghost"
                          size="sm"
                          className="text-white/40 hover:text-purple-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 h-8 px-2 rounded-lg"
                        >
                          {copiedId === confession.id ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Share</span>
                            </>
                          )}
                        </Button>
                        <div className="flex items-center text-white/20 font-black text-[10px] uppercase tracking-widest">
                           <Clock className="w-4 h-4 mr-2" />
                           {formatDistanceToNow(new Date(confession.created_at))} ago
                        </div>
                     </div>
                  </div>
                </div>

                {/* Aesthetic Detail */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/5 to-transparent blur-[60px] pointer-events-none group-hover:from-purple-500/10 transition-colors" />
                <div className="absolute -bottom-10 -right-10 opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-700 group-hover:scale-125">
                   <Ghost className="w-48 h-48 rotate-12" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {isAdmin && (
          <div className="fixed bottom-12 left-0 right-0 flex justify-center px-4 z-50">
            <Button
              onClick={() => navigate('/admin/confessions')}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-12 h-16 shadow-[0_20px_40px_rgba(147,51,234,0.3)] flex items-center gap-4 transition-all hover:scale-105 active:scale-95 group border border-purple-400/20"
            >
              <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              <span className="font-black uppercase tracking-widest text-[10px]">Open Studio Editor</span>
            </Button>
          </div>
        )}
    </div>
  );
};


// End of file
