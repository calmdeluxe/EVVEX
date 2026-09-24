// LEGACY: CalmReader file, not part of EVEX product.
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, Mail, CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import axios from 'axios';

export const LandingCheckout: React.FC = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [itemData, setItemData] = useState<any>(null);

  const { user } = useAuth();
  const itemIdFromParams = searchParams.get('id');
  const type = searchParams.get('item'); // 'trivia', 'book', 'premium'

  useEffect(() => {
    const fetchItem = async () => {
      const identifier = itemIdFromParams || slug;
      if (!identifier) return;
      
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

      if (type === 'trivia') {
        let triviaData = null;
        if (isUUID) {
          const { data } = await supabase.from('trivias').select('*, books(title, price)').eq('id', identifier).maybeSingle();
          triviaData = data;
        }
        if (!triviaData) {
          const { data } = await supabase.from('trivias').select('*, books(title, price)').eq('slug', identifier).maybeSingle();
          triviaData = data;
        }
        setItemData(triviaData);
      } else {
        let bookData = null;
        if (isUUID) {
          const { data } = await supabase.from('books').select('*').eq('id', identifier).maybeSingle();
          bookData = data;
        }
        if (!bookData) {
          const { data } = await supabase.from('books').select('*').eq('public_slug', identifier).maybeSingle();
          bookData = data;
        }
        if (!bookData && /^\d+$/.test(identifier)) {
          const { data } = await supabase.from('books').select('*').eq('id', parseInt(identifier)).maybeSingle();
          bookData = data;
        }
        setItemData(bookData);
      }
    };
    fetchItem();
  }, [itemIdFromParams, slug, type]);

  const handleCheckout = async () => {
    const targetId = itemData?.id || itemIdFromParams || slug;
    
    // If already logged in, go straight to payment
    if (user) {
       navigate(`/payment?item=${type || 'book'}&id=${targetId}`);
       return;
    }

    if (!email) {
      alert("Please enter your email to receive access");
      return;
    }
    
    setLoading(true);
    try {
      // Save email for later retrieval after signup/login
      localStorage.setItem('guest_checkout_email', email);
      localStorage.setItem('pendingPurchase', targetId);
      localStorage.setItem('pendingPurchaseType', type || 'book');
      
      // Redirect to login (AuthPage handles the redirect back via localStorage)
      navigate(`/login?redirect=/payment?item=${type || 'book'}&id=${targetId}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-100 border border-indigo-50">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 mb-4 hover:bg-slate-50 rounded-full transition-colors flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest">
          <ChevronLeft className="w-4 h-4" /> Go Back
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-indigo-100">
             <CreditCard className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Secure Checkout</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Landing Page Direct Access</p>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">You are purchasing</p>
            <h3 className="font-bold text-slate-900 line-clamp-1">{itemData?.title || 'Selected Item'}</h3>
            <p className="text-2xl font-black text-slate-900 mt-2">₦{itemData?.price || (type === 'premium' ? 1500 : 200)}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Your Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="pl-12 h-14 rounded-2xl border-slate-200 focus:ring-indigo-500"
                />
              </div>
            </div>

            <Button 
              onClick={handleCheckout}
              disabled={loading}
              className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
            >
              {loading ? "Processing..." : "Continue to Paystack"}
            </Button>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-50 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400 mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Secured by Paystack</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium px-4">
            By continuing, you agree to create a CalmReader account to access your purchase.
          </p>
        </div>
      </div>
    </div>
  );
};
