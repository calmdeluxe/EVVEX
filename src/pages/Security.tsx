import React, { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../AuthContext';
import { 
  ShieldCheck, 
  Smartphone, 
  Monitor, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Lock, 
  Key,
  ChevronRight,
  History,
  ShieldAlert
} from 'lucide-react';
import { supabase } from '../supabase';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export const Security: React.FC = () => {
  const { user } = useAuth();
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });
      if (error) throw error;
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setResending(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError('Failed to update password. Make sure it is at least 6 characters and properly formatted.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const sessions = [
    { id: 1, device: 'Chrome on MacOS', location: 'Lagos, Nigeria', active: true, lastUsed: 'Now' },
    { id: 2, device: 'Safari on iPhone', location: 'Abuja, Nigeria', active: false, lastUsed: '2 days ago' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Security & Privacy</h1>
            <p className="text-gray-500 mt-1">Protect your account and manage active sessions.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild className="rounded-full border-2 font-bold text-xs h-10 px-6">
              <Link to="/settings">
                <ChevronRight className="w-4 h-4 mr-2 rotate-180" /> Back to Profile
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Quick Actions */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-xl shadow-gray-100 bg-white overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-400">Security Score</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-4xl font-black text-green-700">85%</span>
                  <span className="text-sm font-bold text-gray-400 mb-1">Secure</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
                  <div className="h-full bg-green-600 rounded-full" style={{ width: '85%' }} />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-gray-600">Email Verified</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-gray-600">Strong Password</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm opacity-50">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span className="text-gray-600">2FA Not Enabled</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-gray-100 overflow-hidden">
              <CardContent className="p-2">
                <nav className="space-y-1">
                  <Link to="/settings" className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 text-gray-600 font-medium transition-colors">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5" /> Profile Settings
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <button className="w-full flex items-center justify-between p-4 rounded-xl bg-green-50 text-green-700 font-bold">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5" /> Security Center
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 text-gray-600 font-medium transition-colors">
                    <div className="flex items-center gap-3">
                      <History className="w-5 h-5" /> Login History
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Right: Security Forms */}
          <div className="lg:col-span-8 space-y-8">
            {/* Email Verification */}
            <Card className={`border-none shadow-xl shadow-gray-100 overflow-hidden ${user?.email_confirmed_at ? 'bg-green-50/30' : 'bg-amber-50/30'}`}>
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${user?.email_confirmed_at ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900">Email Verification</h3>
                      <p className="text-sm text-gray-500">
                        {user?.email_confirmed_at 
                          ? `Your email was verified on ${new Date(user.email_confirmed_at).toLocaleDateString()}`
                          : 'Verify your email to unlock all platform features.'}
                      </p>
                    </div>
                  </div>
                  {!user?.email_confirmed_at ? (
                    <Button 
                      variant="outline" 
                      className="rounded-xl border-2 font-bold h-11 px-6 border-amber-200 text-amber-700 hover:bg-amber-100"
                      onClick={handleResendVerification}
                      disabled={resending || resendSuccess}
                    >
                      {resending ? 'Sending...' : resendSuccess ? 'Sent!' : 'Resend Link'}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Verified
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Password Change */}
            <Card className="border-none shadow-xl shadow-gray-100 overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b p-8">
                <CardTitle className="text-xl font-black flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <Key className="w-5 h-5" />
                  </div>
                  Change Password
                </CardTitle>
                <CardDescription>Ensure your account is using a long, random password to stay secure.</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-gray-400">New Password</Label>
                    <Input 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-12 border-2 focus:border-green-700 transition-all rounded-xl"
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Confirm New Password</Label>
                    <Input 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 border-2 focus:border-green-700 transition-all rounded-xl"
                      placeholder="Repeat new password"
                    />
                  </div>
                  
                  {passwordError && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> {passwordError}
                    </div>
                  )}
                  
                  {passwordSuccess && (
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg text-xs font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Password updated successfully!
                    </div>
                  )}

                  <Button type="submit" disabled={passwordLoading} className="h-12 px-8 bg-gray-900 hover:bg-black text-white rounded-xl font-bold">
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* 2FA Placeholder */}
            <Card className="border-none shadow-xl shadow-gray-100 overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-black flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    Two-Factor Authentication
                  </CardTitle>
                  <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-none font-bold">Coming Soon</Badge>
                </div>
                <CardDescription className="mt-2">Add an extra layer of security to your account by requiring more than just a password to log in.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <div className="flex items-center justify-between p-6 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900">Authenticator App</p>
                    <p className="text-sm text-gray-500">Use an app like Google Authenticator or Authy.</p>
                  </div>
                  <Switch 
                    checked={tfaEnabled}
                    onCheckedChange={(checked) => {
                      if (checked) alert('2FA implementation is coming soon!');
                      setTfaEnabled(false);
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sessions */}
            <Card className="border-none shadow-xl shadow-gray-100 overflow-hidden">
              <CardHeader className="p-8 border-b bg-gray-50/50">
                <CardTitle className="text-xl font-black flex items-center gap-3">
                  <div className="p-2 bg-gray-200 text-gray-700 rounded-lg">
                    <Monitor className="w-5 h-5" />
                  </div>
                  Active Sessions
                </CardTitle>
                <CardDescription>Devices where you are currently logged in.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {sessions.map((session) => (
                    <div key={session.id} className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white shadow-sm border border-gray-100 rounded-xl text-gray-600">
                          {session.device.includes('iPhone') ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            {session.device}
                            {session.active && <Badge className="ml-3 bg-green-100 text-green-700 hover:bg-green-100 border-none">Current</Badge>}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{session.location} • Last used {session.lastUsed}</p>
                        </div>
                      </div>
                      {!session.active && (
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 font-bold rounded-lg">
                          <LogOut className="w-4 h-4 mr-2" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="p-8 bg-gray-50 border-t">
                <Button variant="outline" className="w-full h-12 rounded-xl border-2 font-bold text-red-600 border-red-100 hover:bg-red-50 hover:border-red-200">
                  Logout from all other devices
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
