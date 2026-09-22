import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { BookOpen, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // 1. Listen for Supabase Auth state changes (specifically PASSWORD_RECOVERY)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[ResetPassword] Auth event:', event);
      if (event === 'PASSWORD_RECOVERY' || session) {
        setIsRecoverySession(true);
        setVerifyingSession(false);
      }
    });

    // 2. Also check if the URL contains recovery tokens in the hash or active session
    const checkInitialSession = async () => {
      try {
        const hash = window.location.hash;
        const search = window.location.search;

        if (hash && (hash.includes('access_token') || hash.includes('type=recovery'))) {
          // Supabase recovery token in URL hash
          setIsRecoverySession(true);
          setVerifyingSession(false);
          return;
        }

        if (search && (search.includes('code=') || search.includes('type=recovery'))) {
          setIsRecoverySession(true);
          setVerifyingSession(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsRecoverySession(true);
        } else {
          // Give a short delay in case Supabase is parsing the hash asynchronously
          setTimeout(async () => {
            const { data: { session: delayedSession } } = await supabase.auth.getSession();
            if (delayedSession || window.location.hash.includes('access_token')) {
              setIsRecoverySession(true);
            }
            setVerifyingSession(false);
          }, 1200);
          return;
        }
      } catch (err) {
        console.error('[ResetPassword] Error checking session:', err);
      } finally {
        setVerifyingSession(false);
      }
    };

    checkInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { state: { message: 'Password updated successfully! Please log in with your new password.' } });
      }, 3000);
    } catch (err: any) {
      console.error('[ResetPassword] Error updating password:', err);
      let msg = err.message || 'Failed to update password. Please try again.';
      if (msg.toLowerCase().includes('same as')) {
        msg = 'New password cannot be the same as your old password.';
      } else if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('jwt')) {
        msg = 'Your password reset link has expired. Please request a new one.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (verifyingSession) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#030308] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium text-sm">Verifying security token...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#030308] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-90 transition-opacity">
          <BookOpen className="w-9 h-9 text-green-700 dark:text-yellow-400" />
          <span className="font-bold text-2xl tracking-tight text-gray-900 dark:text-white">CalmReader</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="border border-gray-200 dark:border-white/10 shadow-xl bg-white dark:bg-[#0d0d15] rounded-3xl overflow-hidden">
          <CardHeader className="space-y-2 text-center pb-4 pt-8 px-6 sm:px-8">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <KeyRound className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Reset Your Password
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Enter and confirm your new password below to secure your CalmReader account.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 sm:px-8 pb-8 pt-2">
            {success ? (
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Password Updated!</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Your password has been reset successfully. Redirecting you to the login page in 3 seconds...
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-bold h-12 rounded-xl"
                >
                  Proceed to Login <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-5">
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-2xl flex items-start gap-3 text-red-700 dark:text-red-300 text-xs sm:text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">{error}</p>
                      {error.includes('expired') && (
                        <Link to="/forgot-password" className="underline font-bold text-red-800 dark:text-red-200 block mt-1">
                          Click here to request a fresh reset link
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-11 rounded-xl border-gray-200 dark:border-white/10 dark:bg-black/30"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 h-11 rounded-xl border-gray-200 dark:border-white/10 dark:bg-black/30"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-700 hover:bg-green-800 text-white font-bold h-12 rounded-xl shadow-md gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Saving Password...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </div>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="text-xs font-semibold text-gray-500 hover:text-green-700 dark:hover:text-yellow-400 transition-colors"
                  >
                    Remember your password? Log in
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
