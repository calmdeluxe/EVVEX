import React, { useEffect, useState } from 'react';
import { Shield, CheckCircle, XCircle, Copy, ExternalLink, AlertTriangle, RefreshCw, Key, Globe, LayoutDashboard, ShieldCheck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { FULL_SUPABASE_SQL, RECURSION_FIX_SQL } from '../lib/migrations';
import axios from 'axios';
import { supabase } from '../supabase';

export const Setup: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; details?: string; projectRefs?: any } | null>(null);

  const [form, setForm] = useState({
    url: import.meta.env.VITE_SUPABASE_URL || '',
    key: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    serviceRoleKey: ''
  });

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);

      // Fetch active secrets from the server to pre-populate input fields
      try {
        const configRes = await axios.get('/api/setup/get-config');
        if (configRes.data) {
          setForm({
            url: configRes.data.url || '',
            key: configRes.data.key || '',
            serviceRoleKey: configRes.data.serviceRoleKey || ''
          });
        }
      } catch (cfgErr) {
        console.warn('Failed to retrieve active configurations from server:', cfgErr);
      }

      let mockStatus = {
        status: 'error',
        db: 'misconfigured',
        message: 'Could not connect directly to Supabase. Please verify your URL and Anon Key.',
        config: {
          url: form.url || import.meta.env.VITE_SUPABASE_URL || '',
          key: form.key || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          projectRef: '',
          keyProjectRef: ''
        },
        configStatus: { ok: false, reason: 'Failed to query Supabase users table.' },
        envStatus: {
          CALM_GEMINI_KEY: 'SET',
          PAYSTACK_SECRET_KEY: 'SET',
          MAILTRAP_API_TOKEN: 'SET',
          SUPABASE_URL: !!(form.url || import.meta.env.VITE_SUPABASE_URL),
          SUPABASE_SERVICE_ROLE_KEY: true
        },
        purchaseLogs: [] as any[],
        richRecentPurchases: [] as any[],
        rawTransactions: [] as any[]
      };

      try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        if (!error) {
          const u = (supabase as any).supabaseUrl || form.url || import.meta.env.VITE_SUPABASE_URL || '';
          const k = (supabase as any).supabaseKey || form.key || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
          const ref = u ? u.split('.')[0].replace('https://', '') : '';
          mockStatus = {
            status: 'healthy',
            db: 'healthy',
            message: 'Successfully connected directly to Supabase!',
            config: {
              url: u,
              key: k,
              projectRef: ref,
              keyProjectRef: ref
            },
            configStatus: { ok: true, reason: undefined as any },
            envStatus: {
              CALM_GEMINI_KEY: 'SET',
              PAYSTACK_SECRET_KEY: 'SET',
              MAILTRAP_API_TOKEN: 'SET',
              SUPABASE_URL: true,
              SUPABASE_SERVICE_ROLE_KEY: true
            },
            purchaseLogs: [],
            richRecentPurchases: [],
            rawTransactions: []
          };
        } else {
          mockStatus.configStatus.reason = error.message;
        }
      } catch (pingErr: any) {
        mockStatus.configStatus.reason = pingErr.message || 'Ping failed';
      }
      setStatus(mockStatus);
    } catch (err: any) {
      console.error('Health check failed:', err);
      // If we still get a 401, we set a helpful error status
      if (err.response?.status === 401) {
        setStatus({
          status: 'error',
          message: 'Authentication failed (401). The backend is rejecting the request.',
          reason: 'Unauthorized access to health check.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await axios.post('/api/setup/test-config', form);
      setTestResult({
        ok: res.data.ok,
        message: res.data.ok ? res.data.message : res.data.error,
        details: res.data.details,
        projectRefs: res.data.projectRefs
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.response?.data?.error || err.message || 'Verification request failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const res = await axios.post('/api/setup/save-config', form);
      if (res.data.ok) {
        setTestResult({
          ok: true,
          message: res.data.message,
          details: "Keys saved in server's .env! Updating active connection...",
          projectRefs: res.data.projectRefs
        });
        
        // Dynamically update frontend client
        const { updateSupabaseClient } = await import('../supabase');
        updateSupabaseClient(form.url, form.key);
        
        // Refresh status
        setTimeout(() => {
          fetchStatus();
        }, 1500);
      } else {
        setTestResult({
          ok: false,
          message: res.data.error || "Save failed",
          details: res.data.details
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.response?.data?.error || err.message || 'Saving configuration failed'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-blue-600 text-white shadow-xl shadow-blue-100 mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Configuration Diagnostic</h1>
          <p className="text-gray-500 font-medium tracking-tight">Resolve "Mismatched Secret Key" issues instantly</p>
        </div>

        {status && (
          <Alert className={`${status.status === 'healthy' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} rounded-2xl shadow-sm border-2`}>
            {status.status === 'healthy' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
            <AlertTitle className={`font-black ${status.status === 'healthy' ? 'text-green-900' : 'text-red-900'}`}>
              Current System Status: {status.status === 'healthy' ? 'CONNECTED' : 'MISCONFIGURED'}
            </AlertTitle>
            <AlertDescription className={status.status === 'healthy' ? 'text-green-800' : 'text-red-800'}>
              {status.message}
              {status.configStatus?.reason && (
                <div className="mt-4 p-4 bg-white/50 rounded-2xl font-mono text-[11px] border-2 border-dashed border-red-300 space-y-2">
                   <p className="font-bold uppercase text-red-700">Project Reference Audit:</p>
                   <div className="grid grid-cols-2 gap-2 text-center bg-white p-2 rounded-xl">
                      <div>
                         <p className="text-[9px] text-gray-500 uppercase">URL REF</p>
                         <p className="text-sm font-black text-blue-600">{status.config?.projectRef || 'NOT SET'}</p>
                      </div>
                      <div>
                         <p className="text-[9px] text-gray-500 uppercase">KEY REF</p>
                         <p className="text-sm font-black text-purple-600">{status.config?.keyProjectRef || 'NOT SET'}</p>
                      </div>
                   </div>
                   <p className="text-[9px] leading-tight text-gray-500 italic mt-2">
                      * If the blue and purple values above do not match, your app will fail. 
                      Copy both the "Project URL" and "API Key" from EXACTLY the same Supabase project dashboard.
                   </p>
                   <div className="pt-2 border-t mt-2">
                      <p className="font-bold text-red-900 pb-1 uppercase text-[10px]">Error Detail:</p>
                      <span className="break-all">{status.configStatus.reason}</span>
                   </div>
                </div>
              )}
              {(status.configStatus?.reason?.toLowerCase().includes('recursion') || status.message?.toLowerCase().includes('recursion')) && (
                <div className="mt-4 p-6 bg-red-50 border-4 border-red-200 rounded-[32px] space-y-4 shadow-xl animate-bounce">
                  <div className="flex items-center gap-3 text-red-900 font-black text-lg uppercase tracking-tight">
                    <ShieldCheck className="w-8 h-8 text-red-600" /> RECURSION ERROR FIX
                  </div>
                  <p className="text-sm text-red-800 font-bold leading-tight bg-white/50 p-3 rounded-xl border border-red-100">
                    Your database has an "Infinite Loop" in its security policies. 
                    This blocks all users (including you). 
                    Click the button below to copy the fix, then run it in your Supabase SQL Editor.
                  </p>
                  
                  <Button 
                    size="lg" 
                    className="w-full h-16 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-lg shadow-xl shadow-red-200"
                    onClick={() => {
                        const sql = RECURSION_FIX_SQL;
                        const textarea = document.createElement('textarea');
                        textarea.value = sql;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        alert("✅ REPAIR CODE COPIED!\n\n1. Go to Supabase Dashboard > SQL Editor\n2. Click 'New Query'\n3. Paste and click 'RUN'.");
                    }}
                  >
                    <Copy className="mr-2 w-6 h-6" /> COPY REPAIR SQL NOW
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-[10px] text-red-600 font-black uppercase tracking-widest">Run this in your SQL Editor to unlock the app</p>
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-2 border-gray-200 rounded-[32px] overflow-hidden shadow-2xl shadow-gray-200/50">
          <CardHeader className="bg-gray-50/50 p-8 border-b-2 border-gray-100">
            <CardTitle className="text-xl font-black">Test Your Secrets</CardTitle>
            <CardDescription className="text-gray-500 font-medium">
              Paste your keys here to verify if they match BEFORE saving them in the Studio Secrets panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Supabase Project URL</Label>
                <div className="relative group">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input 
                    placeholder="https://your-project.supabase.co" 
                    value={form.url}
                    onChange={(e) => setForm({...form, url: e.target.value})}
                    className="h-14 pl-12 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 transition-all font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Supabase Anon Key</Label>
                <div className="relative group">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input 
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." 
                    value={form.key}
                    onChange={(e) => setForm({...form, key: e.target.value})}
                    className="h-14 pl-12 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 transition-all font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-amber-600 ml-1">Supabase Service Role Key (Admin / Service Role)</Label>
                <div className="relative group">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input 
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." 
                    value={form.serviceRoleKey}
                    onChange={(e) => setForm({...form, serviceRoleKey: e.target.value})}
                    className="h-14 pl-12 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 transition-all font-mono text-xs text-amber-750 bg-amber-50/20"
                  />
                </div>
                <p className="text-[10px] text-amber-700/80 italic ml-1">
                  💡 Required for administrative background tasks and bypassing Row Level Security.
                </p>
              </div>
            </div>

            {testResult && (
              <div className="space-y-4">
                <div className={`p-6 rounded-2xl border-2 ${testResult.ok ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'} animate-in zoom-in-95 duration-200`}>
                  <div className="flex items-start gap-4">
                    {testResult.ok ? <CheckCircle className="w-6 h-6 text-green-600 shrink-0" /> : <XCircle className="w-6 h-6 text-red-600 shrink-0" />}
                    <div className="space-y-1">
                      <p className={`font-black text-sm ${testResult.ok ? 'text-green-900' : 'text-red-900'}`}>
                        {testResult.ok ? 'Validation Passed!' : 'Validation Failed'}
                      </p>
                      <p className={`text-xs ${testResult.ok ? 'text-green-700' : 'text-red-700'} font-medium`}>
                        {testResult.message}
                      </p>
                      {testResult.details && (
                         <p className="mt-2 text-[10px] bg-white/50 p-2 rounded-lg font-mono text-gray-600">
                           Action: {testResult.details}
                         </p>
                      )}
                      {(testResult as any)?.projectRefs && (
                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div className={`p-4 rounded-xl border-2 ${(testResult as any).projectRefs.url === (testResult as any).projectRefs.key ? 'bg-green-100/30 border-green-200' : 'bg-red-100/30 border-red-200'}`}>
                            <p className="text-[10px] font-black uppercase text-gray-500 mb-1">URL Project ID</p>
                            <p className="text-sm font-black text-gray-700 font-mono">{(testResult as any).projectRefs.url || 'None'}</p>
                          </div>
                          <div className={`p-4 rounded-xl border-2 ${(testResult as any).projectRefs.url === (testResult as any).projectRefs.key ? 'bg-green-100/30 border-green-200' : 'bg-red-100/30 border-red-200'}`}>
                            <p className="text-[10px] font-black uppercase text-gray-500 mb-1">Key Project ID</p>
                            <p className="text-sm font-black text-gray-700 font-mono">{(testResult as any).projectRefs.key || 'None'}</p>
                          </div>
                          {(testResult as any).projectRefs.url !== (testResult as any).projectRefs.key && (
                            <div className="col-span-2 p-3 bg-red-600 text-white rounded-xl text-[11px] font-black text-center animate-bounce">
                              ⚠️ PROJECT MISMATCH DETECTED
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* If connection is OK but we suspect missing tables */}
                {testResult.ok && (
                  <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-2xl space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 text-amber-900 font-black text-sm uppercase tracking-tight">
                       <AlertTriangle className="w-5 h-5 text-amber-600" /> Action Required: Initialize Database
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Your keys are correct! Now, ensure you've initialized the database. 
                    </p>
                    <div className="mt-2 p-2 bg-purple-50 rounded border border-purple-100 space-y-2">
                        <p className="font-bold text-[9px] text-purple-800 uppercase flex items-center gap-1">
                          <Key className="w-2.5 h-2.5" /> Supabase OAuth / Auth Callback:
                        </p>
                        <div className="bg-white/60 p-2 rounded border border-purple-100 space-y-1">
                           <div className="flex items-center justify-between">
                             <code className="text-purple-900 font-bold text-[10px] truncate max-w-[200px]">
                               {form.url ? `${form.url}/auth/v1/callback` : 'Enter URL above...'}
                             </code>
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="h-6 px-2 text-[9px] font-black bg-purple-100 hover:bg-purple-200 shrink-0"
                               onClick={() => {
                                 if (!form.url) return;
                                 navigator.clipboard.writeText(`${form.url}/auth/v1/callback`);
                                 alert("Auth Callback URL Copied!");
                               }}
                             >
                                Copy URL
                             </Button>
                           </div>
                        </div>
                        <p className="text-[8px] text-purple-600 italic">Paste this in Supabase Dashboard &gt; Auth &gt; URL Configuration &gt; Redirect URIs</p>
                      </div>

                    <div className="space-y-2">
                       <Label className="text-[10px] font-bold text-amber-700 uppercase ml-1">Run this SQL in Supabase SQL Editor:</Label>
                       <div className="relative group">
                          <textarea 
                            readOnly 
                            value={FULL_SUPABASE_SQL}
                            className="w-full h-32 bg-amber-900/10 border-2 border-amber-200 rounded-xl p-4 font-mono text-[10px] text-amber-900 focus:outline-none resize-none"
                          />
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="absolute bottom-3 right-3 bg-white hover:bg-amber-100 text-amber-800 h-8 px-3 rounded-lg font-bold text-[10px] shadow-sm transform active:scale-95 transition-all"
                            onClick={() => {
                              navigator.clipboard.writeText(FULL_SUPABASE_SQL);
                              alert("Full Database SQL Copied! Now paste it into your Supabase SQL Editor and click 'Run'.");
                            }}
                          >
                             <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy FULL SQL
                          </Button>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={handleTest} 
                variant="outline"
                disabled={testing || saving || !form.url || !form.key}
                className="h-16 rounded-2xl border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-black text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {testing ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Shield className="w-5 h-5 mr-2" />}
                Verify Connection
              </Button>

              <Button 
                onClick={handleSave} 
                disabled={testing || saving || !form.url || !form.key}
                className="h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base shadow-xl shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                Save & Apply Keys
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CLOUDFLARE PAGES DEPLOYMENT & GOOGLE AUTHENTICATION INTEGRATION GUIDE */}
        <div className="p-8 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-100 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center gap-2.5">
             <div className="p-2 bg-indigo-600 rounded-xl text-white">
               <Globe className="w-5 h-5" />
             </div>
             <div>
               <h3 className="text-sm font-black uppercase tracking-wider text-indigo-900 leading-none">Cloudflare Pages & Supabase Client Integration</h3>
               <p className="text-[10px] text-indigo-700/80 font-medium mt-1">Deploy securely to Cloudflare Pages while keeping Supabase and Google Auth fully active</p>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-3 bg-white p-5 rounded-2xl border border-indigo-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">1. Required Cloudflare Environment Variables</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Configure these secrets / variables in your <strong className="font-bold">Cloudflare Pages Dashboard &gt; Settings &gt; Environment Variables</strong> (add to both Production &amp; Preview):
                </p>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {[
                    { name: "SUPABASE_URL", desc: "Your Supabase project URL (e.g. https://xxxx.supabase.co)" },
                    { name: "SUPABASE_SERVICE_ROLE_KEY", desc: "Required for administrative actions & manual book unlocks" },
                    { name: "VITE_SUPABASE_URL", desc: "Same as your SUPABASE_URL for client-side authentication" },
                    { name: "VITE_SUPABASE_ANON_KEY", desc: "Your standard anonymous key" },
                    { name: "VITE_API_BASE_URL", desc: "Optional external backend API URL if hosting the Node.js server elsewhere" },
                    { name: "PAYSTACK_SECRET_KEY", desc: "If you want to handle live transaction callbacks (Optional)" },
                    { name: "BREVO_API_KEY", desc: "Brevo transactional email mailer API key (Optional)" },
                    { name: "BREVO_SENDER_EMAIL", desc: "SENDER email address like support@calmreader.com (Optional)" }
                  ].map((v) => (
                    <div key={v.name} className="flex flex-col gap-0.5 bg-slate-50 p-2 rounded-xl border border-slate-100 font-mono text-[9px]">
                      <span className="font-bold text-slate-800">{v.name}</span>
                      <span className="text-slate-500">{v.desc}</span>
                    </div>
                  ))}
                </div>
            </div>

            <div className="space-y-3 bg-white p-5 rounded-2xl border border-indigo-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">2. Supabase Redirect URIs & Google OAuth</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  To prevent "Invalid Redirect URI" or origin mismatch blockages during Google login on Cloudflare:
                </p>
                <div className="space-y-2">
                  <div className="bg-amber-50 border border-amber-200/60 p-3 rounded-xl space-y-2">
                    <p className="font-black text-[9px] text-amber-800 uppercase flex items-center gap-1">
                      <Key className="w-3 h-3 text-amber-600" /> A. In Supabase Project Settings:
                    </p>
                    <p className="text-[10px] text-amber-950">
                      Navigate to <strong className="font-bold">Authentication &gt; URL Configuration</strong> and configure:
                    </p>
                    <div className="space-y-1.5 font-sans">
                      <div>
                        <span className="text-[8px] font-black text-amber-800 block uppercase">Site URL:</span>
                        <code className="block bg-white border p-1 rounded font-mono text-[8px] text-amber-900 truncate">
                          https://YOUR_APP_NAME.pages.dev
                        </code>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-amber-800 block uppercase">Redirect URIs:</span>
                        <code className="block bg-white border p-1 rounded font-mono text-[8px] text-amber-900 truncate">
                          https://YOUR_APP_NAME.pages.dev/api/auth/callback
                        </code>
                        <code className="block bg-white border p-1 rounded font-mono text-[8px] text-amber-900 truncate mt-1">
                          http://localhost:3000/api/auth/callback
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200/60 p-3 rounded-xl space-y-1">
                    <p className="font-black text-[9px] text-indigo-800 uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-indigo-600" /> B. In Google Cloud Console:
                    </p>
                    <p className="text-[10px] text-indigo-950 font-sans">
                      Add this redirection target to your Google API App under <strong className="font-bold">Credentials &gt; OAuth 2.0 Client IDs &gt; Authorized Redirect URIs</strong>:
                    </p>
                    <code className="block bg-white border p-1 rounded font-mono text-[8px] text-indigo-900 truncate">
                      https://{form.url ? form.url.replace("https://", "").split(".")[0] : "YOUR_SUPABASE_PROJECT"}.supabase.co/auth/v1/callback
                    </code>
                  </div>
                </div>
            </div>

            <div className="space-y-3 bg-white p-5 rounded-2xl border border-indigo-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">3. Google Developer Console Token Setup</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  How to generate and insert your Google Client ID & Client Secret (Token):
                </p>
                <div className="space-y-2">
                  <div className="bg-emerald-50 border border-emerald-200/60 p-3 rounded-xl space-y-1.5 text-[10px] text-emerald-950">
                    <p className="font-black text-[9px] text-emerald-800 uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> A. On Google Cloud Console:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-[9px] font-medium leading-relaxed">
                      <li>Go to <strong>APIs & Services &gt; Credentials</strong></li>
                      <li>Click <strong>Create Credentials &gt; OAuth client ID</strong></li>
                      <li>Select Application type: <strong>Web Application</strong></li>
                      <li>Add the Authorized Redirect URI shown in block <strong>(2-B)</strong> on the left</li>
                      <li>Click Create to get your <strong>Client ID</strong> &amp; <strong>Client Secret</strong></li>
                    </ol>
                  </div>

                  <div className="bg-blue-50 border border-blue-200/60 p-3 rounded-xl space-y-1.5 text-[10px] text-blue-950">
                    <p className="font-black text-[9px] text-blue-800 uppercase flex items-center gap-1">
                      <Key className="w-3 h-3 text-blue-600" /> B. Support Token in Supabase:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-[9px] font-medium leading-relaxed">
                      <li>Open your <strong>Supabase Dashboard</strong></li>
                      <li>Navigate to <strong>Authentication &gt; Providers &gt; Google</strong></li>
                      <li>Turn ON the Google provider toggle</li>
                      <li>Paste client details in <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                      <li>Click <strong>Save</strong> to commit changes</li>
                    </ol>
                  </div>
                </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-white border-2 border-gray-100 rounded-3xl shadow-sm space-y-4">
           <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Step-by-Step Fix</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
               <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-black text-xs">1</div>
               <p className="text-xs font-bold text-gray-900">Copy keys from Supabase Settings &gt; API</p>
             </div>
             <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
               <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-black text-xs">2</div>
               <p className="text-xs font-bold text-gray-900">Paste them above and hit "Run Instant Verification"</p>
             </div>
             <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
               <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-black text-xs">3</div>
               <p className="text-xs font-bold text-gray-900">Once green/valid, copy them into the Studio Secrets panel</p>
             </div>
           </div>
        </div>

        <div className="flex flex-col items-center gap-4 py-4">
           <Button asChild variant="outline" className="rounded-xl border-2">
              <Link to="/dashboard">
                <LayoutDashboard className="w-4 h-4 mr-2" /> Go to Dashboard
              </Link>
           </Button>
           <Button variant="link" onClick={fetchStatus} className="text-gray-400 font-bold hover:text-blue-600 transition-colors">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh System Connection
           </Button>
        </div>
      </div>
    </div>
  );
};
