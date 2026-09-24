import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import { canAccessAdmin, isPlatformAdminEmail } from '../lib/authorization';
import { 
  Users, 
  Search, 
  ChevronLeft, 
  RefreshCw, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  CheckSquare, 
  Square, 
  Sparkles, 
  UserX, 
  UserCheck, 
  AlertCircle,
  Eye
} from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const { isAdmin, isAuthReady, profile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'upgrade' | 'demote' | 'mpr' | 'bulk_upgrade' | 'bulk_demote' | 'bulk_suspend';
    targetUser?: any;
    targetTier?: string;
    inputText: string;
  }>({
    open: false,
    type: 'upgrade',
    inputText: '',
  });

  // Suspend Modal State
  const [suspendModal, setSuspendModal] = useState<{
    open: boolean;
    targetUser?: any;
    inputText: string;
  }>({
    open: false,
    inputText: '',
  });

  const isAuthorized = isAdmin || canAccessAdmin({ ...(profile || {}), is_admin: isAdmin });

  useEffect(() => {
    if (isAuthReady) {
      if (!isAuthorized) {
        navigate('/dashboard');
      } else {
        fetchUsers();
      }
    }
  }, [isAuthReady, isAuthorized, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let loadedUsers: any[] = [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        loadedUsers = data.map((u: any) => ({
          ...u,
          account_tier: u.app_role === 'admin' ? 'admin' : u.app_role === 'mpr' ? 'marketing_partner' : u.app_role === 'event_host' ? 'author' : u.is_vip ? 'premium' : 'free',
          is_admin: u.app_role === 'admin',
          is_premium: u.is_vip === true
        }));
      }

      setUsers(loadedUsers);
    } catch (err: any) {
      console.error("[AdminUsers] Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const isUserProtected = (u: any) => {
    const email = u.email?.toLowerCase();
    return u.is_admin || u.account_tier === 'admin' || isPlatformAdminEmail(email);
  };

  const filteredUsers = users.filter(u => {
    const term = search.toLowerCase();
    const matchSearch = u.email?.toLowerCase().includes(term) || u.full_name?.toLowerCase().includes(term);

    if (!matchSearch) return false;

    if (filterTier === 'all') return true;
    if (filterTier === 'free') return u.account_tier === 'free' || !u.account_tier;
    if (filterTier === 'premium') return u.account_tier === 'premium' || u.is_premium;
    if (filterTier === 'author') return u.account_tier === 'author' || u.is_approved_author;
    if (filterTier === 'marketing_partner') return u.account_tier === 'marketing_partner' || u.role === 'marketing_partner';
    if (filterTier === 'admin') return isUserProtected(u);
    if (filterTier === 'suspended') return u.is_suspended || u.status === 'suspended';

    return true;
  });

  const toggleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      // Don't select protected admin accounts for bulk operations
      const eligible = filteredUsers.filter(u => !isUserProtected(u)).map(u => u.id);
      setSelectedUserIds(eligible);
    }
  };

  const toggleSelectUser = (id: string, isProtected: boolean) => {
    if (isProtected) return;
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleOpenConfirmModal = (u: any, newTier: string) => {
    if (isUserProtected(u)) {
      alert("Admin accounts are read-only and protected from role changes.");
      return;
    }

    const type = newTier === 'free' ? 'demote' : newTier === 'marketing_partner' ? 'mpr' : 'upgrade';
    setConfirmModal({
      open: true,
      type,
      targetUser: u,
      targetTier: newTier,
      inputText: '',
    });
  };

  const handleExecuteTierChange = async () => {
    const { targetUser, targetTier, type } = confirmModal;
    if (!targetUser || !targetTier) return;

    if (confirmModal.inputText.trim().toLowerCase() !== 'confirm') {
      alert("Please type 'confirm' to execute this role change.");
      return;
    }

    try {
      const updates: any = {};
      let mappedRole = targetUser.app_role;
      if (targetTier === 'admin') {
        updates.app_role = 'admin';
        updates.is_vip = true;
        mappedRole = 'admin';
      } else if (targetTier === 'marketing_partner' || targetTier === 'mpr') {
        updates.app_role = 'mpr';
        mappedRole = 'mpr';
      } else if (targetTier === 'author' || targetTier === 'event_host') {
        updates.app_role = 'event_host';
        mappedRole = 'event_host';
      } else if (targetTier === 'premium') {
        updates.is_vip = true;
      } else {
        updates.app_role = 'guest';
        updates.is_vip = false;
        mappedRole = 'guest';
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', targetUser.id);

      if (error) throw error;

      // Log activity to admin_audit_log
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
          target_id: targetUser.id,
          metadata: { email: targetUser.email, previous_role: targetUser.app_role, new_role: mappedRole }
        });
      } catch (e) {}

      setConfirmModal({ open: false, type: 'upgrade', inputText: '' });
      fetchUsers();
    } catch (err: any) {
      alert("Failed to update user tier: " + err.message);
    }
  };

  const handleOpenSuspendModal = (u: any) => {
    if (isUserProtected(u)) {
      alert("Admin accounts are read-only and protected from suspension.");
      return;
    }
    setSuspendModal({
      open: true,
      targetUser: u,
      inputText: '',
    });
  };

  const handleExecuteSuspend = async () => {
    const { targetUser } = suspendModal;
    if (!targetUser) return;

    if (suspendModal.inputText.trim().toLowerCase() !== 'confirm') {
      alert("Please type 'confirm' to execute suspension change.");
      return;
    }

    const newStatus = !targetUser.is_suspended;

    try {
      // Log suspension action into admin_audit_log
      try {
        const { data: session } = await supabase.auth.getSession();
        const actor = session.session?.user;
        await supabase.from('admin_audit_log').insert({
          actor_id: actor?.id || null,
          actor_email: actor?.email || null,
          category: 'security',
          severity: 'audit',
          action: newStatus ? 'user_suspended' : 'user_unsuspended',
          target_type: 'profile',
          target_id: targetUser.id,
          metadata: { email: targetUser.email }
        });
      } catch (e) {}

      alert(`User ${targetUser.email} has been successfully updated.`);
      setSuspendModal({ open: false, inputText: '' });
      fetchUsers();
    } catch (err: any) {
      alert("Failed to update user suspension status: " + err.message);
    }
  };

  const handleBulkAction = async (actionType: 'upgrade' | 'demote' | 'suspend') => {
    if (selectedUserIds.length === 0) return;

    const actionText = actionType === 'upgrade' ? 'upgrade to VIP' : actionType === 'demote' ? 'demote to Guest' : 'suspend';
    
    if (actionType === 'suspend') {
      const input = prompt(`Type "confirm" to suspend ${selectedUserIds.length} selected user(s):`);
      if (input?.trim().toLowerCase() !== 'confirm') {
        alert("Action cancelled. You must type 'confirm' to execute bulk suspension.");
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to ${actionText} ${selectedUserIds.length} selected user(s)?`)) return;
    }

    try {
      let updates: any = {};
      if (actionType === 'upgrade') updates = { is_vip: true };
      else if (actionType === 'demote') updates = { app_role: 'guest', is_vip: false };

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .in('id', selectedUserIds);

        if (error) throw error;
      }

      // Log bulk action to admin_audit_log
      try {
        const { data: session } = await supabase.auth.getSession();
        const actor = session.session?.user;
        await supabase.from('admin_audit_log').insert({
          actor_id: actor?.id || null,
          actor_email: actor?.email || null,
          category: 'security',
          severity: 'audit',
          action: `bulk_${actionType}`,
          target_type: 'profile',
          metadata: { count: selectedUserIds.length, user_ids: selectedUserIds }
        });
      } catch (e) {}

      alert(`Bulk ${actionText} completed successfully for ${selectedUserIds.length} user(s).`);
      setSelectedUserIds([]);
      fetchUsers();
    } catch (err: any) {
      alert("Bulk action failed: " + err.message);
    }
  };

  if (!isAuthReady || !isAuthorized) return null;

  return (
    <AdminLayout>
      <div className="page-container space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
        <div className="flex items-center justify-between gap-4">
          <Button 
            onClick={() => navigate('/admin')}
            variant="ghost" 
            className="rounded-xl h-10 px-3 flex items-center gap-2 text-slate-500 hover:text-green-700 transition-all font-black"
          >
            <ChevronLeft className="w-5 h-5" /> Back to Admin
          </Button>

          <Button 
            onClick={fetchUsers}
            variant="outline"
            className="rounded-2xl h-11 px-4 font-bold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            User Directory Management
          </h1>
          <p className="text-gray-500 font-medium mt-1">Manage user accounts, bulk actions, and tier assignments.</p>
        </div>

        {/* Filters and Bulk Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
              <Input 
                placeholder="Search user name or email..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-11 rounded-xl border-slate-200 font-medium"
              />
            </div>

            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 font-bold w-full sm:w-48">
                <SelectValue placeholder="Filter Role/Tier" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="free">Free Users</SelectItem>
                <SelectItem value="premium">Premium Users</SelectItem>
                <SelectItem value="author">Authors</SelectItem>
                <SelectItem value="marketing_partner">Marketing Partners</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Action Buttons */}
          {isAdmin && selectedUserIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in">
              <span className="text-xs font-black text-slate-500 mr-2">
                {selectedUserIds.length} Selected
              </span>
              <Button 
                onClick={() => handleBulkAction('upgrade')}
                className="h-10 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Bulk Upgrade Premium
              </Button>
              <Button 
                onClick={() => handleBulkAction('demote')}
                variant="outline"
                className="h-10 px-4 border-slate-200 font-black text-xs rounded-xl flex items-center gap-1.5"
              >
                Bulk Demote Free
              </Button>
              <Button 
                onClick={() => handleBulkAction('suspend')}
                variant="outline"
                className="h-10 px-4 border-red-200 text-red-600 hover:bg-red-50 font-black text-xs rounded-xl flex items-center gap-1.5"
              >
                <UserX className="w-3.5 h-3.5" /> Bulk Suspend
              </Button>
            </div>
          )}
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="py-20 flex flex-col items-center text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-green-700" />
            <p className="font-bold text-xs uppercase tracking-widest">Loading Users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="p-16 text-center text-slate-400 italic border-dashed border-2 rounded-[32px]">
            No users match the selected criteria.
          </Card>
        ) : (
          <Card className="rounded-2xl sm:rounded-[32px] border-none shadow-sm overflow-hidden bg-white p-3 sm:p-6">
            <div className="overflow-x-auto w-full min-w-0">
              <table className="w-full text-left border-collapse responsive-table">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    {isAdmin && (
                      <th className="p-4 w-12">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={toggleSelectAll}
                          className="w-6 h-6 p-0"
                        >
                          {selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0 ? (
                            <CheckSquare className="w-5 h-5 text-green-700" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </Button>
                      </th>
                    )}
                    <th className="p-4">User</th>
                    <th className="p-4">Account Tier / Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Joined</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-700">
                  {filteredUsers.map((u) => {
                    const isProtected = isUserProtected(u);
                    const isSelected = selectedUserIds.includes(u.id);

                    return (
                      <tr 
                        key={u.id} 
                        className={`transition-colors ${
                          isProtected 
                            ? 'bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-amber-500' 
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {isAdmin && (
                          <td className="p-4">
                            {!isProtected ? (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => toggleSelectUser(u.id, isProtected)}
                                className="w-6 h-6 p-0"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-5 h-5 text-green-700" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-300" />
                                )}
                              </Button>
                            ) : (
                              <Lock className="w-4 h-4 text-amber-500" />
                            )}
                          </td>
                        )}

                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-900 flex items-center gap-2">
                              {u.full_name || u.email?.split('@')[0] || 'User'}
                              {isProtected && (
                                <Badge className="bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" /> Admin (Read-Only)
                                </Badge>
                              )}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{u.email}</span>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Badge className={
                              isProtected ? 'bg-amber-600 text-white' :
                              u.account_tier === 'marketing_partner' || u.role === 'marketing_partner' ? 'bg-purple-600 text-white' :
                              u.account_tier === 'premium' || u.is_premium ? 'bg-emerald-600 text-white' :
                              u.account_tier === 'author' || u.is_approved_author ? 'bg-blue-600 text-white' :
                              'bg-slate-200 text-slate-700'
                            }>
                              {(u.account_tier || u.role || 'free').toUpperCase()}
                            </Badge>
                          </div>
                        </td>

                        <td className="p-4">
                          {u.is_suspended ? (
                            <Badge variant="outline" className="border-red-300 text-red-600 bg-red-50">Suspended</Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">Active</Badge>
                          )}
                        </td>

                        <td className="p-4 text-xs text-slate-400 font-medium">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => navigate(`/admin/users/${u.id}`)}
                              variant="outline"
                              size="sm"
                              className="h-9 px-3 rounded-xl border-slate-200 text-xs font-bold hover:bg-slate-100 flex items-center gap-1 text-slate-700"
                            >
                              <Eye className="w-3.5 h-3.5" /> Dossier
                            </Button>

                            {isProtected ? (
                              <span className="text-xs font-black text-amber-700 italic">Protected</span>
                            ) : isAdmin ? (
                              <div className="flex items-center gap-2">
                                <Select onValueChange={(val: string) => handleOpenConfirmModal(u, val)}>
                                  <SelectTrigger className="h-9 rounded-xl border-slate-200 text-xs font-bold w-36">
                                    <SelectValue placeholder="Change Tier" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl">
                                    <SelectItem value="free">Free User</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                    <SelectItem value="author">Author</SelectItem>
                                    <SelectItem value="marketing_partner">Marketing Partner</SelectItem>
                                  </SelectContent>
                                </Select>

                                <Button 
                                  onClick={() => handleOpenSuspendModal(u)}
                                  variant="outline"
                                  size="sm"
                                  className={`h-9 px-3 rounded-xl text-xs font-bold border ${
                                    u.is_suspended 
                                      ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' 
                                      : 'border-red-200 text-red-600 hover:bg-red-50'
                                  }`}
                                >
                                  {u.is_suspended ? <UserCheck className="w-3.5 h-3.5 mr-1" /> : <UserX className="w-3.5 h-3.5 mr-1" />}
                                  {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Read-Only</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
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
                You are about to change the tier for user <span className="font-extrabold text-slate-900">{confirmModal.targetUser?.email}</span> to <span className="font-extrabold uppercase text-green-700">{confirmModal.targetTier}</span>.
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

        {/* Suspend Confirmation Modal */}
        <Dialog open={suspendModal.open} onOpenChange={(val) => setSuspendModal(prev => ({ ...prev, open: val }))}>
          <DialogContent className="rounded-[28px] max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-500" />
                {suspendModal.targetUser?.is_suspended ? 'Confirm Unsuspend User' : 'Confirm Suspend User'}
              </DialogTitle>
              <DialogDescription className="text-slate-600 font-medium pt-2">
                You are about to {suspendModal.targetUser?.is_suspended ? 'unsuspend' : 'suspend'} user <span className="font-extrabold text-slate-900">{suspendModal.targetUser?.email}</span> (Role: <span className="font-bold uppercase text-purple-700">{suspendModal.targetUser?.account_tier || suspendModal.targetUser?.role || 'free'}</span>).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-xs font-bold text-slate-500">
                To confirm this action, please type <span className="font-black text-slate-900 uppercase">confirm</span> in the box below:
              </p>
              <Input 
                placeholder="Type 'confirm'" 
                value={suspendModal.inputText}
                onChange={(e) => setSuspendModal(prev => ({ ...prev, inputText: e.target.value }))}
                className="h-12 rounded-xl border-slate-200 font-bold focus:ring-red-600"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => setSuspendModal(prev => ({ ...prev, open: false }))}
                className="rounded-xl font-bold h-11"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleExecuteSuspend}
                disabled={suspendModal.inputText.trim().toLowerCase() !== 'confirm'}
                className={`rounded-xl font-black h-11 text-white ${
                  suspendModal.targetUser?.is_suspended
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {suspendModal.targetUser?.is_suspended ? 'Confirm Unsuspend' : 'Confirm Suspend'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};
