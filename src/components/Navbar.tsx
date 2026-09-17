import React, { useState } from 'react';
import { Home, Trophy, Wallet, User, ShieldAlert, LogOut, Menu, X, BookOpen, Sparkles, ClipboardList } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isAdmin: boolean;
  onLogout: () => void;
  username: string;
  avatar: string;
  role?: 'ceo' | 'tutor' | 'premium' | 'free';
}

export default function Navbar({ currentTab, onTabChange, isAdmin, onLogout, username, avatar, role = 'free' }: NavbarProps) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Configure navigation items dynamically according to active user role
  const getNavItemsByRole = () => {
    switch (role) {
      case 'ceo':
        return [
          { id: 'home', label: 'CEO Dashboard Board', icon: Home },
          { id: 'chat_quiz_hall', label: '🎯 Live Quiz Chat Hub', icon: Sparkles },
          { id: 'ebook_marketplace', label: '📖 eBook Studio & Market', icon: BookOpen },
          { id: 'challenges', label: 'Authorized Contests', icon: Trophy },
          { id: 'wallet', label: 'Vault Reserves', icon: Wallet },
          { id: 'feed', label: '🧩 Puzzle Maker Studio', icon: BookOpen },
          { id: 'requests', label: 'Requests Vetting Hub', icon: ClipboardList },
          { id: 'health', label: 'System Health Logs', icon: ShieldAlert },
          { id: 'profile', label: 'Administrator Profile', icon: User },
        ];
      case 'tutor':
        return [
          { id: 'home', label: 'Tutor Studio Controls', icon: Home },
          { id: 'chat_quiz_hall', label: '🎯 Live Quiz Chat Hub', icon: Sparkles },
          { id: 'ebook_marketplace', label: '📖 eBook Studio & Market', icon: BookOpen },
          { id: 'challenges', label: 'Quiz Creator Feed', icon: Trophy },
          { id: 'wallet', label: 'Earnings Ledger', icon: Wallet },
          { id: 'feed', label: '🧩 Puzzle Maker Studio', icon: BookOpen },
          { id: 'requests', label: 'Administrative Requests', icon: ClipboardList },
          { id: 'profile', label: 'Tutor Profile', icon: User },
        ];
      case 'premium':
        return [
          { id: 'home', label: 'Premium Lounge Hub', icon: Home },
          { id: 'chat_quiz_hall', label: '🎯 Live Quiz Chat Hub', icon: Sparkles },
          { id: 'ebook_marketplace', label: '📖 eBook Studio & Market', icon: BookOpen },
          { id: 'challenges', label: 'Elite Multiplier Quizzes', icon: Trophy },
          { id: 'wallet', label: 'My Premium Wallet', icon: Wallet },
          { id: 'feed', label: '🧩 Puzzle Maker Studio', icon: BookOpen },
          { id: 'requests', label: 'Official Requests', icon: ClipboardList },
          { id: 'profile', label: 'Member Profile', icon: User },
        ];
      case 'free':
      default:
        return [
          { id: 'home', label: 'Dashboard Hub', icon: Home },
          { id: 'chat_quiz_hall', label: '🎯 Live Quiz Chat Hub', icon: Sparkles },
          { id: 'ebook_marketplace', label: '📖 eBook Studio & Market', icon: BookOpen },
          { id: 'challenges', label: 'Practice Challenges', icon: Trophy },
          { id: 'wallet', label: 'Standard NGN Wallet', icon: Wallet },
          { id: 'feed', label: '🧩 Puzzle Maker Studio', icon: BookOpen },
          { id: 'requests', label: 'Official Requests', icon: ClipboardList },
          { id: 'profile', label: 'Basic Profile', icon: User },
        ];
    }
  };

  const navItems = getNavItemsByRole();

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    setIsMobileDrawerOpen(false);
  };

  return (
    <>
      {/* 1. MOBILE FLOATING TOP HEADER */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 fixed top-0 left-0 right-0 z-40 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-1.5 text-slate-600 hover:text-slate-900 focus:outline-none cursor-pointer"
            aria-label="Open navigation sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-base">Q</div>
            <span className="font-extrabold text-lg tracking-tight text-slate-950">Quizoe</span>
          </div>
        </div>

        <img 
          src={avatar} 
          alt={username} 
          className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/10 cursor-pointer"
          onClick={() => handleTabClick('profile')}
        />
      </header>

      {/* 2. MOBILE DRAWER OVERLAY & SLIDE-OUT PANEL */}
      {isMobileDrawerOpen && (
        <>
          {/* Frosted Dark Overlay Backdrop */}
          <div 
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 md:hidden animate-fade-in"
          />

          {/* Sliding Sidebar Body */}
          <aside className="fixed inset-y-0 left-0 w-72 bg-white z-50 md:hidden p-6 flex flex-col justify-between shadow-2xl animate-slide-in-left select-none text-left">
            <div className="flex flex-col gap-6">
              
              {/* Drawer Header Brand */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-base">Q</div>
                  <span className="font-extrabold text-xl tracking-tight text-slate-950">Quizoe</span>
                </div>
                
                <button 
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Identity Details Card */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <img 
                  src={avatar} 
                  alt={username} 
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-blue-500/10"
                />
                <div className="overflow-hidden">
                  <p className="text-[9px] text-slate-400 font-extrabold uppercase">CREATOR ACCOUNT</p>
                  <p className="text-sm font-bold text-slate-800 truncate">@{username}</p>
                </div>
              </div>

              {/* Inner Page Directory */}
              <nav className="flex flex-col gap-1.5 mt-2">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-1 block">NAVIGATION</span>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer text-left ${
                        isActive 
                          ? 'bg-blue-600 text-white font-extrabold shadow-md' 
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 border border-slate-100 bg-slate-50/50'
                      }`}
                    >
                      <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white font-bold' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                {/* Mobile Admin Link Option */}
                {isAdmin && (
                  <>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mt-4 mb-1 block">ADMINISTRATOR</span>
                    <button
                      onClick={() => handleTabClick('admin')}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all cursor-pointer text-left ${
                        currentTab === 'admin' 
                          ? 'bg-rose-50 text-rose-700 font-bold shadow-sm' 
                          : 'text-slate-500 hover:bg-slate-50 hover:text-rose-800'
                      }`}
                    >
                      <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
                      <span>Administrative Console</span>
                    </button>
                  </>
                )}
              </nav>

            </div>

            {/* Logout Action */}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  onLogout();
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
              >
                <LogOut className="w-4.5 h-4.5" />
                <span>Disconnect Server</span>
              </button>
            </div>

          </aside>
        </>
      )}

      {/* 3. DESKTOP ADAPTIVE LEFT FIXED SIDEBAR */}
      <aside className="hidden md:flex flex-col justify-between w-64 bg-white border-r border-slate-200 text-slate-800 h-screen fixed top-0 left-0 z-40 p-6 select-none">
        
        {/* Brand visual header */}
        <div className="flex flex-col gap-6 text-left shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-100">Q</div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-950">Quizoe<span className="text-blue-600">.</span></span>
          </div>

          {/* Quick Creator Info Mini Card */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <img 
              src={avatar} 
              alt={username} 
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-blue-500/10"
            />
            <div className="overflow-hidden">
              <p className="text-[9px] text-slate-400 font-extrabold uppercase">CREATOR OFFICE</p>
              <p className="text-sm font-bold text-slate-800 truncate">@{username}</p>
            </div>
          </div>
        </div>

        {/* Dynamic Nav Items block */}
        <nav className="flex flex-col gap-1.5 my-auto text-left">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-2 block">MAIN DIRECTORY</span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-150 cursor-pointer text-left ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md font-extrabold' 
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-150 border border-slate-100 shadow-xs'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-550 text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {isAdmin && (
            <>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mt-5 mb-2 block">ADMIN PRIVILEGES</span>
              <button
                onClick={() => onTabChange('admin')}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-150 cursor-pointer text-left ${
                  currentTab === 'admin' 
                    ? 'bg-rose-50 text-rose-700 font-bold shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <span>Admin Console</span>
              </button>
            </>
          )}
        </nav>

        {/* Bottom signout session trigger */}
        <div className="pt-4 border-t border-slate-150 text-left shrink-0">
          <button
            onClick={onLogout}
            className="flex items-center gap-3.5 px-4 py-3 w-full rounded-xl font-semibold text-sm text-slate-500 hover:text-red-650 hover:bg-red-50 transition-all cursor-pointer text-left"
          >
            <LogOut className="w-5 h-5" />
            <span>Disconnect Server</span>
          </button>
        </div>

      </aside>
    </>
  );
}
