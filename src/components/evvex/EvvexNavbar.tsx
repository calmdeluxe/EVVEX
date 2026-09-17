import React from 'react';
import { AppRole, User } from '../../types';
import { Sparkles, Ticket, Calendar, Shield, Crown, Scan, Wallet, ChevronDown, CheckCircle2 } from 'lucide-react';

interface EvvexNavbarProps {
  currentUser: User;
  activeTab: 'explore' | 'my-tickets' | 'host-hub' | 'gate-scanner' | 'patron-lounge' | 'admin-queue' | 'wallet';
  onSelectTab: (tab: 'explore' | 'my-tickets' | 'host-hub' | 'gate-scanner' | 'patron-lounge' | 'admin-queue' | 'wallet') => void;
  onSwitchRole: (role: AppRole) => void;
  onOpenDeposit: () => void;
}

export const EvvexNavbar: React.FC<EvvexNavbarProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  onSwitchRole,
  onOpenDeposit
}) => {
  const currentAppRole = currentUser.appRole || 'admin';
  const isAdmin = currentAppRole === 'admin';
  const isMpr = currentAppRole === 'mpr';
  const isHost = currentAppRole === 'event_host' || isAdmin;
  const isPatron = currentAppRole === 'patron' || isAdmin;

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80">
      {/* Top Banner Role Bench */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-xs text-amber-300 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold tracking-wide">EVVEX LIVE ENVIRONMENT:</span>
          <span className="text-slate-300">Active Identity: <strong className="text-amber-300 uppercase">{currentAppRole.replace('_', ' ')}</strong> ({currentUser.email})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 mr-1">Switch Role View:</span>
          {(['admin', 'mpr', 'event_host', 'patron', 'guest'] as AppRole[]).map((r) => (
            <button
              key={r}
              onClick={() => onSwitchRole(r)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                currentAppRole === r
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm shadow-amber-400/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {r === 'event_host' ? 'Host' : r === 'mpr' ? 'MPR' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('explore')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25 border border-amber-300/40">
              <Sparkles className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black tracking-tight text-white font-['Syne']">EVVEX</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  NG
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">Live Events & VIP Passes</p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onSelectTab('explore')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'explore'
                  ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Discover Events
            </button>

            <button
              onClick={() => onSelectTab('my-tickets')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'my-tickets'
                  ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Ticket className="w-4 h-4" />
              My Passes
            </button>

            {isHost && (
              <button
                onClick={() => onSelectTab('host-hub')}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'host-hub'
                    ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                Host Portal
              </button>
            )}

            {(isHost || isAdmin) && (
              <button
                onClick={() => onSelectTab('gate-scanner')}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'gate-scanner'
                    ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Scan className="w-4 h-4 text-emerald-400" />
                Gate Scanner
              </button>
            )}

            {isPatron && (
              <button
                onClick={() => onSelectTab('patron-lounge')}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'patron-lounge'
                    ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Crown className="w-4 h-4 text-amber-300" />
                Patron Lounge
              </button>
            )}

            {(isAdmin || isMpr) && (
              <button
                onClick={() => onSelectTab('admin-queue')}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'admin-queue'
                    ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Shield className="w-4 h-4 text-purple-400" />
                {isAdmin ? 'Admin Governance' : 'MPR Audit'}
              </button>
            )}
          </nav>

          {/* Right Action: Wallet & Account */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => onSelectTab('wallet')}
              className="hidden sm:flex items-center gap-2.5 bg-slate-900 hover:bg-slate-850 px-3.5 py-2 rounded-xl border border-slate-800 cursor-pointer transition-all hover:border-slate-700"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-400 font-medium leading-none">Wallet</p>
                <p className="text-sm font-bold text-white leading-tight">₦{currentUser.balance.toLocaleString('en-NG')}</p>
              </div>
            </div>

            <button
              onClick={onOpenDeposit}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-amber-400/20 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Top Up</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
