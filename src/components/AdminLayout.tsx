import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Wallet, 
  Flag, 
  Megaphone, 
  MessageSquare, 
  LogOut,
  Menu,
  X,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Coins,
  ChevronRight,
  FileText,
  Video,
  ArrowUpRight,
  ArrowLeft,
  Zap,
  HelpCircle,
  ClipboardCheck,
  RefreshCcw,
  BarChart3,
  ScrollText
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import { clearStoredRedirectIntent } from '../lib/authUtils';
import { cn } from '../lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // States to keep dynamic counts of database anomalies/pending states
  const [attentionCounts, setAttentionCounts] = useState({
    authors: 0,
    verifications: 0,
    requests: 0,
    reports: 0,
    health: 0,
  });

  React.useEffect(() => {
    const fetchAttentionCounts = async () => {
      const counts = { authors: 0, verifications: 0, requests: 0, reports: 0, health: 0 };
      
      // 1. Pending Authors
      try {
        const { data: apps } = await supabase.from('author_applications').select('status');
        if (apps) counts.authors = apps.filter((a: any) => a.status === 'pending' || a.status === 0 || a.status === '0').length;
      } catch (err) {
        console.warn("Sidebar count failed for authors table", err);
      }

      // 2. Pending Verifications
      try {
        const { data: vers } = await supabase.from('payment_verifications').select('status');
        if (vers) counts.verifications = vers.filter((v: any) => v.status === 'pending' || v.status === 0 || v.status === '0').length;
      } catch (err) {
        console.warn("Sidebar count failed for verifications table", err);
      }

      // 3. Pending Support Requests
      try {
        const { data: reqs } = await supabase.from('support_requests').select('status');
        if (reqs) counts.requests = reqs.filter((r: any) => r.status === 'pending' || r.status === 'open' || r.status === 0 || r.status === '0').length;
      } catch (err) {
        console.warn("Sidebar count failed for support requests table", err);
      }

      // 4. Pending Reports
      try {
        const { data: reps } = await supabase.from('reported_content').select('status');
        if (reps) counts.reports = reps.filter((r: any) => r.status === 'pending' || r.status === 0 || r.status === '0').length;
      } catch (err) {
        console.warn("Sidebar count failed for reported content table", err);
      }

      // 5. System Health Anomalies
      try {
        const requiredColumns = [
          { table: 'users', column: 'account_tier' },
          { table: 'users', column: 'is_approved_author' },
          { table: 'author_applications', column: 'id' },
          { table: 'payment_verifications', column: 'id' },
          { table: 'support_requests', column: 'id' }
        ];
        let anomalies = 0;
        await Promise.all(requiredColumns.map(async (col) => {
          try {
            const { error } = await supabase.from(col.table).select(col.column).limit(1);
            if (error) anomalies++;
          } catch {
            anomalies++;
          }
        }));
        counts.health = anomalies;
      } catch (err) {
        console.warn("Sidebar count failed for health check", err);
      }

      setAttentionCounts(counts);
    };

    fetchAttentionCounts();
    const interval = setInterval(fetchAttentionCounts, 5 * 60 * 1000); // Poll every 5 minutes instead of 15 seconds to protect database and egress
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      clearStoredRedirectIntent();
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      clearStoredRedirectIntent();
    }
    navigate('/login');
  };

  const menuItems = [
    { icon: ArrowLeft, label: 'EXIT TO USER APP', path: '/dashboard', color: "text-blue-700 font-black border-b-2 border-blue-100" },
    { icon: LayoutDashboard, label: 'Admin Overview', path: '/admin' },
    { icon: Activity, label: 'Analytics', path: '/admin/analytics', color: "text-emerald-600 font-bold" },
    { icon: Users, label: 'Users Directory', path: '/admin#users' },
    { icon: Megaphone, label: 'Announcements', path: '/admin/announcements' },
    { icon: FileText, label: 'Activity Log', path: '/admin/activity-log' },
    { icon: Zap, label: 'Puzzle Maker', path: '/ai-magic', color: "text-pink-600 font-bold" },
    { icon: ShieldCheck, label: 'Secure Vault', path: '/admin#vault', color: "text-purple-600 font-bold" },
    { icon: Zap, label: 'Direct Upgrades', path: '/admin#upgrades', color: "text-amber-600 font-bold" },
    { icon: BookOpen, label: 'Manage eBooks', path: '/admin#books' },
    { icon: FileText, label: 'Moderate Blogs', path: '/admin#blogs' },
    { icon: Video, label: 'Review Videos', path: '/admin#videos' },
    { icon: ShieldAlert, label: 'Author Hub', path: '/admin#authors', alertCount: attentionCounts.authors },
    { icon: Users, label: 'MPR Account Hub', path: '/admin/mpr-hub', color: "text-purple-600 font-bold" },
    { icon: BarChart3, label: 'MPR Analytics', path: '/admin/mpr-analytics', color: "text-indigo-600 font-bold" },
    { icon: ScrollText, label: 'Audit Trail', path: '/admin/mpr-audit', color: "text-amber-700 font-bold" },
    { icon: Wallet, label: 'Payout Queue', path: '/admin#withdrawals' },
    { icon: Coins, label: 'Payment Center', path: '/admin/payments' },
    { icon: ShieldCheck, label: 'Manual Verifications', path: '/admin/payment-verifications', alertCount: attentionCounts.verifications },
    { icon: MessageSquare, label: 'User Requests', path: '/admin/requests', alertCount: attentionCounts.requests },
    { icon: RefreshCcw, label: 'Refund Requests', path: '/admin#refunds', color: "text-amber-700 font-bold" },
    { icon: MessageSquare, label: 'User Feedback', path: '/admin#feedback', color: "text-indigo-600 font-bold" },
    { icon: FileText, label: 'Email History Logs', path: '/admin#emaillogs', color: "text-emerald-700 font-bold" },
    { icon: HelpCircle, label: 'Help Content & FAQs', path: '/admin#help' },
    { icon: Activity, label: 'Financial Audit', path: '/admin#transactions' },
    { icon: Flag, label: 'Reported Content', path: '/admin#reports', alertCount: attentionCounts.reports },
    { icon: Activity, label: 'Engine Health', path: '/admin/system-health', alertCount: attentionCounts.health },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full">
        <Link to="/" className="p-6 flex items-center gap-2 hover:opacity-90 transition-opacity">
          <ShieldAlert className="w-8 h-8 text-green-700" />
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight leading-none">Admin</span>
            <span className="text-xs text-gray-500 font-medium">CalmReader Panel</span>
          </div>
        </Link>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => {
            const isItemActive = 
              location.pathname + location.hash === item.path ||
              (item.path === '/admin/mpr-hub' && (location.pathname === '/admin/mpr-hub' || location.hash === '#mpr' || location.hash === '#mpr-hub')) ||
              (item.path === '/admin' && location.pathname === '/admin' && !location.hash);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isItemActive
                    ? "bg-green-50 text-green-700 font-bold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.alertCount !== undefined && item.alertCount > 0 && (
                  <span className="text-[9px] font-black bg-red-500 text-white rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center animate-pulse border border-white shadow-sm font-mono shrink-0">
                    {item.alertCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 flex flex-col gap-3">
          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-3 px-3 py-4 w-full rounded-2xl text-xs font-black text-white bg-slate-900 hover:bg-black transition-all shadow-xl shadow-slate-200 uppercase tracking-widest italic"
          >
            <ArrowLeft className="w-4 h-4" /> Exit to App
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 transition-colors uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            Terminate
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        {/* Top Header - Mobile */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 h-16 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-green-700" />
            <span className="font-bold text-lg tracking-tight">Admin Panel</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Top Header - Desktop */}
        <header className="hidden md:flex bg-slate-900 border-b border-slate-800 px-8 h-16 items-center justify-between sticky top-0 z-40 text-white">
          <div className="flex items-center gap-4">
             <Link to="/dashboard" className="text-xs font-black text-blue-400 hover:text-white px-4 py-2 rounded-full border border-blue-400/30 flex items-center gap-2 uppercase tracking-widest transition-all bg-blue-400/10 active:scale-95">
                <ArrowLeft className="w-4 h-4" /> Switch to Dashboard (EXIT)
             </Link>
             <h1 className="text-lg font-bold">
               {menuItems.find(item => location.pathname + location.hash === item.path)?.label || 'Admin Management'}
             </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold opacity-90">System Administrator</p>
              <p className="text-xs opacity-60">{user?.email}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-black shadow-lg shadow-red-600/20">
              AD
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-6 w-full max-w-full overflow-x-hidden">
          <div className="page-container max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white flex flex-col">
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-8 h-8 text-green-700" />
                <span className="font-bold text-xl tracking-tight">Admin</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 px-4 space-y-1">
              {menuItems.map((item) => {
                const isItemActive = 
                  location.pathname + location.hash === item.path ||
                  (item.path === '/admin/mpr-hub' && (location.pathname === '/admin/mpr-hub' || location.hash === '#mpr' || location.hash === '#mpr-hub')) ||
                  (item.path === '/admin' && location.pathname === '/admin' && !location.hash);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isItemActive
                        ? "bg-green-50 text-green-700 font-bold"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.alertCount !== undefined && item.alertCount > 0 && (
                      <span className="text-[9px] font-black bg-red-500 text-white rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center animate-pulse border border-white shadow-sm font-mono shrink-0">
                        {item.alertCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-gray-100 flex flex-col gap-3">
              <Link
                to="/dashboard"
                className="flex items-center justify-center gap-3 px-3 py-4 w-full rounded-2xl text-xs font-black text-white bg-slate-900 hover:bg-black transition-all shadow-xl shadow-slate-200 uppercase tracking-widest italic"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ArrowLeft className="w-4 h-4" /> Exit to App
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 transition-colors uppercase tracking-widest"
              >
                <LogOut className="w-4 h-4" />
                Terminate
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
