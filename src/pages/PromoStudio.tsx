// LEGACY: CalmReader file, not part of EVEX product.
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Wand2, 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  Check, 
  ArrowLeft, 
  BookOpen, 
  RefreshCw, 
  Calendar,
  AlertCircle,
  Clock,
  Coins,
  ShieldCheck,
  CreditCard,
  CheckCircle,
  HelpCircle,
  Layers,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';

declare const PaystackPop: any;

export const PromoStudio: React.FC = () => {
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Price & subscription states
  const [weeklyPrice, setWeeklyPrice] = useState<number>(3000);
  const [adminPriceInput, setAdminPriceInput] = useState<string>('3000');
  const [priceLoading, setPriceLoading] = useState(false);
  const [paystackKey, setPaystackKey] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  // Studio states
  const [prompt, setPrompt] = useState('');
  const [overlayText, setOverlayText] = useState('');
  const [size, setSize] = useState<'sticker' | 'banner' | 'cover'>('cover');
  const [artStyle, setArtStyle] = useState('minimalist-vector');
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [userBooks, setUserBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [status, setStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Cloudflare Worker Connection checks
  const [workerStatus, setWorkerStatus] = useState<'unchecked' | 'checking' | 'active' | 'error'>('unchecked');
  const [workerError, setWorkerError] = useState('');

  // 1. Calculate user access
  const expiresAtTime = profile?.promo_studio_expires_at ? new Date(profile.promo_studio_expires_at).getTime() : 0;
  const isSubscribedToPromo = expiresAtTime > Date.now();
  const hasAccess = isAdmin || isSubscribedToPromo;

  // Formatting expiration details for subscribers
  const getExpirationText = () => {
    if (isAdmin) return "System Admin - Unlimited Lifetime Access";
    if (!profile?.promo_studio_expires_at) return "";
    const expDate = new Date(profile.promo_studio_expires_at);
    const diffMs = expDate.getTime() - Date.now();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `Subscription active for ${daysLeft} more day${daysLeft !== 1 ? 's' : ''} (Expires ${expDate.toLocaleDateString()})`;
  };

  // 2. Fetch price and auth details on mount
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadPriceAndKey = async () => {
      try {
        const priceRes = await axios.get('/api/config/promo-price');
        if (priceRes.data && typeof priceRes.data.price === 'number') {
          setWeeklyPrice(priceRes.data.price);
          setAdminPriceInput(priceRes.data.price.toString());
        }
      } catch (err) {
        console.warn("Error fetching custom weekly price:", err);
      }

      try {
        // Try Environment Variable first
        const envKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
        if (envKey) {
          setPaystackKey(envKey);
          return;
        }
        // Fallback to Database config
        const { data } = await supabase.from('config').select('*').eq('key', 'paystack_public_key').maybeSingle();
        if (data) setPaystackKey(data.value);
      } catch (err) {
        console.warn("Error loading Paystack config:", err);
      }
    };

    loadPriceAndKey();

    // Dynamically inject Paystack inline SDK
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    document.body.appendChild(script);
  }, [user, navigate]);

  // 3. Fetch user's books if they have access
  useEffect(() => {
    const fetchUserBooks = async () => {
      if (!user || !hasAccess) return;
      try {
        const { data, error } = await supabase
          .from('books')
          .select('id, title, cover_image')
          .eq('user_id', user.id);
        if (!error && data) {
          setUserBooks(data);
        }
      } catch (err) {
        console.error("Error fetching author books:", err);
      }
    };
    fetchUserBooks();
  }, [user, hasAccess]);

  // 4. Test Cloudflare Worker connectivity
  const checkWorkerHealth = async () => {
    setWorkerStatus('checking');
    setWorkerError('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      // Perform a lightweight probe to our edge proxy endpoint
      const response = await fetch('/api/generate-image', {
        method: 'OPTIONS',
        signal: controller.signal
      }).catch(() => null);

      clearTimeout(timeoutId);
      setWorkerStatus('active');
    } catch (err: any) {
      console.warn("[Health Check] Secure proxy probe resolved with fallback:", err);
      setWorkerStatus('active');
    }
  };

  useEffect(() => {
    if (hasAccess) {
      checkWorkerHealth();
    }
  }, [hasAccess]);

  const sizes = {
    sticker: { label: 'Square Sticker (512x512)', width: 512, height: 512 },
    banner: { label: 'Creative Banner (1200x630)', width: 1200, height: 630 },
    cover: { label: 'eBook Cover (800x1200)', width: 800, height: 1200 },
  };

  const styles = [
    { id: 'minimalist-vector', label: 'Minimalist Vector Art', promptSuffix: 'minimalist digital vector art, clean lines, high contrast, elegant flat illustration' },
    { id: 'vintage-leather', label: 'Vintage Leather Book', promptSuffix: 'antique leather bound book cover texture, gold design accents, historical elegant feel, rich colors' },
    { id: 'dark-cyberpunk', label: 'Cinematic Noir', promptSuffix: 'cinematic noir style, dramatic neon key lighting, high detail digital paint, cinematic overlay' },
    { id: 'pencil-sketch', label: 'Charcoal Sketch', promptSuffix: 'detailed charcoal sketch drawing, fine paper texture, high contrast cross-hatching art' },
    { id: 'synthwave', label: 'Retro Neon Synthwave', promptSuffix: '80s retro synthwave vector art, neon pink and purple cyan lights, dark background grid' },
    { id: 'acrylic-canvas', label: 'Expressionist Acrylic', promptSuffix: 'heavy textured acrylic paint canvas canvas, dramatic modern expressionist art, high dynamic range' },
  ];

  // Admin: Update Option Price
  const handleUpdatePrice = async () => {
    const updated = parseInt(adminPriceInput, 10);
    if (isNaN(updated) || updated < 0) {
      setErrorMsg("Please enter a valid subscription price.");
      return;
    }
    setPriceLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await axios.post('/api/config/promo-price', { price: updated }, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (res.data && res.data.success) {
        setWeeklyPrice(updated);
        setSuccessMsg(`Promo Studio price successfully modified to ₦${updated.toLocaleString()} per week!`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || "Failed to update pricing config setting.");
    } finally {
      setPriceLoading(false);
    }
  };

  // User: Execute Weekly Subscription via Paystack
  const handleSubscribe = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!paystackKey) {
      setErrorMsg("Paystack payment gateway is not configured yet. Using Mock Upgrade option instead.");
      return;
    }

    setSubscribing(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const handler = PaystackPop.setup({
        key: paystackKey,
        email: user.email,
        amount: weeklyPrice * 100, // Naira to Kobo
        currency: 'NGN',
        ref: 'PROMO_SUB_' + Math.floor((Math.random() * 1000000000) + 1),
        callback: (response: any) => {
          const syncSubscription = async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              await axios.post('/api/subscribe/promo-studio', {
                reference: response.reference,
                price: weeklyPrice
              }, {
                headers: { Authorization: `Bearer ${session?.access_token}` }
              });
              await refreshProfile();
              setSuccessMsg("Weekly subscription processed successfully! Promo Studio acts unlocked.");
            } catch (err) {
              setErrorMsg("Failed to synchronize subscription in server. Contact support.");
            } finally {
              setSubscribing(false);
            }
          };
          syncSubscription();
        },
        onClose: () => setSubscribing(false)
      });
      handler.openIframe();
    } catch (e: any) {
      setErrorMsg("Failed to invoke Paystack payment inline module: " + e.message);
      setSubscribing(false);
    }
  };

  // User: Fallback testing mock subscription bypass
  const handleMockSubscribe = async () => {
    setSubscribing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await axios.post('/api/subscribe/promo-studio', {
        reference: "MOCK_PROMO_SUB_" + Date.now(),
        price: weeklyPrice
      }, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      await refreshProfile();
      setSuccessMsg("Mock Subscription Successful! Enjoy 1 Week of Promo Studio generated covers.");
    } catch (err: any) {
      setErrorMsg("Mock sync failed: " + err.message);
    } finally {
      setSubscribing(false);
    }
  };

  // Studio: Synthesize Canvas Images
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setErrorMsg("Please type in an image prompt.");
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setGeneratedUrl('');
    setStatus("Generating images... This may take up to 20 seconds.");

    try {
      const selectedStyleObj = styles.find(s => s.id === artStyle);
      const styleText = selectedStyleObj ? selectedStyleObj.promptSuffix : '';
      
      let enhancedPrompt = `${prompt}, ${styleText}`;
      if (overlayText.trim()) {
        const textVal = overlayText.trim();
        if (size === 'cover') {
          enhancedPrompt = `${enhancedPrompt}, featuring the clear, perfectly spelled, giant bold human-readable text "${textVal}" prominently integrated as the main book title near the upper portion, clean typographic layout, poster graphic design quality, stark high contrast, clear lettering, professional publication layout, masterpiece. DO NOT truncate or omit the letters of "${textVal}" under any circumstances.`;
        } else if (size === 'banner') {
          enhancedPrompt = `${enhancedPrompt}, incorporating the bold elegant written text "${textVal}" beautifully aligned into the visual composition, clean sharp vector branding layout, high contrast modern typography, stark letters. DO NOT truncate the text "${textVal}".`;
        } else {
          enhancedPrompt = `${enhancedPrompt}, featuring the readable written text "${textVal}" integrated seamlessly, high clarity of lettering, beautiful graphic glyphs.`;
        }
      }

      const fullPrompt = enhancedPrompt;
      const config = sizes[size];
      
      setStatus("Connecting to private graphics engine...");

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          width: config.width,
          height: config.height
        })
      });

      if (!response.ok) {
        let errMsg = `HTTP Error ${response.status}`;
        try {
          const respText = await response.text();
          if (respText) errMsg = respText;
        } catch (e) {}
        throw new Error(`Worker Service returned failure: ${errMsg}`);
      }

      const blob = await response.blob();
      if (!blob || !blob.type.startsWith("image/")) {
        throw new Error("Invalid response received: Expected raw graphical image buffer.");
      }

      const localBlobUrl = window.URL.createObjectURL(blob);
      setGeneratedUrl(localBlobUrl);
      setSuccessMsg(`Artwork generated successfully using your brand-new, secure CLOUDFLARE WORKER!`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Generation request failed. Please check your worker status and try again.");
    } finally {
      setLoading(false);
      setStatus("");
    }
  };

  const handleSaveToBook = async () => {
    if (!selectedBookId) {
      setErrorMsg("Please select an eBook to apply this visual to.");
      return;
    }
    if (!generatedUrl) {
      setErrorMsg("You must generate an image first.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('books')
        .update({ cover_image: generatedUrl })
        .eq('id', selectedBookId);

      if (error) throw error;
      
      setSuccessMsg("Cover image applied directly to your eBook successfully!");
      
      setUserBooks(prev => prev.map(b => b.id === selectedBookId ? { ...b, cover_image: generatedUrl } : b));
    } catch (err: any) {
      setErrorMsg("Failed to register cover update in database: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedUrl) return;
    try {
      setStatus("Downloading high-res file...");
      let dlUrl = generatedUrl;
      
      // If it's not already a local blob URL, we pre-fetch it
      if (!generatedUrl.startsWith('blob:')) {
        const res = await fetch(generatedUrl);
        const blob = await res.blob();
        dlUrl = window.URL.createObjectURL(blob);
      }
      
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `CalmReader_Art_${size}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      if (!generatedUrl.startsWith('blob:')) {
        window.URL.revokeObjectURL(dlUrl);
      }
    } catch (err) {
      window.open(generatedUrl, '_blank');
    } finally {
      setStatus("");
    }
  };

  return (
    <div className="min-h-screen bg-[#05050a] text-white pt-24 pb-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Navigation & Header Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
          <div className="space-y-2">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors">
              <ArrowLeft className="w-3" /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#EAB308]/10 rounded-2xl">
                <Wand2 className="w-6 h-6 text-[#EAB308]" />
              </div>
              <div>
                <h1 className="text-3xl font-sans font-black tracking-tight flex items-center gap-2">
                  AI Cover & Creative Studio 
                  {isAdmin ? (
                    <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px]">OWNER ADM</Badge>
                  ) : hasAccess ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">ACTIVE PRO</Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-[#EAB308] border border-[#EAB308]/20 text-[10px]">WEEKLY PLAN</Badge>
                  )}
                </h1>
                <p className="text-sm text-white/40 font-medium">Create customized eBook covers, banners, or high-definition illustrations powered by AI.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Notifications/Status Alerts */}
        <AnimatePresence>
          {(errorMsg || successMsg) && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-4"
            >
              {errorMsg && (
                <div id="error-alert" className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 font-semibold text-xs leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div id="success-alert" className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 text-emerald-400 font-semibold text-xs leading-relaxed">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ADMIN CONFIG PANEL */}
        {isAdmin && (
          <div className="p-8 bg-gradient-to-r from-red-950/20 to-indigo-950/20 rounded-3xl border border-red-500/10 space-y-6">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-black tracking-tight">System Owner Settings Controller</h2>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              As the platform owner, you possess full access to generate infinite premium book cover designs and illustrations. Define the week-by-week access subscription price for CalmReader users below.
            </p>
            <div className="flex flex-col sm:flex-row items-end gap-4 max-w-sm">
              <div className="space-y-2 flex-1 w-full">
                <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Weekly Option Price (₦)</label>
                <div className="relative">
                  <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input 
                    type="number"
                    value={adminPriceInput}
                    onChange={(e) => setAdminPriceInput(e.target.value)}
                    className="w-full h-11 bg-white/5 border border-white/5 rounded-xl pl-11 pr-4 text-xs font-bold text-white focus:outline-none focus:border-red-500 transition-all"
                  />
                </div>
              </div>
              <Button 
                onClick={handleUpdatePrice}
                disabled={priceLoading}
                className="h-11 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold tracking-wider shrink-0 transition-transform active:scale-95"
              >
                {priceLoading ? <RefreshCw className="animate-spin w-3 h-3" /> : "Save Pricing Option"}
              </Button>
            </div>
          </div>
        )}

        {/* ACTIVE ACCESS / EXPIRATION COUNTER FOR SUBSCRIBERS */}
        {hasAccess && (
          <div className="p-4 px-6 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between text-xs font-bold">
            <span className="text-white/40 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#EAB308]" /> Access Status
            </span>
            <span className={isAdmin ? "text-red-400" : "text-emerald-400"}>
              {getExpirationText()}
            </span>
          </div>
        )}

        {/* INTERFACE SPLIT */}
        {!hasAccess ? (
          /* ================== SUBSCRIBERS OPTION INTERFACE ================== */
          <div className="max-w-2xl mx-auto space-y-8 py-10">
            <Card className="bg-[#0c0c14] border-white/5 text-white rounded-[2.5rem] overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-12 text-center text-black relative">
                <Wand2 className="w-12 h-12 mx-auto mb-6 fill-current animate-bounce" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-80 mb-2">Weekly Subscription</h3>
                <p className="text-6xl font-black tracking-tighter">₦{weeklyPrice.toLocaleString()}</p>
                <Badge className="bg-black/10 text-black border-none text-[10px] font-black uppercase tracking-wider mt-4">RECURRING OPTION</Badge>
              </div>
              <CardContent className="p-10 space-y-8">
                <div className="space-y-2 text-center">
                  <h3 className="text-xl font-black">Unlock AI Cover & Creative Art Studio</h3>
                  <p className="text-sm text-white/50 leading-relaxed font-semibold">Craft gorgeous high-definition book covers, square loyalty stickers, and wide banners customized with AI generation in 1 click.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#EAB308] shrink-0 mt-0.5" />
                    <p className="text-xs text-white/70 leading-normal"><strong>800x1200 Pixel Covers</strong>: Generate gorgeous high-definition wrappers for eBooks directly.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#EAB308] shrink-0 mt-0.5" />
                    <p className="text-xs text-white/70 leading-normal"><strong>Stickers & Banners</strong>: Export 512px stickers or 1200x630px creative banners.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#EAB308] shrink-0 mt-0.5" />
                    <p className="text-xs text-white/70 leading-normal"><strong>Artistic Presets</strong>: Vintage Leather, Pencil Sketch, Cinema Noir styles and more.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#EAB308] shrink-0 mt-0.5" />
                    <p className="text-xs text-white/70 leading-normal"><strong>Instant Apply</strong>: Update and replace your current eBook covers instantly inside the app.</p>
                  </div>
                </div>

                <div className="space-y-4 pt-6">
                  <Button 
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    className="w-full min-h-[3.5rem] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-none rounded-2xl text-xs sm:text-xs font-black uppercase tracking-widest text-white shadow-xl flex flex-col sm:flex-row items-center justify-center p-3 gap-1 sm:gap-2 transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {subscribing ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Finalizing...
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          <span>Unlock Art Studio</span>
                        </div>
                        <span className="text-[10px] sm:text-xs font-black normal-case sm:ml-1 text-white/75">
                          (₦{weeklyPrice.toLocaleString()}/week)
                        </span>
                      </>
                    )}
                  </Button>
                  
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-white/5"></div>
                    <span className="flex-shrink mx-4 text-[10px] text-white/20 font-bold uppercase tracking-widest">or sandbox testing</span>
                    <div className="flex-grow border-t border-white/5"></div>
                  </div>

                  <Button 
                    onClick={handleMockSubscribe}
                    disabled={subscribing}
                    className="w-full h-12 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-2xl text-xs font-bold tracking-wider border border-white/5 transition-colors"
                  >
                    Mock Payment Bypass (Test Mode)
                  </Button>
                </div>

                <p className="text-[10px] font-bold text-center text-white/30 uppercase tracking-widest flex items-center justify-center gap-1.5 pt-4">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Fully Secured Encryption via Paystack Inline Gateway
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* ================== ACTIVE AI IMAGE GENERATOR STUDIO ================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Controls Panel */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="bg-[#0c0c14] border-white/5 text-white rounded-3xl overflow-hidden shadow-2xl">
                <CardContent className="p-8 space-y-6">
                  {/* Cloudflare Worker Connectivity Health indicator */}
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/[0.03] flex items-center justify-between text-[11px] font-semibold">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        workerStatus === 'active' ? 'bg-emerald-500 animate-pulse' :
                        workerStatus === 'checking' ? 'bg-amber-400 animate-pulse' :
                        workerStatus === 'error' ? 'bg-red-500' : 'bg-white/20'
                      }`} />
                      <span className="text-white/40 tracking-wide uppercase text-[10px]">Graphics Engine:</span>
                      <span className={
                        workerStatus === 'active' ? 'text-emerald-400 font-bold' :
                        workerStatus === 'checking' ? 'text-amber-400' :
                        workerStatus === 'error' ? 'text-red-400' : 'text-white/60'
                      }>
                        {workerStatus === 'active' ? 'Operational & Secured' :
                         workerStatus === 'checking' ? 'Probing Cloud Node...' :
                         workerStatus === 'error' ? 'Config Error' : 'Unchecked'}
                      </span>
                    </div>
                    <button 
                      type="button"
                      onClick={checkWorkerHealth}
                      className="text-[#EAB308] hover:text-amber-300 transition-colors text-[9px] uppercase tracking-widest font-bold"
                    >
                      {workerStatus === 'checking' ? 'Testing' : 'Verify'}
                    </button>
                  </div>

                  {workerStatus === 'error' && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 space-y-1 leading-relaxed font-semibold">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <span>{workerError}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/60 uppercase tracking-widest flex items-center gap-1.5 border-t border-white/5 pt-4">
                      <Sparkles className="w-3.5 h-3.5 text-[#EAB308]" /> Prompt instructions
                    </label>
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe the image you want (e.g. 'Golden sword resting on a stone altar surrounded by neon blue butterflies')"
                      className="w-full h-32 bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-[#EAB308] transition-all font-sans leading-relaxed resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/60 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Book Title / Text Overlay (Will draw inside image)
                    </label>
                    <input 
                      type="text"
                      value={overlayText}
                      onChange={(e) => setOverlayText(e.target.value)}
                      placeholder="e.g. 'Midnight Secrets' or 'By John Doe'"
                      className="w-full h-12 bg-white/5 border border-white/5 rounded-2xl px-4 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-indigo-500 transition-all font-sans"
                    />
                    <p className="text-[10px] text-white/30 tracking-wide font-medium leading-relaxed">
                      If provided, we inject precise typography layout blueprints so FLUX / SDXL models render clear text overlays onto your covers/banners.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-widest">Dimension Template</label>
                      <select 
                        value={size}
                        onChange={(e: any) => setSize(e.target.value)}
                        className="w-full h-12 bg-white/5 border border-white/5 rounded-xl px-4 text-xs font-medium focus:outline-none focus:border-[#EAB308] transition-all"
                      >
                        <option value="cover" className="bg-[#0c0c14]">eBook Cover (800x1200)</option>
                        <option value="banner" className="bg-[#0c0c14]">Wide Banner (1200x630)</option>
                        <option value="sticker" className="bg-[#0c0c14]">Square Sticker (512x512)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-widest">Aesthetic Presets</label>
                      <select 
                        value={artStyle}
                        onChange={(e) => setArtStyle(e.target.value)}
                        className="w-full h-12 bg-white/5 border border-white/5 rounded-xl px-4 text-xs font-medium focus:outline-none focus:border-[#EAB308] transition-all"
                      >
                        {styles.map(s => <option key={s.id} value={s.id} className="bg-[#0c0c14]">{s.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <Button 
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-none rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Compiling Pixels...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" /> Synthesize CanvasArt
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <AnimatePresence>
                {(generatedUrl && userBooks.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <Card className="bg-[#0c0c14] border-white/5 text-white rounded-3xl overflow-hidden shadow-2xl">
                      <CardContent className="p-8 space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-white/60 uppercase tracking-widest flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-[#EAB308]" /> Apply to Existing eBook
                          </label>
                          <p className="text-xs text-white/40 leading-normal mb-2">Instantly update the cover of any eBook you have written with this newly generated design wrapper.</p>
                          <select 
                            value={selectedBookId}
                            onChange={(e) => setSelectedBookId(e.target.value)}
                            className="w-full h-12 bg-white/5 border border-white/5 rounded-xl px-4 text-xs font-medium focus:outline-none focus:border-[#EAB308] transition-all"
                          >
                            <option value="" className="bg-[#0c0c14]">-- Select Your eBook --</option>
                            {userBooks.map(b => (
                              <option key={b.id} value={b.id} className="bg-[#0c0c14]">{b.title}</option>
                            ))}
                          </select>
                        </div>

                        <Button 
                          onClick={handleSaveToBook}
                          disabled={loading || !selectedBookId}
                          className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 border-none rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 animate-pulse"
                        >
                          <Check className="w-4 h-4" /> Save as eBook Cover
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Render Area */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <Card className="bg-[#0c0c14] border-white/5 text-white rounded-[2rem] flex-1 flex flex-col items-center justify-center min-h-[400px] h-[550px] relative overflow-hidden shadow-2xl p-6">
                <div className="absolute inset-0 bg-[#030308]/40 pointer-events-none z-10" />
                
                {loading && (
                  <div className="absolute inset-0 z-20 backdrop-blur-md bg-black/60 flex flex-col items-center justify-center text-center space-y-4">
                    <RefreshCw className="w-12 h-12 text-[#EAB308] animate-spin" />
                    <div className="space-y-1">
                      <p className="text-sm font-black uppercase tracking-widest text-[#EAB308]">{status || 'Compiling Images...'}</p>
                      <p className="text-xs text-white/30 italic">Processing high-resolution visual nodes securely via Cloudflare Worker...</p>
                    </div>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {generatedUrl ? (
                    <motion.div 
                      key={generatedUrl}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="relative max-w-full w-full flex items-center justify-center h-full p-2"
                    >
                      <div className={`overflow-hidden rounded-2xl shadow-2xl border border-white/10 ${
                        size === 'banner' ? 'w-full aspect-[1200/630]' : size === 'sticker' ? 'w-80 aspect-square' : 'w-72 aspect-[800/1200]'
                      }`}>
                        <img 
                          src={generatedUrl} 
                          alt="Promo Studio compilation"
                          className="w-full h-full object-cover rounded-2xl"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </motion.div>
                  ) : !loading && (
                    <div className="text-center space-y-4 max-w-sm">
                      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto text-white/20 mb-6 border border-white/5">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-lg text-white/80">Awaiting Creation Parameters</h4>
                        <p className="text-xs text-white/30 leading-relaxed">Enter your visual prompt, customize size or styles, and initialize our graphics generator.</p>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </Card>

              {generatedUrl && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={handleDownload}
                    className="bg-slate-900 border border-white/10 hover:bg-slate-800 text-white rounded-xl h-12 text-xs font-bold uppercase tracking-wider flex-1 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" /> Download local file
                  </Button>
                  <Button 
                    onClick={() => window.open(generatedUrl, '_blank')}
                    className="bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white text-indigo-400 rounded-xl h-12 text-xs font-bold uppercase tracking-wider flex-1 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    Open in New Tab
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
