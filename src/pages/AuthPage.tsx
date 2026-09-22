import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { getAppUrl } from '../lib/utils';
import { getValidRedirect, clearStoredRedirectIntent, isPlatformAdminEmail } from '../lib/authUtils';
import { sendVerificationEmail } from '../services/emailService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, BookOpen, CheckCircle2, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export const AuthPage: React.FC<{ mode: 'login' | 'signup' | 'forgot' }> = ({ mode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [verifyCode, setVerifyCode] = useState('');
  const [showVerifyInput, setShowVerifyInput] = useState(false);
  const [verifying, setVerifying] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    if (redirectParam) {
      localStorage.setItem('redirectAfterLogin', redirectParam);
    }
    
    if (location.state?.message) {
      setMessage(location.state.message);
    }
    const ref = params.get('ref') || localStorage.getItem('referralCode');
    if (ref) {
      setReferralCode(ref);
      localStorage.setItem('referralCode', ref); // Re-persist if it came from params
    }
    
    // Check if we just came back from a confirmation link or have a code
    const errorDescription = params.get('error_description');
    if (errorDescription) {
      setError(decodeURIComponent(errorDescription));
    }

    // Secure cross-window message listener for Google OAuth login success
    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      const isAllowedOrigin = 
        origin === window.location.origin ||
        origin.endsWith('.run.app') ||
        origin.endsWith('.onrender.com') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('calmreader.com');

      if (!isAllowedOrigin) {
        return;
      }

      if (event.data?.type === 'GOOGLE_AUTH_CALLBACK') {
        const { hash, search } = event.data;
        console.log('[GoogleAuth] Session tokens received in parent window context:', { hash, search });
        
        try {
          setLoading(true);
          setError('');
          
          let parsedHash = hash;
          if (!parsedHash && search) {
            parsedHash = search.replace('?', '#');
          }

          if (parsedHash) {
            const urlParams = new URLSearchParams(parsedHash.replace('#', '?'));
            const access_token = urlParams.get('access_token');
            const refresh_token = urlParams.get('refresh_token');

            if (access_token && refresh_token) {
              const { error: sessionErr } = await supabase.auth.setSession({
                access_token,
                refresh_token
              });

              if (sessionErr) throw sessionErr;

              setMessage('Google Sign-In Successful! Redirecting...');
              setTimeout(() => handlePostAuthRedirect(), 1200);
            } else {
              throw new Error('Required authentication tokens are missing in OAuth callback payload.');
            }
          } else {
            throw new Error('Empty redirect callback payload received.');
          }
        } catch (err: any) {
          console.error('[GoogleAuth] Error parsing credentials:', err);
          setError(err.message || 'Verification of Google session tokens failed.');
        } finally {
          setLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [location]);

  const [resending, setResending] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      if (error && error.message.includes('fetch')) throw error;
      setMessage('Connection to Supabase is active! Your network is working correctly.');
    } catch (err: any) {
      setError('Connection Failed: ' + (err.message || 'Could not reach Supabase.'));
    } finally {
      setTestingConnection(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: getAppUrl(),
        }
      });
      if (error) throw error;
      setMessage('Confirmation email resent! Please check your inbox and spam folder.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend confirmation email.');
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setVerifying(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: verifyCode,
        type: 'signup',
      });

      if (error) throw error;
      
      setMessage('Email verified successfully! You can now login.');
      setShowVerifyInput(false);
      // Wait a bit and redirect
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to verify code. Please check the code and try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Open a blank window synchronously to prevent pop-up blocker
    const authWindow = window.open('about:blank', '_blank');
    if (!authWindow) {
      setError('Popup blocked! Please allow popups for this site to log in with Google.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const redirectTo = `${window.location.origin}/api/auth/callback`;
      
      console.log(`[GoogleAuth] Initiating login, will redirect to callback: ${redirectTo}`);

      // In this environment, we must use skipBrowserRedirect to get the provider URL
      // and redirect our popup window directly to it to avoid iframe constraints.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true, 
          redirectTo,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline'
          }
        }
      });

      if (error) {
        authWindow.close();
        if (error.message.includes('provider is not enabled')) {
          throw new Error('Google Login is not yet enabled in the Supabase Dashboard. Please enable the Google Provider in Supabase -> Authentication -> Providers.');
        }
        if (error.message.includes('redirect_uri_mismatch') || error.message.includes('invalid_request')) {
          throw new Error('Google Login is currently restricted to authorized domains. If you are the administrator, please ensure this domain is added to your Google Cloud Console and Supabase authorized redirects.');
        }
        throw error;
      }

      if (data?.url) {
        console.log(`[GoogleAuth] Redirecting popup to: ${data.url}`);
        authWindow.location.href = data.url;
      } else {
        authWindow.close();
        throw new Error("Failed to generate Google Login URL.");
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      let message = err.message || 'Failed to sign in with Google';
      if (message.toLowerCase().includes('not allowed')) {
        message = 'Your Google account is not authorized for this application yet. This usually means you need to add your email to the "Test Users" in the Google Cloud Console authentication settings.';
      } else if (message.toLowerCase().includes('access denied')) {
        message = 'Access Denied: The login attempt was rejected. Please ensure you have enabled the Google Provider in Supabase and that your email is authorized.';
      }
      setError(message);
      setLoading(false);
    }
  };

  const handlePostAuthRedirect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      
      if (!currentUser) {
        clearStoredRedirectIntent();
        localStorage.removeItem('pendingPurchase');
        localStorage.removeItem('pendingPurchaseEbookId');
        navigate('/dashboard');
        return;
      }

      const currentUserEmail = currentUser.email?.toLowerCase();
      
      // 1. Fetch saved intents and clear them immediately to ensure they are unique and can't leak across different logins
      const searchParams = new URLSearchParams(window.location.search);
      const urlRedirect = searchParams.get('redirect');
      const emailSpecificRedirect = currentUserEmail ? localStorage.getItem(`redirectAfterLogin_${currentUserEmail}`) : null;
      const localRedirect = localStorage.getItem('redirectAfterLogin');
      const sessionRedirect = sessionStorage.getItem('redirectAfterLogin');
      const rawRedirectUrl = urlRedirect || emailSpecificRedirect || localRedirect || sessionRedirect;
      const pendingPurchaseID = localStorage.getItem('pendingPurchase');
      
      clearStoredRedirectIntent();
      localStorage.removeItem('pendingPurchase');
      localStorage.removeItem('pendingPurchaseEbookId');

      // Fetch user profile from Database to perform strict security checks
      const { data: profile } = await supabase
        .from('users')
        .select('account_tier, is_suspended, is_admin, is_premium')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profile?.is_suspended) {
        clearStoredRedirectIntent();
        await supabase.auth.signOut();
        setError('Account Suspended: Please contact support.');
        navigate('/login');
        return;
      }

      const userSummary = {
        email: currentUser.email,
        account_tier: profile?.account_tier || 'free',
        is_admin: profile?.is_admin || false,
        is_premium: profile?.is_premium || false
      };

      const validatedRedirect = getValidRedirect(userSummary, rawRedirectUrl);

      if (validatedRedirect && validatedRedirect !== '/dashboard') {
        navigate(validatedRedirect);
        return;
      }

      // 2. Fallback to simple pending purchase ID
      if (pendingPurchaseID) {
        navigate(`/payment?id=${pendingPurchaseID}`);
        return;
      }

    } catch (err) {
      console.error("[AuthPage] Failed to verify status for secure redirect:", err);
    }

    // Default
    navigate('/dashboard');
  };

  React.useEffect(() => {
    const handlePopupMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      const isAllowedOrigin = 
        origin === window.location.origin ||
        origin.endsWith('.run.app') ||
        origin.endsWith('.onrender.com') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('calmreader.com');

      if (!isAllowedOrigin) {
        return;
      }

      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
        const { accessToken, refreshToken } = event.data;
        if (accessToken && refreshToken) {
          try {
            setLoading(true);
            setError('');
            const { error: setSessionErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            if (setSessionErr) throw setSessionErr;
            
            console.log("[GoogleAuth] Successfully synchronized oauth session");
            handlePostAuthRedirect();
          } catch (err: any) {
            console.error("[GoogleAuth] Session sync error:", err);
            setError(err.message || 'Failed to complete Google Login synchronization.');
          } finally {
            setLoading(false);
          }
        }
      }
    };

    window.addEventListener('message', handlePopupMessage);
    return () => window.removeEventListener('message', handlePopupMessage);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      // Bind any saved redirect to the specific email being authenticated to ensure uniqueness
      const redirectParam = localStorage.getItem('redirectAfterLogin');
      if (redirectParam && email) {
        localStorage.setItem(`redirectAfterLogin_${email.trim().toLowerCase()}`, redirectParam);
      }
      
      // Supabase connection is handled in src/supabase.ts with fallbacks
      
      if (mode === 'login') {
        const authResult = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (authResult.error) {
          if (authResult.error.message?.toLowerCase().includes('failed to fetch') || authResult.error.message?.toLowerCase().includes('networkerror')) {
            console.warn("[AuthPage] Direct Supabase login failed with network error, attempting server fallback...");
            try {
              const serverRes = await axios.post('/api/auth/login', { email, password });
              if (serverRes.data?.session) {
                await supabase.auth.setSession(serverRes.data.session);
                handlePostAuthRedirect();
                return;
              }
            } catch (serverErr: any) {
              const serverMsg = serverErr.response?.data?.error || serverErr.message;
              throw new Error(serverMsg);
            }
          }
          throw authResult.error;
        }
        
        handlePostAuthRedirect();
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (username.length < 3) {
          throw new Error('Username must be at least 3 characters');
        }

        // 1. Age Verification (Date of Birth)
        if (!dateOfBirth) {
          throw new Error('Date of Birth is required.');
        }
        const dob = new Date(dateOfBirth);
        if (isNaN(dob.getTime())) {
          throw new Error('Invalid Date of Birth.');
        }
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        if (age < 18) {
          throw new Error('You must be at least 18 years old to register.');
        }

        // 2. Phone Number Uniqueness
        const cleanPhone = phoneNumber.trim();
        if (!cleanPhone) {
          throw new Error('Phone number is required.');
        }

        const { data: existingPhoneUser } = await supabase
          .from('users')
          .select('id')
          .or(`contact.eq.${cleanPhone},phone.eq.${cleanPhone}`)
          .maybeSingle();

        if (existingPhoneUser) {
          throw new Error('This phone number is already registered to another account.');
        }

        // 3. Terms & Conditions Checkbox
        if (!agreedToTerms) {
          throw new Error('You must agree to the Terms & Conditions and Privacy Policy to register.');
        }

        // Try signing in first - if it works, the user already exists
        // This bypasses the email rate limit check of the signUp method
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!signInError && signInData.user) {
          // User exists! Check if profile exists, if not create it
          let { data: existingProfile, error: profileCheckError } = await supabase
            .from('users')
            .select('id')
            .eq('id', signInData.user.id)
            .maybeSingle();
            
          // If UUID lookup failed due to type mismatch, try email lookup
          if (profileCheckError && profileCheckError.message.includes('invalid input syntax for type integer')) {
            const { data: emailProfile } = await supabase
              .from('users')
              .select('id')
              .eq('email', signInData.user.email)
              .maybeSingle();
            existingProfile = emailProfile;
          }

          if (!existingProfile) {
            const profileData = {
              email: signInData.user.email,
              username,
              full_name: fullName,
              contact: cleanPhone,
              phone: cleanPhone,
              date_of_birth: dateOfBirth,
              is_admin: false,
              account_tier: 'free',
              is_premium: false,
              registration_paid: false,
              is_suspended: false,
            };

            // Try inserting with id (assuming it's a UUID)
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: signInData.user.id,
                ...profileData
              });

            // If that fails due to type mismatch, try without ID
            if (insertError && insertError.message.includes('invalid input syntax for type integer')) {
              await supabase.from('users').insert(profileData);
            }
          }

          // Record user agreement
          try {
            await supabase.from('user_agreements').insert({
              user_id: signInData.user.id,
              agreed_at: new Date().toISOString(),
              user_agent: window.navigator.userAgent,
            });
          } catch (agreedErr) {
            console.warn('Agreement insertion skipped:', agreedErr);
          }
          
          handlePostAuthRedirect();
          return;
        }

        // If sign in failed with anything other than "Invalid login credentials", 
        // it might be a real error (like rate limit), but we should try signUp anyway
        // unless it's a known blocking error.

        let signUpResult = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getAppUrl(),
            data: {
              full_name: fullName,
              username: username,
            }
          }
        });

        if (signUpResult.error && (signUpResult.error.message?.toLowerCase().includes('failed to fetch') || signUpResult.error.message?.toLowerCase().includes('networkerror'))) {
          console.warn("[AuthPage] Direct Supabase signup failed with network error, attempting server fallback...");
          try {
            const serverRes = await axios.post('/api/auth/signup', {
              email,
              password,
              fullName,
              username,
              phoneNumber: cleanPhone,
              dateOfBirth
            });
            if (serverRes.data?.session) {
              await supabase.auth.setSession(serverRes.data.session);
              handlePostAuthRedirect();
              return;
            }
            if (serverRes.data?.user && !serverRes.data?.session) {
              setMessage('Signup successful! A confirmation email has been sent. Please check your inbox and confirm your address to continue.');
              setLoading(false);
              return;
            }
          } catch (serverErr: any) {
            const serverMsg = serverErr.response?.data?.error || serverErr.message;
            throw new Error(serverMsg);
          }
        }

        const data = signUpResult.data;
        const authError = signUpResult.error;

        // Supabase sometimes doesn't return an error even if user exists (for security)
        // Check if user object is returned but no session - this usually means unconfirmed
        if (!authError && data.user && !data.session) {
          setMessage('Signup successful! A confirmation email has been sent. Please check your inbox and confirm your address to continue.');
          setLoading(false);
          return;
        }

        if (authError) {
          if (authError.message.includes('User already registered') || authError.message.includes('already exists')) {
            throw new Error('This email is already registered. If you forgot your password, please use the "Forgot Password" link below. If you haven\'t confirmed your email, try to Login to see resend options.');
          }
          throw authError;
        }
        
        if (!data.user) throw new Error('Signup failed');

        // Create user profile
        const profileData = {
          email: data.user.email,
          username,
          full_name: fullName,
          contact: cleanPhone,
          phone: cleanPhone,
          date_of_birth: dateOfBirth,
          is_admin: false,
          account_tier: 'free',
          is_premium: false,
          registration_paid: false,
          is_suspended: false,
        };

        // Try inserting with id (assuming it's a UUID)
        let { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            ...profileData
          });

        if (profileError && profileError.message.includes('invalid input syntax for type integer')) {
          console.warn('ID type mismatch detected (UUID vs Integer). Retrying without ID...');
          // Try inserting without the ID, letting the database generate one
          const { error: secondAttemptError } = await supabase
            .from('users')
            .insert(profileData);
          profileError = secondAttemptError;
        }

        if (profileError) {
          console.error('Final profile creation attempt failed:', profileError);
          throw profileError;
        }

        // Record user agreement in user_agreements table
        try {
          await supabase.from('user_agreements').insert({
            user_id: data.user.id,
            agreed_at: new Date().toISOString(),
            user_agent: window.navigator.userAgent,
          });
        } catch (agreedErr) {
          console.warn('user_agreements record skipped:', agreedErr);
        }

        // Send Welcome Email via Mailtrap (Optional)
        try {
          await sendVerificationEmail(data.user.email!);
        } catch (e) {
          console.warn('Mailtrap welcome email skipped (likely not configured):', e);
        }

        // Record referral if code exists
        if (referralCode) {
          try {
            await axios.post('/api/referral/record', { referrer_id: referralCode, referred_id: data.user.id });

            // Immediately grant reward for the test (or based on business logic)
            await axios.post('/api/referral/grant-reward', { referred_user_id: data.user.id });
            console.log('[Auth] Referral recorded and reward granted.');
          } catch (err) {
            console.error('Failed to process referral:', err);
          }
        }

        handlePostAuthRedirect();
      } else if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${getAppUrl()}/reset-password`,
        });
        if (resetError) throw resetError;
        setMessage('Password reset link sent to your email.');
      }
    } catch (err: any) {
      console.error('Auth Error Details:', err);
      let errorMessage = err.message || 'An error occurred';
      const lowercaseError = errorMessage.toLowerCase();

      if (errorMessage.includes('Invalid API key') || errorMessage.includes('401')) {
        errorMessage = 'Invalid Supabase API Key. Please ensure you have copied the "anon public" key from Supabase Project Settings > API.';
      } else if (lowercaseError.includes('security purposes')) {
        errorMessage = 'Too many attempts. Please wait about 30 seconds before clicking Sign Up again for your security.';
        setLoading(true);
        setTimeout(() => setLoading(false), 5000);
        setError(errorMessage);
        return;
      } else if (lowercaseError.includes('email rate limit exceeded')) {
        errorMessage = 'Signup Limit Reached: Supabase only allows a few signups per hour for security. If you already have an account, please try to "Login" instead. If you are new, please wait a few minutes.';
      } else if (lowercaseError.includes('invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please double-check your credentials and try again.';
      } else if (lowercaseError.includes('failed to fetch')) {
        errorMessage = 'Network Error: Failed to connect to Supabase. This can happen if your internet is unstable or Supabase is temporarily unreachable.';
      } else if (lowercaseError.includes('email not confirmed') || errorMessage.includes('Email not confirmed')) {
        errorMessage = 'Email Verification Required: Please check your inbox (and spam folder) for the confirmation link. You must verify your email before you can log in.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'login' ? 'Login' : mode === 'signup' ? 'Sign Up' : 'Forgot Password';
  const description = mode === 'login' 
    ? 'Enter your credentials to access your bookshelf' 
    : mode === 'signup' 
    ? 'Create an account to start building your card books' 
    : 'Enter your email to receive a reset link';

  const showGoogleButton = true;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#030308] text-white p-4 py-12 font-sans relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#EAB308]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="mb-8 z-10 font-sans">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs text-white/70 hover:text-black font-black uppercase tracking-widest bg-white/5 hover:bg-[#EAB308] rounded-full border border-white/10 hover:border-[#EAB308] transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:shadow-[0_10px_20px_rgba(234,179,8,0.25)] hover:scale-105"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      <Link to="/" className="flex items-center gap-3 mb-10 z-10 hover:opacity-90 transition-opacity">
        <div className="bg-[#EAB308] p-2.5 rounded-2xl shadow-lg shadow-[#EAB308]/20">
          <BookOpen className="w-7 h-7 text-black" />
        </div>
        <h1 className="text-3xl font-black font-sans tracking-tighter text-white">CalmReader</h1>
      </Link>

      <Card className="w-full max-w-md bg-[#0c0c14] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-3xl z-10 overflow-hidden">
        <CardHeader className="border-b border-white/5 pb-6">
          <CardTitle className="text-2xl font-black tracking-tight text-white">{title}</CardTitle>
          <CardDescription className="text-white/45 text-sm font-medium mt-1">
            {description}
            {mode === 'signup' && (
              <span className="block mt-2 text-[10px] text-[#EAB308] font-bold uppercase tracking-wider">
                Note: Limits apply to 3 signups per hour per IP.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
            {showVerifyInput ? (
              <form onSubmit={handleVerifyOtp} className="space-y-4 font-sans">
                <div className="space-y-2">
                  <Label htmlFor="vEmail" className="text-white/50 text-xs font-bold uppercase tracking-wider block mb-1">Your Email</Label>
                  <Input
                    id="vEmail"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#EAB308]/50 focus-visible:border-[#EAB308]/50 text-sm rounded-xl py-5 h-11 pointer-events-auto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="verifyCode" className="text-white/50 text-xs font-bold uppercase tracking-wider block mb-1">6-Digit Verification Code</Label>
                  <Input
                    id="verifyCode"
                    required
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="123456"
                    className="text-center text-2xl font-extrabold tracking-widest bg-white/5 border-white/10 text-[#EAB308] placeholder:text-[#EAB308]/20 rounded-xl py-5 h-11"
                  />
                  <p className="text-[10px] text-white/40 font-medium font-sans">
                    Please key in the 6-digit confirmation code code received in your email.
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-[#EAB308] hover:bg-[#EAB308]/90 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-md mt-6"
                  disabled={verifying}
                >
                  {verifying ? 'Verifying...' : 'Verify Email'}
                </Button>
                <Button
                  type="button"
                  aria-label="Return"
                  variant="ghost"
                  className="w-full text-xs text-white/50 hover:text-white hover:bg-white/5 h-10 uppercase font-bold tracking-wider"
                  onClick={() => setShowVerifyInput(false)}
                >
                  Return to {title}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 font-sans">
                {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-white/50 text-xs font-bold uppercase tracking-wider block mb-1">Full Name</Label>
                  <Input
                    id="fullName"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#EAB308]/50 focus-visible:border-[#EAB308]/50 text-sm rounded-xl py-5 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white/50 text-xs font-bold uppercase tracking-wider block mb-1">Username</Label>
                  <Input
                    id="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="johndoe"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#EAB308]/50 focus-visible:border-[#EAB308]/50 text-sm rounded-xl py-5 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-white/50 text-xs font-bold uppercase tracking-wider block mb-1">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+234..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#EAB308]/50 focus-visible:border-[#EAB308]/50 text-sm rounded-xl py-5 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-white/50 text-xs font-bold uppercase tracking-wider block mb-1">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#EAB308]/50 focus-visible:border-[#EAB308]/50 text-sm rounded-xl py-5 h-11 [color-scheme:dark]"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/50 text-xs font-bold uppercase tracking-wider block mb-1">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#EAB308]/50 focus-visible:border-[#EAB308]/50 text-sm rounded-xl py-5 h-11"
              />
            </div>
            
            {mode !== 'forgot' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/50 text-xs font-bold uppercase tracking-wider block mb-1">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#EAB308]/50 focus-visible:border-[#EAB308]/50 text-sm rounded-xl py-5 h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-white/50 text-xs font-bold uppercase tracking-wider block mb-1">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#EAB308]/50 focus-visible:border-[#EAB308]/50 text-sm rounded-xl py-5 h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
                    {mode === 'signup' && (
                      <div className="space-y-2">
                        <Label htmlFor="referralCode" className="text-white/50 text-xs font-bold uppercase tracking-wider block mb-1">Referral Code (Optional)</Label>
                        {referralCode ? (
                          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                            <div className="flex-1">
                               <p className="text-[10px] text-emerald-400 font-bold leading-tight uppercase tracking-wider">
                                  Referral Active
                                </p>
                                <p className="text-[10px] text-white/60 font-medium">
                                  Invited with code: <span className="font-mono bg-white/5 px-1 rounded text-white font-bold">{referralCode}</span>
                                </p>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 px-2 text-[8px] text-red-400 hover:text-red-500 hover:bg-red-500/10 uppercase font-black"
                              onClick={() => setReferralCode('')}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="relative">
                            <Input
                              id="referralCode"
                              value={referralCode}
                              onChange={(e) => setReferralCode(e.target.value)}
                              placeholder="Enter referral code"
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#EAB308]/50 focus-visible:border-[#EAB308]/50 text-sm rounded-xl py-5 h-11 font-mono"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {mode === 'signup' && (
                      <div className="flex items-start gap-3 pt-2">
                        <input
                          type="checkbox"
                          id="agreedToTerms"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          required
                          className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-[#EAB308] focus:ring-[#EAB308] focus:ring-offset-0 cursor-pointer"
                        />
                        <Label htmlFor="agreedToTerms" className="text-xs text-white/70 font-medium cursor-pointer leading-normal">
                          I agree to the{' '}
                          <Link to="/terms" target="_blank" className="text-[#EAB308] underline font-bold">
                            Terms & Conditions
                          </Link>{' '}
                          and{' '}
                          <Link to="/privacy" target="_blank" className="text-[#EAB308] underline font-bold">
                            Privacy Policy
                          </Link>
                        </Label>
                      </div>
                    )}
              </>
            )}

            {error && (
              <div className="flex flex-col gap-2 bg-red-500/10 border border-red-500/20 p-3 rounded-xl mt-4">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
                {error.includes('Verification Required') && (
                  <div className="flex flex-col gap-2 mt-1 border-t border-white/5 pt-2">
                    {isPlatformAdminEmail(email.trim()) && (
                      <div className="bg-[#EAB308]/5 p-2 rounded text-[10px] text-[#EAB308] border border-[#EAB308]/20">
                        <strong>Admin Dev Tip:</strong> To skip confirm during development, go to your 
                        <a href="https://supabase.com/dashboard/project/_/auth/providers" target="_blank" rel="noopener noreferrer" className="underline mx-1 font-bold">Supabase Dashboard</a> 
                        &gt; Auth &gt; Providers &gt; Email and <strong>uncheck "Confirm Email"</strong>.
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <Button 
                        variant="link" 
                        className="text-xs text-red-400 hover:text-red-300 p-0 h-auto justify-start font-bold underline"
                        onClick={handleResendConfirmation}
                        disabled={resending}
                      >
                        {resending ? 'Resending...' : 'Resend Confirmation Email'}
                      </Button>
                      <Button 
                        variant="link" 
                        className="text-xs text-[#EAB308] hover:text-[#EAB308]/80 p-0 h-auto justify-start font-bold underline"
                        onClick={() => setShowVerifyInput(true)}
                      >
                        I have a 6-digit code instead
                      </Button>
                    </div>
                  </div>
                )}
                {error.includes('Signup Limit Reached') && (
                  <Button 
                    variant="link" 
                    className="text-xs text-red-400 hover:text-red-300 p-0 h-auto justify-start font-bold underline"
                    onClick={() => navigate('/login')}
                  >
                    Proceed to Login instead
                  </Button>
                )}
                {error.includes('Failed to connect') && (
                  <Button 
                    variant="link" 
                    className="text-xs text-red-400 hover:text-red-300 p-0 h-auto justify-start font-bold underline"
                    onClick={testConnection}
                    disabled={testingConnection}
                  >
                    {testingConnection ? 'Testing...' : 'Test Connection Again'}
                  </Button>
                )}
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl mt-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-medium">{message}</span>
              </div>
            )}

            {showGoogleButton && (
              <>
                <div className="relative my-6 text-white/20">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/5" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase font-sans tracking-widest">
                    <span className="bg-[#0c0c14] px-3 text-white/40 font-black">Or continue with</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-3 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white h-11 shadow-sm rounded-xl transition-all font-black text-xs uppercase tracking-wider"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Google Login</span>
                  </Button>
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-[#EAB308] hover:bg-[#EAB308]/90 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_8px_20px_rgba(234,179,8,0.2)] hover:scale-[1.02] mt-6"
              disabled={loading}
            >
              {loading ? 'Processing...' : title}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2.5 text-xs text-white/55 border-t border-white/5 pt-6 mt-4 pb-6">
          {mode === 'login' && (
            <>
              <p>Don't have an account? <Link to="/signup" className="text-[#EAB308] font-bold hover:underline">Sign Up</Link></p>
              <Link to="/forgot-password" title="Reset your password" className="text-[#EAB308]/70 hover:text-[#EAB308] hover:underline">Forgot Password?</Link>
            </>
          )}
          {mode === 'signup' && (
            <p>Already have an account? <Link to="/login" className="text-[#EAB308] font-bold hover:underline">Login</Link></p>
          )}
          {mode === 'forgot' && (
            <p>Back to <Link to="/login" className="text-[#EAB308] font-bold hover:underline">Login</Link></p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};
