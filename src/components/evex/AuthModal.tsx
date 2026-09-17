import React, { useState } from 'react';
import { 
  X, Mail, Lock, User as UserIcon, Sparkles, CheckCircle2, 
  ShieldCheck, CalendarPlus, Briefcase, Megaphone, Ticket, Crown
} from 'lucide-react';
import { AppRole, User } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'signin' | 'signup';
  onClose: () => void;
  onLoginSuccess: (user: Partial<User>) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'signin',
  onClose,
  onLoginSuccess
}) => {
  const [tab, setTab] = useState<'signin' | 'signup'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('attendee');

  if (!isOpen) return null;

  const handleDemoLogin = (role: AppRole) => {
    let mockUser: Partial<User> = {
      appRole: role,
      isVip: role === 'patron'
    };

    if (role === 'admin') {
      mockUser = {
        ...mockUser,
        username: 'Platform Admin',
        email: 'admin@evex.ng',
        balance: 150000
      };
    } else if (role === 'creator') {
      mockUser = {
        ...mockUser,
        username: 'Mainland Block Party Team',
        email: 'creator@mainlandparty.com',
        balance: 850000
      };
    } else if (role === 'vendor') {
      mockUser = {
        ...mockUser,
        username: 'Lagos Island Grill & Cocktails',
        email: 'bookings@lagosgrill.ng',
        balance: 320000
      };
    } else if (role === 'mpr') {
      mockUser = {
        ...mockUser,
        username: 'Tunde Entertainment PR',
        email: 'tunde@mprnetwork.ng',
        referralCode: 'EVEX_VIP99',
        balance: 145000
      };
    } else {
      mockUser = {
        ...mockUser,
        username: 'Samuel Chukwuemeka',
        email: 'samuel@evex.ng',
        isVip: true,
        balance: 45000
      };
    }

    onLoginSuccess(mockUser);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    onLoginSuccess({
      email,
      username: username || email.split('@')[0],
      appRole: selectedRole,
      isVip: selectedRole === 'patron'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl space-y-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">E</span>
            <span className="font-extrabold text-white text-base tracking-tight">EVEX ACCESS</span>
          </div>
          <h2 className="text-xl font-black text-white">
            {tab === 'signin' ? 'Welcome Back to EVEX' : 'Create Your EVEX Account'}
          </h2>
          <p className="text-xs text-slate-400">
            {tab === 'signin' ? 'Enter your credentials or pick a demo profile to test instantly.' : 'Join the premier discovery and event community in Nigeria.'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setTab('signin')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              tab === 'signin' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              tab === 'signup' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Demo Fast Logins for Testing */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block mb-2">
            ⚡ Quick Demo Logins (1-Click Test Any Persona)
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleDemoLogin('attendee')}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-left border border-slate-800 flex items-center gap-2"
            >
              <Ticket className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="font-bold text-white block text-[11px]">Attendee / VIP</span>
                <span className="text-[10px] text-slate-400">Samuel C.</span>
              </div>
            </button>

            <button
              onClick={() => handleDemoLogin('creator')}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-left border border-slate-800 flex items-center gap-2"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <div>
                <span className="font-bold text-white block text-[11px]">Event Creator</span>
                <span className="text-[10px] text-slate-400">Mainland Party</span>
              </div>
            </button>

            <button
              onClick={() => handleDemoLogin('vendor')}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-left border border-slate-800 flex items-center gap-2"
            >
              <Briefcase className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <div>
                <span className="font-bold text-white block text-[11px]">Vendor Partner</span>
                <span className="text-[10px] text-slate-400">Lagos Grill</span>
              </div>
            </button>

            <button
              onClick={() => handleDemoLogin('mpr')}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-left border border-slate-800 flex items-center gap-2"
            >
              <Megaphone className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <div>
                <span className="font-bold text-white block text-[11px]">MPR Promoter</span>
                <span className="text-[10px] text-slate-400">Tunde PR</span>
              </div>
            </button>
          </div>
        </div>

        {/* Regular Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Samuel Chukwuemeka"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              required
            />
          </div>

          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Account Type</label>
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value as AppRole)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value="attendee">Attendee (Discover & Buy Tickets)</option>
                <option value="creator">Event Creator / Host (List Events)</option>
                <option value="vendor">Vendor Partner (Offer Services)</option>
                <option value="mpr">MPR Marketing Partner (Promote & Earn)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow transition mt-2"
          >
            {tab === 'signin' ? 'Sign In to Account' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
};
