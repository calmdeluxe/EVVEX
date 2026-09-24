import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ChevronLeft, 
  ShieldCheck, 
  UserCheck, 
  Database,
  Sparkles,
  Zap,
  Server,
  Clock,
  Ticket
} from 'lucide-react';
import axios from 'axios';

export const SystemHealth: React.FC = () => {
  const { isAdmin, isAuthReady, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Real Diagnostic Metrics
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [authLatency, setAuthLatency] = useState<number | null>(null);
  const [paystackStatus, setPaystackStatus] = useState<'healthy' | 'unconfigured' | 'error'>('healthy');
  const [tableCounts, setTableCounts] = useState<{ [table: string]: number | string }>({});
  const [gateLogs24h, setGateLogs24h] = useState<number>(0);
  const [rlsStatus, setRlsStatus] = useState<string>('Active');

  // Quick Upgrade Tool State
  const [upgradeEmail, setUpgradeEmail] = useState('');
  const [targetTier, setTargetTier] = useState<'admin' | 'mpr' | 'event_host' | 'patron' | 'guest'>('guest');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');

  const isMarketingPartner = profile?.app_role === 'mpr' || profile?.account_tier === 'marketing_partner';

  useEffect(() => {
    if (isAuthReady) {
      if (!isAdmin && !isMarketingPartner) {
        navigate('/dashboard');
      } else {
        checkSystemHealth();
      }
    }
  }, [isAuthReady, isAdmin, isMarketingPartner, navigate]);

  const checkSystemHealth = async () => {
    setLoading(true);
    try {
      // 1. Measure DB Latency
      const t0 = performance.now();
      const { error: dbErr } = await supabase.from('profiles').select('id').limit(1);
      const measuredDbLatency = Math.round(performance.now() - t0);
      setDbLatency(dbErr ? null : measuredDbLatency);

      // 2. Measure Auth Latency
      const t1 = performance.now();
      const { error: authErr } = await supabase.auth.getSession();
      const measuredAuthLatency = Math.round(performance.now() - t1);
      setAuthLatency(authErr ? null : measuredAuthLatency);

      // 3. Query Paystack endpoint status
      try {
        const paystackRes = await axios.get('/api/config/paystack-status').catch(() => null);
        if (paystackRes && paystackRes.status === 200) {
          setPaystackStatus('healthy');
        } else {
          // Check if env variable is set directly
          const hasPk = !!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
          setPaystackStatus(hasPk ? 'healthy' : 'unconfigured');
        }
      } catch (e) {
        setPaystackStatus('error');
      }

      // 4. Query live table counts directly
      const tablesToCheck = [
        'profiles',
        'events',
        'event_ticket_tiers',
        'event_tickets',
        'event_gate_logs',
        'event_payout_requests',
        'admin_announcements',
        'admin_audit_log',
        'payment_disputes',
        'platform_settings',
        'support_requests'
      ];

      const counts: { [table: string]: number | string } = {};
      await Promise.all(
        tablesToCheck.map(async (tbl) => {
          try {
            const { count, error } = await supabase.from(tbl).select('*', { count: 'exact', head: true });
            counts[tbl] = error ? 'Error' : (count ?? 0);
          } catch (e) {
            counts[tbl] = 'Error';
          }
        })
      );
      setTableCounts(counts);

      // 5. Query Gate logs in the last 24 hours
      try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count, error } = await supabase
          .from('event_gate_logs')
          .select('*', { count: 'exact', head: true })
          .gte('scan_timestamp', oneDayAgo);
        setGateLogs24h(error ? 0 : (count ?? 0));
      } catch (e) {
        setGateLogs24h(0);
      }

    } catch (err) {
      console.error('[SystemHealth] Health diagnostic failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeEmail.trim()) return;

    if (!isAdmin) {
      alert('Marketing Partners have read-only access to system role changes.');
      return;
    }

    setUpgradeLoading(true);
    setUpgradeMessage('');

    try {
      const email = upgradeEmail.trim().toLowerCase();
      
      const { data: userProfile, error: fetchErr } = await supabase
        .from('profiles')
        .select('id, app_role')
        .eq('email', email)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!userProfile) {
        setUpgradeMessage(`No profile found for email "${email}".`);
        return;
      }

      const updates: any = { app_role: targetTier };
      if (targetTier === 'admin') {
        updates.is_vip = true;
      }

      const { error: updateErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userProfile.id);

      if (updateErr) throw updateErr;

      // Log into admin_audit_log
      try {
        const { data: session } = await supabase.auth.getSession();
        const actor = session.session?.user;
        await supabase.from('admin_audit_log').insert({
          actor_id: actor?.id || null,
          actor_email: actor?.email || null,
          category: 'security',
          severity: 'audit',
          action: 'role_changed',
          target_type: 'profile',
          target_id: userProfile.id,
          metadata: { email, previous_role: userProfile.app_role, new_role: targetTier }
        });
      } catch (e) {}

      setUpgradeMessage(`Successfully updated ${email} to role "${targetTier.toUpperCase()}"!`);
      setUpgradeEmail('');
      checkSystemHealth();
    } catch (err: any) {
      setUpgradeMessage(`Error: ${err.message}`);
    } finally {
      setUpgradeLoading(false);
    }
  };

  if (!isAuthReady || (!isAdmin && !isMarketingPartner)) return null;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Button 
            onClick={() => navigate('/admin')}
            variant="ghost" 
            className="rounded-xl h-10 px-3 flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-all font-black"
          >
            <ChevronLeft className="w-5 h-5" /> Back to Admin
          </Button>

          <Button 
            onClick={checkSystemHealth}
            variant="outline"
            disabled={loading}
            className="rounded-2xl h-11 px-4 font-bold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Run Diagnostics
          </Button>
        </div>

        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            System Diagnostics & Health
            {isMarketingPartner && (
              <span className="text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-full uppercase tracking-wider">
                Marketing Partner
              </span>
            )}
          </h1>
          <p className="text-gray-500 font-medium mt-1">Live telemetry, database latency, and schema verification.</p>
        </div>

        {/* Latency & Connectivity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="rounded-[28px] border-slate-100 p-6 shadow-sm bg-white">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Database Latency</p>
                <p className="text-2xl font-black text-slate-900">
                  {dbLatency !== null ? `${dbLatency} ms` : 'Disconnected'}
                </p>
              </div>
              <div className={`p-3 rounded-2xl ${dbLatency !== null ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                <Database className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="rounded-[28px] border-slate-100 p-6 shadow-sm bg-white">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Auth Latency</p>
                <p className="text-2xl font-black text-slate-900">
                  {authLatency !== null ? `${authLatency} ms` : 'Offline'}
                </p>
              </div>
              <div className={`p-3 rounded-2xl ${authLatency !== null ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                <Zap className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="rounded-[28px] border-slate-100 p-6 shadow-sm bg-white">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paystack Gateway</p>
                <p className="text-lg font-black text-slate-900 capitalize">{paystackStatus}</p>
              </div>
              <div className={`p-3 rounded-2xl ${paystackStatus === 'healthy' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                <Server className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="rounded-[28px] border-slate-100 p-6 shadow-sm bg-white">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gate Scans (24h)</p>
                <p className="text-2xl font-black text-slate-900">{gateLogs24h}</p>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
                <Ticket className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Live Table Counts Grid */}
        <Card className="rounded-[32px] border-slate-100 p-8 shadow-sm bg-white">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              Live Table Row Counts (Supabase)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(tableCounts).map(([table, count]) => (
                <div key={table} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 font-mono truncate max-w-[150px]">{table}</p>
                    <p className="text-lg font-black text-slate-900 mt-1">{count}</p>
                  </div>
                  <Badge variant={count === 'Error' ? 'destructive' : 'secondary'} className="text-[10px] font-bold uppercase">
                    {count === 'Error' ? 'FAIL' : 'OK'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Direct Role Override Form */}
        <Card className="rounded-[32px] border-none shadow-md overflow-hidden bg-white p-8">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-indigo-600" />
              Direct Role Assignment Tool
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={handleQuickUpgrade} className="space-y-6">
              {upgradeMessage && (
                <div className={`p-4 rounded-2xl text-sm font-bold ${
                  upgradeMessage.includes('Successfully') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {upgradeMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">User Email Address</Label>
                  <Input 
                    placeholder="e.g., user@example.com" 
                    value={upgradeEmail}
                    onChange={(e) => setUpgradeEmail(e.target.value)}
                    className="h-12 rounded-2xl border-slate-200 focus:ring-indigo-600 font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">Target App Role</Label>
                  <Select value={targetTier} onValueChange={(val: any) => setTargetTier(val)}>
                    <SelectTrigger className="h-12 rounded-2xl border-slate-200 font-bold">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="guest">Guest</SelectItem>
                      <SelectItem value="patron">Patron</SelectItem>
                      <SelectItem value="event_host">Event Host</SelectItem>
                      <SelectItem value="mpr">MPR</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={upgradeLoading || !isAdmin}
                className="h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl shadow-lg flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                {upgradeLoading ? 'Applying Role...' : 'Assign App Role'}
              </Button>
              {!isAdmin && (
                <p className="text-xs text-amber-700 font-bold italic mt-2">
                  * Note: Marketing Partners view system health in read-only mode.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};
