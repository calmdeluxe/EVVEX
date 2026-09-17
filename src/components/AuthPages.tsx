import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ArrowLeft, Mail, Lock, User, UserPlus } from 'lucide-react';

interface AuthPagesProps {
  initialView: 'signin' | 'signup' | 'forgot';
  onAuthSuccess: (username: string, email?: string) => void;
  onBackToLanding: () => void;
}

export default function AuthPages({ initialView, onAuthSuccess, onBackToLanding }: AuthPagesProps) {
  const [view, setView] = useState<'signin' | 'signup' | 'forgot'>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [referral, setReferral] = useState('');
  const [errorStatus, setErrorStatus] = useState('');

  const benefits = [
    "Compete in sponsored challenges with zero entry deposit fees.",
    "Cash out instantly to Opay, PalmPay, Moniepoint, or international Banks.",
    "Receive ₦25 bonus credits per active peer referral.",
    "Establish your custom creator feed and monetize user engagement."
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus('');

    if (view === 'signin') {
      if (!email || !password) {
        setErrorStatus('Please provide both administrative credentials.');
        return;
      }
      
      // Determine username from entered email identifier
      let parsedUsername = 'winbigonly';
      if (email.toLowerCase() === 'winbigonly@gmail.com' || email.toLowerCase() === 'winbigonly') {
        parsedUsername = 'winbigonly';
      } else {
        parsedUsername = email.split('@')[0] || 'winbigonly';
      }
      
      onAuthSuccess(parsedUsername, email);
    } else if (view === 'signup') {
      if (!username || !email || !password) {
        setErrorStatus('Please complete all compulsory fields.');
        return;
      }
      onAuthSuccess(username, email);
    } else {
      // Forgot Password submission
      if (!email) {
        setErrorStatus('Please provide your registered email identifier.');
        return;
      }
      setErrorStatus('Password reset link successfully generated to: ' + email);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      
      {/* LEFT PANEL: Branding & Premium Benefits */}
      <div className="lg:w-1/2 bg-slate-900 text-white p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/10 blur-[100px] rounded-full"></div>

        {/* Header Branding */}
        <div className="relative flex items-center justify-between z-10 shrink-0">
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Landing
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-sm">Q</div>
            <span className="font-extrabold text-xl tracking-tight text-white">Quizoe<span className="text-blue-500">.</span></span>
          </div>
        </div>

        {/* Core Value Statement */}
        <div className="my-auto py-12 relative z-10 text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-blue-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 fill-blue-400" />
            Premium Account Hub
          </span>
          <h2 className="text-3xl lg:text-5xl font-black mb-8 leading-tight">
            Unlock the Ultimate Challenge Platform
          </h2>
          
          <div className="flex flex-col gap-4">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-3 items-start select-none">
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm md:text-base font-medium">{benefit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Credit */}
        <div className="relative z-10 text-xs text-slate-500 text-left shrink-0">
          Partnered with world-class digital payment gateways. Anti-Money Laundering compliant.
        </div>
      </div>

      {/* RIGHT PANEL: Authentic Interactive Forms with Floating Labels */}
      <div className="lg:w-1/2 bg-white flex items-center justify-center p-8 lg:p-16 relative">
        <div className="max-w-md w-full text-left">
          
          {/* Form Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {view === 'signin' 
                ? 'Welcome Back' 
                : view === 'signup' 
                ? 'Create Account' 
                : 'Forgot Password'}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 font-medium">
              {view === 'signin'
                ? "Enter your credentials to access your fintech challenge center."
                : view === 'signup'
                ? "Sign up today and get your custom bank-style rewards card."
                : "Provide your registered email to request a secure key reset."}
            </p>
          </div>

          {/* Form Element */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {errorStatus && (
              <div className={`p-3.5 rounded-xl border text-sm font-semibold select-none ${
                errorStatus.includes('successfully') 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {errorStatus}
              </div>
            )}

            {view === 'signup' && (
              <div className="relative border border-slate-200 rounded-xl focus-within:border-blue-500 transition-colors">
                <span className="absolute left-4 top-3.5 text-slate-400"><User className="w-5 h-5" /></span>
                <input
                  type="text"
                  required
                  placeholder="Choose Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent pl-11 pr-4 py-3.5 text-slate-800 font-medium placeholder-slate-400 focus:outline-none text-sm"
                />
              </div>
            )}

            <div className="relative border border-slate-200 rounded-xl focus-within:border-blue-500 transition-colors">
              <span className="absolute left-4 top-3.5 text-slate-400"><Mail className="w-5 h-5" /></span>
              <input
                type="email"
                required
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent pl-11 pr-4 py-3.5 text-slate-800 font-medium placeholder-slate-400 focus:outline-none text-sm"
              />
            </div>

            {view !== 'forgot' && (
              <div className="relative border border-slate-200 rounded-xl focus-within:border-blue-500 transition-colors">
                <span className="absolute left-4 top-3.5 text-slate-400"><Lock className="w-5 h-5" /></span>
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent pl-11 pr-4 py-3.5 text-slate-800 font-medium placeholder-slate-400 focus:outline-none text-sm"
                />
              </div>
            )}

            {view === 'signup' && (
              <div className="relative border border-slate-200 rounded-xl focus-within:border-blue-500 transition-colors">
                <span className="absolute left-4 top-3.5 text-slate-400"><UserPlus className="w-5 h-5" /></span>
                <input
                  type="text"
                  placeholder="Referral Code (Optional)"
                  value={referral}
                  onChange={(e) => setReferral(e.target.value)}
                  className="w-full bg-transparent pl-11 pr-4 py-3.5 text-slate-800 font-medium placeholder-slate-400 focus:outline-none text-sm"
                />
              </div>
            )}

            {/* Forgot Pass triggers */}
            {view === 'signin' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setView('forgot')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Core Action Submit Button */}
            <button
              type="submit"
              className="btn-premium w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all cursor-pointer text-center flex justify-center items-center"
            >
              {view === 'signin' 
                ? 'Sign In Account' 
                : view === 'signup' 
                ? 'Register & Claim Gift' 
                : 'Send Reset Instructions'}
            </button>
          </form>

          {/* Social login divider mockups */}
          <div className="mt-8">
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
              <span className="relative px-3 bg-white text-xs font-bold uppercase tracking-wider text-slate-400">Or continue with</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <button className="flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 py-2.5 px-4 rounded-xl cursor-default text-xs font-semibold text-slate-600 select-none">
                <svg className="w-4 h-4 text-red-500 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.4h6.86c-.277 1.56-1.602 4.585-6.86 4.585-4.54 0-8.24-3.765-8.24-8.4s3.7-8.4 8.24-8.4c2.58 0 4.307 1.095 5.298 2.045l2.465-2.37C18.435 1.21 15.62 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.89 11.57-11.79 0-.795-.085-1.4-.195-1.925H12.24z"/>
                </svg>
                Google
              </button>
              <button className="flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 py-2.5 px-4 rounded-xl cursor-default text-xs font-semibold text-slate-600 select-none">
                <svg className="w-4 h-4 text-blue-600 fill-current" viewBox="0 0 24 24">
                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                </svg>
                Facebook
              </button>
            </div>

            {/* Alternator links */}
            <p className="text-center text-xs font-semibold text-slate-500">
              {view === 'signin' ? (
                <>
                  New to Quizoe?{' '}
                  <button
                    onClick={() => { setView('signup'); setErrorStatus(''); }}
                    className="text-blue-600 hover:text-blue-800 font-bold ml-0.5 cursor-pointer"
                  >
                    Register free here
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button
                    onClick={() => { setView('signin'); setErrorStatus(''); }}
                    className="text-blue-600 hover:text-blue-800 font-bold ml-0.5 cursor-pointer"
                  >
                    Sign in here
                  </button>
                </>
              )}
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
