import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  BookText, 
  Wallet, 
  ArrowUpRight, 
  Users, 
  Settings, 
  ShieldCheck, 
  Heart,
  MessageSquare,
  MessageCircle,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronRight,
  BookOpen,
  Wand2,
  Zap,
  Bell,
  CheckCheck,
  Newspaper,
  Video,
  Clock,
  ExternalLink,
  MessageSquarePlus,
  Smartphone,
  Trophy,
  User,
  Ticket,
  Store,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import { clearStoredRedirectIntent } from '../lib/authUtils';
import { Button } from '@/components/ui/button';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { UserFeedbackModal } from './UserFeedbackModal';

interface DashboardLayoutProps {
  children: React.ReactNode;
  hideMobileHeader?: boolean;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, hideMobileHeader = false }) => {
  const { profile, user, isAdmin, accountTier } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isPremiumAuthor = accountTier === 'author' || accountTier === 'admin';
  const isPremium = accountTier === 'premium' || isPremiumAuthor;

  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingBooksList, setPendingBooksList] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifWarning, setNotifWarning] = useState<string | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      try {
        let allNotifs: any[] = [];
        const { data: notifs } = await supabase
          .from('author_notifications')
          .select('*')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false });

        if (notifs) {
          allNotifs = [...notifs];
        }

        if (isAdmin) {
          try {
            const adminRes = await axios.get('/api/admin/books');
            if (adminRes.data && adminRes.data.books) {
              const pendingList = adminRes.data.books.filter((b: any) => {
                const isPending = b.status === 'pending_review' || b.status === 2 || b.status === 0 || b.status === 'pending';
                return isPending;
              });
              setPendingBooksList(pendingList);

              const pendingNotifs = pendingList.map((book: any) => ({
                id: `pending-book-${book.id}`,
                title: `📖 Pending Review: ${book.title || 'Untitled eBook'}`,
                message: `Submitted by ${book.users?.full_name || book.users?.email || 'Author'}. Click to inspect cards & make decision.`,
                is_read: false,
                created_at: book.created_at || new Date().toISOString(),
                link: `/edit/${book.id}`,
                isPendingEbook: true
              }));

              allNotifs = [...pendingNotifs, ...allNotifs];
            }
          } catch (adminErr) {
            console.warn("Failed to fetch pending admin books for notifications:", adminErr);
          }
        }

        setNotifications(allNotifs);
        const unread = allNotifs.filter((n: any) => !n.is_read).length;
        setUnreadCount(unread);
        setNotifWarning(null);
      } catch (err) {
        console.warn("[DashboardLayout] Notif fetch warning:", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 3 * 60 * 1000); // Poll every 3 minutes
    return () => clearInterval(interval);
  }, [user, isAdmin]);

  const handleNotifClick = (notif: any) => {
    setIsNotifOpen(false);
    const targetLink = notif.link || notif.metadata?.link || (notif.ebook_id ? `/edit/${notif.ebook_id}` : null);
    if (targetLink) {
      navigate(targetLink);
    } else if (isAdmin && (notif.isPendingEbook || notif.title?.includes('Pending'))) {
      navigate('/admin');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const { error: updateErr } = await supabase
        .from('author_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('author_id', user.id)
        .eq('is_read', false);

      if (!updateErr) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const handleLogout = async () => {
    try {
      clearStoredRedirectIntent();
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    } catch (e) {
      clearStoredRedirectIntent();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
  };

  const isMpr = 
    accountTier === 'marketing_partner' || 
    accountTier === 'mpr' || 
    (user as any)?.account_tier === 'mpr' ||
    (user as any)?.role === 'marketing_partner' ||
    profile?.account_tier === 'marketing_partner' || 
    profile?.account_tier === 'mpr' || 
    profile?.role === 'marketing_partner' || 
    accountTier === 'admin' || 
    isAdmin;

  const isVendorUser = 
    accountTier === 'author' || 
    (user as any)?.account_tier === 'author' || 
    (user as any)?.role === 'vendor' ||
    profile?.account_tier === 'vendor' ||
    profile?.app_role === 'vendor' ||
    profile?.is_approved_author === true ||
    profile?.is_author === true;

  const menuItems: { icon: any; label: string; path: string; hidden?: boolean; color?: string; action?: () => void }[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Ticket, label: 'Tickets & Purchases', path: '/bookshelf' },
    { icon: ShieldCheck, label: 'ADMIN CENTER', path: '/admin', hidden: !isAdmin && accountTier !== 'admin', color: "text-red-700 font-black animate-pulse bg-red-50" },
    { icon: Heart, label: 'Confessions Studio', path: '/admin/confessions', hidden: !isAdmin && accountTier !== 'admin', color: "text-pink-600" },
    { icon: Users, label: '★ MPR Partner Center', path: '/mpr', hidden: !isMpr, color: "text-purple-700 dark:text-purple-400 font-black bg-purple-50 dark:bg-purple-950/30" },
    
    // Event & Ticket Creation (ADMIN & MPR ONLY — Strictly forbidden for Vendors)
    { icon: Ticket, label: '+ Create Event & Ticket', path: '/create-book?type=event', hidden: !isAdmin && !isMpr, color: "text-amber-500 font-bold" },
    
    // Trivia Engine (ADMIN & MPR ONLY — Strictly forbidden for Vendors, Patrons, VIPs)
    { icon: Trophy, label: 'Trivia Engine', path: '/trivia', hidden: !isAdmin && !isMpr, color: "text-purple-600 font-bold" },

    // Vendor Shop & Product Operations (Vendors & Admin)
    { icon: Store, label: 'Vendor Shop Management', path: '/vendor', hidden: !isVendorUser && !isAdmin, color: "text-emerald-600 font-bold" },
    { icon: PlusCircle, label: '+ Create Product / Item', path: '/create-book?type=product', hidden: !isVendorUser && !isAdmin, color: "text-emerald-600 font-bold" },
    { icon: Newspaper, label: '+ Blog & Vendor Post', path: '/create-book?type=blog', hidden: !isVendorUser && !isAdmin && !isMpr, color: "text-indigo-600 font-bold" },
    { icon: BookText, label: 'My Products & Listings', path: '/my-books', hidden: !isVendorUser && !isAdmin },
    
    // Onboarding / Upgrades
    { icon: Zap, label: 'Upgrade to VIP', path: '/upgrade/premium', hidden: accountTier !== 'free', color: "text-amber-600 font-bold" },
    { icon: Store, label: 'Become a Vendor / Shop', path: '/apply/author', hidden: isVendorUser || accountTier === 'admin' || isMpr, color: "text-indigo-600 font-bold" },

    // General Discovery & Operations
    { icon: BarChart3, label: 'Analytics Dashboard', path: '/analytics', color: "text-emerald-600 font-bold" },
    { icon: Wand2, label: 'Promo Image Studio', path: '/promo-studio', color: "text-amber-500 font-bold" },
    { icon: Smartphone, label: '📱 Download Android APK', path: '/download', color: "text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/20" },
    { icon: Store, label: 'Vendor Marketplace', path: '/dashboard/discovery' },
    { icon: Wallet, label: 'Earnings', path: '/earnings' },
    { icon: ArrowUpRight, label: 'Withdrawal', path: '/earnings#withdraw' },
    { icon: Users, label: 'Referral', path: '/dashboard#referrals' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: ShieldCheck, label: 'Security', path: '/security' },
    { icon: MessageSquare, label: 'Request Support', path: '/request' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#030308] text-gray-900 dark:text-gray-100 transition-colors duration-200 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#0d0d15] border-r border-gray-200 dark:border-white/5 fixed h-full z-40">
        <div className="p-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <BookOpen className="w-8 h-8 text-green-700 dark:text-[#EAB308]" />
            <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">EVVEX</span>
          </Link>
        </div>

        <div className="px-6 mb-6">
          {accountTier === 'admin' || isAdmin ? (
            <div className="flex flex-col gap-2">
              <div className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-[10px] font-black uppercase tracking-widest py-1 px-2 rounded inline-block">Administrator</div>
              <Link to="/admin" className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Go to Admin Panel
              </Link>
            </div>
          ) : isMpr ? (
            <div className="bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 text-[10px] font-black uppercase tracking-widest py-1 px-2 rounded inline-block">Marketing Partner (MPR)</div>
          ) : isVendorUser ? (
            <div className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest py-1 px-2 rounded inline-block">Verified Vendor</div>
          ) : accountTier === 'premium' ? (
            <div className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest py-1 px-2 rounded inline-block">VIP Patron</div>
          ) : (
            <div className="bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest py-1 px-2 rounded inline-block">Visitor / Patron</div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-thin">
          {menuItems.filter(i => !i.hidden).map((item) => {
            const isActive = location.pathname === item.path;
            const Component = item.path ? Link : 'button';
            const props: any = item.path ? { to: item.path } : { onClick: item.action };

            return (
              <Component
                key={item.label}
                {...props}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left",
                  isActive
                    ? "bg-green-50 dark:bg-[#EAB308]/10 text-green-700 dark:text-[#EAB308]"
                    : item.color || "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Component>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-white/5 space-y-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-black text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        {/* Top Header - Mobile */}
        {!hideMobileHeader && (
          <header 
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
            className="md:hidden bg-white dark:bg-[#0d0d15] border-b border-gray-200 dark:border-white/5 px-3 sm:px-4 min-h-16 flex items-center justify-between sticky top-0 z-40 w-full"
          >
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <BookOpen className="w-6 h-6 text-green-700 dark:text-[#EAB308]" />
            <span className="font-bold text-lg tracking-tight text-gray-900 dark:text-white">EVVEX</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link 
              to="/blog" 
              className="flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-gray-700 dark:text-gray-300"
              title="Blog"
            >
              <Newspaper className="w-3.5 h-3.5 text-green-700 dark:text-[#EAB308]" />
              <span className="hidden sm:inline">Blog</span>
            </Link>
            <Link 
              to="/videos" 
              className="flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-gray-700 dark:text-gray-300"
              title="Videos"
            >
              <Video className="w-3.5 h-3.5 text-green-700 dark:text-[#EAB308]" />
              <span className="hidden sm:inline">Videos</span>
            </Link>
            {/* Major Admin Pending Reviews Shortcut (Mobile) */}
            {isAdmin && pendingBooksList.length > 0 && (
              <button
                onClick={() => navigate(`/edit/${pendingBooksList[0].id}`)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all animate-pulse"
                title="Click to review pending eBooks"
              >
                <Clock className="w-3 h-3" />
                <span>Pending ({pendingBooksList.length})</span>
              </button>
            )}

            <ThemeToggle />
            
            {/* Mobile Notification Trigger */}
            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 border border-white rounded-full" />
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                    <span className="font-bold text-xs text-gray-900">Notifications ({unreadCount})</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-semibold text-green-700 hover:underline flex items-center gap-0.5"
                      >
                        <CheckCheck className="w-3 h-3" /> Mark read
                      </button>
                    )}
                  </div>

                  {notifWarning ? (
                    <div className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg font-medium border border-amber-100">
                      {notifWarning}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400 font-medium">
                      No notifications yet
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto space-y-2 scrollbar-thin">
                      {notifications.map((notif: any) => (
                        <div 
                          key={notif.id}
                          onClick={() => handleNotifClick(notif)}
                          className={cn(
                            "p-2.5 rounded-lg text-[11px] leading-relaxed border text-left cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
                            notif.isPendingEbook 
                              ? "bg-amber-50/70 border-amber-200 text-amber-950 font-semibold hover:bg-amber-100/80" 
                              : notif.is_read 
                                ? "bg-gray-50/50 text-gray-600 border-transparent hover:bg-gray-100/60" 
                                : "bg-green-50/40 text-gray-900 border-green-200/60 font-medium hover:bg-green-100/60"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-gray-900 flex items-center gap-1">
                              {notif.title}
                            </span>
                            <span className="text-[9px] text-gray-400">
                              {new Date(notif.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700 text-[10px]">{notif.message}</p>
                          <div className="mt-1 flex items-center justify-end text-[9px] font-black uppercase text-indigo-600 gap-0.5">
                            <span>Open & Review</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>
        )}

        {/* Top Header - Desktop (Optional, for profile/notifications) */}
        <header className="hidden md:flex bg-white dark:bg-[#0d0d15] border-b border-gray-200 dark:border-white/5 px-8 h-16 items-center justify-end sticky top-0 z-40">
          <div className="flex items-center gap-6">
            {/* Major Admin Pending Reviews Shortcut (Desktop) */}
            {isAdmin && pendingBooksList.length > 0 && (
              <button
                onClick={() => navigate(`/edit/${pendingBooksList[0].id}`)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all animate-pulse"
                title="Click to review pending eBooks"
              >
                <Clock className="w-4 h-4" />
                <span>Pending Reviews ({pendingBooksList.length})</span>
              </button>
            )}

            <Link 
              to="/blog" 
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-gray-700 dark:text-gray-300"
            >
              <Newspaper className="w-3.5 h-3.5 text-green-700 dark:text-[#EAB308]" />
              <span>Blog</span>
            </Link>
            <Link 
              to="/videos" 
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-gray-700 dark:text-gray-300"
            >
              <Video className="w-3.5 h-3.5 text-green-700 dark:text-[#EAB308]" />
              <span>Videos</span>
            </Link>
            <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />
            <ThemeToggle />
            
            {/* Notification Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 border border-white rounded-full" />
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 p-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                    <span className="font-bold text-sm text-gray-900">Notifications ({unreadCount})</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-xs font-semibold text-green-700 hover:underline flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark read
                      </button>
                    )}
                  </div>

                  {notifWarning ? (
                    <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg font-medium border border-amber-100 mb-2">
                      {notifWarning}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400 font-medium">
                      No notifications yet
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-2.5 scrollbar-thin">
                      {notifications.map((notif: any) => (
                        <div 
                          key={notif.id}
                          onClick={() => handleNotifClick(notif)}
                          className={cn(
                            "p-3 rounded-xl text-xs leading-relaxed border text-left cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
                            notif.isPendingEbook 
                              ? "bg-amber-50/80 border-amber-200 text-amber-950 font-semibold hover:bg-amber-100/90" 
                              : notif.is_read 
                                ? "bg-gray-50/50 text-gray-600 border-transparent hover:bg-gray-100/60" 
                                : "bg-green-50/40 text-gray-900 border-green-200/60 font-medium hover:bg-green-100/60"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-gray-900 flex items-center gap-1">
                              {notif.title}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(notif.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700 text-xs">{notif.message}</p>
                          <div className="mt-1.5 flex items-center justify-end text-[10px] font-black uppercase text-indigo-600 gap-1">
                            <span>Open & Review</span>
                            <ExternalLink className="w-3 h-3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-gray-200" />

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{profile?.full_name || user?.email}</p>
                <p className="text-xs text-gray-500">@{profile?.username || 'user'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                {(profile?.full_name || user?.email || '?')[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className={cn("flex-1 w-full max-w-full overflow-x-hidden pb-20 md:pb-24", hideMobileHeader ? "p-0 md:p-8" : "p-2 sm:p-4 md:p-8")}>
          {children}
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white flex flex-col">
            <div className="p-6 flex items-center justify-between border-b border-gray-100 mb-2">
              <div className="flex flex-col gap-1">
                <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity" onClick={() => setIsMobileMenuOpen(false)}>
                  <BookOpen className="w-6 h-6 text-green-700" />
                  <span className="font-bold text-lg tracking-tight">EVVEX</span>
                </Link>
                <div>
                  {accountTier === 'admin' || isAdmin ? (
                    <div className="bg-red-100 text-red-700 text-[8px] font-black uppercase tracking-widest py-0.5 px-1.5 rounded inline-block">Administrator</div>
                  ) : isMpr ? (
                    <div className="bg-purple-100 text-purple-700 text-[8px] font-black uppercase tracking-widest py-0.5 px-1.5 rounded inline-block">Marketing Partner</div>
                  ) : isVendorUser ? (
                    <div className="bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase tracking-widest py-0.5 px-1.5 rounded inline-block">Verified Vendor</div>
                  ) : accountTier === 'premium' ? (
                    <div className="bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-widest py-0.5 px-1.5 rounded inline-block">VIP Patron</div>
                  ) : (
                    <div className="bg-gray-100 text-gray-700 text-[8px] font-black uppercase tracking-widest py-0.5 px-1.5 rounded inline-block">Visitor / Patron</div>
                  )}
                </div>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 px-4 space-y-1">
              {menuItems.filter(i => !i.hidden).map((item) => {
                const isActive = location.pathname === item.path;
                const Component = item.path ? Link : 'button';
                const props: any = item.path ? { to: item.path } : { onClick: () => { item.action?.(); setIsMobileMenuOpen(false); } };

                return (
                  <Component
                    key={item.label}
                    {...props}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left",
                      isActive
                        ? "bg-green-50 text-green-700"
                        : item.color || "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Component>
                );
              })}
            </nav>
            <div className="p-4 border-t border-gray-100 space-y-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-black text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Log Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Fixed Bottom Footer with Essential App Navigation: Home, Trivia Hub, Wallet, Setting, Profile */}
      <footer className="fixed bottom-0 left-0 right-0 md:left-64 z-40 border-t border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#0d0d15]/95 backdrop-blur-md py-2 px-3 sm:px-6 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <Link
            to="/dashboard"
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all",
              location.pathname === '/dashboard' || location.pathname === '/'
                ? "text-green-700 dark:text-[#EAB308] font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-green-700 dark:hover:text-[#EAB308] font-medium"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[11px] tracking-tight">Home</span>
          </Link>

          <Link
            to="/trivia"
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all",
              location.pathname === '/trivia' || location.pathname.startsWith('/trivia')
                ? "text-green-700 dark:text-[#EAB308] font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-green-700 dark:hover:text-[#EAB308] font-medium"
            )}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-[11px] tracking-tight">Trivia Hub</span>
          </Link>

          <Link
            to="/earnings"
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all",
              location.pathname === '/earnings' || location.pathname.startsWith('/earnings')
                ? "text-green-700 dark:text-[#EAB308] font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-green-700 dark:hover:text-[#EAB308] font-medium"
            )}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[11px] tracking-tight">Wallet</span>
          </Link>

          <Link
            to="/settings"
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all",
              location.pathname === '/settings'
                ? "text-green-700 dark:text-[#EAB308] font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-green-700 dark:hover:text-[#EAB308] font-medium"
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[11px] tracking-tight">Setting</span>
          </Link>

          <Link
            to="/profile"
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all",
              location.pathname === '/profile'
                ? "text-green-700 dark:text-[#EAB308] font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-green-700 dark:hover:text-[#EAB308] font-medium"
            )}
          >
            <User className="w-5 h-5" />
            <span className="text-[11px] tracking-tight">Profile</span>
          </Link>
        </div>
      </footer>

      {/* User Feedback Modal */}
      <UserFeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </div>
  );
};
