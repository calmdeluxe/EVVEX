// LEGACY: CalmReader file, not part of EVEX product.
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, ShieldCheck, AlertCircle, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

declare const PaystackPop: any;

export const PublicPurchase: React.FC = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [itemType, setItemType] = useState<'book' | 'trivia' | 'premium'>('book');
  const [itemData, setItemData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<any>(null);
  const [affiliateRef, setAffiliateRef] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [bankInfo, setBankInfo] = useState<any>(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [manualPending, setManualPending] = useState(false);
  const [paystackScriptStatus, setPaystackScriptStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  const loadPaystackScript = () => {
    setPaystackScriptStatus('loading');
    
    // Remove existing if any
    const existing = document.getElementById('paystack-inline-js');
    if (existing) {
      try {
        existing.remove();
      } catch (e) {
        console.warn("Failed to clean up existing script", e);
      }
    }

    if ((window as any).PaystackPop) {
      setPaystackScriptStatus('loaded');
      return;
    }

    const script = document.createElement('script');
    script.id = 'paystack-inline-js';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;

    script.onload = () => {
      setPaystackScriptStatus('loaded');
    };

    script.onerror = () => {
      setPaystackScriptStatus('error');
    };

    document.body.appendChild(script);

    // Timeout check (8 seconds)
    setTimeout(() => {
      if (!(window as any).PaystackPop) {
        setPaystackScriptStatus((prev) => prev === 'loaded' ? 'loaded' : 'error');
      }
    }, 8000);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = (params.get('item') as any) || 'book';
    const id = params.get('id') || localStorage.getItem('pendingPurchase');
    const ref = params.get('ref');
    
    if (ref) setAffiliateRef(ref);
    setItemType(type);
    
    if (user?.email) {
      setEmail(user.email);
    } else {
      const storedEmail = localStorage.getItem('guest_checkout_email');
      if (storedEmail) setEmail(storedEmail);
    }

    let isSubscribed = true;

    const fetchData = async () => {
      try {
        if (isSubscribed) setLoading(true);
        // 1. Fetch Item Data
        let currentItemData = null;

        if (type === 'trivia') {
          const identifier = id || slug;
          if (identifier) {
            let triviaData = null;
            // Try UUID first
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
            if (isUUID) {
              const { data } = await supabase.from('trivias').select('*, books(title, price)').eq('id', identifier).maybeSingle();
              triviaData = data;
            }
            if (!triviaData) {
              const { data } = await supabase.from('trivias').select('*, books(title, price)').eq('slug', identifier).maybeSingle();
              triviaData = data;
            }
            if (triviaData) {
              currentItemData = {
                title: `Trivia: ${triviaData.title}`,
                subtitle: `Practice Challenge for ${triviaData.books?.title || 'E-Book'}`,
                price: triviaData.price || 200, 
                id: triviaData.book_id || 'general', 
                trivia_id: triviaData.id 
              };
            }
          }
        } else if (type === 'premium') {
          currentItemData = {
            title: "Premium Author Upgrade",
            subtitle: "Publish unlimited books and earn 90% royalties",
            price: 5000,
            id: 'premium'
          };
        } else if (slug || id) {
          const identifier = slug || id;
          if (identifier) {
            let bookData = null;
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
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
            if (bookData) {
              currentItemData = {
                ...bookData,
                subtitle: `Swipeable Card Book • ${bookData.cards_json?.length || 0} Cards`,
              };
            }
          }
        }

        if (isSubscribed) setItemData(currentItemData);

        // Check if already purchased or is free
        if (type === 'book' && currentItemData?.id) {
          const isFree = !currentItemData.price || Number(currentItemData.price) === 0;
          if (isFree) {
            console.log("[Purchase] Free book, redirecting to read page...");
            navigate(`/read/${currentItemData.id}`);
            return;
          }

          if (user) {
            const { data: alreadyPurchased } = await supabase
              .from('ebook_purchases')
              .select('id')
              .eq('user_id', user.id)
              .eq('ebook_id', currentItemData.id)
              .maybeSingle();

            if (alreadyPurchased) {
              console.log("[Purchase] Already purchased, redirecting to read page...");
              navigate(`/read/${currentItemData.id}`);
              return;
            }
          }
        }

        // 2. Fetch Bank Info & Paystack Key
        const [bankRes, configRes] = await Promise.all([
          supabase.from('config').select('*').eq('key', 'admin_bank_details').maybeSingle(),
          supabase.from('config').select('*').eq('key', 'paystack_public_key').maybeSingle()
        ]);

        if (isSubscribed) {
          if (bankRes.data) setBankInfo(bankRes.data.value);
          
          const dbKey = configRes.data?.value;
          const envKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
          const activeKey = dbKey || envKey;
          
          if (activeKey) {
            setConfig({ paystackPublicKey: activeKey });
          } else {
            console.warn("[Purchase] No Paystack key found in DB or Env.");
          }
        }
      } catch (err) {
        console.error("Fetch purchase data error:", err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };
    fetchData();

    // Load Paystack script dynamically with monitoring
    loadPaystackScript();

    return () => {
      isSubscribed = false;
    };
  }, [slug, location.search, user?.email]);

  const handleManualPayment = async () => {
    if (!user) {
      setError('Please login to submit payment requests');
      return;
    }
    if (!receiptUrl) {
      setError('Please provide a receipt URL or transaction ID');
      return;
    }
    setManualPending(true);
    try {
      await supabase.from('payment_requests').insert({
        user_id: user.id,
        book_id: itemType === 'book' ? itemData.id : null,
        trivia_id: itemType === 'trivia' ? itemData.id : null,
        amount: itemData.price,
        method: 'bank_transfer',
        receipt_url: receiptUrl,
        status: 'pending'
      });
      alert('Payment request submitted! Admin will verify and grant access within 24 hours.');
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to submit request');
    } finally {
      setManualPending(false);
    }
  };

  const handleMockSuccess = async (realRef?: string) => {
    setProcessing(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        const ebookId = itemType === 'book' ? itemData.id : null;
        if (ebookId) localStorage.setItem('pendingPurchase', ebookId);
        navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
        return;
      }

      localStorage.removeItem('pendingPurchase'); 

      const reference = realRef || ('MOCK_' + Date.now());

      if (itemType === 'trivia') {
        let amount = 200;
        try {
          const isGeneral = itemData.id === 'general';
          const tQuery = isGeneral
            ? supabase.from('trivias').select('price').is('book_id', null).single()
            : supabase.from('trivias').select('price').eq('book_id', itemData.id).single();
          const { data: triviaData } = await tQuery;
          if (triviaData?.price !== undefined && triviaData?.price !== null) {
            amount = triviaData.price;
          }
        } catch (e) {
          console.warn("Trivia price fetch failed:", e);
        }

        const { error: txError } = await supabase.from('transactions').insert({
          user_id: session.user.id,
          book_id: itemData.id === 'general' ? null : itemData.id,
          type: 'trivia_access',
          amount: amount,
          status: 'successful',
          paystack_reference: reference
        });
        if (txError) throw txError;

        navigate(`/trivia/ebook/${itemData.trivia_id || itemData.id}`);
      } else if (itemType === 'premium') {
        const { error: userError } = await supabase
          .from('users')
          .update({
            account_tier: 'premium',
            is_premium: true,
            premium_upgrade_date: new Date().toISOString()
          })
          .eq('id', session.user.id);
        if (userError) throw userError;

        const { error: txError } = await supabase.from('transactions').insert({
          user_id: session.user.id,
          type: 'premium_upgrade',
          amount: 1500,
          status: 'completed',
          paystack_reference: reference
        });
        if (txError) throw txError;

        navigate('/dashboard');
      } else {
        // eBook Purchase
        const { data: trans, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: session.user.id,
            book_id: itemData.id,
            type: 'purchase',
            amount: itemData.price || 0,
            status: 'successful',
            paystack_reference: reference
          })
          .select()
          .single();
        if (txError) throw txError;

        if (trans) {
          const { data: existingEpic } = await supabase
            .from("ebook_purchases")
            .select("*")
            .eq("user_id", session.user.id)
            .eq("ebook_id", itemData.id)
            .maybeSingle();

          if (!existingEpic) {
            await supabase.from("ebook_purchases").insert({
              user_id: session.user.id,
              ebook_id: itemData.id,
              purchase_id: trans.id
            });
          }

          // AFFILIATE REWARD: check if an affiliate referrer exists
          const affiliateReferrer = localStorage.getItem('affiliate_referrer');
          if (affiliateReferrer && affiliateReferrer !== session.user.id) {
            try {
              // Fetch referrer profile to verify they exist and get their current wallet/earned values
              let referrerProfile = null;
              if (affiliateReferrer.length === 8 && !affiliateReferrer.includes("-")) {
                const { data } = await supabase
                  .from('users')
                  .select('id, wallet_balance, total_earned')
                  .ilike('id', `${affiliateReferrer}%`)
                  .limit(1)
                  .maybeSingle();
                referrerProfile = data;
              } else {
                const { data } = await supabase
                  .from('users')
                  .select('id, wallet_balance, total_earned')
                  .eq('id', affiliateReferrer)
                  .maybeSingle();
                referrerProfile = data;
              }

              if (referrerProfile && referrerProfile.id !== session.user.id) {
                const commissionAmount = Math.round((itemData.price || 0) * 0.1);
                if (commissionAmount > 0) {
                  const newWalletBalance = (referrerProfile.wallet_balance || 0) + commissionAmount;
                  const newTotalEarned = (referrerProfile.total_earned || 0) + commissionAmount;

                  // 1. Credit wallet_balance and total_earned in users table
                  await supabase
                    .from('users')
                    .update({
                      wallet_balance: newWalletBalance,
                      total_earned: newTotalEarned
                    })
                    .eq('id', referrerProfile.id);

                  // 2. Log in transactions with type = 'affiliate_commission'
                  await supabase.from('transactions').insert({
                    user_id: referrerProfile.id,
                    book_id: itemData.id,
                    type: 'affiliate_commission',
                    amount: commissionAmount,
                    status: 'completed',
                    paystack_reference: reference || `AFFILIATE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
                  });

                  console.log(`[Affiliate Reward] Credited 10% commission of ₦${commissionAmount} to referrer ${referrerProfile.id}`);
                  // Clear the referrer to prevent double credit on subsequent purchases
                  localStorage.removeItem('affiliate_referrer');
                }
              }
            } catch (affError) {
              console.error("[Affiliate Reward] Failed to credit commission:", affError);
            }
          }
        }

        const accessToken = realRef || ('MOCK_' + Math.random().toString(36).substring(2, 15));
        localStorage.setItem(`access_${itemData.id}`, accessToken);
        navigate(`/book/${itemData.public_slug || itemData.id}/read`);
      }
    } catch (err: any) {
      setError('Payment recording failed: ' + (err.message || err));
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    // 1. Wait for auth to be ready if it's still loading
    if (loading) {
      console.log("[Purchase] Auth is still loading, waiting...");
      return;
    }

    // 2. Check existing user from context
    if (!user) {
      console.warn("[Purchase] No user context found. Checking explicit session...");
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn("[Purchase] No session found. Saving intent and redirecting to login.");
        const ebookId = itemType === 'book' ? itemData?.id : null;
        if (ebookId) localStorage.setItem('pendingPurchase', ebookId);
        navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
        return;
      }
    }

    // 3. FREE Book purchase flow - immediately grant access
    if (itemData.price === 0 || itemData.price === '0') {
      setProcessing(true);
      setError('');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
          return;
        }

        if (itemType === 'trivia') {
          const { error: txError } = await supabase.from('transactions').insert({
            user_id: session.user.id,
            book_id: itemData.id === 'general' ? null : itemData.id,
            type: 'trivia_access',
            amount: 0,
            status: 'successful',
            paystack_reference: 'FREE_' + Date.now()
          });
          if (txError) throw txError;
          navigate(`/trivia/ebook/${itemData.trivia_id || itemData.id}`);
        } else if (itemType === 'premium') {
          const { error: userError } = await supabase
            .from('users')
            .update({
              account_tier: 'premium',
              is_premium: true,
              premium_upgrade_date: new Date().toISOString()
            })
            .eq('id', session.user.id);
          if (userError) throw userError;

          const { error: txError } = await supabase.from('transactions').insert({
            user_id: session.user.id,
            type: 'premium_upgrade',
            amount: 0,
            status: 'completed',
            paystack_reference: 'FREE_' + Date.now()
          });
          if (txError) throw txError;
          navigate('/dashboard');
        } else {
          const { data: trans, error: txError } = await supabase
            .from('transactions')
            .insert({
              user_id: session.user.id,
              book_id: itemData.id,
              type: 'purchase',
              amount: 0,
              status: 'successful',
              paystack_reference: 'FREE_' + Date.now()
            })
            .select()
            .single();
          if (txError) throw txError;

          if (trans) {
            const { data: existingEpic } = await supabase
              .from("ebook_purchases")
              .select("*")
              .eq("user_id", session.user.id)
              .eq("ebook_id", itemData.id)
              .maybeSingle();

            if (!existingEpic) {
              await supabase.from("ebook_purchases").insert({
                user_id: session.user.id,
                ebook_id: itemData.id,
                purchase_id: trans.id
              });
            }
          }
          
          const accessToken = 'FREE_' + Math.random().toString(36).substring(2, 15);
          localStorage.setItem(`access_${itemData.id}`, accessToken);
          navigate(`/book/${itemData.public_slug || itemData.id}/read`);
        }
      } catch (err: any) {
        setError('Failed to claim free eBook: ' + err.message);
        console.error("Free book error:", err);
      } finally {
        setProcessing(false);
      }
      return;
    }

    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    if (!config?.paystackPublicKey) {
      setError('Paystack public key not found. Use "Mock Success" button to test the flow.');
      return;
    }

    setProcessing(true);
    setError('');

    if (typeof PaystackPop === 'undefined') {
      setError('Paystack secure inline gateway failed to initialize. Please check your internet connection and try the "Retry Connection" button, or pay via manual bank transfer.');
      setProcessing(false);
      return;
    }

    try {
      const handler = PaystackPop.setup({
        key: config.paystackPublicKey,
        email: email,
        amount: itemData.price * 100,
        currency: 'NGN',
        ref: 'CR_' + Math.floor((Math.random() * 1000000000) + 1),
        metadata: {
          item_id: itemData.id,
          book_id: itemData.id,
          item_type: itemType,
          type: itemType === 'premium' ? 'premium_upgrade' : (itemType === 'trivia' ? 'trivia' : 'purchase'),
          affiliate_code: affiliateRef
        },
        callback: (response: any) => handleMockSuccess(response.reference),
        onClose: () => {
          setProcessing(false);
        }
      });
      handler.openIframe();
    } catch (e: any) {
      console.error("Paystack open error:", e);
      setError('Failed to initiate secure checkout session: ' + (e.message || 'connection gateway timeout'));
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-700 border-t-transparent"></div>
      <p className="text-sm font-bold text-slate-500 animate-pulse">Establishing Secure Checkout...</p>
    </div>
  );

  if (!itemData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900 font-black">Item Not Found</h2>
        <p className="text-slate-500 mt-2">The eBook or Trivia challenge you requested is unavailable.</p>
        <Button onClick={() => {
          if (window.history.length > 2) {
            navigate(-1);
          } else {
            navigate(user ? '/dashboard' : '/');
          }
        }} className="mt-8 bg-slate-900 rounded-2xl h-12 px-8">
          {user ? 'Go to Dashboard' : 'Return Home'}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <Card className="w-full max-w-lg shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border-none rounded-[48px] overflow-hidden bg-white">
        <div className="bg-green-700 p-12 text-white text-center relative overflow-hidden">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.1 }} className="absolute -top-10 -left-10 transform scale-150"><BookOpen className="w-32 h-32" /></motion.div>
          <h1 className="text-3xl font-black tracking-tight relative z-10">{itemData.title}</h1>
          <p className="mt-3 text-sm font-bold opacity-80 uppercase tracking-widest relative z-10">{itemData.subtitle}</p>
        </div>
        
        <CardContent className="p-12 space-y-10">
          <div className="text-center bg-green-50 py-8 rounded-[32px] border border-green-100/50">
            <span className="text-5xl font-black text-green-900 tracking-tighter">₦{itemData.price.toLocaleString()}</span>
            <p className="text-[10px] font-black text-green-600 mt-2 uppercase tracking-[0.2em]">One-Time Access License</p>
          </div>

          <div className="space-y-8">
            {!user ? (
              <div className="space-y-3">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Delivery Email</Label>
                <Input
                  type="email"
                  placeholder="Where should we send your access key?"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    localStorage.setItem('guest_checkout_email', e.target.value);
                  }}
                  className="h-16 rounded-[20px] border-2 border-slate-100 focus:border-green-500 focus:ring-0 transition-all font-bold text-slate-800 px-6 text-lg"
                />
                <p className="text-[10px] text-amber-600 font-bold ml-1">
                  Tip: <Link to="/login" className="underline">Login</Link> to automatically link this purchase to your bookshelf.
                </p>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 rounded-[20px] border border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logged in Account</p>
                    <p className="text-sm font-bold text-slate-900">{user.email}</p>
                  </div>
                  <div className="bg-green-100 p-2 rounded-full">
                    <Check className="w-4 h-4 text-green-700" />
                  </div>
                </div>
                <Button 
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="w-full border-green-200 bg-green-50 text-green-700 rounded-xl h-10 font-bold text-xs hover:bg-green-100 transition-colors"
                >
                  Go to Dashboard
                </Button>
              </div>
            )}

            {(itemData?.price > 0) && paystackScriptStatus === 'loading' && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-4 rounded-[20px] border border-amber-100/50 font-bold justify-between">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent"></div>
                  <span>Loading Paystack Secure Gateway...</span>
                </div>
              </div>
            )}

            {(itemData?.price > 0) && paystackScriptStatus === 'error' && (
              <div className="flex items-center gap-3 text-red-600 text-xs bg-red-50 p-4 rounded-[20px] border border-red-100/50 font-bold justify-between">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold">Connection Issues Detected</p>
                    <p className="text-[10px] text-red-500 font-medium leading-normal mt-0.5">Paystack script failed to load. Check your network context.</p>
                  </div>
                </div>
                <Button 
                  onClick={loadPaystackScript}
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-rose-50 text-red-700 border-red-200 rounded-xl h-9 px-3 shrink-0 text-[10px] font-black uppercase tracking-widest"
                >
                  Retry Connection
                </Button>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 text-red-600 text-xs bg-red-50 p-5 rounded-[20px] border border-red-100/50 font-bold leading-relaxed">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button 
                onClick={handlePayment} 
                disabled={processing}
                className="w-full bg-green-700 hover:bg-green-800 h-20 rounded-[24px] text-xl font-black shadow-[0_20px_40px_-8px_rgba(21,128,61,0.3)] transition-all active:scale-95 disabled:opacity-50"
              >
                {processing ? 'Processing...' : (itemData.price === 0 || itemData.price === '0' ? 'Get Free Access' : 'Purchase Now')}
              </Button>
              
              {(itemData?.price > 0) && (
                <Button 
                  variant="outline"
                  onClick={() => handleMockSuccess()}
                  disabled={processing}
                  className="w-full border-amber-200 bg-amber-50 text-amber-700 h-14 rounded-[20px] text-[10px] font-black hover:bg-amber-100 uppercase tracking-widest"
                >
                  Mock Test: Verify Payment Success
                </Button>
              )}
            </div>

            {(itemData?.price > 0) && (
              <>
                <div className="relative py-2">
                   <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100" /></div>
                   <div className="relative flex justify-center text-[10px] font-black uppercase"><span className="bg-white px-6 text-slate-300 tracking-[0.3em]">Manual Method</span></div>
                </div>

                {showManual ? (
                   <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-200/50 space-y-6">
                      <div className="space-y-3">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank Details</p>
                         <div className="bg-white p-5 rounded-2xl border border-slate-100 text-[11px] font-bold text-slate-600 leading-relaxed whitespce-pre-wrap">
                            {bankInfo || 'Bank: Access Bank\nAcc Name: CardBook Hub\nAcc No: 1234567890'}
                         </div>
                      </div>
                      <div className="space-y-3">
                         <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Receipt URL / Reference Code</Label>
                         <Input 
                            placeholder="Paste receipt link or transaction code..."
                            value={receiptUrl}
                            onChange={(e) => setReceiptUrl(e.target.value)}
                            className="h-14 rounded-2xl text-sm font-bold border-slate-200 px-6"
                         />
                      </div>
                      <Button 
                        onClick={handleManualPayment}
                        disabled={manualPending || !receiptUrl}
                        className="w-full bg-slate-900 h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all active:scale-95"
                      >
                         {manualPending ? 'Submitting...' : 'Confirm Transfer'}
                      </Button>
                   </div>
                ) : (
                   <Button 
                     variant="ghost" 
                     onClick={() => setShowManual(true)}
                     className="w-full h-10 font-black text-slate-400 hover:text-green-700 text-[10px] uppercase tracking-widest"
                   >
                      I'd rather pay via Bank Transfer
                   </Button>
                )}
              </>
            )}
          </div>

          <div className="pt-10 border-t border-slate-100 flex items-center justify-center gap-3 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
            <ShieldCheck className="w-5 h-5 text-green-700/30" />
            <span>Bank-Grade Encryption Enabled</span>
          </div>
        </CardContent>
      </Card>
      
      <div className="fixed bottom-8 flex gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-4 bg-white rounded-2xl shadow-xl border border-slate-100 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-green-700 transition-colors"
        >
          Cancel & Go Back
        </button>
        {user && (
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-4 bg-green-700 text-white rounded-2xl shadow-xl border border-green-600 text-xs font-black uppercase tracking-widest hover:bg-green-800 transition-colors"
          >
            Go to Dashboard
          </button>
        )}
      </div>
    </div>
  );
};
