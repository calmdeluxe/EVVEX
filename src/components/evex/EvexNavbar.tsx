import React, { useState } from 'react';
import { 
  Compass, Ticket, CalendarPlus, UserCheck, ShieldCheck, 
  Sparkles, Briefcase, Megaphone, Menu, X, LogIn, User,
  ChevronDown, Crown
} from 'lucide-react';
import { AppRole, User as UserType } from '../../types';

interface EvexNavbarProps {
  currentUser: UserType | null;
  currentRole: AppRole;
  currentView: string;
  onNavigate: (view: string) => void;
  onSwitchRole: (role: AppRole) => void;
  onOpenAuth: (initialTab?: 'signin' | 'signup') => void;
  onSignOut: () => void;
  savedEventsCount?: number;
  myTicketsCount?: number;
}

export const EvexNavbar: React.FC<EvexNavbarProps> = ({
  currentUser,
  currentRole,
  currentView,
  onNavigate,
  onSwitchRole,
  onOpenAuth,
  onSignOut,
  myTicketsCount = 0
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const rolesList: { id: AppRole; label: string; icon: any; color: string }[] = [
    { id: 'attendee', label: 'Attendee', icon: Ticket, color: 'text-emerald-400' },
    { id: 'creator', label: 'Event Creator', icon: CalendarPlus, color: 'text-amber-400' },
    { id: 'vendor', label: 'Vendor Partner', icon: Briefcase, color: 'text-blue-400' },
    { id: 'mpr', label: 'MPR (Marketing Partner)', icon: Megaphone, color: 'text-purple-400' },
    { id: 'admin', label: 'Platform Admin', icon: ShieldCheck, color: 'text-rose-400' }
  ];

  const handleRoleChange = (role: AppRole) => {
    onSwitchRole(role);
    setIsRoleDropdownOpen(false);
    // Navigate to role's home view
    if (role === 'creator') onNavigate('creator-dashboard');
    else if (role === 'vendor') onNavigate('vendor-dashboard');
    else if (role === 'mpr') onNavigate('mpr-dashboard');
    else if (role === 'admin') onNavigate('admin-dashboard');
    else onNavigate('attendee-dashboard');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      {/* Role Testing & Persona Switcher Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-1.5 border-b border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Active Role:
          </span>
          <div className="relative">
            <button
              id="btn-role-switcher"
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-medium border border-slate-700 transition"
            >
              <span className="capitalize">{currentRole.replace('_', ' ')}</span>
              {currentUser?.isVip && currentRole === 'attendee' && (
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1 rounded flex items-center gap-0.5">
                  <Crown className="w-2.5 h-2.5 text-amber-400" /> VIP
                </span>
              )}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-60 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 py-1.5 z-50">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  Switch Experience Persona
                </div>
                {rolesList.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleRoleChange(r.id)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition ${
                        currentRole === r.id ? 'bg-amber-400/10 text-amber-400 font-semibold' : 'text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${r.color}`} />
                        {r.label}
                      </span>
                      {currentRole === r.id && <span className="text-[10px] text-amber-400">● Active</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <span className="hidden sm:inline">EVEX Nigeria • Lagos, Abuja, Port Harcourt</span>
          {currentUser ? (
            <span className="font-mono text-emerald-400 font-medium">
              ₦{currentUser.balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </span>
          ) : (
            <button 
              onClick={() => onOpenAuth('signin')}
              className="text-amber-400 hover:text-amber-300 font-medium underline"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              id="brand-logo-btn"
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-2.5 text-left focus:outline-none group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-black text-slate-950 text-xl tracking-tight shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                E
              </div>
              <div>
                <span className="text-2xl font-black tracking-tight text-white flex items-center gap-1">
                  EVEX
                  <span className="text-xs bg-amber-400 text-slate-950 font-bold px-1.5 py-0.5 rounded tracking-normal">
                    NG
                  </span>
                </span>
                <p className="text-[10px] text-slate-400 -mt-1 hidden sm:block tracking-wide">
                  Discover • Plan • Connect • Experience
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              id="nav-landing"
              onClick={() => onNavigate('landing')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                currentView === 'landing' ? 'bg-slate-800 text-amber-400' : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Home
            </button>
            <button
              id="nav-discover"
              onClick={() => onNavigate('discover')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                currentView === 'discover' ? 'bg-slate-800 text-amber-400' : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Compass className="w-4 h-4 text-amber-400" />
              Discover Events
            </button>

            {/* Role-Specific Portal Links */}
            {currentRole === 'attendee' && (
              <>
                <button
                  id="nav-my-tickets"
                  onClick={() => onNavigate('attendee-dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                    currentView === 'attendee-dashboard' ? 'bg-slate-800 text-amber-400' : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Ticket className="w-4 h-4 text-emerald-400" />
                  My Tickets
                  {myTicketsCount > 0 && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
                      {myTicketsCount}
                    </span>
                  )}
                </button>
              </>
            )}

            {currentRole === 'creator' && (
              <button
                id="nav-creator"
                onClick={() => onNavigate('creator-dashboard')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  currentView === 'creator-dashboard' ? 'bg-slate-800 text-amber-400' : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <CalendarPlus className="w-4 h-4 text-amber-400" />
                Creator Hub
              </button>
            )}

            {currentRole === 'vendor' && (
              <button
                id="nav-vendor"
                onClick={() => onNavigate('vendor-dashboard')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  currentView === 'vendor-dashboard' ? 'bg-slate-800 text-amber-400' : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Briefcase className="w-4 h-4 text-blue-400" />
                Vendor Portal
              </button>
            )}

            {currentRole === 'mpr' && (
              <button
                id="nav-mpr"
                onClick={() => onNavigate('mpr-dashboard')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  currentView === 'mpr-dashboard' ? 'bg-slate-800 text-amber-400' : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Megaphone className="w-4 h-4 text-purple-400" />
                MPR Partner Hub
              </button>
            )}

            {currentRole === 'admin' && (
              <button
                id="nav-admin"
                onClick={() => onNavigate('admin-dashboard')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  currentView === 'admin-dashboard' ? 'bg-slate-800 text-amber-400' : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                Admin Console
              </button>
            )}
          </nav>

          {/* User Account / Sign In CTA */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <button
                  id="btn-nav-profile"
                  onClick={() => {
                    if (currentRole === 'creator') onNavigate('creator-dashboard');
                    else if (currentRole === 'vendor') onNavigate('vendor-dashboard');
                    else if (currentRole === 'mpr') onNavigate('mpr-dashboard');
                    else if (currentRole === 'admin') onNavigate('admin-dashboard');
                    else onNavigate('attendee-dashboard');
                  }}
                  className="flex items-center gap-2 text-left bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-800 transition"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.username}
                    className="w-7 h-7 rounded-full object-cover border border-amber-400/40"
                  />
                  <div className="text-xs leading-tight">
                    <p className="font-semibold text-slate-200">{currentUser.username}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{currentRole.replace('_', ' ')}</p>
                  </div>
                </button>
                <button
                  id="btn-signout"
                  onClick={onSignOut}
                  className="text-xs text-slate-400 hover:text-red-400 transition"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="btn-signin"
                  onClick={() => onOpenAuth('signin')}
                  className="px-3.5 py-1.5 text-sm font-semibold text-slate-200 hover:text-white transition"
                >
                  Sign In
                </button>
                <button
                  id="btn-signup"
                  onClick={() => onOpenAuth('signup')}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-md shadow-amber-400/20 transition flex items-center gap-1.5"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              id="btn-mobile-menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 pt-2 pb-6 space-y-2">
          <button
            onClick={() => {
              onNavigate('landing');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-900"
          >
            Home
          </button>
          <button
            onClick={() => {
              onNavigate('discover');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-slate-900 flex items-center gap-2"
          >
            <Compass className="w-4 h-4" />
            Discover Events
          </button>
          <button
            onClick={() => {
              onNavigate('attendee-dashboard');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-900 flex items-center gap-2"
          >
            <Ticket className="w-4 h-4 text-emerald-400" />
            My Tickets
          </button>
          <button
            onClick={() => {
              onNavigate('creator-dashboard');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-900 flex items-center gap-2"
          >
            <CalendarPlus className="w-4 h-4 text-amber-400" />
            Creator Hub
          </button>
          <button
            onClick={() => {
              onNavigate('vendor-dashboard');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-900 flex items-center gap-2"
          >
            <Briefcase className="w-4 h-4 text-blue-400" />
            Vendor Portal
          </button>
          <button
            onClick={() => {
              onNavigate('mpr-dashboard');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-900 flex items-center gap-2"
          >
            <Megaphone className="w-4 h-4 text-purple-400" />
            MPR Partner Hub
          </button>
          <button
            onClick={() => {
              onNavigate('admin-dashboard');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-900 flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            Admin Console
          </button>

          <div className="pt-4 border-t border-slate-800">
            {currentUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={currentUser.avatar} alt="User" className="w-8 h-8 rounded-full" />
                  <span className="text-sm font-semibold">{currentUser.username}</span>
                </div>
                <button
                  onClick={() => {
                    onSignOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-xs text-red-400"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onOpenAuth('signin');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2 text-center text-sm font-medium bg-slate-900 rounded-lg text-slate-200"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    onOpenAuth('signup');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2 text-center text-sm font-bold bg-amber-400 text-slate-950 rounded-lg"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
