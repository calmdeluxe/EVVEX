import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '../components/DashboardLayout';
import { ThemeToggle } from '../components/ThemeToggle';
import { 
  User, 
  Lock, 
  Trash2, 
  Save, 
  Coins, 
  AlertCircle, 
  CreditCard, 
  Smartphone, 
  Mail,
  CheckCircle2,
  ChevronRight,
  Shield,
  Eye
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export const Settings: React.FC = () => {
  const { user, profile, isAdmin, isAuthReady } = useAuth();
  const navigate = useNavigate();

  // Security Redirect
  useEffect(() => {
    if (isAuthReady && !user) {
      console.log('[Settings] Unauthenticated access. Redirecting to login.');
      navigate('/login');
    }
  }, [user, isAuthReady, navigate]);
  
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [contact, setContact] = useState(profile?.contact || '');
  const [bankName, setBankName] = useState(profile?.bank_name || '');
  const [accountNumber, setAccountNumber] = useState(profile?.account_number || '');
  const [accountName, setAccountName] = useState(profile?.account_name || '');
  
  const [bio, setBio] = useState(profile?.bio || '');
  const [socialLink, setSocialLink] = useState(profile?.social_link || '');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setContact(profile.contact || '');
      setBankName(profile.bank_name || '');
      setAccountNumber(profile.account_number || '');
      setAccountName(profile.account_name || '');
      setBio(profile.bio || '');
      setSocialLink(profile.social_link || '');
    }
  }, [profile]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          username: username,
          phone: contact
        })
        .eq('id', user.id);

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert('Failed to update profile. Please check your data and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.confirm('CRITICAL: This will permanently delete your account and ALL your books. This cannot be undone. Are you sure?');
    if (confirmation) {
      try {
        if (!user) return;
        await supabase.auth.signOut();
        localStorage.clear();
        navigate('/');
        alert('Your account deletion request has been received. You have been logged out.');
      } catch (err: any) {
        alert('Error during account deletion process.');
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Account Settings</h1>
            <p className="text-gray-500 mt-1">Manage your identity, payouts, and preferences.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild className="rounded-full border-2 font-bold text-xs h-10 px-6">
              <Link to="/security">
                <Shield className="w-4 h-4 mr-2" /> Security Settings
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Navigation & Summary */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="overflow-hidden border-none shadow-xl shadow-gray-100 bg-gradient-to-br from-green-700 to-green-900 text-white">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center text-2xl font-black">
                    {fullName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold leading-tight">{fullName || 'User'}</h2>
                    <p className="text-green-200 text-sm opacity-80">@{username || 'username'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm py-2 border-b border-white/10">
                    <span className="opacity-60">Status</span>
                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-none">
                      {isAdmin ? 'Administrator' : profile?.is_premium ? 'Premium' : 'Standard'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm py-2">
                    <span className="opacity-60">Email</span>
                    <span className="font-medium truncate max-w-[150px]">{user?.email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-gray-100">
              <CardContent className="p-2">
                <nav className="space-y-1">
                  <button className="w-full flex items-center justify-between p-4 rounded-xl bg-green-50 text-green-700 font-bold">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5" /> Profile & Payouts
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <Link to="/security" className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 text-gray-600 font-medium transition-colors">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5" /> Security & Password
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <Link to="/request" className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 text-gray-600 font-medium transition-colors">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5" /> Support Requests
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Right: Main Content */}
          <div className="lg:col-span-8 space-y-8">
            <form onSubmit={handleProfileUpdate}>
              <Card className="border-none shadow-xl shadow-gray-100 overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b p-8">
                  <CardTitle className="text-xl font-black flex items-center gap-3">
                    <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                      <User className="w-5 h-5" />
                    </div>
                    Personal Information
                  </CardTitle>
                  <CardDescription>Update your display name and contact details.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Display Name</Label>
                      <Input 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-12 border-2 focus:border-green-700 transition-all rounded-xl"
                        placeholder="e.g. Samuel Chukwuemeke"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-gray-400">WhatsApp / Phone</Label>
                    <Input 
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="h-12 border-2 focus:border-green-700 transition-all rounded-xl"
                      placeholder="+234..."
                    />
                  </div>

                  <div className="pt-6 mt-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white">App Theme Preference</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Switch between light and dark visual themes instantly.</p>
                    </div>
                    <ThemeToggle />
                  </div>

                  {(isAdmin || profile?.is_premium) && (
                    <div className="pt-8 mt-8 border-t border-gray-100 space-y-6">
                      <CardTitle className="text-xl font-black flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                          <Eye className="w-5 h-5" />
                        </div>
                        Author Identity (Sophisticated)
                      </CardTitle>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Author Biography</Label>
                          <Textarea 
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell your readers about your journey..."
                            className="min-h-[120px] border-2 focus:border-indigo-600 rounded-xl resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-gray-400">External Portfolio / Social Link</Label>
                          <Input 
                            value={socialLink}
                            onChange={(e) => setSocialLink(e.target.value)}
                            placeholder="https://instagram.com/yourname"
                            className="h-12 border-2 focus:border-indigo-600 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-8 mt-8 border-t border-gray-100">
                    <CardTitle className="text-xl font-black flex items-center gap-3 mb-6">
                      <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      Payout Account
                    </CardTitle>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Bank Name</Label>
                        <Input 
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="h-12 border-2 focus:border-green-700 transition-all rounded-xl"
                          placeholder="e.g. Access Bank"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Account Number</Label>
                          <Input 
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            className="h-12 border-2 focus:border-green-700 transition-all rounded-xl"
                            placeholder="10-digit number"
                            maxLength={10}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Account Name</Label>
                          <Input 
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            className="h-12 border-2 focus:border-green-700 transition-all rounded-xl"
                            placeholder="Full name as it appears on bank"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-gray-50 p-8 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {success && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-green-600 font-bold text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Changes saved
                      </motion.div>
                    )}
                  </div>
                  <Button type="submit" disabled={loading} className="h-12 px-8 bg-green-700 hover:bg-green-800 rounded-xl font-bold shadow-lg shadow-green-100">
                    {loading ? 'Saving Changes...' : 'Save All Changes'}
                  </Button>
                </CardFooter>
              </Card>
            </form>

            {!isAdmin && (
              <Card className="border-2 border-red-50 bg-red-50/20 overflow-hidden">
                <CardContent className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-lg font-bold text-red-900">Delete Account</h3>
                    <p className="text-sm text-red-700 opacity-80 mt-1">Permanently remove your account and all your books.</p>
                  </div>
                  <Button variant="destructive" onClick={handleDeleteAccount} className="h-11 px-6 font-bold rounded-xl">
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
