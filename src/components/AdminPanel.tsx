import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  Wallet, 
  Trophy, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Search, 
  ShieldAlert, 
  CheckSquare, 
  Plus, 
  RefreshCw, 
  Database, 
  Mail, 
  Cpu, 
  ShieldCheck,
  LayoutDashboard,
  Compass,
  ListTodo,
  Radio,
  Megaphone,
  Layers,
  History,
  Activity,
  Award,
  Bell,
  Image,
  Settings,
  FileText,
  HelpCircle,
  LogOut,
  ChevronRight,
  Filter,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Globe,
  Trash2,
  Check,
  Lock,
  Unlock,
  Building2,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  ClipboardList
} from 'lucide-react';
import { User, Challenge, FeedPost, Transaction, AdminStats, ReportItem, UserRequest } from '../types';

interface AdminPanelProps {
  stats: AdminStats;
  users: User[];
  challenges: Challenge[];
  transactions: Transaction[];
  feedPosts: FeedPost[];
  reports: ReportItem[];
  userRequests: UserRequest[];
  onUpdateStats: (newStats: AdminStats) => void;
  onModifyUserStatus: (userId: string, newStatus: 'basic' | 'premium') => void;
  onApproveTransaction: (txId: string) => void;
  onRejectTransaction: (txId: string) => void;
  onAddMockChallenge: (ch: Challenge) => void;
  onDeleteFeedPost: (postId: string) => void;
  onResolveReport: (reportId: string) => void;
  onGrantRequest: (id: string) => void;
  onDeclineRequest: (id: string) => void;
  onToast: (msg: string, type: 'success' | 'info') => void;
}

export default function AdminPanel({
  stats,
  users,
  challenges,
  transactions,
  feedPosts,
  reports,
  userRequests,
  onUpdateStats,
  onModifyUserStatus,
  onApproveTransaction,
  onRejectTransaction,
  onAddMockChallenge,
  onDeleteFeedPost,
  onResolveReport,
  onGrantRequest,
  onDeclineRequest,
  onToast
}: AdminPanelProps) {
  
  // Tab control states (21 sections requested)
  type SidebarTab = 
    | 'dashboard' 
    | 'users' 
    | 'challenges' 
    | 'competitions' 
    | 'quizzes' 
    | 'liveControl'
    | 'contentFeed' 
    | 'advertisements' 
    | 'walletSystem' 
    | 'transactions' 
    | 'subscriptions' 
    | 'referrals' 
    | 'leaderboards' 
    | 'reports' 
    | 'notifications' 
    | 'moderation' 
    | 'mediaLibrary' 
    | 'rewards' 
    | 'analytics' 
    | 'settings' 
    | 'auditLogs' 
    | 'supportTickets'
    | 'userRequests'
    | 'integrations';

  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');
  
  // Shared dialog state for view/edit items
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionConfirmItem, setActionConfirmItem] = useState<{ type: string; title: string; desc: string; onConfirm: () => void } | null>(null);
  
  // Search parameters
  const [globalSearch, setGlobalSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('all');
  const [txStatusFilter, setTxStatusFilter] = useState<string>('all');
  const [reqStatusFilter, setReqStatusFilter] = useState<'all' | 'pending' | 'granted' | 'declined'>('all');
  const [reqTypeFilter, setReqTypeFilter] = useState<'all' | 'credits' | 'upgrade' | 'support' | 'other'>('all');
  const [reqSearch, setReqSearch] = useState('');
  
  // Custom interactive mock data stores
  const [mockCompetitions, setMockCompetitions] = useState([
    { id: 'comp-1', title: 'Naira Brainfest Champion Bowl', sponsor: 'OPay Nigeria', prizePool: 250000, fee: 1000, participants: 412, status: 'live', votes: 1290, criteria: '90%+ Quiz Score + Speed Handshake' },
    { id: 'comp-2', title: 'Naira Mastermind Hackathon', sponsor: 'Mainstack', prizePool: 500000, fee: 2500, participants: 180, status: 'upcoming', votes: 0, criteria: 'Originality + Fintech Practical Quiz' },
    { id: 'comp-3', title: 'Lagos Creative Content Contest', sponsor: 'PalmPay Ltd', prizePool: 350000, fee: 1500, participants: 320, status: 'ended', votes: 2400, criteria: 'Community Vote (70%) + Expert Audit (30%)' }
  ]);

  const [mockQuizzes, setMockQuizzes] = useState([
    { id: 'q-1', title: 'OPay Paradigm Handshake Speed test', category: 'Fintech', r_amount: 150, fee: 0, time_limit: '15s/Q', max_p: 500, status: 'live', questions: 5 },
    { id: 'q-2', title: 'Palmpay Double-Spend Cryptographic Ledger', category: 'Security', r_amount: 500, fee: 100, time_limit: '12s/Q', max_p: 250, status: 'scheduled', questions: 10 },
    { id: 'q-3', title: 'Paystack Secret API Headers Scrape', category: 'Coding', r_amount: 300, fee: 50, time_limit: '20s/Q', max_p: 1000, status: 'ended', questions: 8 }
  ]);

  // Quiz Builder State
  const [quizForm, setQuizForm] = useState({
    title: '',
    category: 'Fintech',
    desc: '',
    time_limit: '15s/Q',
    reward: 150,
    fee: 0,
    max_p: 500,
    questions: [
      { q: 'What cryptographic digest code prevents double-spend transactions?', o1: 'SHA-256 Webhook Hash', o2: 'MD5 Static Signature', o1_correct: true }
    ]
  });

  const [mockAds, setMockAds] = useState([
    { id: 'ad-1', advertiser: 'Kuda Microfinance Bank', budget: 120000, duration: '14 Days', placement: 'Sidebar Banner', clicks: 1240, views: 24500, status: 'running', banner: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=400' },
    { id: 'ad-2', advertiser: 'Fairmoney Quick Loans', budget: 85000, duration: '7 Days', placement: 'Daily Quiz Footer', clicks: 680, views: 11000, status: 'paused', banner: 'https://images.unsplash.com/photo-1542222024-c39e2281f121?q=80&w=400' }
  ]);

  const [mockSubscriptions, setMockSubscriptions] = useState([
    { id: 'sub-f', name: 'Free', price: 0, duration: 'Lifetime', features: 'Access basic quizzes, standard daily limits, regular payout reviews', activeSubscribers: 1240, status: 'Active' },
    { id: 'sub-b', name: 'Basic', price: 2000, duration: 'Monthly', features: 'Access standard quizzes, double limits, email support', activeSubscribers: 450, status: 'Active' },
    { id: 'sub-p', name: 'Premium', price: 5000, duration: 'Monthly', features: 'Zero commission charges, instant webhook handshakes, priority VIP novel archives', activeSubscribers: 312, status: 'Active' },
    { id: 'sub-v', name: 'VIP', price: 15000, duration: 'Quarterly', features: 'Access sponsored global grants, featured creator bulletin tags, co-host custom houses', activeSubscribers: 85, status: 'Active' }
  ]);

  const [activeSubscribersList, setActiveSubscribersList] = useState([
    { id: 'subscr-1', username: 'samuel_opay', email: 'samuel@opay.ng', plan: 'Premium', price: 5000, startDate: '2026-05-15', renewalDate: '2026-06-15', status: 'Auto-Renewing' },
    { id: 'subscr-2', username: 'dan_stack', email: 'dan@mainstack.com', plan: 'VIP', price: 15000, startDate: '2026-04-01', renewalDate: '2026-07-01', status: 'Active' },
    { id: 'subscr-4', username: 'isoko_p', email: 'isoko@palmpay.co', plan: 'Basic', price: 2000, startDate: '2026-06-01', renewalDate: '2026-07-01', status: 'Active' },
    { id: 'subscr-5', username: 'john_doe', email: 'john@gmail.com', plan: 'Free', price: 0, startDate: '2026-02-10', renewalDate: 'Unlimited', status: 'Lifetime' },
    { id: 'subscr-6', username: 'quick_borrower', email: 'borrow@fairmoney.ng', plan: 'Premium', price: 5000, startDate: '2026-05-07', renewalDate: '2026-06-07', status: 'Expired' }
  ]);

  const [mockAudits, setMockAudits] = useState([
    { id: 'aud-1', admin: 'winbigonly', actionType: 'Wallet Adjusted', action: 'Approved Withdrawal TX #WDL_7718', ip: '102.89.44.11', device: 'MacBook Pro M3 Pro', date: '2026-06-07' },
    { id: 'aud-2', admin: 'winbigonly', actionType: 'User Modified', action: 'Upgraded basic account to Sovereign Premium Pro for @samuel_opay', ip: '102.89.44.11', device: 'Chrome Client Console', date: '2026-06-07' },
    { id: 'aud-3', admin: 'winbigonly', actionType: 'Challenge Deleted', action: 'Purged offensive feed post #feed_902', ip: '102.89.44.11', device: 'MacBook Pro M3 Pro', date: '2026-06-07' },
    { id: 'aud-4', admin: 'finance_bot', actionType: 'Wallet Adjusted', action: 'Credited @dan_stack with ₦150,000 challenge winnings bonus', ip: '192.168.1.100', device: 'Server Crontab Engine', date: '2026-06-06' },
    { id: 'aud-5', admin: 'tutor_moderator', actionType: 'User Modified', action: 'Suspended spam user account @scam_flicker', ip: '105.112.38.99', device: 'Android Operations Client', date: '2026-06-05' },
    { id: 'aud-6', admin: 'winbigonly', actionType: 'Challenge Deleted', action: 'Deleted inactive test competition "Naira Handshake Draft #1"', ip: '102.89.44.11', device: 'MacBook Pro', date: '2026-06-04' }
  ]);

  // Filters state for Audit Logs
  const [auditSearch, setAuditSearch] = useState('');
  const [auditAdminFilter, setAuditAdminFilter] = useState('all');
  const [auditTypeFilter, setAuditTypeFilter] = useState('all');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');

  // Subscription plan creation states
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('');
  const [newPlanDuration, setNewPlanDuration] = useState('Monthly');
  const [newPlanFeatures, setNewPlanFeatures] = useState('');

  const [mockTickets, setMockTickets] = useState([
    { id: 'tkt-1', user: 'samuel_opay', title: 'Naira instant withdraw payout delay', type: 'Wallet Issue', date: '2026-06-07', priority: 'High', status: 'pending', desc: 'I initialized an instant OPay bank settlement but my dashboard says pending. Please sync callback webhook.' },
    { id: 'tkt-2', user: 'dan_stack', title: 'Tutor royalty sharing spreadsheet calculation error', type: 'Royalty Dispute', date: '2026-06-06', priority: 'Medium', status: 'resolved', desc: 'The 70/30 platform revenue split seems to have slightly trimmed down client ledger. Help review.' }
  ]);

  const [activeLiveQuizSession, setActiveLiveQuizSession] = useState({
    quizTitle: 'OPay Paradigm Handshake Speed test',
    participantsCount: 142,
    timerSeconds: 15,
    lastCorrectRate: '86%',
    paused: false,
    sessionLeaderboard: [
      { rank: 1, user: 'isoko_p', score: '98 pts', speed: '0.4s' },
      { rank: 2, user: 'samuel_opay', score: '92 pts', speed: '0.9s' },
      { rank: 3, user: 'dan_stack', score: '88 pts', speed: '1.2s' }
    ]
  });

  // Admin active live quiz timer countdown ticking loop
  useEffect(() => {
    let intervalId: any = null;
    if (activeLiveQuizSession.timerSeconds > 0 && !activeLiveQuizSession.paused) {
      intervalId = setInterval(() => {
        setActiveLiveQuizSession(prev => {
          if (prev.timerSeconds <= 1) {
            clearInterval(intervalId);
            return { ...prev, timerSeconds: 0 };
          }
          return { ...prev, timerSeconds: prev.timerSeconds - 1 };
        });
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeLiveQuizSession.timerSeconds, activeLiveQuizSession.paused]);

  const [notificationBuilder, setNotificationBuilder] = useState({
    title: '',
    channel: 'all',
    type: 'In-App',
    body: ''
  });

  // Integration variables status check state
  const [integrationConfig, setIntegrationConfig] = useState({
    supabase: { configured: true, url: 'https://iyqip6xzsmidoljwufh3z4.supabase.co' },
    supabaseServiceRole: { configured: true },
    paystack: { configured: true, publicKey: 'pk_live_d81907cb5fe8c' },
    brevo: { configured: true },
    openrouter: { configured: true }
  });
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Helper metrics aggregator
  const pendingTxCount = transactions.filter(t => t.status === 'pending').length;
  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;
  const totalVerifiedUsers = users.length + 312; // aggregate tracker

  const triggerToast = (msg: string, type: 'success' | 'info') => {
    onToast(msg, type);
  };

  const handleActionConfirm = (title: string, desc: string, onConfirm: () => void) => {
    setActionConfirmItem({
      type: 'confirm',
      title,
      desc,
      onConfirm: () => {
        onConfirm();
        setActionConfirmItem(null);
      }
    });
  };

  // 1. Sidebar menu listings list configuration
  const sidebarItems: { id: SidebarTab; label: string; icon: React.ComponentType<any>; count?: number; dot?: boolean }[] = [
    { id: 'dashboard', label: 'Platform Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users Portal', icon: Users },
    { id: 'challenges', label: 'Competitions Builder', icon: Trophy },
    { id: 'competitions', label: 'Sponsored Cups', icon: Compass },
    { id: 'quizzes', label: 'Master Quiz Banks', icon: ListTodo },
    { id: 'liveControl', label: 'Live Control Room', icon: Radio, dot: true },
    { id: 'contentFeed', label: 'Social Content Feed', icon: Megaphone },
    { id: 'advertisements', label: 'Sponsor Ads System', icon: Layers },
    { id: 'walletSystem', label: 'Vault Audit Overview', icon: Wallet },
    { id: 'transactions', label: 'Trans Settlements', icon: History, count: pendingTxCount },
    { id: 'subscriptions', label: 'Membership Tiers', icon: Award },
    { id: 'referrals', label: 'Referral Trees', icon: Activity },
    { id: 'leaderboards', label: 'Leaderboard Banks', icon: Trophy },
    { id: 'reports', label: 'Flagged Reports', icon: AlertTriangle, count: pendingReportsCount },
    { id: 'notifications', label: 'Notification Dispatch', icon: Bell },
    { id: 'moderation', label: 'Content Moderation', icon: CheckSquare },
    { id: 'mediaLibrary', label: 'Media Library Vault', icon: Image },
    { id: 'rewards', label: 'Reward Catalogs', icon: Award },
    { id: 'analytics', label: 'Performance Graphs', icon: BarChart3 },
    { id: 'supportTickets', label: 'Support Tickets', icon: HelpCircle },
    { id: 'userRequests', label: 'User Request Board', icon: ClipboardList, count: userRequests.filter(r => r.status === 'pending').length },
    { id: 'integrations', label: 'Tech Integrations', icon: ShieldCheck },
    { id: 'settings', label: 'General Configuration', icon: Settings },
  ];

  return (
    <div id="admin_master_viewport" className="p-0 max-w-[1700px] mx-auto text-left select-none pb-24 md:pb-12 bg-slate-50 min-h-screen flex flex-col md:flex-row relative">
      
      {/* 1. COMPACT ENTERPRISE SIDEBAR CONTAINER */}
      <div id="admin_nav_sidebar" className="w-full md:w-72 bg-slate-900 text-white shrink-0 shadow-xl flex flex-col justify-between sticky top-0 md:h-screen overflow-y-auto border-r border-slate-800 scrollbar-thin">
        <div>
          {/* Logo Brand Banner */}
          <div className="p-6 border-b border-slate-805 flex items-center justify-between gap-3 bg-slate-950/40">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-rose-500 animate-pulse" />
              <div>
                <h2 className="text-sm font-black tracking-widest text-slate-100 uppercase">QUIZOE MASTER OS</h2>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase">Enterprise Hub</p>
              </div>
            </div>
            <span className="bg-rose-900 text-rose-100 text-[8px] font-black uppercase px-2 py-0.5 rounded-full ring-2 ring-rose-550/20">CEO PANEL</span>
          </div>

          <div className="p-3 my-2 bg-slate-950/20 mx-3 rounded-xl border border-slate-800">
            <span className="text-[9px] text-slate-400 font-extrabold block uppercase tracking-wider mb-1">Authenticated System Driver</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-rose-650 flex items-center justify-center font-bold text-xs shadow-md">W</div>
              <span className="text-[11px] font-bold text-slate-200">winbigonly@gmail.com</span>
            </div>
          </div>

          {/* Navigation link stacks */}
          <nav className="p-3 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`side_tab_${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs font-extrabold cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-rose-900 text-white shadow-md shadow-rose-950/40 border border-rose-800/40 translate-x-1' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span className="font-sans tracking-wide">{item.label}</span>
                  </div>
                  {item.count && item.count > 0 ? (
                    <span className="bg-rose-620 text-white font-mono font-black text-[9px] py-0.5 px-2.5 rounded-full shrink-0">
                      {item.count}
                    </span>
                  ) : item.dot ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer actions of left bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold mb-2">
            <span>Server Ping State</span>
            <span className="text-emerald-500 flex items-center gap-1">🟢 14ms Ready</span>
          </div>
          <button
            onClick={() => handleActionConfirm('Reset Administrative Worksession', 'Do you want to discard local temporary configurations?', () => {
              triggerToast('Temporary cache garbage collection completed.', 'success');
            })}
            className="w-full bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold text-[11px] py-2 px-3.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Flush Memory Cache</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN SCROLLABLE OPERATIONS COMMAND BOARD */}
      <main id="admin_main_content" className="flex-grow p-6 md:p-8 overflow-y-auto max-h-screen text-slate-900">
        
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in text-left">
            
            {/* Header section with live timestamp tracker */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-150 mb-4 shadow-xs">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <LayoutDashboard className="w-6 h-6 text-rose-650" />
                  Quizoe Central Operating System
                </h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">Platform-wide visualizer of all financial ledgers, participant speed triggers, and social moderations.</p>
              </div>
              <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200 shrink-0 font-mono text-[10.5px] font-black text-slate-500">
                Lagos Standard Current Time: 2026-06-07 10:56 UTC
              </div>
            </div>

            {/* Platform metrics bento grid (Banking style) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between hover:border-indigo-250 transition-colors">
                <div>
                  <div className="flex items-center justify-between text-slate-400 font-extrabold uppercase text-[10px] tracking-wider mb-2">
                    <span>Total Client Base</span>
                    <Users className="w-4 h-4 text-indigo-500" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 font-mono tracking-tight">{totalVerifiedUsers}</h3>
                </div>
                <div className="text-[10.5px] text-green-600 font-bold mt-4 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+18.3% month over month</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between hover:border-rose-250 transition-colors">
                <div>
                  <div className="flex items-center justify-between text-slate-400 font-extrabold uppercase text-[10px] tracking-wider mb-2">
                    <span>Active Quiz Sockets</span>
                    <Radio className="w-4 h-4 text-rose-500" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 font-mono tracking-tight">{stats.activeUsers}</h3>
                </div>
                <div className="text-[10.5px] text-rose-600 font-bold mt-4 flex items-center gap-0.5 animate-pulse">
                  <span>● 142 clients connected live to quizzes right now</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between hover:border-emerald-250 transition-colors">
                <div>
                  <div className="flex items-center justify-between text-slate-400 font-extrabold uppercase text-[10px] tracking-wider mb-2">
                    <span>Gross Revenue Index</span>
                    <Wallet className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className="text-3xl font-black text-emerald-600 font-mono tracking-tight">₦{stats.totalRevenue.toLocaleString()}</h3>
                </div>
                <div className="text-[10.5px] text-slate-500 font-semibold mt-4">
                  <span>Sovereign vault ledger synchronised</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between hover:border-amber-250 transition-colors">
                <div>
                  <div className="flex items-center justify-between text-slate-400 font-extrabold uppercase text-[10px] tracking-wider mb-2">
                    <span>Settlements Handled</span>
                    <History className="w-4 h-4 text-amber-500" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 font-mono tracking-tight">{stats.totalTransactionsNum}</h3>
                </div>
                <div className="text-[10.5px] text-amber-600 font-bold mt-4 flex items-center gap-1">
                  <span>● {pendingTxCount} settlements awaiting manual audit</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Master Quick Handshakes Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <button onClick={() => setActiveTab('quizzes')} className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100/60 p-3.5 rounded-xl cursor-pointer text-center text-xs font-extrabold text-indigo-850 transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm">
                  <Plus className="w-4 h-4" /> Assemble Quiz
                </button>
                <button onClick={() => setActiveTab('challenges')} className="bg-rose-50 border border-rose-100 hover:bg-rose-100/60 p-3.5 rounded-xl cursor-pointer text-center text-xs font-extrabold text-rose-850 transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm">
                  <Trophy className="w-4 h-4" /> Create Cup
                </button>
                <button onClick={() => setActiveTab('notifications')} className="bg-amber-50 border border-amber-100 hover:bg-amber-100/60 p-3.5 rounded-xl cursor-pointer text-center text-xs font-extrabold text-amber-850 transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm">
                  <Bell className="w-4 h-4" /> Send Broadcast
                </button>
                <button onClick={() => setActiveTab('transactions')} className="bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/60 p-3.5 rounded-xl cursor-pointer text-center text-xs font-extrabold text-emerald-850 transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm">
                  <Wallet className="w-4 h-4" /> Credit Client Wallet
                </button>
                <button onClick={() => {
                  triggerToast('Dumping system data backups...', 'success');
                }} className="bg-slate-100 border border-slate-200 hover:bg-slate-200 p-3.5 rounded-xl cursor-pointer text-center text-xs font-extrabold text-slate-705 transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm">
                  <FileSpreadsheet className="w-4 h-4" /> Export Excel
                </button>
                <button onClick={() => setActiveTab('liveControl')} className="bg-purple-50 border border-purple-100 hover:bg-purple-100/60 p-3.5 rounded-xl cursor-pointer text-center text-xs font-extrabold text-purple-850 transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm">
                  <Radio className="w-4 h-4" /> Control Room
                </button>
              </div>
            </div>

            {/* Recent activity split dashboards logs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Recent Registrants */}
              <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs text-left">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h4 className="text-xs font-black text-slate-905 uppercase tracking-wider">Latest Platform Registrations</h4>
                  <button onClick={() => setActiveTab('users')} className="text-indigo-650 hover:text-indigo-800 text-[10.5px] font-black cursor-pointer flex items-center gap-0.5">
                    <span>View Registrar</span> <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3.5">
                  {users.slice(0, 5).map((usr) => (
                    <div key={usr.id} className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <img src={usr.avatar} className="w-7 h-7 rounded-lg object-cover border border-slate-150" alt="" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">@{usr.username}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{usr.email}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-extrabold ${
                        usr.membershipStatus === 'premium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-150 text-slate-655'
                      }`}>
                        {usr.membershipStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Active Contests tracker */}
              <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs text-left">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h4 className="text-xs font-black text-slate-905 uppercase tracking-wider">Platform Live Active Contests</h4>
                  <button onClick={() => setActiveTab('competitions')} className="text-indigo-650 hover:text-indigo-800 text-[10.5px] font-black cursor-pointer flex items-center gap-0.5">
                    <span>View Contests</span> <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3.5">
                  {challenges.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <img src={c.coverImage} className="w-7 h-7 rounded-lg object-cover shrink-0" alt="" />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-800 truncate">{c.title}</p>
                          <p className="text-[9.5px] text-indigo-650 font-black uppercase font-mono mt-0.5">{c.category}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-600 font-mono">₦{c.prizePool.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: USER MANAGEMENT PORTAL */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-150">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" /> User Accounts Registrar Registry
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Modify credit balance, inspect referral campaigns, reset access keys, or adjust role authorizations.</p>
              </div>

              {/* Filters Stacks */}
              <div className="flex gap-2 flex-wrap text-xs font-bold shrink-0">
                <select 
                  value={userRoleFilter} 
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-slate-100 hover:bg-slate-150 py-2 px-3 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="all">Every Role</option>
                  <option value="ceo">CEO Admins</option>
                  <option value="tutor">Tutors</option>
                  <option value="premium">Premium Pro</option>
                  <option value="free">Basic Seekers</option>
                </select>

                <div className="dashboard-search-bar flex items-center pl-3 pr-2 py-1.5 w-64">
                  <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search name, phone, email..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="bg-transparent text-xs font-semibold focus:outline-none w-full"
                  />
                </div>
              </div>
            </div>

            {/* Registrant Table */}
            <div className="bg-white rounded-3xl border border-slate-150 overflow-hidden shadow-xs">
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Profile Identity</th>
                      <th>Contact Email</th>
                      <th>Role Membership</th>
                      <th>Country Code</th>
                      <th>Wallet Credit Balance</th>
                      <th>Actions Control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(usr => {
                        const matchedSearch = usr.username.toLowerCase().includes(globalSearch.toLowerCase()) || usr.email.toLowerCase().includes(globalSearch.toLowerCase());
                        const matchedRole = userRoleFilter === 'all' || usr.membershipStatus === userRoleFilter || (userRoleFilter === 'ceo' && usr.username.toLowerCase() === 'winbigonly');
                        return matchedSearch && matchedRole;
                      })
                      .map((usr) => (
                        <tr key={usr.id} className="hover:bg-slate-50/40 transition-colors">
                          <td>
                            <div className="flex items-center gap-2.5">
                              <img src={usr.avatar} className="w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-150" alt="" />
                              <div>
                                <p className="font-extrabold text-slate-900 text-xs">@{usr.username}</p>
                                <p className="text-[10px] text-slate-400 font-bold">Ref: {usr.referralCode || 'N/A'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="font-mono text-slate-600 text-[11px]">{usr.email}</td>
                          <td>
                            <span className={`px-2 py-1 rounded text-[9.5px] uppercase font-black ${
                              usr.username.toLowerCase() === 'winbigonly' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                              usr.membershipStatus === 'premium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                            }`}>
                              👑 {usr.username.toLowerCase() === 'winbigonly' ? 'ceo admin' : usr.membershipStatus}
                            </span>
                          </td>
                          <td className="text-slate-500 font-bold text-xs">NG (Nigeria)</td>
                          <td className="font-bold font-mono text-slate-900 text-xs">₦{usr.balance.toLocaleString()}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedUser(usr)}
                                className="bg-indigo-50 hover:bg-indigo-150 text-indigo-750 font-bold text-[10.5px] py-1 px-3 rounded-lg cursor-pointer"
                              >
                                View Folder
                              </button>
                              
                              {usr.membershipStatus === 'basic' ? (
                                <button
                                  onClick={() => handleActionConfirm(`Upgrade ${usr.username} to Premium`, `Authorize premium features and lift limiters for @${usr.username}?`, () => {
                                    onModifyUserStatus(usr.id, 'premium');
                                    triggerToast(`User @${usr.username} promoted to Sovereign Premium!`, "success");
                                  })}
                                  className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-250 font-bold text-[10px] py-1 px-3 rounded-lg cursor-pointer"
                                >
                                  Make Premium
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActionConfirm(`Revoke premium for ${usr.username}`, `Restrict client to basic operations?`, () => {
                                    onModifyUserStatus(usr.id, 'basic');
                                    triggerToast(`Premium membership suspended for @${usr.username}.`, "info");
                                  })}
                                  className="bg-slate-150 hover:bg-slate-200 text-slate-600 font-black text-[10px] py-1 px-3 rounded-lg cursor-pointer"
                                >
                                  Revert Basic
                                </button>
                              )}

                              <button
                                onClick={() => handleActionConfirm(`Force Balance Adjustment`, `Do you want to inject ₦5,000 into @${usr.username}'s active wallet as a loyalty bonus?`, () => {
                                  usr.balance += 5000;
                                  triggerToast(`₦5,000 credit handshake injected instantly into @${usr.username}'s wallet.`, 'success');
                                })}
                                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] py-1 px-2.5 rounded-lg cursor-pointer"
                              >
                                +₦5,000 Credit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COMPETITIONS (CHALLENGES) BUILDER */}
        {activeTab === 'challenges' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in text-left">
            
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-150 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3 mb-6">
                <Trophy className="w-5 h-5 text-rose-650" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase">Assemble Prize Bowl Event</h3>
                  <p className="text-[10.5px] text-slate-400 font-sans font-semibold">Publish entry-fee based challenge categories and rewards pools.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block mb-1">Challenge Name</label>
                  <input
                    type="text"
                    required
                    id="frm_ch_name"
                    placeholder="e.g. TikTok Afrobeats Grand Master"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block mb-1">Operational Class</label>
                  <select
                    id="frm_ch_sector"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                  >
                    <option value="Quiz">Interactive Quiz Contest</option>
                    <option value="Photography">Visual Photo Battle</option>
                    <option value="Food">Culinary Gourmet Critique</option>
                    <option value="Business">Entrepreneurship Idea Pitch</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Prize Fund (₦)</label>
                    <input
                      type="number"
                      id="frm_ch_prize"
                      placeholder="e.g. 150000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Ticket Cost (₦)</label>
                    <input
                      type="number"
                      id="frm_ch_entry"
                      placeholder="e.g. 500"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Voting &amp; Judging Protocol</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none">
                    <option value="vote">Global User Poll Consensus</option>
                    <option value="judge">Tutor Commission Appraisal</option>
                    <option value="speed">Speed &amp; Accuracy Score System</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const elName = document.getElementById('frm_ch_name') as HTMLInputElement;
                    const elSector = document.getElementById('frm_ch_sector') as HTMLSelectElement;
                    const elPrize = document.getElementById('frm_ch_prize') as HTMLInputElement;
                    const elEntry = document.getElementById('frm_ch_entry') as HTMLInputElement;

                    if (!elName?.value) {
                      triggerToast('Please provide a challenge title before publishing.', 'info');
                      return;
                    }

                    const sampleCh: Challenge = {
                      id: `ch_${Date.now()}`,
                      title: elName.value,
                      description: 'Published via Enterprise Live Console Panel Workspace Hub.',
                      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300',
                      category: elSector.value,
                      prizePool: Number(elPrize?.value) || 50000,
                      entryFee: Number(elEntry?.value) || 0,
                      participants: 0,
                      maxParticipants: 500,
                      timeLeft: '7 Days Left',
                      status: 'active'
                    };

                    onAddMockChallenge(sampleCh);
                    triggerToast(`Dynamic Competition "${elName.value}" deployed successfully!`, 'success');
                    
                    if (elName) elName.value = '';
                    if (elPrize) elPrize.value = '';
                    if (elEntry) elEntry.value = '';
                  }}
                  className="w-full bg-rose-900 hover:bg-rose-850 text-white font-bold py-3.5 px-6 rounded-xl text-xs cursor-pointer shadow-md transition-all uppercase"
                >
                  🚀 Publish Global Prize Bowl
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-150 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-slate-50 pb-3 mb-4">
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase">Board Competition Ledger</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Showing {challenges.length} rows</span>
                </div>

                <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-2">
                  {challenges.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-150 flex items-center justify-between hover:bg-slate-100/50 transition-colors">
                      <div className="flex gap-3 overflow-hidden">
                        <img src={c.coverImage} className="w-11 h-11 rounded-lg object-cover shrink-0" alt="" />
                        <div className="overflow-hidden">
                          <h4 className="font-black text-slate-900 text-xs truncate leading-normal">{c.title}</h4>
                          <span className="text-[9.5px] text-indigo-600 font-extrabold uppercase bg-indigo-50 py-0.5 px-1.5 rounded mt-1.5 inline-block">
                            {c.category}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-emerald-600 font-mono">₦{c.prizePool.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 font-bold font-sans mt-0.5">Fee: ₦{c.entryFee}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: SPONSORED CUPS */}
        {activeTab === 'competitions' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white p-6 rounded-3xl border border-slate-150">
              <h2 className="text-md font-black text-slate-900 uppercase flex items-center gap-1.5">
                <Compass className="w-5 h-5 text-indigo-650" /> Sponsored Cups Management
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-1">Setup external brand advertisements, track payout metrics, and select winners of creative challenges.</p>
            </div>

            <div className="admin-table-container bg-white rounded-3xl border border-slate-150 overflow-hidden">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Cup Title</th>
                    <th>Submitting Sponsor</th>
                    <th>Grand Pool</th>
                    <th>Ticket Cost</th>
                    <th>Subscribers Count</th>
                    <th>Judges Criteria</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockCompetitions.map((comp) => (
                    <tr key={comp.id}>
                      <td className="font-extrabold text-slate-900 text-xs">{comp.title}</td>
                      <td>
                        <span className="bg-indigo-50 text-indigo-750 font-black text-[10px] px-2.5 py-1 rounded-md">
                          {comp.sponsor}
                        </span>
                      </td>
                      <td className="font-mono text-emerald-600 font-bold text-xs">₦{comp.prizePool.toLocaleString()}</td>
                      <td className="font-mono text-slate-700 font-semibold text-xs">₦{comp.fee}</td>
                      <td className="font-bold text-xs">{comp.participants} connected</td>
                      <td className="text-slate-500 font-semibold text-xs truncate max-w-xs">{comp.criteria}</td>
                      <td>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              triggerToast(`Disbursing ₦${comp.prizePool} pool awards to top participants!`, 'success');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] py-1 px-3 rounded-lg"
                          >
                            Crown Winners
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: MASTER QUIZ BANKS */}
        {activeTab === 'quizzes' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in text-left">
            
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-150">
              <h3 className="font-black text-sm text-slate-900 uppercase mb-4 flex items-center gap-1.5">
                <ListTodo className="w-5 h-5 text-indigo-650" /> Program Quiz template
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10.5px] text-slate-400 font-bold uppercase block mb-1">Quiz Title</label>
                  <input
                    type="text"
                    id="q_builder_title"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({...quizForm, title: e.target.value})}
                    placeholder="e.g. PalmPay Signature authentication"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10.5px] text-slate-400 font-bold uppercase block mb-1">Category</label>
                    <select
                      value={quizForm.category}
                      onChange={(e) => setQuizForm({...quizForm, category: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                    >
                      <option value="Fintech">Financial Systems</option>
                      <option value="Security">Ledger Vetting</option>
                      <option value="History">Regional Banking Culture</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10.5px] text-slate-400 font-bold uppercase block mb-1">Timer Bound</label>
                    <select
                      value={quizForm.time_limit}
                      onChange={(e) => setQuizForm({...quizForm, time_limit: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                    >
                      <option value="10s/Q">10s Seconds Box</option>
                      <option value="15s/Q">15s Seconds Box</option>
                      <option value="20s/Q">20s Seconds Box</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10.5px] text-slate-400 font-bold uppercase block mb-1">Reward/Player (₦)</label>
                    <input
                      type="number"
                      value={quizForm.reward}
                      onChange={(e) => setQuizForm({...quizForm, reward: Number(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] text-slate-400 font-bold uppercase block mb-1">Entry Fee (₦)</label>
                    <input
                      type="number"
                      value={quizForm.fee}
                      onChange={(e) => setQuizForm({...quizForm, fee: Number(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Question builder section */}
                <div className="border-t border-slate-100 pt-4 mt-4 text-left">
                  <h4 className="text-[11px] font-black text-rose-900 uppercase tracking-wider mb-2">Question Template Matrix</h4>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                    <input
                      type="text"
                      id="q_builder_qtext"
                      placeholder="Input Question statement..."
                      className="w-full bg-white border border-slate-150 rounded-lg p-2.5 text-xs font-semibold focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        id="q_builder_o1"
                        placeholder="Option A"
                        className="w-full bg-white border border-slate-150 rounded-lg p-2.5 text-xs font-semibold focus:outline-none"
                      />
                      <input
                        type="text"
                        id="q_builder_o2"
                        placeholder="Option B"
                        className="w-full bg-white border border-slate-150 rounded-lg p-2.5 text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!quizForm.title) {
                      triggerToast('Please provide a Quiz Title first.', 'info');
                      return;
                    }
                    const qInput = document.getElementById('q_builder_qtext') as HTMLInputElement;
                    const o1Input = document.getElementById('q_builder_o1') as HTMLInputElement;
                    const o2Input = document.getElementById('q_builder_o2') as HTMLInputElement;

                    const newQuiz = {
                      id: `q-${Date.now()}`,
                      title: quizForm.title,
                      category: quizForm.category,
                      r_amount: quizForm.reward,
                      fee: quizForm.fee,
                      time_limit: quizForm.time_limit,
                      max_p: quizForm.max_p,
                      status: 'scheduled',
                      questions: qInput?.value ? 1 : 0
                    };

                    setMockQuizzes([newQuiz, ...mockQuizzes]);
                    triggerToast(`Master compilation of Quiz "${quizForm.title}" recorded!`, 'success');
                    
                    setQuizForm({
                      title: '',
                      category: 'Fintech',
                      desc: '',
                      time_limit: '15s/Q',
                      reward: 150,
                      fee: 0,
                      max_p: 500,
                      questions: []
                    });
                    if (qInput) qInput.value = '';
                    if (o1Input) o1Input.value = '';
                    if (o2Input) o2Input.value = '';
                  }}
                  className="w-full bg-slate-905 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl text-xs cursor-pointer text-center bg-slate-900 uppercase font-mono"
                >
                  Save to Global Banks
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-150 shadow-xs text-left">
              <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-50 pb-3 mb-4 uppercase">Live In-Production Quizzes</h3>
              <div className="space-y-4">
                {mockQuizzes.map((quiz) => (
                  <div key={quiz.id} className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs leading-normal">{quiz.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold font-sans uppercase mt-1">
                        {quiz.category} • {quiz.questions} Questions • {quiz.time_limit} Group Limit
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <span className="text-xs font-black text-indigo-700 block">₦{quiz.r_amount} Bonus</span>
                        <span className={`text-[9px] font-black uppercase text-white py-0.5 px-1.5 rounded inline-block mt-1 ${
                          quiz.status === 'live' ? 'bg-green-600' : 'bg-slate-400'
                        }`}>
                          {quiz.status}
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          triggerToast(`Deleted quiz ${quiz.id} from bank.`, 'info');
                          setMockQuizzes(mockQuizzes.filter(mq => mq.id !== quiz.id));
                        }} 
                        className="p-1 px-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 6: LIVE QUIZ CONTROL ROOM */}
        {activeTab === 'liveControl' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-md font-black text-slate-909 uppercase tracking-tight flex items-center gap-2">
                  <Radio className="w-5 h-5 text-rose-500 animate-ping" /> Real-Time Live Quiz Operations Operator
                </h2>
                <p className="text-xs text-slate-400 font-medium">Overwatch participant triggers, freeze score logs, disqualify hackers or broadcast alerts.</p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => {
                    setActiveLiveQuizSession({...activeLiveQuizSession, paused: !activeLiveQuizSession.paused});
                    triggerToast(activeLiveQuizSession.paused ? 'Resumed quiz session timers.' : 'Suspended all question timers instantly.', 'info');
                  }}
                  className={`py-2 px-3.5 rounded-xl font-bold text-xs cursor-pointer ${
                    activeLiveQuizSession.paused ? 'bg-green-600 text-white' : 'bg-amber-600 text-white'
                  }`}
                >
                  {activeLiveQuizSession.paused ? '▶ Resume Session' : '⏸ Pause Session'}
                </button>
                <button
                  onClick={() => {
                    triggerToast('Sent disqualified signal feedback.', 'info');
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl cursor-pointer"
                >
                  🚨 Block Disruptors
                </button>
              </div>
            </div>

            {/* QUIZ TIMER CONTROL BLOCK */}
            <div className="bg-gradient-to-r from-slate-900 via-[#161a38] to-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-left space-y-1">
                <span className="text-[9px] uppercase tracking-widest font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 py-0.5 px-2.5 rounded-full inline-block">
                  ⏱️ Live Conversational Quiz Master Controls
                </span>
                <h3 className="text-sm font-extrabold text-slate-100">Dynamic Quiz Timer Operator Panel</h3>
                <p className="text-[11px] text-slate-300">Set the countdown limit algorithm and broadcast live triggers to verify response velocity.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                {/* Duration Configurator */}
                <div className="bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-slate-400 uppercase font-black px-2">Duration:</span>
                  {[3, 6, 10, 15].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setActiveLiveQuizSession(prev => ({ ...prev, timerSeconds: s, paused: true }));
                        triggerToast(`Preset countdown initialized to ${s} seconds. Click Start to launch!`, 'info');
                      }}
                      className={`py-1 px-3.5 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer ${
                        activeLiveQuizSession.timerSeconds === s 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs' 
                          : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                  <div className="flex items-center gap-1 pl-2 pr-1 border-l border-white/5">
                    <input 
                      type="number"
                      placeholder="Custom"
                      id="custom_timer_admin_val"
                      className="w-16 bg-slate-900 border border-white/10 text-xs font-mono py-1 px-1.5 rounded focus:outline-none text-white text-center"
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          setActiveLiveQuizSession(prev => ({ ...prev, timerSeconds: val, paused: true }));
                        }
                      }}
                    />
                  </div>
                </div>

                {/* State Controls Block */}
                <div className="flex items-center gap-1.5 select-none">
                  {/* Start Button */}
                  <button
                    onClick={() => {
                      if (activeLiveQuizSession.timerSeconds === 0) {
                        setActiveLiveQuizSession(prev => ({ ...prev, timerSeconds: 6, paused: false }));
                        triggerToast('Started active quiz session with default 6s countdown!', 'success');
                      } else {
                        setActiveLiveQuizSession(prev => ({ ...prev, paused: false }));
                        triggerToast(`Started live session countdown at ${activeLiveQuizSession.timerSeconds}s!`, 'success');
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-505 text-white font-black text-xs py-2 px-3.5 rounded-xl transition-all cursor-pointer shadow-xs uppercase flex items-center gap-1"
                  >
                    ▶ Start
                  </button>

                  {/* Pause Button */}
                  <button
                    onClick={() => {
                      setActiveLiveQuizSession(prev => ({ ...prev, paused: true }));
                      triggerToast('All client countdowns paused instantly!', 'info');
                    }}
                    disabled={activeLiveQuizSession.paused || activeLiveQuizSession.timerSeconds === 0}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-black text-xs py-2 px-3.5 rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed uppercase flex items-center gap-1"
                  >
                    ⏸ Pause
                  </button>

                  {/* Stop Button */}
                  <button
                    onClick={() => {
                      setActiveLiveQuizSession(prev => ({ ...prev, timerSeconds: 0, paused: true }));
                      triggerToast('Session timer terminated. Live inputs deactivated.', 'info');
                    }}
                    disabled={activeLiveQuizSession.timerSeconds === 0}
                    className="bg-rose-700 hover:bg-rose-600 text-white font-black text-xs py-2 px-3.5 rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed uppercase flex items-center gap-1"
                  >
                    ⏹ Stop
                  </button>
                </div>
              </div>
            </div>

            {/* Live Controller Console Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Telemetry Status Widget */}
              <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 space-y-4">
                <span className="text-[9px] uppercase tracking-widest font-black text-rose-405 bg-rose-950 py-1 px-2.5 rounded-md">Live Stream telemetry</span>
                <h4 className="text-sm font-black text-slate-100">{activeLiveQuizSession.quizTitle}</h4>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-750">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Matched Clients</span>
                    <p className="text-xl font-black font-mono mt-1 text-slate-100">{activeLiveQuizSession.participantsCount} Connected</p>
                  </div>
                  <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-750">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Accuracy rate</span>
                    <p className="text-xl font-black font-mono mt-1 text-emerald-400">{activeLiveQuizSession.lastCorrectRate}</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">Clock timer:</span>
                  <span className="font-mono text-rose-500 font-black tracking-widest text-sm animate-pulse">00:{activeLiveQuizSession.timerSeconds}s</span>
                </div>
              </div>

              {/* Live Leaderboard Stack */}
              <div className="bg-white p-5 rounded-3xl border border-slate-150 block lg:col-span-2">
                <h4 className="text-xs font-black text-slate-900 border-b border-slate-50 pb-3 mb-4 uppercase">Rapid Score Leaderboard Sync</h4>
                <div className="space-y-3">
                  {activeLiveQuizSession.sessionLeaderboard.map((player) => (
                    <div key={player.rank} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-150">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-[10.5px] font-black text-slate-700 flex items-center justify-center font-mono">
                          {player.rank}
                        </span>
                        <span className="font-extrabold text-slate-900 text-xs">@{player.user}</span>
                      </div>
                      <div className="flex items-center gap-5 text-right">
                        <span className="text-xs font-extrabold text-indigo-750 font-mono">{player.score}</span>
                        <span className="bg-emerald-50 text-emerald-805 text-[10px] font-black uppercase px-2 py-0.5 rounded-md font-mono">{player.speed} delay</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 7: SOCIAL CONTENT FEED */}
        {activeTab === 'contentFeed' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-md font-black text-slate-900 uppercase flex items-center gap-1.5">
                  <Megaphone className="w-5 h-5 text-indigo-650" /> Social Bulletin Publisher
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">Configure automated stories, tutorials, community posts, or system update alerts for all accounts.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Social Content Creator Builder */}
              <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-150">
                <h3 className="font-extrabold text-slate-900 uppercase text-xs mb-4">Post Builder Block</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Body Material Content</label>
                    <textarea
                      id="bullet_body_mat"
                      placeholder="e.g. Sovereign Premium upgrade features are now 100% active in Southern sectors."
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold focus:outline-none min-h-[100px]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 font-sans">Coverage Image Graphics URL</label>
                    <input
                      type="text"
                      id="bullet_media_graphics"
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={() => {
                      const textEl = document.getElementById('bullet_body_mat') as HTMLTextAreaElement;
                      const imageEl = document.getElementById('bullet_media_graphics') as HTMLInputElement;

                      if (!textEl?.value) {
                        triggerToast('Please write down your bulletin body first.', 'info');
                        return;
                      }

                      const dynamicPost: FeedPost = {
                        id: `feed_${Date.now()}`,
                        authorName: 'winbigonly',
                        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300',
                        authorRole: 'CEO Admin',
                        content: textEl.value,
                        mediaUrl: imageEl?.value || undefined,
                        mediaType: imageEl?.value ? 'image' : undefined,
                        likes: 0,
                        shares: 0,
                        commentsCount: 0,
                        isAnnouncement: true,
                        timestamp: new Date().toISOString()
                      };

                      triggerToast('Social bulletin announcement launched on board successfully!', 'success');
                      textEl.value = '';
                      if (imageEl) imageEl.value = '';
                    }}
                    className="w-full bg-rose-900 hover:bg-rose-850 text-white font-bold py-3.5 px-4 rounded-xl text-xs cursor-pointer text-center uppercase"
                  >
                    Deploy Broadcast Bulletin
                  </button>
                </div>
              </div>

              {/* Feed items for deleting */}
              <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-150">
                <h3 className="font-extrabold text-slate-900 uppercase text-xs mb-4">Board Moderator reviews</h3>
                <div className="space-y-4">
                  {feedPosts.map((post) => (
                    <div key={post.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-150 flex items-center justify-between">
                      <div>
                        <span className="text-[8.5px] uppercase bg-indigo-50 border border-indigo-150 text-indigo-755 font-black px-1.5 py-0.5 rounded-md inline-block mb-1.5">
                          {post.authorRole}
                        </span>
                        <p className="text-xs font-semibold text-slate-800 leading-normal">"{post.content}"</p>
                      </div>
                      <button
                        onClick={() => {
                          onDeleteFeedPost(post.id);
                          triggerToast('Post purged.', 'info');
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[10px] py-1 px-2.5 rounded-lg shrink-0 ml-3"
                      >
                        Purge
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: SPONSOR ADS SYSTEM */}
        {activeTab === 'advertisements' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs">
              <h2 className="text-md font-black text-slate-909 uppercase">Sponsor Advertisements Campaigns</h2>
              <p className="text-xs text-slate-400 font-medium mt-1">Review active advertiser banners, update billing allocations, and assess click conversions counts.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockAds.map((ad) => (
                <div key={ad.id} className="bg-white rounded-3xl border border-slate-150 overflow-hidden shadow-xs hover:border-indigo-150 transition-colors flex flex-col justify-between">
                  <div className="h-40 relative">
                    <img src={ad.banner} className="w-full h-full object-cover" alt="" />
                    <span className="absolute top-3 right-3 uppercase font-black text-[9px] text-white bg-indigo-650 py-0.5 px-2 rounded-md shadow-sm">
                      {ad.placement}
                    </span>
                  </div>
                  <div className="p-4 space-y-3 flex-grow flex flex-col justify-between text-left">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 leading-normal">{ad.advertiser}</h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">Duration Cycle: {ad.duration} • Active Campaign</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2 rounded-xl text-xs font-mono font-bold">
                      <div className="text-left">
                        <span className="text-[9px] text-slate-400 uppercase font-black">Ad Clicks</span>
                        <p className="text-slate-800 mt-0.5">{ad.clicks} Clicks</p>
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] text-slate-400 uppercase font-black">Views</span>
                        <p className="text-slate-800 mt-0.5">{ad.views} Views</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: VAULT AUDIT OVERVIEW */}
        {activeTab === 'walletSystem' && (
          <div className="space-y-6 animate-fade-in text-left font-sans">
            <div className="bg-white p-6 rounded-3xl border border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-md font-black text-slate-909 uppercase tracking-tight flex items-center gap-1.5">
                  <Wallet className="w-5 h-5 text-emerald-600" /> Administrative Vault Audit Overview
                </h2>
                <p className="text-xs text-slate-400 font-medium">Verify system pool balances, check treasury cash split ratios, and monitor active liabilities.</p>
              </div>
            </div>

            {/* Custom high contrast radial gradient bank vault card */}
            <div className="bg-slate-950 text-white p-7 rounded-3xl border border-slate-900 max-w-xl shadow-xl flex items-center justify-between relative overflow-hidden" 
                 style={{ backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
              <div className="space-y-4">
                <span className="text-[9px] font-black uppercase text-rose-300 tracking-wider bg-rose-955/60 py-0.5 px-2.5 rounded">
                  Quizoe Central Treasury Vault
                </span>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-widest">Aggregate Liquid Value Assets</span>
                  <h3 className="text-3xl font-mono font-black text-slate-100 tracking-tight mt-1">₦3,150,450.00</h3>
                </div>
              </div>
              <div className="w-20 h-20 rounded-full border-4 border-slate-800 flex items-center justify-center bg-slate-900/60 shadow-inner">
                <ShieldCheck className="w-8 h-8 text-indigo-400" />
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: TRANSACTIONS SETTLEMENTS */}
        {activeTab === 'transactions' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white p-6 rounded-3xl border border-slate-150 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-md font-black text-slate-900 uppercase">Settlement Order Manual Audit</h2>
                <p className="text-xs text-slate-400 font-medium">Approve instant NGN withdrawals, verify deposit handshakes, or trigger direct webhooks callback manually.</p>
              </div>
            </div>

            {/* Settle Order Table */}
            <div className="admin-table-container bg-white rounded-3xl border border-slate-150 overflow-hidden shadow-xs">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Class</th>
                    <th>Settlement Value</th>
                    <th>Logged Date</th>
                    <th>Status</th>
                    <th>Resolution Core Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="font-mono text-xs font-bold text-slate-900">{tx.reference}</td>
                      <td className="capitalize text-slate-600 font-semibold">{tx.type}</td>
                      <td className="font-bold font-mono text-emerald-650">₦{tx.amount.toFixed(2)}</td>
                      <td className="text-xs text-slate-500 font-medium">{new Date(tx.date).toLocaleDateString()}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black ${
                          tx.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1.5">
                          {tx.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => {
                                  onApproveTransaction(tx.id);
                                  triggerToast('Sovereign paystack settlement approved.', 'success');
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] py-1 px-3 rounded-lg cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  onRejectTransaction(tx.id);
                                  triggerToast('Settlement voided.', 'info');
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] py-1 px-3 rounded-lg cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium uppercase font-mono">Ledger Verified</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 11: MEMBERSHIP TIERS SUBSCRIPTIONS */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6 animate-fade-in text-left">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-150 shadow-xs">
              <div>
                <h2 className="text-md font-black text-slate-900 uppercase flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" /> Quizoe Client Membership Bundles
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">Configure base pricing ratios, features limits, grant tiers, and monitor active user renewals.</p>
              </div>
              <button
                onClick={() => setIsAddingPlan(!isAddingPlan)}
                className="bg-indigo-650 hover:bg-indigo-750 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" /> {isAddingPlan ? 'Close Plan Builder' : 'Create Custom Plan'}
              </button>
            </div>

            {/* Dynamic Interactive Plan Creator Form */}
            {isAddingPlan && (
              <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs animate-fade-in text-left">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-650" /> Configure New Membership Plan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Plan Name</label>
                    <input
                      type="text"
                      placeholder="e.g. VIP Ultimate, Platinum Pro"
                      value={newPlanName}
                      onChange={(e) => setNewPlanName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Price (₦)</label>
                    <input
                      type="number"
                      placeholder="e.g. 10000"
                      value={newPlanPrice}
                      onChange={(e) => setNewPlanPrice(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Billing Duration</label>
                    <select
                      value={newPlanDuration}
                      onChange={(e) => setNewPlanDuration(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold focus:outline-none"
                    >
                      <option value="Monthly">Monthly Cycle</option>
                      <option value="Quarterly">Quarterly Cycle</option>
                      <option value="Yearly">Yearly Cycle</option>
                      <option value="Lifetime">One-time / Lifetime</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Plan Status Trigger</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newPlanName || !newPlanPrice) {
                            triggerToast('Please provide a name and pricing rate before saving.', 'info');
                            return;
                          }
                          const newPlan = {
                            id: `sub-${Date.now()}`,
                            name: newPlanName,
                            price: Number(newPlanPrice),
                            duration: newPlanDuration,
                            features: newPlanFeatures || 'Access generic speed challenges and priority support handshakes',
                            activeSubscribers: 0,
                            status: 'Active'
                          };
                          setMockSubscriptions([...mockSubscriptions, newPlan]);
                          triggerToast(`Membership Plan "${newPlanName}" created successfully!`, 'success');
                          setNewPlanName('');
                          setNewPlanPrice('');
                          setNewPlanFeatures('');
                          setIsAddingPlan(false);
                        }}
                        className="flex-grow bg-indigo-650 hover:bg-indigo-750 text-white font-black text-xs py-2.5 rounded-xl transition-all"
                      >
                        Publish Plan
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Plan Features Benefit List</label>
                  <textarea
                    rows={2}
                    placeholder="Describe specific features allowed under this subscription level e.g. Zero checkout commission, VIP novel vault..."
                    value={newPlanFeatures}
                    onChange={(e) => setNewPlanFeatures(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Configured Subscription Cards Layout list */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {mockSubscriptions.map((sub) => {
                const isPremium = sub.name.toLowerCase().includes('premium') || sub.name.toLowerCase() === 'premium';
                const isVIP = sub.name.toLowerCase().includes('vip') || sub.name.toLowerCase() === 'vanguard';
                return (
                  <div 
                    key={sub.id} 
                    className={`bg-white rounded-3xl border p-5 flex flex-col justify-between hover:scale-[1.01] transition-all text-left shadow-xs relative ${
                      isVIP ? 'border-rose-350 bg-rose-50/10' :
                      isPremium ? 'border-amber-350 bg-amber-50/10' : 'border-slate-150'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className={`text-[9px] font-black uppercase py-0.5 px-2 rounded-md ${
                          isVIP ? 'bg-rose-100 text-rose-800' :
                          isPremium ? 'bg-amber-100 text-amber-800' : 'bg-indigo-50 text-indigo-705'
                        }`}>
                          {sub.duration} cycle
                        </span>
                        <span className="text-[10px] font-extrabold text-slate-400 font-mono">
                          {sub.activeSubscribers} Active Users
                        </span>
                      </div>
                      
                      <h4 className="font-extrabold text-slate-900 text-md mt-4">{sub.name} plan</h4>
                      <p className="text-2xl font-black font-mono text-slate-900 mt-2">
                        {sub.price === 0 ? 'Free' : `₦${sub.price.toLocaleString()}`}
                      </p>
                      
                      <div className="text-xs text-slate-605 leading-relaxed mt-4 pt-4 border-t border-slate-100 space-y-2">
                        <p className="font-medium">{sub.features}</p>
                        <div className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 mt-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Auto-renewal tracking active</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                      <button
                        onClick={() => {
                          const action = sub.status === 'Active' ? 'Paused' : 'Active';
                          const updated = mockSubscriptions.map(s => s.id === sub.id ? { ...s, status: action } : s);
                          setMockSubscriptions(updated);
                          triggerToast(`Plan "${sub.name}" status switched to ${action}`, 'success');
                        }}
                        className={`flex-grow text-[11px] font-black py-2.5 rounded-xl cursor-pointer text-center ${
                          sub.status === 'Active' 
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {sub.status === 'Active' ? 'Pause Plan' : 'Resume Plan'}
                      </button>
                      <button
                        onClick={() => {
                          handleActionConfirm(`Delete Subscription "${sub.name}"`, `Are you absolutely sure you want to delete this bundle? Active subscribers will revert.`, () => {
                            setMockSubscriptions(mockSubscriptions.filter(s => s.id !== sub.id));
                            triggerToast(`Subscription bundle "${sub.name}" deleted.`, 'info');
                          });
                        }}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2.5 rounded-xl cursor-pointer border border-transparent"
                        title="Delete Subscription Tier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active subscribers and status tracking layout list table */}
            <div className="bg-white rounded-3xl border border-slate-150 overflow-hidden shadow-xs text-left mt-6">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase">Interactive Subscription Renewal & Tracking Matrix</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Vetting engine matching user payments to webhook callback dates on paystack.</p>
                </div>
                <span className="bg-indigo-50 text-indigo-750 text-[10.5px] font-black py-1 px-3 rounded-full">
                  Total Managed Premium Logs: {activeSubscribersList.length} Accounts
                </span>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Subscriber client</th>
                      <th>Plan Enrolled</th>
                      <th>Operational Fees</th>
                      <th>Start Cycle Date</th>
                      <th>Renewal Target Date</th>
                      <th>Automatic Renewal Status</th>
                      <th>Control Handshakes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSubscribersList.map((subscriber) => (
                      <tr key={subscriber.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="font-extrabold text-slate-900 text-xs">
                          <div>
                            <p className="text-slate-900 font-bold">@{subscriber.username}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{subscriber.email}</p>
                          </div>
                        </td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            subscriber.plan === 'VIP' ? 'bg-rose-100 text-rose-800' :
                            subscriber.plan === 'Premium' ? 'bg-amber-100 text-amber-805' :
                            subscriber.plan === 'Basic' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {subscriber.plan} level
                          </span>
                        </td>
                        <td className="font-mono text-xs text-slate-700 font-bold">₦{subscriber.price.toLocaleString()}</td>
                        <td className="text-xs text-slate-500 font-semibold">{subscriber.startDate}</td>
                        <td className="text-xs text-slate-500 font-semibold">{subscriber.renewalDate}</td>
                        <td>
                          <span className={`px-2 py-1 rounded text-[10px] font-extrabold uppercase ${
                            subscriber.status === 'Lifetime' ? 'bg-emerald-100 text-emerald-800' :
                            subscriber.status === 'Auto-Renewing' ? 'bg-indigo-100 text-indigo-800 animate-pulse' :
                            subscriber.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            ● {subscriber.status}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                const updated = activeSubscribersList.map(s => {
                                  if (s.id === subscriber.id) {
                                    return { 
                                      ...s, 
                                      status: s.status === 'Expired' ? 'Active' : 'Expired',
                                      renewalDate: s.status === 'Expired' ? '2026-07-07' : 'Past Due'
                                    };
                                  }
                                  return s;
                                });
                                setActiveSubscribersList(updated);
                                triggerToast(`Subscription cycle status toggled for @${subscriber.username}.`, 'success');
                              }}
                              className="bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-black py-1 px-3 rounded-lg cursor-pointer"
                            >
                              Toggle Status
                            </button>
                            <button
                              onClick={() => {
                                handleActionConfirm(`Force Cancel @${subscriber.username} Membership`, `This will immediately revoke all subscription privileges and lower account to Free Tier. Proceed?`, () => {
                                  setActiveSubscribersList(activeSubscribersList.filter(s => s.id !== subscriber.id));
                                  triggerToast(`Sovereign level subscription cancelled for @${subscriber.username}.`, 'info');
                                });
                              }}
                              className="bg-rose-50 text-rose-600 hover:bg-rose-100 text-[10px] font-bold py-1 px-2.5 rounded-lg border border-rose-100 cursor-pointer"
                            >
                              Revoke
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 12: REFERRALS TREES */}
        {activeTab === 'referrals' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white p-6 rounded-3xl border border-slate-150 text-left mb-6 shadow-xs">
              <h2 className="text-md font-black text-slate-909 uppercase">Multi-tier Referral Campaigns</h2>
              <p className="text-xs text-slate-400 font-medium">Verify referral payouts split configurations, adjust manual reward parameters, and browse downlines.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-150">
                <span className="text-[9.5px] uppercase font-black tracking-wide text-slate-400">Total Referral Nodes</span>
                <p className="text-2xl font-mono font-black text-slate-900 mt-1">1,248 Nodes</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-150">
                <span className="text-[9.5px] uppercase font-black tracking-wide text-slate-400">Referral reward (₦)</span>
                <p className="text-2xl font-mono font-black text-indigo-705 mt-1">₦500 / Member</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-150">
                <span className="text-[9.5px] uppercase font-black tracking-wide text-slate-400">Total Paid Out</span>
                <p className="text-2xl font-mono font-black text-emerald-600 mt-1">₦624,000</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-150">
                <span className="text-[9.5px] uppercase font-black tracking-wide text-slate-400">Campaign Handshake Toggle</span>
                <span className="text-xs font-black text-emerald-600 uppercase block mt-2">● Active</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 13: LEADERBOARD BANKS */}
        {activeTab === 'leaderboards' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs mb-6 text-left">
              <h2 className="text-md font-black text-slate-909 uppercase">High-stake Quiz Leaderboards</h2>
              <p className="text-xs text-slate-400 font-semibold mt-1">Browse rankings, trigger seasonal resets, or export score spreadsheets.</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-150 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <span className="text-xs font-black text-slate-900 uppercase">Platform score index records</span>
                <button
                  onClick={() => {
                    triggerToast('CSV spreadsheet generated and downloaded.', 'success');
                  }}
                  className="bg-indigo-550 hover:bg-indigo-700 bg-indigo-600 text-white font-bold text-xs py-1.5 px-3.5 rounded-xl cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export CSV Spreadsheet
                </button>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-extrabold text-xs text-slate-900">1. @winbigonly (System Leader)</span>
                  <span className="font-mono text-xs font-black text-indigo-750">2,410 Accuracy pts</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-extrabold text-xs text-slate-900">2. @samuel_opay (Fintech Contender)</span>
                  <span className="font-mono text-xs font-black text-indigo-750">1,980 Accuracy pts</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-extrabold text-xs text-slate-900">3. @dan_stack (Tutor)</span>
                  <span className="font-mono text-xs font-black text-indigo-750">1,720 Accuracy pts</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 14: FLAGGED REPORT LOGS */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white p-6 rounded-3xl border border-slate-150">
              <h2 className="text-lg font-black text-slate-900">Community Scanners Reported Logs</h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Vetting queue for reported client behavior indicators.</p>
            </div>

            <div className="admin-table-container bg-white rounded-3xl border border-slate-150 overflow-hidden shadow-xs">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Reporter User</th>
                    <th>Object Flagged</th>
                    <th>Reasoning Details</th>
                    <th>Date Logged</th>
                    <th>Resolution Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((rep) => (
                    <tr key={rep.id}>
                      <td className="font-bold text-slate-900">@{rep.reporter}</td>
                      <td className="font-semibold text-slate-500 text-xs">{rep.targetType}: {rep.targetId}</td>
                      <td className="text-slate-700 font-semibold">{rep.reason}</td>
                      <td className="text-slate-400 text-xs">{rep.date}</td>
                      <td>
                        {rep.status === 'pending' ? (
                          <button
                            onClick={() => {
                              onResolveReport(rep.id);
                              triggerToast('Report marked resolved.', 'success');
                            }}
                            className="bg-amber-100 hover:bg-green-100 text-amber-800 border border-amber-250 font-bold text-[10.5px] py-1 px-3.5 rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Resolve Flag
                          </button>
                        ) : (
                          <span className="text-green-600 text-xs font-black flex items-center gap-1 tracking-wide uppercase">
                            <CheckCircle2 className="w-4 h-4 text-green-505" /> Cleared
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center p-8 text-slate-400 font-bold">No items found in reporting archives.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 15: NOTIFICATION WIZARD DISPATCHER */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs mb-6">
              <h2 className="text-md font-black text-slate-909 uppercase">System Bulletin Dispatcher Wizard</h2>
              <p className="text-xs text-slate-405 font-semibold mt-1">Configure target audiences, pick push notification/In-App toggles, and send immediately.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-150 max-w-xl shadow-xs space-y-4 text-left">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Select Audience Group</label>
                <select
                  value={notificationBuilder.channel}
                  onChange={(e) => setNotificationBuilder({...notificationBuilder, channel: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                >
                  <option value="all">Every Single Client</option>
                  <option value="premium">Premium Pro Clients Only</option>
                  <option value="tutor">Active Tutors Only</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Message Header</label>
                <input
                  type="text"
                  placeholder="e.g. Free Quiz Bowl Starts in 10 Minutes!"
                  value={notificationBuilder.title}
                  onChange={(e) => setNotificationBuilder({...notificationBuilder, title: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Message Body</label>
                <textarea
                  placeholder="Tell clients the entry fee bounds and pool awards..."
                  value={notificationBuilder.body}
                  onChange={(e) => setNotificationBuilder({...notificationBuilder, body: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:outline-none min-h-[100px]"
                />
              </div>

              <button
                onClick={() => {
                  if (!notificationBuilder.title || !notificationBuilder.body) {
                    triggerToast('Message details incomplete.', 'info');
                    return;
                  }
                  triggerToast(`Dispatching live broadcast to group: ${notificationBuilder.channel}`, 'success');
                  setNotificationBuilder({ title: '', channel: 'all', type: 'In-App', body: '' });
                }}
                className="w-full bg-slate-905 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl text-xs cursor-pointer text-center bg-slate-900 uppercase"
              >
                📢 Broadcast Alert Instantly
              </button>
            </div>
          </div>
        )}

        {/* TAB 16: CONTENT MODERATION CENTER */}
        {activeTab === 'moderation' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs mb-6">
              <h2 className="text-md font-black text-slate-909 uppercase">Spam Vetting &amp; Content Shield</h2>
              <p className="text-xs text-slate-405 font-medium mt-1">Inspect user-submitted portfolios, verify study room descriptions, and enforce visual terms of service.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-150 p-6 flex flex-col gap-4 text-left">
              <h3 className="text-xs font-black text-slate-900 border-b border-slate-50 pb-2.5 uppercase">Submission review queue</h3>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 flex items-center justify-between">
                <div>
                  <span className="text-[8.5px] uppercase font-black bg-rose-50 border border-rose-200 text-rose-800 px-2 py-0.5 rounded-md inline-block mb-1.5">
                    Creative Vetting Required
                  </span>
                  <p className="text-xs font-extrabold text-slate-800">Portfolio upload: "Lekki Arts Craft collection.png"</p>
                  <p className="text-[10px] mt-0.5 text-slate-400 font-bold">Uploaded by @samuel_opay</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      triggerToast('Portfolio approved and published!', 'success');
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10.5px] py-1 px-3.5 rounded-lg cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      triggerToast('Portfolio rejected.', 'info');
                    }}
                    className="bg-red-650 hover:bg-red-750 text-white font-bold text-[10.5px] py-1 px-3.5 rounded-lg cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 17: MEDIA LIBRARY */}
        {activeTab === 'mediaLibrary' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white p-6 rounded-3xl border border-slate-150 text-left mb-6 shadow-xs">
              <h2 className="text-md font-black text-slate-909 uppercase">Media Library Storage Directory</h2>
              <p className="text-xs text-slate-400 font-semibold mt-1">Review active layout wallpapers, ebooks layout images, and sponsor advertisements templates.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-xs hover:border-indigo-150 transition-colors">
                <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300" className="w-full h-32 object-cover" alt="" />
                <div className="p-3">
                  <p className="text-[10px] text-slate-500 font-bold truncate">Premium Novel Wallpaper.png</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-xs hover:border-indigo-150 transition-colors">
                <img src="https://images.unsplash.com/photo-161805198143-e5283b519a7f?q=80&w=300" className="w-full h-32 object-cover" alt="" />
                <div className="p-3">
                  <p className="text-[10px] text-slate-500 font-bold truncate">Tutor Handshake Graph.png</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-xs hover:border-indigo-150 transition-colors">
                <img src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=300" className="w-full h-32 object-cover" alt="" />
                <div className="p-3">
                  <p className="text-[10px] text-slate-500 font-bold truncate">VIP Ledger Vector.png</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-xs hover:border-indigo-150 transition-colors">
                <img src="https://images.unsplash.com/photo-1542222024-c39e2281f121?q=80&w=300" className="w-full h-32 object-cover" alt="" />
                <div className="p-3">
                  <p className="text-[10px] text-slate-500 font-bold truncate">Kuda Promo Card.jpg</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 18: REWARD CATALOGS */}
        {activeTab === 'rewards' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs mb-6 text-left">
              <h2 className="text-md font-black text-slate-909 uppercase">Voucher &amp; Bounty Catalog</h2>
              <p className="text-xs text-slate-405 font-medium">Configure milestones levels, adjust point redemption variables, and disburse vouchers.</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-150 space-y-4">
              <h3 className="text-xs font-black text-slate-900 border-b border-slate-50 pb-2.5 uppercase font-mono">Bounty configurations</h3>
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-extrabold text-slate-900">Naira speed bonus vouchers</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Awarded automatically to participants who nail speed scores of &lt; 0.5s</p>
                  </div>
                  <span className="font-mono font-black text-indigo-755 text-sm">₦1,000 Voucher</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 19: PERFORMANCE ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white p-6 rounded-3xl border border-slate-150 mb-6">
              <h2 className="text-md font-black text-slate-909 uppercase">Analytical metrics analyzer</h2>
              <p className="text-xs text-slate-405 font-semibold mt-1">Review transaction graphs indicators, track registrations index, and overwatch platform retention.</p>
            </div>

            {/* Custom high fidelity chart visualizer */}
            <div className="bg-white p-6 rounded-3xl border border-slate-150 text-left">
              <h3 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-3 mb-6 uppercase block">Weekly Active Users Sockets Summary</h3>
              
              <div className="h-44 flex items-end justify-between gap-4 pt-1 px-4">
                {[45, 68, 72, 91, 104, 118, 142].map((val, idx) => {
                  const pct = (val / 142) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                      <span className="text-[10px] font-mono font-black text-slate-405 group-hover:text-indigo-605 transition-colors">{val}</span>
                      <div className="w-full bg-indigo-600 rounded-t-lg transition-all duration-700" style={{ height: `${pct * 1.2}px`, backgroundImage: 'linear-gradient(180deg, #1e1b4b 0%, #4338ca 100%)' }} />
                      <span className="text-[10px] text-slate-455 mt-1 font-extrabold">Day {idx + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 20: HELP SUPPORT TICKETS */}
        {activeTab === 'supportTickets' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white p-6 rounded-3xl border border-slate-150 mb-6">
              <h2 className="text-md font-black text-slate-909 uppercase">User Disputes &amp; Complaint tickets</h2>
              <p className="text-xs text-slate-405 font-medium mt-1">Assign resolution tickers, communicate ledger corrections, or resolve disputed bank handshakes.</p>
            </div>

            <div className="space-y-4">
              {mockTickets.map((ticket) => (
                <div key={ticket.id} className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs text-left">
                  <div className="flex justify-between items-start border-b border-slate-50 pb-3 mb-3 flex-wrap gap-2">
                    <div>
                      <span className="text-[9.5px] font-black uppercase text-indigo-755 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {ticket.type}
                      </span>
                      <h4 className="text-xs font-black text-slate-900 mt-2 leading-normal">{ticket.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">From Client: @{ticket.user} • Filed {ticket.date}</p>
                    </div>
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase inline-block ${
                        ticket.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed">"{ticket.desc}"</p>
                  
                  {ticket.status === 'pending' && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setMockTickets(mockTickets.map(t => t.id === ticket.id ? {...t, status: 'resolved'} : t));
                          triggerToast('Ticket marked as resolved. System feedback sent.', 'success');
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10.5px] p-1 px-3.5 rounded-lg cursor-pointer"
                      >
                        Resolve Dispute
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: OFFICIAL USER REQUESTS VETTING CENTER */}
        {activeTab === 'userRequests' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 uppercase">
                  Official Administrative Request Board (Vetting Desk)
                </h1>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Approve and grant manual Naira balance refills, premium level tier upgrades, or decline invalid receipt requests instantly.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] uppercase font-black text-slate-400 bg-slate-100 py-1 px-3 rounded-lg border border-slate-200 flex items-center gap-1.5 shrink-0 select-none">
                  Pending: {userRequests.filter(r => r.status === 'pending').length}
                </span>
                <span className="text-[10px] uppercase font-black text-emerald-700 bg-emerald-50 py-1 px-3 rounded-lg border border-emerald-100 flex items-center gap-1.5 shrink-0 select-none">
                  Granted: {userRequests.filter(r => r.status === 'granted').length}
                </span>
              </div>
            </div>

            {/* Filter Hub Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Query requests by username, details, or ID..."
                  value={reqSearch}
                  onChange={(e) => setReqSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={reqStatusFilter}
                  onChange={(e) => setReqStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Vetting Status: All</option>
                  <option value="pending">Vetting Status: Pending</option>
                  <option value="granted">Vetting Status: Granted</option>
                  <option value="declined">Vetting Status: Declined</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={reqTypeFilter}
                  onChange={(e) => setReqTypeFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Type: All</option>
                  <option value="credits">Type: Credits Refill</option>
                  <option value="upgrade">Type: Tier Upgrade</option>
                  <option value="support">Type: Support &amp; Help</option>
                  <option value="other">Type: Other / Misc</option>
                </select>
              </div>

              <div className="md:col-span-1 text-right">
                <button
                  onClick={() => {
                    setReqSearch('');
                    setReqStatusFilter('all');
                    setReqTypeFilter('all');
                  }}
                  className="p-2 text-slate-400 hover:text-slate-800 focus:outline-none cursor-pointer"
                  title="Reset Filter"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Request items display board */}
            <div className="bg-white rounded-3xl border border-slate-150 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="p-4 pl-6">Sender Address / ID</th>
                      <th className="p-4">Objective Type</th>
                      <th className="p-4 min-w-[250px]">Detailed Reason</th>
                      <th className="p-4 text-right">Credit Value</th>
                      <th className="p-4">Submission Date</th>
                      <th className="p-4">Vetting Status</th>
                      <th className="p-4 pr-6 text-right">Control Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {userRequests.filter(req => {
                      const matchesStatus = reqStatusFilter === 'all' || req.status === reqStatusFilter;
                      const matchesType = reqTypeFilter === 'all' || req.type === reqTypeFilter;
                      const searchLow = reqSearch.toLowerCase();
                      const matchesSearch = !reqSearch || 
                        req.username.toLowerCase().includes(searchLow) || 
                        req.id.toLowerCase().includes(searchLow) ||
                        req.details.toLowerCase().includes(searchLow);
                      return matchesStatus && matchesType && matchesSearch;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400">
                          <AlertTriangle className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                          <p className="font-bold">No user requests matched the filters.</p>
                          <p className="text-[11px] text-slate-400">Audit indicators show tranquil request pipelines.</p>
                        </td>
                      </tr>
                    ) : (
                      userRequests.filter(req => {
                        const matchesStatus = reqStatusFilter === 'all' || req.status === reqStatusFilter;
                        const matchesType = reqTypeFilter === 'all' || req.type === reqTypeFilter;
                        const searchLow = reqSearch.toLowerCase();
                        const matchesSearch = !reqSearch || 
                          req.username.toLowerCase().includes(searchLow) || 
                          req.id.toLowerCase().includes(searchLow) ||
                          req.details.toLowerCase().includes(searchLow);
                        return matchesStatus && matchesType && matchesSearch;
                      }).map((req) => {
                        const isPending = req.status === 'pending';
                        const isGranted = req.status === 'granted';
                        const isDeclined = req.status === 'declined';

                        return (
                          <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-4 pl-6">
                              <div>
                                <span className="font-black text-slate-900">@{req.username}</span>
                                <p className="text-[9.5px] font-mono text-slate-400 uppercase mt-0.5">ID: #{req.id.slice(0, 8)}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-[9.5px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100/50 py-0.5 px-2 rounded-md">
                                {req.type.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 max-w-[320px]">
                              <p className="line-clamp-2 text-slate-600 font-medium leading-relaxed" title={req.details}>
                                {req.details}
                              </p>
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-slate-900">
                              {req.amount !== undefined ? `₦${req.amount.toLocaleString()}` : '—'}
                            </td>
                            <td className="p-4 text-slate-400 text-[11px] font-bold">{req.date}</td>
                            <td className="p-4">
                              <span className={`text-[9.5px] font-black uppercase py-0.5 px-2 rounded-md flex items-center justify-center w-24 gap-1 ${
                                isGranted ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                isDeclined ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isGranted ? 'bg-emerald-400' : isDeclined ? 'bg-rose-400' : 'bg-amber-400 animate-ping'}`} />
                                {req.status}
                              </span>
                            </td>
                            <td className="p-4 pr-6 text-right">
                              {isPending ? (
                                <div className="inline-flex gap-2">
                                  <button
                                    onClick={() => onGrantRequest(req.id)}
                                    className="bg-emerald-605 hover:bg-emerald-700 hover:shadow-xs text-white font-bold text-[10.5px] py-1 px-3.5 rounded-lg transition-all cursor-pointer"
                                  >
                                    Grant
                                  </button>
                                  <button
                                    onClick={() => onDeclineRequest(req.id)}
                                    className="bg-rose-55 hover:bg-rose-700 text-white font-bold text-[10.5px] py-1 px-3.5 rounded-lg transition-all cursor-pointer"
                                  >
                                    Decline
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold uppercase select-none">
                                  {isGranted ? 'Vetted & Granted' : 'Vetted & Declined'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 13: POWERFUL TECHNICAL INTEGRATIONS (Slightly custom backend checker) */}
        {activeTab === 'integrations' && (
          <div className="bg-white rounded-3xl border border-slate-150 p-6 flex flex-col gap-6 animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Master Cloud Backend &amp; Integration Services</h3>
                <p className="text-xs text-slate-500 font-medium">Verify production secure credentials, check API server routing, and ensure service tunnels are active.</p>
              </div>
              <button
                onClick={async () => {
                  setLoadingConfig(true);
                  try {
                    const res = await fetch('/api/config/status');
                    if (res.ok) {
                      const data = await res.json();
                      setIntegrationConfig(data);
                    }
                  } catch (err) {
                    console.warn(err);
                  } finally {
                    setLoadingConfig(false);
                    triggerToast('Config lookup completed!', 'success');
                  }
                }}
                disabled={loadingConfig}
                className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingConfig ? 'animate-spin' : ''}`} />
                <span>Query Keys Status</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="border border-slate-150/80 rounded-2xl p-5 hover:bg-slate-50/50 transition-all flex flex-col justify-between gap-4">
                <div>
                  <span className="text-[9.5px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700">
                    CONNECTED
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-3.5 mb-1.5 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-600" />
                    Supabase Database
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Persistent storage stream system. Houses community eBooks, content creations, logs and portfolios.
                  </p>
                  <div className="mt-3 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase">Cloud Project Host</p>
                    <code className="text-[10px] font-mono text-slate-650 truncate block mt-0.5">{integrationConfig.supabase.url}</code>
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-400 font-mono">
                  ENV: VITE_SUPABASE_URL
                </div>
              </div>

              <div className="border border-slate-150/80 rounded-2xl p-5 hover:bg-slate-50/50 transition-all flex flex-col justify-between gap-4">
                <div>
                  <span className="text-[9.5px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700">
                    SECURE ACTIVE
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-905 mt-3.5 mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Database Bypass Key
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Confirms service bypass key credentials. Allows automated pruning of spam messages without client context.
                  </p>
                </div>
                <div className="text-xs font-semibold text-slate-400 font-mono">
                  ENV: SUPABASE_SERVICE_ROLE_KEY
                </div>
              </div>

              <div className="border border-slate-150/80 rounded-2xl p-5 hover:bg-slate-50/50 transition-all flex flex-col justify-between gap-4">
                <div>
                  <span className="text-[9.5px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700">
                    GATEWAY LIVE
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-3.5 mb-1.5 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-blue-600" />
                    Paystack Gateway API
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Liquid payout and card deposit routers. Direct integration with Opay, PalmPay, and Nigerian banks.
                  </p>
                  <div className="mt-3 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase">Gateway Public Key</p>
                    <code className="text-[10px] font-mono text-slate-650 truncate block mt-0.5">{integrationConfig.paystack.publicKey}</code>
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-400 font-mono">
                  ENV: PAYSTACK_SECRET_KEY
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 21: AUDIT LOGS OVERVIEW */}
        {activeTab === 'auditLogs' && (
          <div className="space-y-6 animate-fade-in text-left">
            {/* Header section */}
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs mb-6 text-left">
              <h2 className="text-md font-black text-slate-900 uppercase flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-650" /> Administrative Audit Trails
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Enterprise vetting database recording critical administrative actions. Keeps track of state modifications, manual ledger adjustments, and deleted assets.
              </p>
            </div>

            {/* Simulated Live Action Terminal / Quick Event Logger */}
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs text-left">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-600" /> Administrative Action Simulator
              </h3>
              <p className="text-xs text-slate-400 font-semibold mb-4 leading-relaxed">
                Test and verify the tracking matrix by logging mock telemetry entries directly into the ledger registry. Select parameters below to trigger a live administrative operational audit event.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Admin Driver</label>
                  <select 
                    id="sim-admin"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none"
                    defaultValue="winbigonly"
                  >
                    <option value="winbigonly">winbigonly (CEO)</option>
                    <option value="tutor_moderator">tutor_moderator (Staff)</option>
                    <option value="finance_bot">finance_bot (Cron AI)</option>
                    <option value="system_cron">system_cron (Docker)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Operational Action Type</label>
                  <select 
                    id="sim-type"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none"
                    defaultValue="Wallet Adjusted"
                  >
                    <option value="User Modified">User Modified</option>
                    <option value="Wallet Adjusted">Wallet Adjusted</option>
                    <option value="Challenge Deleted">Challenge Deleted</option>
                    <option value="Settings Updated">Settings Updated</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex items-end gap-3">
                  <div className="flex-grow">
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Operational Action Description</label>
                    <input 
                      id="sim-desc"
                      type="text"
                      placeholder="e.g. Adjusted wallet boundary cap from +50k to +100k"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const adminEl = document.getElementById('sim-admin') as HTMLSelectElement;
                      const typeEl = document.getElementById('sim-type') as HTMLSelectElement;
                      const descEl = document.getElementById('sim-desc') as HTMLInputElement;

                      const adminName = adminEl?.value || 'winbigonly';
                      const actionType = typeEl?.value || 'Wallet Adjusted';
                      const actionText = descEl?.value || `Simulated ${actionType} event triggered by client terminal.`;

                      const newLog = {
                        id: `aud-${Date.now()}`,
                        admin: adminName,
                        actionType: actionType,
                        action: actionText,
                        ip: '102.89.44.' + Math.floor(Math.random() * 254 + 1),
                        device: 'Simulation Console Terminal',
                        date: new Date().toISOString().split('T')[0]
                      };

                      setMockAudits([newLog, ...mockAudits]);
                      triggerToast(`Telemetry recorded: ${actionType} on system log context.`, 'success');
                      if (descEl) descEl.value = '';
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-xl cursor-pointer shadow-sm transition-all"
                  >
                    Simulate Log
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Filter Control Deck Panel */}
            <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-indigo-600" /> Telemetry Filtering Deck
                </span>
                {(auditSearch || auditAdminFilter !== 'all' || auditTypeFilter !== 'all' || auditStartDate || auditEndDate) && (
                  <button
                    onClick={() => {
                      setAuditSearch('');
                      setAuditAdminFilter('all');
                      setAuditTypeFilter('all');
                      setAuditStartDate('');
                      setAuditEndDate('');
                      triggerToast('Search criteria reset successfully.', 'info');
                    }}
                    className="text-rose-600 hover:text-rose-700 text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                  >
                    Clear Filter Selection
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {/* 1. Global Search Box */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Search logs description, IP, device..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>

                {/* 2. Admin filter */}
                <div>
                  <select
                    value={auditAdminFilter}
                    onChange={(e) => setAuditAdminFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none"
                  >
                    <option value="all">Drivers: All Admins</option>
                    <option value="winbigonly">winbigonly (CEO)</option>
                    <option value="finance_bot">finance_bot (AI)</option>
                    <option value="tutor_moderator">tutor_moderator (Staff)</option>
                    <option value="system_cron">system_cron (System)</option>
                  </select>
                </div>

                {/* 3. Action type filter */}
                <div>
                  <select
                    value={auditTypeFilter}
                    onChange={(e) => setAuditTypeFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none"
                  >
                    <option value="all">Actions: All Types</option>
                    <option value="User Modified">User Modified</option>
                    <option value="Wallet Adjusted">Wallet Adjusted</option>
                    <option value="Challenge Deleted">Challenge Deleted</option>
                    <option value="Settings Updated">Settings Updated</option>
                  </select>
                </div>

                {/* 4. Start date range filter */}
                <div>
                  <input
                    type="date"
                    value={auditStartDate}
                    onChange={(e) => setAuditStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none text-slate-500"
                    title="Logs start date range"
                  />
                </div>

                {/* 5. End date range filter */}
                <div>
                  <input
                    type="date"
                    value={auditEndDate}
                    onChange={(e) => setAuditEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none text-slate-500"
                    title="Logs end date range"
                  />
                </div>
              </div>
            </div>

            {/* Filtered logs lists Table */}
            <div className="bg-white rounded-3xl border border-slate-150 overflow-hidden shadow-xs text-left">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                  Showing {
                    mockAudits.filter(log => {
                      if (auditSearch) {
                        const s = auditSearch.toLowerCase();
                        const matches = log.action.toLowerCase().includes(s) || 
                                        log.admin.toLowerCase().includes(s) ||
                                        (log.device && log.device.toLowerCase().includes(s));
                        if (!matches) return false;
                      }
                      if (auditAdminFilter !== 'all' && log.admin !== auditAdminFilter) return false;
                      if (auditTypeFilter !== 'all' && log.actionType !== auditTypeFilter) return false;
                      if (auditStartDate && log.date < auditStartDate) return false;
                      if (auditEndDate && log.date > auditEndDate) return false;
                      return true;
                    }).length
                  } of {mockAudits.length} Records
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setMockAudits([
                        { id: 'aud-1', admin: 'winbigonly', actionType: 'Wallet Adjusted', action: 'Approved Withdrawal TX #WDL_7718', ip: '102.89.44.11', device: 'MacBook Pro M3 Pro', date: '2026-06-07' },
                        { id: 'aud-2', admin: 'winbigonly', actionType: 'User Modified', action: 'Upgraded basic account to Sovereign Premium Pro for @samuel_opay', ip: '102.89.44.11', device: 'Chrome Client Console', date: '2026-06-07' },
                        { id: 'aud-3', admin: 'winbigonly', actionType: 'Challenge Deleted', action: 'Purged offensive feed post #feed_902', ip: '102.89.44.11', device: 'MacBook Pro M3 Pro', date: '2026-06-07' },
                        { id: 'aud-4', admin: 'finance_bot', actionType: 'Wallet Adjusted', action: 'Credited @dan_stack with ₦150,000 challenge winnings bonus', ip: '192.168.1.100', device: 'Server Crontab Engine', date: '2026-06-06' },
                        { id: 'aud-5', admin: 'tutor_moderator', actionType: 'User Modified', action: 'Suspended spam user account @scam_flicker', ip: '105.112.38.99', device: 'Android Operations Client', date: '2026-06-05' },
                        { id: 'aud-6', admin: 'winbigonly', actionType: 'Challenge Deleted', action: 'Deleted inactive test competition "Naira Handshake Draft #1"', ip: '102.89.44.11', device: 'MacBook Pro', date: '2026-06-04' }
                      ]);
                      triggerToast('Audit trails reset to system standard starter pack.', 'success');
                    }}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer uppercase font-mono"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset Ledger
                  </button>
                  <button
                    onClick={() => {
                      setMockAudits([]);
                      triggerToast('Full ledger wiped. Empty state initiated.', 'info');
                    }}
                    className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer uppercase"
                  >
                    <Trash2 className="w-3 h-3" /> Bulk Clear
                  </button>
                </div>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Time Trigger</th>
                      <th>Admin Driver</th>
                      <th>Action category</th>
                      <th>Vetted Operational Ledger Detail</th>
                      <th>Operational terminal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockAudits
                      .filter(log => {
                        if (auditSearch) {
                          const s = auditSearch.toLowerCase();
                          const matches = log.action.toLowerCase().includes(s) || 
                                          log.admin.toLowerCase().includes(s) ||
                                          (log.device && log.device.toLowerCase().includes(s));
                          if (!matches) return false;
                        }
                        if (auditAdminFilter !== 'all' && log.admin !== auditAdminFilter) return false;
                        if (auditTypeFilter !== 'all' && log.actionType !== auditTypeFilter) return false;
                        if (auditStartDate && log.date < auditStartDate) return false;
                        if (auditEndDate && log.date > auditEndDate) return false;
                        return true;
                      })
                      .map((log) => {
                        const isWallet = log.actionType === 'Wallet Adjusted';
                        const isUserNum = log.actionType === 'User Modified';
                        const isDelCh = log.actionType === 'Challenge Deleted';
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="font-mono text-xs text-slate-450 whitespace-nowrap">{log.date}</td>
                            <td className="font-extrabold text-slate-900 text-xs">
                              <span className="text-slate-400 font-normal">@</span>{log.admin}
                            </td>
                            <td>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase whitespace-nowrap ${
                                isWallet ? 'bg-emerald-100 text-emerald-800' :
                                isUserNum ? 'bg-amber-100 text-amber-805' :
                                isDelCh ? 'bg-rose-100 text-rose-800' : 'bg-indigo-50 text-indigo-705'
                              }`}>
                                {log.actionType || 'General audit'}
                              </span>
                            </td>
                            <td className="font-sans text-xs text-slate-800 font-bold max-w-sm leading-relaxed">{log.action}</td>
                            <td className="font-mono text-[10.5px] text-slate-400 font-medium">
                              <div>
                                <p className="font-bold text-slate-600">{log.ip}</p>
                                <p className="text-[10px] text-slate-400 font-normal">{log.device}</p>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {mockAudits.filter(log => {
                      if (auditSearch) {
                        const s = auditSearch.toLowerCase();
                        const matches = log.action.toLowerCase().includes(s) || 
                                        log.admin.toLowerCase().includes(s) ||
                                        (log.device && log.device.toLowerCase().includes(s));
                        if (!matches) return false;
                      }
                      if (auditAdminFilter !== 'all' && log.admin !== auditAdminFilter) return false;
                      if (auditTypeFilter !== 'all' && log.actionType !== auditTypeFilter) return false;
                      if (auditStartDate && log.date < auditStartDate) return false;
                      if (auditEndDate && log.date > auditEndDate) return false;
                      return true;
                    }).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                            <ShieldAlert className="w-8 h-8 text-slate-300" />
                            <p className="text-xs font-extrabold">No administrative telemetry matches your filters.</p>
                            <button
                              onClick={() => {
                                setAuditSearch('');
                                setAuditAdminFilter('all');
                                setAuditTypeFilter('all');
                              }}
                              className="text-xs text-indigo-600 hover:underline font-bold mt-1"
                            >
                              Reset filters and try again
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 22: GENERAL SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs mb-6 text-left">
              <h2 className="text-md font-black text-slate-909 uppercase">Universal parameters setting</h2>
              <p className="text-xs text-slate-400 font-semibold mt-1">Configure general app characteristics such as client currency bounds, localization standard, and maintenance keys.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-150 text-xs font-bold max-w-xl space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">Standard Platform Name</label>
                <input type="text" defaultValue="Quizoe" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">Functional Currency Unit</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:outline-none">
                  <option value="NGN">Naira ₦ (NGN)</option>
                  <option value="USD">Dollar $ (USD)</option>
                </select>
              </div>
              <button
                onClick={() => triggerToast('General settings parameters saved successfully!', 'success')}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold p-3 rounded-xl cursor-pointer mt-4"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}

      </main>

      {/* VIEW SINGLE USER DIRECTORY MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 text-left border border-slate-100 relative max-h-[85vh] overflow-y-auto animate-fade-in shadow-xl">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs py-1 px-3 rounded-xl cursor-pointer"
            >
              Close Folder
            </button>
            
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
              <img src={selectedUser.avatar} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-150" alt="" />
              <div>
                <h3 className="text-md font-black text-slate-900">@{selectedUser.username}</h3>
                <p className="text-xs text-slate-400 font-semibold">{selectedUser.email}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-sans font-bold">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase block">Wallet Balance</span>
                  <p className="text-md text-slate-900 font-mono font-black mt-0.5">₦{selectedUser.balance.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase block">Status</span>
                  <span className="text-xs text-emerald-600 block mt-1">● Active Account</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block">Referral Campaign Summary</span>
                <p className="text-[11px] text-slate-700 mt-1">Code: <strong className="font-mono text-indigo-755">{selectedUser.referralCode || 'N/A'}</strong></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION OVERLAY DIALOG */}
      {actionConfirmItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-left border border-slate-100 animate-fade-in shadow-xl">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{actionConfirmItem.title}</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">{actionConfirmItem.desc}</p>
            <div className="flex gap-2.5 justify-end mt-6">
              <button
                onClick={() => setActionConfirmItem(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl cursor-pointer"
              >
                No, cancel
              </button>
              <button
                onClick={actionConfirmItem.onConfirm}
                className="bg-rose-900 hover:bg-rose-850 text-white font-bold text-xs py-2 px-4 rounded-xl cursor-pointer shadow-md"
              >
                Yes, authorize
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
