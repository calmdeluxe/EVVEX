import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  ShieldCheck, 
  ChevronLeft, 
  RefreshCw, 
  Activity, 
  Sparkles, 
  UserX, 
  UserCheck, 
  Clock, 
  Lock, 
  AlertCircle,
  BookOpen,
  DollarSign
} from 'lucide-react';

export const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, isAuthReady, profile } = useAuth();
  const navigate = useNavigate();

  const [userData, setUserData] = useState<any>(null);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [userPurchases, setUserPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    targetTier?: string;
    inputText: string;
  }>({
    open: false,
    inputText: '',
  });

  const isMarketingPartner = profile?.account_tier === 'marketing_partner' || profile?.role === 'marketing_partner';

  const ADMIN_EMAILS = [
    'samuelchukwuemeke05@gmail.com',
    'chukwuemekedaniella@gmail.com'
  ];

  useEffect(() => {
    if (isAuthReady) {
      if (!isAdmin && !isMarketingPartner) {
        navigate('/dashboard');
      } else if (id) {
        fetchUserProfile(id);
      }
    }
  }, [isAuthReady, isAdmin, isMarketingPartner, id, navigate]);

  const isUserProtected = (u: any) => {
    if (!u) return false;
    const email = u.email?.toLowerCase();
    return u.is_admin || u.account_tier === 'admin' || ADMIN_EMAILS.includes(email);
  };

  const fetchUserProfile = async (userId: string) => {
    setLoading(true);
    try {
      // 1. Fetch user profile
      let userObj: any = null;
      const { data: publicProfile } = await supabase
        .from('user_profiles_public')
        .select('*')
        .eq('id', userId)
        .single();

      if (publicProfile) {
        userObj = publicProfile;
      } else {
        const { data: mainUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        if (mainUser) userObj = mainUser;
      }

      setUserData(userObj);

      // 2. Fetch User Activity / Audit Log
      const { data: logs } = await supabase
        .from('admin_activity_log')
        .select('*')
        .or(`target_id.eq.${userId},admin_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50);

      setUserActivity(logs || []);

      // 3. Fetch Purchases
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setUserPurchases(purchasesData || []);

    } catch (err) {
      console.error("[UserProfile] Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfirmModal = (newTier: string) => {
    if (isUserProtected(userData)) {
      alert("Admin accounts are read-only and protected from role changes.");
      return;
    }

    setConfirmModal({
      open: true,
      targetTier: newTier,
      inputText: '',
    });
  };

  const handleExecuteTierChange = async () => {
    const { targetTier } = confirmModal;
    if (!userData || !targetTier) return;

    if (confirmModal.inputText.trim().toLowerCase() !== 'confirm') {
      alert("Please type 'confirm' to execute this role change.");
      return;
    }

    try {
      const updates: any = { account_tier: targetTier };
      if (targetTier === 'premium') updates.is_premium = true;
      if (targetTier === 'marketing_partner') updates.role = 'marketing_partner';

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userData.id);

      if (error) throw error;

      // Log activity
      try {
        await supabase.from('admin_activity_log').insert({
          action: `USER_TIER_CHANGED_TO_${targetTier.toUpperCase()}`,
          target_type: 'user',
          target_id: userData.id,
          details: { email: userData.email, new_tier: targetTier }
        });
      } catch (e) {}

      setConfirmModal({ open: false, inputText: '' });
      fetchUserProfile(userData.id);
    } catch (err: any) {
      alert("Failed to update user tier: " + err.message);
    }
  };

  const toggleSuspension = async () => {
    if (!userData || isUserProtected(userData)) return;
    const newStatus = !userData.is_suspended;
    const actionLabel = newStatus ? 'suspend' : 'unsuspend';

    if (!confirm(`Are you sure you want to ${actionLabel} ${userData.email}?`)) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_suspended: newStatus })
        .eq('id', userData.id);

      if (error) throw error;

      fetchUserProfile(userData.id);
    } catch (err: any) {
      alert("Failed to update suspension status: " + err.message);
    }
  };

  if (!isAuthReady || (!isAdmin && !isMarketingPartner)) return null;

  const isProtected = isUserProtected(userData);

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Button 
            onClick={() => navigate('/admin/users')}
            variant="ghost" 
            className="rounded-xl h-10 px-3 flex items-center gap-2 text-slate-500 hover:text-green-700 transition-all font-black"
          >
            <ChevronLeft className="w-5 h-5" /> Back to User Directory
          </Button>

          <Button 
            onClick={() => id && fetchUserProfile(id)}
            variant="outline"
            className="rounded-2xl h-11 px-4 font-bold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Dossier
          </Button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-green-700" />
            <p className="font-bold text-xs uppercase tracking-widest">Loading User Dossier...</p>
          </div>
        ) : !userData ? (
          <Card className="p-16 text-center text-slate-400 italic border-dashed border-2 rounded-[32px]">
            User record not found or accessible.
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Header Badge & Profile Banner */}
            <div className={`p-8 rounded-[32px] border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
              isProtected 
                ? 'bg-amber-500/10 border-amber-300' 
                : 'bg-white border-slate-100'
            }`}>
              <div className="flex items-center gap-5">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black ${
                  isProtected ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white'
                }`}>
                  {userData.full_name?.[0]?.toUpperCase() || userData.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                    {userData.full_name || userData.email?.split('@')[0] || 'User Profile'}
                    {isProtected && (
                      <Badge className="bg-amber-500 text-white font-black text-xs px-3 py-1 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" /> Admin (Read-Only)
                      </Badge>
                    )}
                  </h1>
                  <p className="text-slate-500 font-mono text-sm mt-1">{userData.email}</p>
                </div>
              </div>

              {/* Status and Action Controls */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={
                  isProtected ? 'bg-amber-600 text-white text-xs px-3 py-1' :
                  userData.account_tier === 'marketing_partner' || userData.role === 'marketing_partner' ? 'bg-purple-600 text-white text-xs px-3 py-1' :
                  userData.account_tier === 'premium' || userData.is_premium ? 'bg-emerald-600 text-white text-xs px-3 py-1' :
                  userData.account_tier === 'author' || userData.is_approved_author ? 'bg-blue-600 text-white text-xs px-3 py-1' :
                  'bg-slate-200 text-slate-700 text-xs px-3 py-1'
                }>
                  {(userData.account_tier || userData.role || 'free').toUpperCase()}
                </Badge>

                {userData.is_suspended ? (
                  <Badge variant="outline" className="border-red-300 text-red-600 bg-red-50 text-xs px-3 py-1">Suspended</Badge>
                ) : (
                  <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 text-xs px-3 py-1">Active Account</Badge>
                )}

                {isAdmin && !isProtected && (
                  <div className="flex items-center gap-2">
                    <Select onValueChange={(val: string) => handleOpenConfirmModal(val)}>
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-bold w-40 bg-white">
                        <SelectValue placeholder="Update Tier" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="free">Free User</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="author">Author</SelectItem>
                        <SelectItem value="marketing_partner">Marketing Partner</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button 
                      onClick={toggleSuspension}
                      variant="outline"
                      className={`h-10 px-4 rounded-xl text-xs font-bold border ${
                        userData.is_suspended 
                          ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' 
                          : 'border-red-200 text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {userData.is_suspended ? <UserCheck className="w-3.5 h-3.5 mr-1" /> : <UserX className="w-3.5 h-3.5 mr-1" />}
                      {userData.is_suspended ? 'Unsuspend' : 'Suspend'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* User Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="rounded-[28px] border-slate-100 p-6 shadow-sm bg-white">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-slate-100 rounded-2xl text-slate-700">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Full Name</p>
                    <p className="text-lg font-bold text-slate-900">{userData.full_name || 'N/A'}</p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[28px] border-slate-100 p-6 shadow-sm bg-white">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-blue-50 rounded-2xl text-blue-700">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Email Address</p>
                    <p className="text-sm font-mono font-bold text-slate-900 truncate">{userData.email || 'N/A'}</p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[28px] border-slate-100 p-6 shadow-sm bg-white">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-700">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Join Date</p>
                    <p className="text-lg font-bold text-slate-900">
                      {userData.created_at ? new Date(userData.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Activity History & Purchases Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* User Activity / Audit History */}
              <Card className="rounded-[32px] border-none shadow-sm bg-white p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-700" />
                    Activity & Audit History
                  </h2>
                  <Badge variant="outline" className="font-bold">{userActivity.length} Events</Badge>
                </div>

                {userActivity.length === 0 ? (
                  <p className="text-slate-400 text-sm italic py-8 text-center">No logged activity records for this user.</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {userActivity.map((act) => (
                      <div key={act.id} className="p-4 bg-slate-50 rounded-2xl flex flex-col gap-1 border border-slate-100">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-900 uppercase tracking-wider">{act.action}</span>
                          <span className="text-slate-400 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(act.created_at).toLocaleString()}
                          </span>
                        </div>
                        {act.details && (
                          <p className="text-xs text-slate-500 font-mono mt-1">
                            {JSON.stringify(act.details)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Purchase & Content History */}
              <Card className="rounded-[32px] border-none shadow-sm bg-white p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-700" />
                    Purchases & Library Unlocks
                  </h2>
                  <Badge variant="outline" className="font-bold">{userPurchases.length} Items</Badge>
                </div>

                {userPurchases.length === 0 ? (
                  <p className="text-slate-400 text-sm italic py-8 text-center">No purchases recorded for this user.</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {userPurchases.map((p) => (
                      <div key={p.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">Book ID: {p.book_id || 'N/A'}</p>
                          <p className="text-xs text-slate-400">
                            Purchased: {new Date(p.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className="bg-emerald-600 text-white font-bold">
                          ₦{(p.amount || 0).toLocaleString()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        <Dialog open={confirmModal.open} onOpenChange={(val) => setConfirmModal(prev => ({ ...prev, open: val }))}>
          <DialogContent className="rounded-[28px] max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-amber-500" />
                Confirm Role Change
              </DialogTitle>
              <DialogDescription className="text-slate-600 font-medium pt-2">
                You are about to change the tier for user <span className="font-extrabold text-slate-900">{userData?.email}</span> to <span className="font-extrabold uppercase text-green-700">{confirmModal.targetTier}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-xs font-bold text-slate-500">
                To confirm this change, please type <span className="font-black text-slate-900 uppercase">confirm</span> in the box below:
              </p>
              <Input 
                placeholder="Type 'confirm'" 
                value={confirmModal.inputText}
                onChange={(e) => setConfirmModal(prev => ({ ...prev, inputText: e.target.value }))}
                className="h-12 rounded-xl border-slate-200 font-bold focus:ring-green-700"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                className="rounded-xl font-bold h-11"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleExecuteTierChange}
                disabled={confirmModal.inputText.trim().toLowerCase() !== 'confirm'}
                className="rounded-xl font-black h-11 bg-green-700 hover:bg-green-800 text-white"
              >
                Confirm Role Change
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};
