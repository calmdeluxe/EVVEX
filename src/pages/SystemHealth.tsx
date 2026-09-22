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
  Sparkles
} from 'lucide-react';

export const SystemHealth: React.FC = () => {
  const { isAdmin, isAuthReady, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [healthStatus, setHealthStatus] = useState<any>({
    supabaseConnected: false,
    usersTableOk: false,
    booksTableOk: false,
    purchasesTableOk: false,
    supportTableOk: false,
    announcementsTableOk: false,
    activityLogTableOk: false,
  });

  // Quick Upgrade Tool State
  const [upgradeEmail, setUpgradeEmail] = useState('');
  const [targetTier, setTargetTier] = useState('premium');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');

  const isMarketingPartner = profile?.account_tier === 'marketing_partner' || profile?.role === 'marketing_partner';

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
      const status: any = {};

      // 1. Supabase connection check
      const { data: usersCheck, error: usersErr } = await supabase.from('users').select('id').limit(1);
      status.supabaseConnected = !usersErr;
      status.usersTableOk = !usersErr;

      // 2. Books check
      const { error: booksErr } = await supabase.from('books').select('id').limit(1);
      status.booksTableOk = !booksErr;

      // 3. Purchases check
      const { error: purchasesErr } = await supabase.from('purchases').select('id').limit(1);
      status.purchasesTableOk = !purchasesErr;

      // 4. Support check
      const { error: supportErr } = await supabase.from('support_requests').select('id').limit(1);
      status.supportTableOk = !supportErr;

      // 5. Announcements check
      const { error: annErr } = await supabase.from('announcements').select('id').limit(1);
      status.announcementsTableOk = !annErr;

      // 6. Activity Log check
      const { error: logErr } = await supabase.from('admin_activity_log').select('id').limit(1);
      status.activityLogTableOk = !logErr;

      setHealthStatus(status);
    } catch (err) {
      console.error("[SystemHealth] Diagnostic failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeEmail.trim()) return;

    if (!isAdmin) {
      alert("Marketing Partners have read-only access to system tier upgrades.");
      return;
    }

    setUpgradeLoading(true);
    setUpgradeMessage('');

    try {
      const email = upgradeEmail.trim().toLowerCase();
      
      // Update in database
      const updates: any = { account_tier: targetTier };
      if (targetTier === 'premium') updates.is_premium = true;
      if (targetTier === 'author') updates.is_approved_author = true;
      if (targetTier === 'marketing_partner') updates.role = 'marketing_partner';

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('email', email)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        setUpgradeMessage(`No user found with email "${email}". Please verify.`);
      } else {
        setUpgradeMessage(`Successfully upgraded ${email} to ${targetTier.toUpperCase()}!`);
        setUpgradeEmail('');
      }
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
            className="rounded-xl h-10 px-3 flex items-center gap-2 text-slate-500 hover:text-green-700 transition-all font-black"
          >
            <ChevronLeft className="w-5 h-5" /> Back to Admin
          </Button>

          <Button 
            onClick={checkSystemHealth}
            variant="outline"
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
          <p className="text-gray-500 font-medium mt-1">Database integrity checks and direct tier overrides.</p>
        </div>

        {/* Database Health Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="rounded-[28px] border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Database Connection</p>
                <p className="text-lg font-black text-slate-900">Supabase Connection</p>
              </div>
              {healthStatus.supabaseConnected ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              )}
            </div>
          </Card>

          <Card className="rounded-[28px] border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Users Table</p>
                <p className="text-lg font-black text-slate-900">Schema Health</p>
              </div>
              {healthStatus.usersTableOk ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              )}
            </div>
          </Card>

          <Card className="rounded-[28px] border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Announcements Table</p>
                <p className="text-lg font-black text-slate-900">Broadcast Subsystem</p>
              </div>
              {healthStatus.announcementsTableOk ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              )}
            </div>
          </Card>
        </div>

        {/* Direct Tier Override Form */}
        <Card className="rounded-[32px] border-none shadow-md overflow-hidden bg-white p-8">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-green-700" />
              Direct User Tier Override Tool
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
                    placeholder="E.g., user@example.com" 
                    value={upgradeEmail}
                    onChange={(e) => setUpgradeEmail(e.target.value)}
                    className="h-12 rounded-2xl border-slate-200 focus:ring-green-700 font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">Target Account Tier</Label>
                  <Select value={targetTier} onValueChange={setTargetTier}>
                    <SelectTrigger className="h-12 rounded-2xl border-slate-200 font-bold">
                      <SelectValue placeholder="Select Tier" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="free">Free User</SelectItem>
                      <SelectItem value="premium">Premium User</SelectItem>
                      <SelectItem value="author">Author Account</SelectItem>
                      <SelectItem value="marketing_partner">Marketing Partner</SelectItem>
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
                {upgradeLoading ? 'Applying Upgrade...' : 'Apply Tier Override'}
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
