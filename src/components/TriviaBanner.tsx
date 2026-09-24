// LEGACY: CalmReader file, not part of EVEX product. To be unmounted in a later pass.
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Timer, BrainCircuit, X, ChevronRight, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';

export const TriviaBanner: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTrivia, setActiveTrivia] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestTrivia = async () => {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        let trivias: any[] = [];
        
        const { data: dbTrivias } = await supabase
          .from('trivias')
          .select('*, books(title, price)')
          .eq('deleted', false)
          .eq('status', 'active');

        if (dbTrivias) {
          trivias = dbTrivias.map((t: any) => ({
            id: t.book_id || 'general',
            session_id: t.id,
            title: t.title || (t.book_id ? t.books?.title : "General Knowledge Challenge"),
            reward_points: t.reward_points || 10,
            expiry_at: t.expiry_at,
            created_at: t.created_at,
            alreadyAttempted: false,
            hasAccess: !t.book_id,
            isGeneral: !t.book_id
          }));
        }
        
        if (trivias && trivias.length > 0) {
          const dismissedTrivias = JSON.parse(localStorage.getItem('dismissed_trivias') || '[]');
          
          const now = Date.now();
          const twelveHoursInMs = 12 * 60 * 60 * 1000;

          // Find eligible trivias: 
          // 1. Created within the last 12 hours
          // 2. Not dismissed IN THIS LOCAL STORAGE
          // 3. User hasn't already attempted this specific session (checked by server)
          const eligible = trivias.filter((t: any) => {
            const createdAt = t.created_at ? new Date(t.created_at).getTime() : 0;
            const isFresh = (now - createdAt) <= twelveHoursInMs;
            const dismissedKey = `${t.session_id}_${t.id}`;
            const isDismissed = dismissedTrivias.includes(dismissedKey);
            
            // Only show if not attempted yet (server sends alreadyAttempted: false)
            return isFresh && !isDismissed && !t.alreadyAttempted;
          });

          if (eligible.length > 0) {
            // Sort by expiry (closest first)
            const sorted = eligible.sort((a: any, b: any) => {
              const timeA = a.expiry_at ? new Date(a.expiry_at).getTime() : Infinity;
              const timeB = b.expiry_at ? new Date(b.expiry_at).getTime() : Infinity;
              return timeA - timeB;
            });
            setActiveTrivia(sorted[0]);
          }
        }
      } catch (err: any) {
        console.warn("[TriviaBanner] Failed to fetch latest trivias safely:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLatestTrivia();
  }, []);

  if (dismissed || loading || !activeTrivia) return null;

  const handlePlayClick = async () => {
    // Get current session explicitly
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      localStorage.setItem('redirectAfterLogin', `/trivia/ebook/${activeTrivia.id || activeTrivia.session_id}`);
      navigate('/login', { state: { message: "Please login to play trivia" } });
      return;
    }
    
    if (activeTrivia.book_id && activeTrivia.hasAccess === false) {
       navigate(`/payment?item=trivia&id=${activeTrivia.id}&return=/trivia/ebook/${activeTrivia.id || activeTrivia.session_id}`);
       return;
    }
    
    navigate(`/trivia/ebook/${activeTrivia.id || activeTrivia.session_id}`);
  };

  const handleDismiss = () => {
    const dismissedStore = JSON.parse(localStorage.getItem('dismissed_trivias') || '[]');
    const dismissedKey = `${activeTrivia.session_id}_${activeTrivia.id}`;
    if (!dismissedStore.includes(dismissedKey)) {
      localStorage.setItem('dismissed_trivias', JSON.stringify([...dismissedStore, dismissedKey]));
    }
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        exit={{ y: -100 }}
        className="fixed top-[64px] left-0 right-0 z-40 px-4"
      >
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 p-[2px] rounded-2xl shadow-xl shadow-amber-200/40 border-none">
            <div className="bg-white rounded-[14px] flex items-center justify-between p-3 px-6 gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="bg-amber-100 p-2 rounded-lg shrink-0">
                  <BrainCircuit className="w-5 h-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded-md">General Trivia</span>
                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      Expires soon
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 truncate">
                    {activeTrivia.title}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex flex-col items-end mr-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Win Rewards</p>
                  <p className="text-sm font-black text-amber-600">+{activeTrivia.reward_points} T-Points</p>
                </div>
                {!user ? (
                  <Link 
                    to="/login"
                    state={{ message: "Please login to play trivia" }}
                    onClick={() => localStorage.setItem('redirectAfterLogin', '/trivia')}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                  >
                    Get Started <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link 
                    to="/trivia"
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                  >
                    View Hub <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
                <button 
                  onClick={handleDismiss}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
