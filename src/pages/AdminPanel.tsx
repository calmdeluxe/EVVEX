import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { canAccessAdmin, isPlatformAdminEmail } from '../lib/authorization';
import { AdminLayout } from '../components/AdminLayout';
import { AdminConfirmModal } from '../components/AdminConfirmModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  Wallet, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Flag, 
  Coins, 
  BarChart3, 
  BookCheck, 
  BookOpen,
  MessageSquare,
  Search,
  BrainCircuit,
  ArrowUpRight,
  Clock,
  ExternalLink,
  ShieldCheck,
  Activity,
  Loader2,
  AlertTriangle,
  FileText,
  Video,
  X,
  Trophy,
  Zap,
  Database,
  LayoutDashboard,
  LogOut,
  Inbox,
  CreditCard,
  Download,
  RefreshCcw,
  Copy,
  Image,
  Upload,
  Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getAppUrl } from '../lib/utils';
import axios from 'axios';
import * as migrations from '../lib/migrations';
import { AdminRefundsSection } from '../components/admin/AdminRefundsSection';
import { AdminFeedbackSection } from '../components/admin/AdminFeedbackSection';
import { AdminEmailLogsSection } from '../components/admin/AdminEmailLogsSection';
import { AdminMprMonitoring } from '../components/AdminMprMonitoring';

export const AdminPanel: React.FC = () => {
  const { isAdmin, user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.hash.replace('#', '') || 'dashboard';
  
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [pendingBooks, setPendingBooks] = useState<any[]>([]);
  const [authorApplications, setAuthorApplications] = useState<any[]>([]);
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [paymentVerifications, setPaymentVerifications] = useState<any[]>([]);
  const [vaultItems, setVaultItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPost, setNewPost] = useState({ title: '', content: '', type: 'announcement', linkUrl: '' });
  const [supportResponse, setSupportResponse] = useState<{ id: string, text: string, status: string } | null>(null);
  const [paymentNote, setPaymentNote] = useState<{ id: string, text: string } | null>(null);
  const [healthChecks, setHealthChecks] = useState<any[]>([]);
  const [healthChecking, setHealthChecking] = useState(false);
  const [backendHealth, setBackendHealth] = useState<any>(null);
  const [dbOffline, setDbOffline] = useState(false);
  const [authorSubTab, setAuthorSubTab] = useState<'applications' | 'submissions'>('applications');
  const [triviaSubmissions, setTriviaSubmissions] = useState<any[]>([]);
  const [selectedTriviaReview, setSelectedTriviaReview] = useState<any | null>(null);
  const [triviaFeedback, setTriviaFeedback] = useState("");
  const [isTriviaReviewing, setIsTriviaReviewing] = useState(false);

  // Decline / Revisions feedback modal state
  const [declineModalBook, setDeclineModalBook] = useState<{ id: string; title: string; note?: string } | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineSubmitting, setDeclineSubmitting] = useState(false);
  
  // State for System Health Cover Auto-Upload tool
  const [healthBooks, setHealthBooks] = useState<any[]>([]);
  const [selectedHealthBookId, setSelectedHealthBookId] = useState<string>('');
  const [uploadingHealthCover, setUploadingHealthCover] = useState<boolean>(false);
  const [healthCoverFile, setHealthCoverFile] = useState<File | null>(null);
  const [healthUploadSuccess, setHealthUploadSuccess] = useState<string>('');
  const [healthUploadError, setHealthUploadError] = useState<string>('');

  // Safety confirmation modal state for critical admin actions
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionName: string;
    requiredWord: string;
    targetId?: string;
    targetType?: string;
    details?: any;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionName: '',
    requiredWord: 'delete',
    onConfirm: () => {},
  });

  // Robust query helper to read from user_profiles_public with users table fallback
  const queryUsers = async (selectStr: string = '*', filterIds?: string[]) => {
    try {
      let query = supabase.from('profiles').select(selectStr);
      if (filterIds && filterIds.length > 0) {
        query = query.in('id', filterIds);
      }
      const { data, error } = await query;
      if (!error && data) return { data, error: null };
      
      let fbQuery = supabase.from('profiles').select(selectStr);
      if (filterIds && filterIds.length > 0) {
        fbQuery = fbQuery.in('id', filterIds);
      }
      return await fbQuery;
    } catch (e: any) {
      let fbQuery = supabase.from('profiles').select(selectStr);
      if (filterIds && filterIds.length > 0) {
        fbQuery = fbQuery.in('id', filterIds);
      }
      return await fbQuery;
    }
  };

  const queryUserByEmail = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (!error && data) return { data, error: null };
      
      return await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
    } catch (e) {
      return await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
    }
  };

  useEffect(() => {
    if (activeTab === 'health') {
      const loadBooks = async () => {
        try {
          const { data, error } = await supabase
            .from('events')
            .select('id, title, cover_image')
            .order('title', { ascending: true });
          if (!error && data) {
            setHealthBooks(data);
          }
        } catch (err) {
          console.error("Failed to load events for health diagnostic tools:", err);
        }
      };
      loadBooks();
    }
  }, [activeTab]);

  const handleHealthUploadCover = async () => {
    if (!selectedHealthBookId) {
      setHealthUploadError("Please select a book first!");
      return;
    }
    if (!healthCoverFile) {
      setHealthUploadError("Please choose an image file to upload!");
      return;
    }

    setUploadingHealthCover(true);
    setHealthUploadSuccess('');
    setHealthUploadError('');

    try {
      const fileExt = healthCoverFile.name.split('.').pop();
      const fileName = `covers/${selectedHealthBookId}_${Date.now()}.${fileExt}`;
      
      // Upload file directly to 'media' bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, healthCoverFile, {
          cacheControl: '0',
          upsert: true
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      // Auto-fetch the public URL and update the event's cover_image column
      const { error: updateError } = await supabase
        .from('events')
        .update({ cover_image: publicUrl })
        .eq('id', selectedHealthBookId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setHealthUploadSuccess(`Successfully uploaded and linked cover image! Public URL: ${publicUrl}`);
      // Refresh local list to show update
      setHealthBooks(prev => prev.map(b => b.id.toString() === selectedHealthBookId ? { ...b, cover_image: publicUrl } : b));
      setHealthCoverFile(null);
    } catch (err: any) {
      setHealthUploadError(err.message || "Failed to upload cover image.");
    } finally {
      setUploadingHealthCover(false);
    }
  };

  // States and mechanisms for logging & zip retrieval
  const [logs, setLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'log' | 'warn' | 'error'>('all');
  const [downloadPending, setDownloadPending] = useState(false);

  useEffect(() => {
    // Seed initial buffered logs
    if ((window as any).__APP_LOGS__) {
      setLogs([...(window as any).__APP_LOGS__]);
    }
    
    // Listen for real-time broadcasts
    const handleNewLog = () => {
      if ((window as any).__APP_LOGS__) {
        setLogs([...(window as any).__APP_LOGS__]);
      }
    };
    
    window.addEventListener('newapplog', handleNewLog);
    return () => {
      window.removeEventListener('newapplog', handleNewLog);
    };
  }, []);

  const clearLogs = () => {
    (window as any).__APP_LOGS__ = [];
    setLogs([]);
  };

  const downloadLogsAsText = () => {
    const rawText = logs.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    const blob = new Blob([rawText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system_logs_${new Date().toISOString().substring(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadProjectZip = async () => {
    setDownloadPending(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const response = await axios.get('/api/admin/download-project-zip', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });
      
      const blob = response.data;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'project-source.zip';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Download Error: ' + err.message);
    } finally {
      setDownloadPending(false);
    }
  };

  const [supportFilter, setSupportFilter] = useState({ status: 'all', type: 'all' });
  const [supportPage, setSupportPage] = useState(1);
  const [paymentFilter, setPaymentFilter] = useState({ status: 'all' });
  const [upgradeTokens, setUpgradeTokens] = useState<any[]>([]);
  const [newTokenForm, setNewTokenForm] = useState({ 
    email: '', 
    tier: 'premium', 
    expires_in_days: 7,
    benefit_duration_days: 30 
  });
  const [selectedUserActivity, setSelectedUserActivity] = useState<any>(null);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [unlockForm, setUnlockForm] = useState({
    userIdentifier: '',
    bookId: '',
    amount: ''
  });

  const [userCohortFilter, setUserCohortFilter] = useState<'all' | 'premium' | 'authors' | 'marketing_partner' | 'admins' | 'suspended'>('all');

  const [dbCounts, setDbCounts] = useState<{ books: number; blogs: number; authors: number; loading: boolean; error: string | null }>({
    books: 0,
    blogs: 0,
    authors: 0,
    loading: false,
    error: null
  });

  const fetchRealtimeCounts = async () => {
    setDbCounts(current => ({ ...current, loading: true, error: null }));
    try {
      const [profilesResult, eventsResult, ticketsResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('event_tickets').select('id', { count: 'exact', head: true }),
      ]);

      const firstError = profilesResult.error || eventsResult.error || ticketsResult.error;
      if (firstError) throw firstError;

      setDbCounts({
        books: eventsResult.count || 0,
        blogs: ticketsResult.count || 0,
        authors: profilesResult.count || 0,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setDbCounts(current => ({
        ...current,
        loading: false,
        error: error?.message || 'Unable to retrieve live counts',
      }));
    }
  };

  const mask = (val: string) => {
    if (!val) return "MISSING";
    if (val.length < 10) return "****";
    return val.substring(0, 8) + "..." + val.substring(val.length - 4);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData(true);
      checkSystemHealth();
      // DISABLED: was polling CalmReader tables
      // fetchRealtimeCounts();

      // Implement background polling to immediately reflect fixed columns/policy recursion issues
      const healthTimer = setInterval(() => {
        checkSystemHealth(true);
        // DISABLED: was polling CalmReader tables
        // fetchRealtimeCounts();
      }, 10000);

      return () => clearInterval(healthTimer);
    }
  }, [isAdmin]);

  const checkSystemHealth = async (silent: boolean | React.MouseEvent = false) => {
    const isSilent = silent === true;
    if (!isSilent) setHealthChecking(true);
    const requiredColumns = [
      { table: 'profiles', column: 'app_role', label: 'App Role', migration: 'EVEX_SCHEMA' },
      { table: 'profiles', column: 'is_admin', label: 'Admin Permissions', migration: 'EVEX_SCHEMA' },
      { table: 'events', column: 'status', label: 'Event Status', migration: 'EVEX_SCHEMA' },
      { table: 'events', column: 'title', label: 'Event Title', migration: 'EVEX_SCHEMA' },
      { table: 'event_tickets', column: 'id', label: 'Event Tickets Table', migration: 'EVEX_SCHEMA' },
      { table: 'support_requests', column: 'id', label: 'Support Table', migration: 'EVEX_SCHEMA' },
      { table: 'transactions', column: 'id', label: 'Transactions Table', migration: 'EVEX_SCHEMA' }
    ];

    try {
      // We check by attempting a select on those columns
      const results = await Promise.all(requiredColumns.map(async (col) => {
        try {
          const { error } = await supabase.from(col.table).select(col.column).limit(1);
          return {
            ...col,
            status: error ? 'missing' : 'healthy',
            error: error?.message
          };
        } catch (err: any) {
           return {
             ...col,
             status: 'missing',
             error: err.message
           };
        }
      }));
      setHealthChecks(results);

      // Check for recursion error in results
      const recursionError = results.find(r => r.error?.includes('infinite recursion'));
      if (recursionError) {
        console.error("Infinite recursion detected in policies. Run Repair to fix.");
      }

      // Check backend config health directly using direct query to profiles
      try {
        const u = (supabase as any).supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '';
        const k = (supabase as any).supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
        const ref = u ? u.split('.')[0].replace('https://', '') : '';
        
        const { error: pingErr } = await supabase.from('profiles').select('id').limit(1);
        const isHealthy = !pingErr;
        
        const bHealth = {
          status: isHealthy ? 'ok' : 'error',
          db: isHealthy ? 'healthy' : 'misconfigured',
          config: {
            url: u,
            key: k,
            projectRef: ref,
            keyProjectRef: ref
          },
          configStatus: { ok: isHealthy, reason: pingErr?.message },
          envStatus: {
            CALM_GEMINI_KEY: 'SET',
            PAYSTACK_SECRET_KEY: 'SET',
            MAILTRAP_API_TOKEN: 'SET',
            SUPABASE_URL: !!u,
            SUPABASE_SERVICE_ROLE_KEY: !!k
          },
          purchaseLogs: [] as any[],
          richRecentPurchases: [] as any[],
          rawTransactions: [] as any[]
        };
        
        setBackendHealth(bHealth);
        setDbOffline(!isHealthy);
      } catch (pingErr: any) {
        setBackendHealth({
          status: 'error',
          db: 'misconfigured',
          config: { url: '', key: '', projectRef: '', keyProjectRef: '' },
          configStatus: { ok: false, reason: pingErr.message || 'Connection failed' },
          envStatus: {
            CALM_GEMINI_KEY: 'SET',
            PAYSTACK_SECRET_KEY: 'SET',
            MAILTRAP_API_TOKEN: 'SET',
            SUPABASE_URL: false,
            SUPABASE_SERVICE_ROLE_KEY: false
          },
          purchaseLogs: [],
          richRecentPurchases: [],
          rawTransactions: []
        });
        setDbOffline(true);
      }
    } catch (err) {
      console.error('Health check error:', err);
    } finally {
      setHealthChecking(false);
    }
  };

  const fetchAdminData = async (isInitial = false) => {
    if (isInitial || users.length === 0) {
      setLoading(true);
    }
    try {
      await Promise.all([
        // stats
        (async () => {
          try {
            const { count: booksCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
            const { data: usersDataForCount, error: usersErrorForCount } = await queryUsers('id');
            const usersCount = !usersErrorForCount && usersDataForCount ? usersDataForCount.length : 0;
            const { data: revData } = await supabase.from('transactions').select('amount, status');
            const revenueData = (revData || []).filter((r: any) => r.status === 'success' || r.status === 'successful');
            const totalRev = (revenueData || []).reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0);
            setStats({
              totalRevenue: totalRev,
              totalUsers: usersCount || 0,
              totalBooks: booksCount || 0
            });
          } catch (err) {
            console.error('[AdminPanel] stats query failed:', err);
          }
        })(),

        // triviaSubmissions (LEGACY CalmReader feature, gracefully handled)
        (async () => {
          try {
            // LEGACY: trivias table does not exist in EVEX schema
            setTriviaSubmissions([]);
          } catch (err) {
            // Swallowed
          }
        })(),

        // pendingBooks -> events moderation
        (async () => {
          try {
            const { data: dbEvents } = await supabase
              .from('events')
              .select('*')
              .eq('status', 'pending_review')
              .order('created_at', { ascending: false });

            if (dbEvents && dbEvents.length > 0) {
              const organizerIds = [...new Set(dbEvents.map((v: any) => v.organizer_id))].filter(Boolean);
              let userMap: Record<string, any> = {};
              if (organizerIds.length > 0) {
                const { data: profilesData } = await supabase.from('profiles').select('id, email, full_name').in('id', organizerIds);
                if (profilesData) {
                  userMap = profilesData.reduce((acc: any, u: any) => { acc[u.id] = u; return acc; }, {});
                }
              }
              const mappedEvents = dbEvents.map((b: any) => ({
                ...b,
                users: userMap[b.organizer_id] || { email: 'Unknown Host' }
              }));
              setPendingBooks(mappedEvents);
            } else {
              setPendingBooks([]);
            }
          } catch (err) {
            console.error('[AdminPanel] pendingBooks query failed:', err);
          }
        })(),

        // withdrawals
        (async () => {
          try {
            const { data: rawWithdrawals } = await supabase
              .from('payment_requests')
              .select('*')
              .order('created_at', { ascending: false });
            
            const dbWithdrawals = rawWithdrawals?.filter((v: any) => v.status === 'pending' || v.status === 0 || v.status === '0' || v.status === 'open') || null;
            
            if (dbWithdrawals) {
              const userIds = [...new Set(dbWithdrawals.map((v: any) => v.user_id))].filter(Boolean);
              let userMap: Record<string, any> = {};
              if (userIds.length > 0) {
                const { data: usersData } = await queryUsers('id, email', userIds);
                if (usersData) {
                  userMap = usersData.reduce((acc: any, u: any) => { acc[u.id] = u; return acc; }, {});
                }
              }
              const mappedWithdrawals = dbWithdrawals.map((w: any) => ({
                ...w,
                users: userMap[w.user_id] || { email: 'Unknown User' }
              }));
              setWithdrawals(mappedWithdrawals);
            }
          } catch (err) {
            console.error('[AdminPanel] withdrawals query failed:', err);
          }
        })(),

        // users
        (async () => {
          try {
            const { data: dbUsers } = await queryUsers('id, email, full_name, username, account_tier, is_admin, is_premium, wallet_balance, t_points, created_at');
            if (dbUsers) {
              setUsers(dbUsers);
            }
          } catch (err) {
            console.error('[AdminPanel] users query failed:', err);
          }
        })(),

        // transactions
        (async () => {
          try {
            const { data: dbTx } = await supabase
              .from('purchases')
              .select('*')
              .order('created_at', { ascending: false });
            if (dbTx) {
              const userIds = [...new Set(dbTx.map((v: any) => v.user_id))].filter(Boolean);
              const bookIds = [...new Set(dbTx.map((v: any) => v.book_id))].filter(Boolean);
              let userMap: Record<string, any> = {};
              let bookMap: Record<string, any> = {};
              
              if (userIds.length > 0) {
                const { data: usersData } = await queryUsers('id, email', userIds);
                if (usersData) {
                  userMap = usersData.reduce((acc: any, u: any) => { acc[u.id] = u; return acc; }, {});
                }
              }
              if (bookIds.length > 0) {
                const { data: booksData } = await supabase.from('events').select('id, title').in('id', bookIds);
                if (booksData) {
                  bookMap = booksData.reduce((acc: any, b: any) => { acc[b.id] = b; return acc; }, {});
                }
              }
              const mappedTx = dbTx.map((t: any) => ({
                ...t,
                users: userMap[t.user_id] || { email: 'Unknown User' },
                books: bookMap[t.book_id] || { title: 'Unknown Event' }
              }));
              setTransactions(mappedTx);
            }
          } catch (err) {
            console.error('[AdminPanel] transactions query failed:', err);
          }
        })(),

        // announcements
        (async () => {
          try {
            const { data: dbAnn } = await supabase
               .from('announcements')
               .select('*')
               .order('created_at', { ascending: false });
            if (dbAnn) {
               setPosts(dbAnn);
            }
          } catch (err) {
            console.error('[AdminPanel] announcements query failed:', err);
          }
        })(),

        // support
        (async () => {
          try {
            const { data: dbSupport } = await supabase
              .from('support_requests')
              .select('*')
              .order('created_at', { ascending: false });
            
            if (dbSupport) {
              const userIds = [...new Set(dbSupport.map((v: any) => v.user_id))].filter(Boolean);
              let userMap: Record<string, any> = {};
              if (userIds.length > 0) {
                const { data: usersData } = await queryUsers('id, email', userIds);
                if (usersData) {
                  userMap = usersData.reduce((acc: any, u: any) => { acc[u.id] = u; return acc; }, {});
                }
              }
              const mappedSupport = dbSupport.map((s: any) => ({
                ...s,
                users: userMap[s.user_id] || { email: 'Unknown User' }
              }));
              setSupportRequests(mappedSupport);
            }
          } catch (err) {
            console.error('[AdminPanel] support query failed:', err);
          }
        })(),

        // authorApplications
        (async () => {
          try {
            const { data: dbAuth } = await supabase
              .from('author_applications')
              .select('*')
              .order('created_at', { ascending: false });
            if (dbAuth) {
              const userIds = [...new Set(dbAuth.map((v: any) => v.user_id))].filter(Boolean);
              let userMap: Record<string, any> = {};
              if (userIds.length > 0) {
                const { data: usersData } = await queryUsers('id, email', userIds);
                if (usersData) {
                  userMap = usersData.reduce((acc: any, u: any) => { acc[u.id] = u; return acc; }, {});
                }
              }
              const mappedAuth = dbAuth.map((a: any) => ({
                ...a,
                users: userMap[a.user_id] || { email: 'Unknown User' }
              }));
              setAuthorApplications(mappedAuth);
            }
          } catch (err) {
            console.error('[AdminPanel] authorApplications query failed:', err);
          }
        })(),

        // paymentVerifications
        (async () => {
          try {
            const { data: dbPV } = await supabase
              .from('payment_verifications')
              .select('*')
              .order('created_at', { ascending: false });
            
            if (dbPV) {
              const userIds = [...new Set(dbPV.map((v: any) => v.user_id))].filter(Boolean);
              let userMap: Record<string, any> = {};
              if (userIds.length > 0) {
                const { data: usersData } = await queryUsers('id, email', userIds);
                if (usersData) {
                  userMap = usersData.reduce((acc: any, u: any) => { acc[u.id] = u; return acc; }, {});
                }
              }
              const mappedPV = dbPV.map((v: any) => ({
                ...v,
                users: userMap[v.user_id] || { email: 'Unknown User' }
              }));
              setPaymentVerifications(mappedPV);
            }
          } catch (err) {
            console.error('[AdminPanel] paymentVerifications query failed:', err);
          }
        })(),

        // upgradeTokens
        (async () => {
          try {
            const { data: dbTokens } = await supabase
              .from('upgrade_tokens')
              .select('*')
              .order('created_at', { ascending: false });
            if (dbTokens) {
              setUpgradeTokens(dbTokens);
            }
          } catch (err) {
            console.error('[AdminPanel] upgradeTokens query failed:', err);
          }
        })(),

        // vault
        (async () => {
          try {
            const { data: dbVault } = await supabase
              .from('vault')
              .select('*')
              .order('created_at', { ascending: false });
            if (dbVault) {
              setVaultItems(dbVault);
            }
          } catch (err) {
            console.error('[AdminPanel] vault query failed:', err);
          }
        })()
      ]);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      if (isInitial || users.length === 0) {
        setTimeout(() => setLoading(false), 300);
      }
    }
  };

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editingPayout, setEditingPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ bank_name: '', account_number: '', account_name: '' });
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);

  const handleOpenPayoutEdit = (user: any) => {
    setSelectedUser(user);
    setPayoutForm({
      bank_name: user.bank_name || '',
      account_number: user.account_number || '',
      account_name: user.account_name || ''
    });
    setEditingPayout(true);
  };

  const handleSavePayout = async () => {
    if (!selectedUser) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bank_name: payoutForm.bank_name,
          account_number: payoutForm.account_number,
          account_name: payoutForm.account_name
        })
        .eq('id', selectedUser.id);
      if (error) throw error;
      setEditingPayout(false);
      setSelectedUser(null);
      fetchAdminData();
    } catch (err: any) {
      alert('Failed to update payout details: ' + err.message);
    }
  };

  const handleOpenReview = async (book: any) => {
    setSelectedBook(book);
    setReviewMode(true);
    setLoadingCards(true);
    try {
      const { data, error } = await supabase.from('events').select('description').eq('id', book.id).maybeSingle();
      if (error) throw error;
      let cards: any[] = [];
      try {
        cards = data?.description ? [{ question: 'Event Overview', answer: data.description }] : [];
      } catch (e) {
        cards = [];
      }
      setSelectedBook((prev: any) => {
        if (!prev || prev.id !== book.id) return prev;
        return { ...prev, cards_json: cards || [] };
      });
    } catch (err: any) {
      console.error("Failed to load cards for review:", err);
    } finally {
      setLoadingCards(false);
    }
  };

  const handleBookAction = async (bookId: string, action: 'approve' | 'reject', admin_note?: string) => {
    try {
      const newStatus = action === 'approve' ? 'published' : 'draft';
      const { error } = await supabase
        .from("events")
        .update({
          status: newStatus,
          admin_note: admin_note || null,
        })
        .eq("id", bookId);

      if (error) throw error;

      // Log into admin_audit_log
      try {
        const { data: session } = await supabase.auth.getSession();
        const actor = session.session?.user;
        await supabase.from('admin_audit_log').insert({
          actor_id: actor?.id || null,
          actor_email: actor?.email || null,
          category: 'event_moderation',
          severity: 'audit',
          action: action === 'approve' ? 'event_approved' : 'event_rejected',
          target_type: 'event',
          target_id: bookId,
          metadata: { new_status: newStatus, admin_note: admin_note || null }
        });
      } catch (e) {}

      setPendingBooks(prev => prev.filter(b => b.id !== bookId));
      setReviewMode(false);
      setSelectedBook(null);
      fetchAdminData();
      alert(`Event ${action === 'approve' ? 'approved & published' : 'declined'} successfully.`);
    } catch (err: any) {
      alert('Failed to update event status: ' + err.message);
    }
  };

  const handleWithdrawalAction = async (withdrawalId: string, action: 'approve' | 'reject') => {
    try {
      // 1. Try to update in payment_requests
      const { data: prData } = await supabase
        .from('payment_requests')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', withdrawalId)
        .select();

      // 2. Also try to update in withdrawals
      const { data: wData } = await supabase
        .from('withdrawals')
        .update({ 
          status: action === 'approve' ? 'approved' : 'rejected',
          processed_at: action === 'approve' ? new Date().toISOString() : null
        })
        .eq('id', withdrawalId)
        .select();

      // 3. If approved, handle balance/transactions
      if (action === 'approve') {
        const item = (prData && prData[0]) || (wData && wData[0]);
        if (item) {
          await supabase.from('transactions').insert({
            user_id: item.user_id,
            type: 'withdrawal',
            amount: -item.amount,
            status: 'completed'
          });
        }
      }

      fetchAdminData();
    } catch (err: any) {
      alert('Failed to process withdrawal: ' + err.message);
    }
  };

  const handlePaymentVerify = async (id: string, action: 'approve' | 'reject') => {
    try {
      const session = await supabase.auth.getSession();
      const adminUserId = session.data.session?.user?.id;
      const status = action === 'approve' ? 'approved' : 'rejected';
      const note = paymentNote?.id === id ? paymentNote.text : '';

      // 1. Fetch current verification
      const { data: pv, error: fetchErr } = await supabase
        .from("payment_verifications")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr || !pv) throw new Error(fetchErr?.message || "Verification record not found");

      // 2. Update payment_verifications
      const { error: updateErr } = await supabase
        .from("payment_verifications")
        .update({
          status,
          admin_note: note,
          approved_by: action === 'approve' ? adminUserId : null,
          approved_at: action === 'approve' ? new Date().toISOString() : null
        })
        .eq("id", id);

      if (updateErr) throw updateErr;

      // 3. If approved, apply consequences
      if (action === "approve") {
        const { data: user } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", pv.user_id)
          .maybeSingle();

        if (user) {
          if (pv.transaction_type === "premium_upgrade") {
            await supabase.rpc("admin_set_user_tier", {
              p_email: user.email,
              p_new_tier: "premium",
            });
          } else if (pv.transaction_type === "author_upgrade") {
            await supabase.rpc("admin_set_user_tier", {
              p_email: user.email,
              p_new_tier: "author",
            });
          } else if (pv.transaction_type === "ebook_purchase" && pv.reference_id) {
            await supabase.from("transactions").insert({
              user_id: pv.user_id,
              book_id: pv.reference_id,
              buyer_email: user.email,
              amount: Math.round(pv.amount || 0),
              type: "purchase",
              status: "successful",
              paystack_reference: pv.transaction_ref || `MANUAL-${pv.id}`,
            });

            try {
              const { data: existingEpic } = await supabase
                .from("event_tickets")
                .select("*")
                .eq("user_id", pv.user_id)
                .eq("event_id", pv.reference_id)
                .maybeSingle();

              if (!existingEpic) {
                await supabase.from("event_tickets").insert({
                  user_id: pv.user_id,
                  event_id: pv.reference_id
                });
              }
            } catch (e: any) {
              console.warn("event_tickets double-grant insert failed:", e);
            }
          }
        }
      }

      setPaymentNote(null);
      fetchAdminData();
      alert(`Verification ${action}d successfully.`);
    } catch (err: any) {
      alert('Failed to resolve verification: ' + err.message);
    }
  };

  const handleSupportRespond = async (requestId: string) => {
    if (!supportResponse?.text) return;
    try {
      const session = await supabase.auth.getSession();
      const adminId = session.data.session?.user?.id;
      const status = supportResponse.status || 'resolved';
      const response = supportResponse.text;

      // 1. Update support request
      const { error: updateError } = await supabase
        .from("support_requests")
        .update({ status, admin_response: response })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // 2. Audit response
      if (adminId) {
        try {
          await supabase.from("admin_responses").insert({
            request_id: requestId,
            admin_id: adminId,
            response: response,
            status_after: status,
          });
        } catch (e) {
          console.warn("Audit log insert failed:", e);
        }
      }

      setSupportResponse(null);
      fetchAdminData();
    } catch (err: any) {
      alert('Failed to send response: ' + err.message);
    }
  };

  const handleResolveAuthorApplication = async (applicationId: string, action: 'approve' | 'reject', adminNote?: string) => {
    try {
      const { data: appData, error: appErr } = await supabase
        .from("author_applications")
        .select("*")
        .eq("id", applicationId)
        .maybeSingle();

      if (appErr || !appData) {
        throw new Error("Application not found");
      }

      const status = action === "approve" ? "approved" : "rejected";

      const { error: updateErr } = await supabase
        .from("author_applications")
        .update({
          status,
          admin_note: adminNote || null,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", applicationId);

      if (updateErr) throw updateErr;

      if (action === "approve") {
        const { error: userErr } = await supabase
          .from("profiles")
          .update({
            app_role: "event_host",
            account_tier: "author",
            is_approved_author: true
          })
          .eq("id", appData.user_id);

        if (userErr) throw userErr;
      }

      fetchAdminData();
    } catch (err: any) {
      alert('Failed to resolve application: ' + err.message);
    }
  };

  const handleUserAction = async (userId: string, action: string, value: any) => {
    try {
      let updateData: any = {};
      let targetTable = "profiles";

      if (action === "toggle_admin") {
        updateData.is_admin = !!value;
        if (value) updateData.app_role = 'admin';
      } else if (action === "toggle_premium") {
        updateData.is_premium = !!value;
        updateData.is_vip = !!value;
      } else if (action === "toggle_suspend") {
        updateData.is_suspended = !!value;
      } else if (action === "toggle_book_suspend") {
        updateData.status = value ? 'archived' : 'published';
        targetTable = "events";
      }

      const { error } = await supabase
        .from(targetTable)
        .update(updateData)
        .eq("id", userId);

      if (error) throw error;
      fetchAdminData();
    } catch (err: any) {
      alert('Failed to update user: ' + err.message);
    }
  };

  const requestUserSuspend = (targetUser: any, suspend: boolean) => {
    if (!suspend) {
      handleUserAction(targetUser.id, 'toggle_suspend', false);
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: `Suspend Account: ${targetUser.full_name || targetUser.email}`,
      description: `Suspending this user account will revoke their active session access and block them from logging in or making transactions.`,
      actionName: "Suspend User Account",
      requiredWord: "suspend",
      targetId: targetUser.id,
      targetType: "user",
      details: { email: targetUser.email },
      onConfirm: async () => {
        await handleUserAction(targetUser.id, 'toggle_suspend', true);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteBook = async (bookId: string, itemTitle?: string, typeName: string = 'eBook') => {
    setConfirmModal({
      isOpen: true,
      title: `Delete ${typeName}: ${itemTitle || 'Item'}`,
      description: `Deleting this ${typeName.toLowerCase()} permanently removes it and all associated metadata. This action cannot be undone.`,
      actionName: `Delete ${typeName}`,
      requiredWord: "delete",
      targetId: bookId,
      targetType: typeName.toLowerCase(),
      onConfirm: async () => {
        try {
          await supabase
            .from('events')
            .update({ status: 'cancelled' })
            .eq('id', bookId);

          // Log into admin_audit_log
          try {
            const { data: session } = await supabase.auth.getSession();
            const actor = session.session?.user;
            await supabase.from('admin_audit_log').insert({
              actor_id: actor?.id || null,
              actor_email: actor?.email || null,
              category: 'event_moderation',
              severity: 'audit',
              action: 'event_cancelled',
              target_type: 'event',
              target_id: bookId
            });
          } catch (e) {}

          setPendingBooks(prev => prev.filter(b => b.id !== bookId));
          fetchAdminData();
          alert(`${typeName} cancelled successfully`);
        } catch (err: any) {
          alert(`Failed to delete ${typeName.toLowerCase()}: ` + (err.response?.data?.error || err.message));
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleGenerateToken = async () => {
    try {
      const randToken = 'UPG-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      const { error } = await supabase.from('upgrade_tokens').insert([{
        token: randToken,
        target_tier: newTokenForm.tier,
        expires_at: new Date(Date.now() + (newTokenForm.expires_in_days || 7) * 24 * 3600 * 1000).toISOString(),
        benefit_duration_days: newTokenForm.benefit_duration_days || null,
        user_email: newTokenForm.email?.trim() || null
      }]);
      if (error) {
        throw new Error('Supabase insert failed: ' + error.message);
      }

      setNewTokenForm({ 
        email: '', 
        tier: 'premium', 
        expires_in_days: 7, 
        benefit_duration_days: 30 
      });
      fetchAdminData();
      alert('Upgrade token generated successfully');
    } catch (err: any) {
      alert('Failed to generate token: ' + err.message);
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (!window.confirm('Delete this token?')) return;
    try {
      const { error } = await supabase.from('upgrade_tokens').delete().eq('id', tokenId);
      if (error) throw error;
      fetchAdminData();
      alert('Token deleted successfully');
    } catch (err: any) {
      alert('Failed to delete token: ' + err.message);
    }
  };

  const handlePromoteDemote = async (userId: string, targetTier: string, duration?: number) => {
    try {
      const { data: user } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();
      if (!user) throw new Error("User not found");

      const params: any = {
        p_email: user.email,
        p_new_tier: targetTier,
      };
      if (duration !== undefined && duration !== null) {
        params.p_duration_days = Number(duration);
      }

      // Attempt RPC call first
      const { error: rpcErr } = await supabase.rpc("admin_set_user_tier", params);

      // Direct database update to guarantee database synchronization
      const updates: any = { account_tier: targetTier };
      if (targetTier === 'premium') {
        updates.is_premium = true;
        updates.is_vip = true;
      } else if (targetTier === 'marketing_partner') {
        updates.role = 'marketing_partner';
        updates.account_tier = 'marketing_partner';
        updates.app_role = 'mpr';
      } else if (targetTier === 'author') {
        updates.is_approved_author = true;
        updates.app_role = 'event_host';
      } else if (targetTier === 'free') {
        updates.is_premium = false;
        updates.role = 'user';
        updates.app_role = 'guest';
      } else if (targetTier === 'admin') {
        updates.is_admin = true;
        updates.app_role = 'admin';
      }

      const { error: updateErr } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (rpcErr && updateErr) {
        throw updateErr || rpcErr;
      }

      fetchAdminData(false);
      alert(`User tier updated to ${targetTier}`);
    } catch (err: any) {
      alert('Failed to update tier: ' + err.message);
    }
  };

  const handlePromoteDemoteByEmail = async (email: string, targetTier: string, duration?: number) => {
    try {
      // First find user by email using Supabase directly
      const { data: userData, error: userError } = await queryUserByEmail(email);
      
      if (userError || !userData) {
        alert("User not found with email: " + email);
        return;
      }
      
      await handlePromoteDemote(userData.id, targetTier, duration);
    } catch (err: any) {
      alert('Search failed: ' + err.message);
    }
  };

  const fetchUserActivity = async (userId: string) => {
    try {
      setIsActivityLoading(true);
      
      const [userRes, booksRes, transRes, applyRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("events").select("*").eq("created_by", userId),
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("author_applications").select("*").eq("user_id", userId),
      ]);

      let activities: any[] = [];
      try {
        const { data: actData } = await supabase
          .from("user_activity")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (actData) activities = actData;
      } catch (e: any) {
        console.warn("Failed to fetch user_activity:", e);
      }

      let userSession: any = null;
      try {
        const { data: sessData } = await supabase
          .from("user_sessions")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        if (sessData) userSession = sessData;
      } catch (e: any) {
        console.warn("Failed to fetch user_sessions:", e);
      }

      setSelectedUserActivity({
        profile: userRes.data,
        books: booksRes.data || [],
        transactions: transRes.data || [],
        applications: applyRes.data || [],
        activities,
        session: userSession,
      });
    } catch (err: any) {
      console.error("Error fetching activity:", err);
      alert("Failed to load user activity: " + err.message);
    } finally {
      setIsActivityLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        <p className="text-gray-500">Loading Admin Panel...</p>
      </div>
    );
  }

  const isAuthorized = isAdmin || canAccessAdmin({ ...(profile || {}), email: user?.email, is_admin: isAdmin });

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="bg-white p-12 rounded-[2.5rem] shadow-xl max-w-md border border-slate-100 flex flex-col items-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight uppercase italic">Access Denied</h2>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">
            You do not have administrative privileges to access this area.
          </p>
          <div className="flex flex-col gap-3 w-full">
            <Button onClick={() => navigate('/dashboard')} className="bg-green-700 hover:bg-green-800 text-white font-bold h-14 rounded-2xl w-full shadow-lg">
              Return to Dashboard
            </Button>
            <Button variant="ghost" onClick={() => supabase.auth.signOut().then(() => navigate('/login'))} className="font-bold text-slate-400">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {[
        { label: 'Gross Revenue', value: `₦${stats?.totalRevenue?.toLocaleString() || 0}`, icon: Coins, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Active Readers', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Author Hub', value: authorApplications?.filter(a => a.status === 'pending').length || 0, icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50', sub: 'Pending' },
        { label: 'Content Pool', value: stats?.totalBooks || 0, icon: BookCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Open Repairs', value: healthChecks.filter(h => h.status === 'missing').length || 0, icon: Activity, color: 'text-red-600', bg: 'bg-red-50' },
        { label: 'Withdrawal', value: withdrawals.length || 0, icon: Wallet, color: 'text-orange-600', bg: 'bg-orange-50', sub: 'Queue' },
      ].map((stat) => (
        <Card key={stat.label} className="border-none shadow-sm hover:shadow-md transition-shadow rounded-3xl overflow-hidden group">
          <CardContent className="p-6 flex flex-col justify-between h-full min-h-[140px]">
            <div className={`p-3 w-fit rounded-2xl ${stat.bg} ${stat.color} mb-4 transition-transform group-hover:scale-110`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                {stat.label} {stat.sub && <span className="text-gray-300 ml-1">/ {stat.sub}</span>}
              </p>
              <p className="text-2xl font-black text-gray-900 tracking-tight">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <AdminLayout>
      <div className="page-container space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
        {/* Persistent Admin Navigation Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Control Center</p>
              <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase italic flex items-center gap-2">
                Admin Console
                <Badge className="bg-slate-900 text-white rounded-full text-[10px] py-0.5 px-3 uppercase tracking-wider font-extrabold">{activeTab}</Badge>
              </h1>
            </div>
          </div>
          
          <Button 
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
          >
             <LayoutDashboard className="w-4 h-4" /> Exit to Dashboard
          </Button>
        </div>

        {dbOffline && (
          <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-lg mb-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="space-y-3 flex-1">
                <h3 className="text-lg font-bold text-red-900">Database Connection Required</h3>
                <div className="text-red-700 space-y-2">
                  <p>The platform is running in restricted safety mode because Supabase is not properly configured. Most admin functions will be disabled.</p>
                  {backendHealth?.configStatus?.reason && (
                    <div className="p-3 bg-white/50 border border-red-200 rounded text-xs font-mono mt-2 break-all">
                      {backendHealth.configStatus.reason}
                    </div>
                  )}
                  <div className="pt-2">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => navigate('/setup')}
                    >
                      Launch Setup Wizard
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              <Card 
                className="bg-indigo-600 border-none shadow-lg cursor-pointer hover:bg-indigo-700 transition-all group"
                onClick={() => navigate('/create-book?type=ebook')}
              >
                <CardContent className="p-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <BrainCircuit className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 tracking-tight">eBook Studio</h3>
                  <p className="text-indigo-100 text-[10px] uppercase font-bold tracking-widest opacity-80">Author Mode</p>
                  <Button variant="secondary" className="mt-6 w-full font-black rounded-xl h-10">New eBook</Button>
                </CardContent>
              </Card>

              <Card 
                className="bg-emerald-600 border-none shadow-lg cursor-pointer hover:bg-emerald-700 transition-all group"
                onClick={() => navigate('/admin/payments')}
              >
                <CardContent className="p-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Coins className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 tracking-tight">Payments</h3>
                  <p className="text-emerald-100 text-[10px] uppercase font-bold tracking-widest opacity-80">Income Queue</p>
                  <Button variant="secondary" className="mt-6 w-full font-black rounded-xl h-10">Verify Payments</Button>
                </CardContent>
              </Card>

              <Card 
                className="bg-teal-600 border-none shadow-lg cursor-pointer hover:bg-teal-700 transition-all group"
                onClick={() => navigate('/admin/payment-verifications')}
              >
                <CardContent className="p-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 tracking-tight">Manual Proofs</h3>
                  <p className="text-teal-100 text-[10px] uppercase font-bold tracking-widest opacity-80">Audit Desk</p>
                  <Button variant="secondary" className="mt-6 w-full font-black rounded-xl h-10">Verify Receipts</Button>
                </CardContent>
              </Card>

              <Card 
                className="bg-slate-900 border-none shadow-lg cursor-pointer hover:bg-black transition-all group border-2 border-red-500/20"
                onClick={() => navigate('/admin#health')}
              >
                <CardContent className="p-8 flex flex-col items-center text-center relative overflow-hidden">
                  <div className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </div>
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Activity className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 tracking-tight">System Health</h3>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest opacity-80">Direct Diagnostic Desk</p>
                  <Button variant="secondary" className="mt-6 w-full font-black rounded-xl h-10 bg-red-600 text-white hover:bg-red-700 border-none">Inspect Health</Button>
                </CardContent>
              </Card>

              <Card 
                className="bg-purple-700 border-none shadow-lg cursor-pointer hover:bg-purple-800 transition-all group"
                onClick={() => navigate('/admin/mpr-hub')}
              >
                <CardContent className="p-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 tracking-tight">MPR Account Hub</h3>
                  <p className="text-purple-100 text-[10px] uppercase font-bold tracking-widest opacity-80">Partner Control Panel</p>
                  <Button variant="secondary" className="mt-6 w-full font-black rounded-xl h-10">Manage Partners</Button>
                </CardContent>
              </Card>

              <Card 
                className="bg-blue-600 border-none shadow-lg cursor-pointer hover:bg-blue-700 transition-all group"
                onClick={() => navigate('/admin#users')}
              >
                <CardContent className="p-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 tracking-tight">Users</h3>
                  <p className="text-blue-100 text-[10px] uppercase font-bold tracking-widest opacity-80">Directory</p>
                  <Button variant="secondary" className="mt-6 w-full font-black rounded-xl h-10">Manage Users</Button>
                </CardContent>
              </Card>

              <Card 
                className="bg-purple-600 border-none shadow-lg cursor-pointer hover:bg-purple-700 transition-all group"
                onClick={() => navigate('/admin/confessions')}
              >
                <CardContent className="p-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 tracking-tight">Confessions</h3>
                  <p className="text-purple-100 text-[10px] uppercase font-bold tracking-widest opacity-80">Moderation</p>
                  <Button variant="secondary" className="mt-6 w-full font-black rounded-xl h-10">Manage Studio</Button>
                </CardContent>
              </Card>

              <Card 
                className="bg-amber-600 border-none shadow-lg cursor-pointer hover:bg-amber-700 transition-all group"
                onClick={() => navigate('/admin/trivia')}
              >
                <CardContent className="p-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 tracking-tight">Trivia Center</h3>
                  <p className="text-amber-100 text-[10px] uppercase font-bold tracking-widest opacity-80">Engagement</p>
                  <Button variant="secondary" className="mt-6 w-full font-black rounded-xl h-10">Manage Trivia</Button>
                </CardContent>
              </Card>

              <Card 
                className="bg-slate-900 border-none shadow-lg cursor-pointer hover:bg-black transition-all group"
                onClick={() => navigate('/dashboard')}
              >
                <CardContent className="p-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <LayoutDashboard className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 tracking-tight">User View</h3>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest opacity-80">Switch to App</p>
                  <Button variant="outline" className="mt-6 w-full font-black border-slate-700 text-white hover:bg-slate-800 rounded-xl h-10">Exit Admin</Button>
                </CardContent>
              </Card>

              <Card 
                className="bg-red-600 border-none shadow-lg cursor-pointer hover:bg-red-700 transition-all group"
                onClick={() => {
                  if (window.confirm("Are you sure you want to log out? Security keys will be wiped from session.")) {
                    supabase.auth.signOut().then(() => navigate('/login'));
                  }
                }}
              >
                <CardContent className="p-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <LogOut className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 tracking-tight italic uppercase">Restart</h3>
                  <p className="text-red-100 text-[10px] uppercase font-bold tracking-widest opacity-80">Security</p>
                  <Button variant="secondary" className="mt-6 w-full font-black rounded-xl h-10 text-red-600">Secure Logout</Button>
                </CardContent>
              </Card>
            </div>
            {renderStats()}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Pending Books</CardTitle>
                    <CardDescription>Books waiting for review.</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/admin#books')}>View All</Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto w-full min-w-0">
                    <table className="w-full text-sm text-left responsive-table">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-3 font-medium text-gray-500">Title</th>
                          <th className="px-6 py-3 font-medium text-gray-500">Author</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pendingBooks.slice(0, 5).map(book => (
                          <tr key={book.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">{book.title}</td>
                            <td className="px-6 py-4 text-gray-500">{book.users?.email || book.user_id}</td>
                            <td className="px-6 py-4 text-right">
                              <Button size="sm" onClick={() => handleOpenReview(book)} className="h-8 bg-slate-900 font-bold px-4 hover:bg-slate-800 rounded-lg">Review</Button>
                            </td>
                          </tr>
                        ))}
                        {pendingBooks.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-6 py-4 text-center text-gray-400 font-medium">
                              No pending books to review.
                            </td>
                          </tr>
                        )}
                      </tbody>


                    </table>
                  </div>
                </CardContent>
              </Card>

              {reviewMode && selectedBook && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                  >
                    <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900">Book Compliance Review</h2>
                        <p className="text-sm text-slate-500 font-medium">Author ID: {selectedBook.user_id}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeclineModalBook({ id: selectedBook.id, title: selectedBook.title });
                            setDeclineReason(selectedBook.admin_note || '');
                          }}
                          variant="destructive" 
                          className="bg-red-600 font-black h-11 px-6 rounded-xl gap-2 hover:bg-red-700 shadow-md text-xs"
                        >
                           <XCircle className="w-4 h-4" /> REJECT & FEEDBACK
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setReviewMode(false); }} className="rounded-full">
                          <X className="w-6 h-6" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-8 space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                             <div className="aspect-[21/9] bg-slate-100 rounded-3xl overflow-hidden border-2 border-slate-200">
                                {selectedBook.cover_image && <img src={selectedBook.cover_image} className="w-full h-full object-cover" />}
                             </div>
                             <h3 className="text-3xl font-black">{selectedBook.title}</h3>
                             <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <Label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Copyright Analysis (Simulated)</Label>
                                <div className="flex items-center gap-3 text-emerald-600 font-bold bg-emerald-50 p-3 rounded-xl">
                                   <ShieldCheck className="w-5 h-5" />
                                   98% Unique - No strict matches found in global database.
                                </div>
                             </div>
                          </div>
                          
                          <div className="space-y-4">
                             <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Content Preview</Label>
                             <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {loadingCards ? (
                                   <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2 font-medium">
                                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600 animate-pulse" />
                                      <span>Loading card preview data...</span>
                                   </div>
                                ) : Array.isArray(selectedBook.cards_json) ? selectedBook.cards_json.slice(0, 5).map((c: any, i: number) => (
                                   <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                      <p className="text-[10px] font-black text-indigo-600 mb-1">CARD {i+1}</p>
                                      <p className="text-sm font-bold text-slate-700 leading-relaxed">{c.text}</p>
                                   </div>
                                )) : <p className="italic text-slate-400">Legacy content format</p>}
                             </div>
                             
                             <div className="pt-4 border-t">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Admin Review Notes</Label>
                                <Textarea 
                                  placeholder="Add notes for the author if rejecting..."
                                  value={selectedBook.admin_note || ''}
                                  onChange={(e) => setSelectedBook({ ...selectedBook, admin_note: e.target.value })}
                                  className="rounded-xl border-slate-200"
                                />
                             </div>
                          </div>
                       </div>
                    </div>
                    
                    <div className="p-8 border-t bg-slate-50 flex justify-between items-center">
                       <div className="flex flex-wrap gap-4 items-center">
                          <Button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookAction(selectedBook.id, 'approve', selectedBook.admin_note);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-14 px-8 rounded-2xl gap-2 transition-all hover:scale-105 shadow-lg shadow-emerald-100"
                          >
                             <CheckCircle2 className="w-5 h-5" /> APPROVE & PUBLISH EBOOK
                          </Button>
                          <Button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const bId = selectedBook.id;
                              const bTitle = selectedBook.title;
                              setReviewMode(false);
                              setSelectedBook(null);
                              handleDeleteBook(bId, bTitle, 'eBook');
                            }}
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 font-black h-14 px-6 rounded-2xl gap-2"
                          >
                             <Trash2 className="w-5 h-5" /> DELETE EBOOK
                          </Button>
                       </div>
                       <p className="text-[10px] font-black text-slate-400 uppercase max-w-[200px] text-right">
                          BY APPROVING, YOU CONFIRM THIS BOOK MEETS PLATFORM STANDARDS AND PRESERVES AUTHOR OWNERSHIP.
                       </p>
                    </div>
                  </motion.div>
                </div>
              )}

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Pending Payouts</CardTitle>
                    <CardDescription>Withdrawal requests to process.</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/admin#withdrawals')}>View All</Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto w-full min-w-0">
                    <table className="w-full text-sm text-left responsive-table">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-3 font-medium text-gray-500">User</th>
                          <th className="px-6 py-3 font-medium text-gray-500">Amount</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {withdrawals.slice(0, 5).map(req => (
                          <tr key={req.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-900">{req.users?.email}</p>
                              <div className="text-[10px] text-gray-400 font-mono mt-1">
                                {req.bank_name} • {req.account_number}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-green-700">₦{(req.amount || 0).toLocaleString()}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" onClick={() => handleWithdrawalAction(req.id, 'approve')} className="bg-emerald-600 font-black h-8 shadow-sm">Approve</Button>
                                <Button size="sm" variant="outline" onClick={() => handleWithdrawalAction(req.id, 'reject')} className="h-8 text-red-600 border-red-100 hover:bg-red-50 font-black">Reject</Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {withdrawals.length === 0 && (
                          <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400 italic">No pending payouts</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {(activeTab === 'mpr' || activeTab === 'mpr-hub') && (
          <AdminMprMonitoring />
        )}

        {activeTab === 'books' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>eBook Management</CardTitle>
                <CardDescription>Review and manage all eBooks on the platform.</CardDescription>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input 
                  placeholder="Search books..." 
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full min-w-0">
                <table className="w-full text-sm text-left responsive-table">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 font-medium text-gray-500">Title</th>
                      <th className="px-6 py-4 font-medium text-gray-500">Author</th>
                      <th className="px-6 py-4 font-medium text-gray-500">Price</th>
                      <th className="px-6 py-4 font-medium text-gray-500">Status</th>
                      <th className="px-6 py-4 font-medium text-gray-500">Visibility</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingBooks.filter(b => {
                      const type = b.admin_note?.includes('type:') ? b.admin_note.split('type:')[1].split(',')[0] : 'ebook';
                      const matchesSearch = b.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                          b.users?.email?.toLowerCase().includes(searchQuery.toLowerCase());
                      return type === 'ebook' && matchesSearch;
                    }).map(book => (
                      <tr key={book.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">{book.title}</td>
                        <td className="px-6 py-4 text-gray-500">{book.users?.email || book.user_id}</td>
                        <td className="px-6 py-4 font-bold">₦{book.price}</td>
                        <td className="px-6 py-4">
                          <Badge variant={book.status === 1 ? "default" : "secondary"}>
                            {book.status === 1 ? "APPROVED" : "PENDING"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {book.is_suspended ? (
                            <Badge variant="destructive">SUSPENDED</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-100">ACTIVE</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                             <Button 
                               size="sm" 
                               variant="outline"
                               onClick={() => handleUserAction(book.id, 'toggle_book_suspend', !book.is_suspended)}
                               className={book.is_suspended ? "text-green-600" : "text-amber-600"}
                             >
                               {book.is_suspended ? 'Unsuspend' : 'Suspend'}
                             </Button>
                             {book.status !== 1 && (
                               <Button size="sm" onClick={() => handleOpenReview(book)} className="bg-slate-900">Review</Button>
                             )}
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteBook(book.id, book.title, 'eBook')} className="text-red-500 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}



        {activeTab === 'blogs' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Blog Management</CardTitle>
                <CardDescription>Manage articles and blog content.</CardDescription>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input 
                  placeholder="Search articles..." 
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full min-w-0">
                <table className="w-full text-sm text-left responsive-table">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 font-medium text-gray-500">Article Title</th>
                      <th className="px-6 py-4 font-medium text-gray-500">Author</th>
                      <th className="px-6 py-4 font-medium text-gray-500">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingBooks.filter(b => {
                      const type = b.admin_note?.includes('type:') ? b.admin_note.split('type:')[1].split(',')[0] : 'ebook';
                      const matchesSearch = b.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                          b.users?.email?.toLowerCase().includes(searchQuery.toLowerCase());
                      return type === 'blog' && matchesSearch;
                    }).map(book => (
                      <tr key={book.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">{book.title}</td>
                        <td className="px-6 py-4 text-gray-500">{book.users?.full_name || book.users?.email}</td>
                        <td className="px-6 py-4 text-amber-600 font-bold uppercase tracking-tighter text-[10px]">{book.status === 1 ? 'Published' : 'Under Review'}</td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex justify-end gap-2">
                             {book.status !== 1 && (
                               <Button size="sm" onClick={() => handleOpenReview(book)} className="bg-slate-900">Approve</Button>
                             )}
                             <Button size="sm" variant="ghost" onClick={() => handleDeleteBook(book.id, book.title, 'Blog Post')} className="text-red-500">
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           </div>
                        </td>
                      </tr>
                    ))}
                    {pendingBooks.filter(b => (b.admin_note || '').includes('type:blog')).length === 0 && (
                       <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">No blog posts found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'videos' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Video Content</CardTitle>
                <CardDescription>Manage video articles and linked media.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full min-w-0">
                <table className="w-full text-sm text-left responsive-table">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 font-medium text-gray-500">Video Title</th>
                      <th className="px-6 py-4 font-medium text-gray-500">Creator</th>
                      <th className="px-6 py-4 font-medium text-gray-500">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingBooks.filter(b => {
                      const type = b.admin_note?.includes('type:') ? b.admin_note.split('type:')[1].split(',')[0] : 'ebook';
                      return type === 'video';
                    }).map(book => (
                      <tr key={book.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">{book.title}</td>
                        <td className="px-6 py-4 text-gray-500">{book.users?.email}</td>
                        <td className="px-6 py-4 font-bold text-red-600 uppercase text-[10px]">{book.status === 1 ? 'Live' : 'Pending'}</td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex justify-end gap-2">
                             {book.status !== 1 && (
                               <Button size="sm" onClick={() => handleOpenReview(book)} className="bg-slate-900">Publish</Button>
                             )}
                             <Button size="sm" variant="ghost" onClick={() => handleDeleteBook(book.id, book.title, 'Video')} className="text-red-500">
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'users' && (
          <>
          {/* Simple Minimalist Tab Filter Selection */}
          <div className="flex flex-wrap items-center gap-2 mb-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 font-sans select-none">Filter Category:</span>
             {(['all', 'premium', 'authors', 'marketing_partner', 'admins', 'suspended'] as const).map((filter) => (
                <button
                   key={filter}
                   onClick={() => setUserCohortFilter(filter)}
                   className={`px-3 py-1.5 text-xs font-bold rounded-xl tracking-wide uppercase transition-all select-none ${userCohortFilter === filter ? 'bg-slate-900 text-white shadow-sm font-sans' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 font-sans'}`}
                >
                   {filter === 'marketing_partner' ? 'marketing partner' : filter}
                </button>
             ))}
          </div>

          <Card className="rounded-[1.5rem] border-slate-100 bg-white shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between py-5 border-b border-slate-50">
              <div>
                <CardTitle className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2 font-sans text-sm">
                  <Users className="w-4 h-4 text-indigo-505" />
                  User Directory 
                  <Badge variant="outline" className="text-[9px] py-0.5 px-2 border-indigo-200 text-indigo-700 bg-indigo-50 font-black rounded-full uppercase tracking-wider">{userCohortFilter === 'marketing_partner' ? 'Marketing Partner' : userCohortFilter}</Badge>
                </CardTitle>
                <CardDescription className="text-slate-400 font-sans text-[11px]">Manage user accounts and permission states.</CardDescription>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input 
                  placeholder="Search user profile..." 
                  className="pl-9 w-60 bg-slate-50 border-none rounded-xl text-xs h-9 font-sans"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full min-w-0">
                <table className="w-full text-xs text-left responsive-table">
                  <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="px-5 py-3 font-semibold">User Profile</th>
                      <th className="px-5 py-3 font-semibold">Account Tier</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Joined</th>
                      <th className="px-5 py-3 font-semibold">Payout details</th>
                      <th className="px-5 py-3 text-right font-semibold pr-6">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users
                      .filter(u => {
                        const matchesSearch = (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
                        if (!matchesSearch) return false;
                        if (userCohortFilter === 'premium') return u.is_premium || u.account_tier === 'premium';
                        if (userCohortFilter === 'authors') return u.account_tier === 'author' || u.is_approved_author;
                        if (userCohortFilter === 'marketing_partner') return u.account_tier === 'marketing_partner' || u.role === 'marketing_partner';
                        if (userCohortFilter === 'admins') return u.is_admin || isPlatformAdminEmail(u.email) || u.account_tier === 'admin';
                        if (userCohortFilter === 'suspended') return u.is_suspended;
                        return true;
                      })
                      .map(u => {
                        const isProtectedAdmin = u.is_admin || u.account_tier === 'admin' || isPlatformAdminEmail(u.email);

                        return (
                      <tr key={u.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="px-5 py-3 font-sans">
                          <div className="flex items-center gap-2.5">
                            <div className="relative shrink-0">
                              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-extrabold text-xs select-none">
                                {u.full_name?.charAt(0) || <Users className="w-3.5 h-3.5" />}
                              </div>
                              {(() => {
                                 const lastActive = u.last_active_at || u.last_active;
                                 if (lastActive) {
                                   const diffMinutes = Math.floor((Date.now() - new Date(lastActive).getTime()) / 60000);
                                   if (diffMinutes < 5 && diffMinutes >= 0) {
                                     return (
                                       <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" title="Online now" />
                                     );
                                   }
                                 }
                                 return null;
                              })()}
                            </div>
                            <div>
                               <div className="font-extrabold text-indigo-650 hover:text-indigo-800 text-xs leading-none select-all cursor-pointer hover:underline" onClick={() => navigate(`/admin/users/${u.id}`)} title="Click to view dossier profile & activity">{u.full_name || (isProtectedAdmin ? 'Admin' : 'Anonymous User')}</div>
                               <div className="text-[11px] text-slate-400 font-medium leading-none mt-1 select-all cursor-pointer hover:underline hover:text-indigo-600" onClick={() => navigate(`/admin/users/${u.id}`)} title="Click to view dossier profile & activity">{u.email}</div>
                               <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap items-center gap-1 font-mono leading-none">
                                  <span>ID: {u.id.substring(0, 8)}</span>
                               </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-sans">
                           <div className="flex flex-wrap gap-1 select-none">
                             {isProtectedAdmin ? (
                               <Badge className="bg-red-650 text-[8px] font-black px-1.5 py-0 text-white">ADMIN</Badge>
                             ) : (u.account_tier === 'marketing_partner' || u.role === 'marketing_partner') ? (
                               <Badge className="bg-purple-600 text-[8px] font-black px-1.5 py-0 text-white">MARKETING PARTNER</Badge>
                             ) : u.is_premium || u.account_tier === 'premium' ? (
                               <Badge className="bg-amber-500 text-[8px] font-black px-1.5 py-0 text-white">PREMIUM</Badge>
                             ) : u.account_tier === 'author' ? (
                               <Badge className="bg-indigo-600 text-[8px] font-black px-1.5 py-0 text-white">AUTHOR</Badge>
                             ) : (
                               <Badge variant="outline" className="text-[8px] font-bold px-1.5 py-0 text-slate-400 border-slate-200">FREE</Badge>
                             )}
                           </div>
                        </td>
                        <td className="px-5 py-3 select-none font-sans">
                           {u.is_suspended ? (
                             <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded-full text-[10px] font-bold select-none font-sans">Suspended</span>
                           ) : (() => {
                              const lastActive = u.last_active_at || u.last_active;
                              if (lastActive) {
                                const diffMinutes = Math.floor((Date.now() - new Date(lastActive).getTime()) / 60000);
                                if (diffMinutes < 5 && diffMinutes >= 0) {
                                  return (
                                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse select-none font-sans">Online</span>
                                  );
                                }
                              }
                              return (
                                <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-medium font-sans select-none">Active</span>
                              );
                           })()}
                        </td>
                        <td className="px-5 py-3 text-slate-500 font-mono text-[10px] select-none font-sans">
                           {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-5 py-3 font-sans">
                           {u.account_number ? (
                             <div className="space-y-0.5 leading-none">
                               <span className="text-[11px] font-bold text-slate-700 block">{u.bank_name}</span>
                               <span className="text-[10px] text-slate-400 font-mono block select-all">{u.account_number}</span>
                               <button 
                                 onClick={() => handleOpenPayoutEdit(u)}
                                 className="text-[9px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-0.5 mt-0.5 cursor-pointer font-sans"
                               >
                                 Edit Payout <ArrowUpRight className="w-2.5 h-2.5" />
                               </button>
                             </div>
                           ) : (
                             <button 
                               onClick={() => handleOpenPayoutEdit(u)}
                               className="text-[10px] font-bold text-slate-300 hover:text-slate-650 italic border-b border-dashed border-slate-200 cursor-pointer font-sans"
                             >
                               + Specs
                             </button>
                           )}
                        </td>
                        <td className="px-5 py-3 pr-6 text-right font-sans">
                           {isProtectedAdmin ? (
                             <div className="flex items-center gap-1.5 justify-end">
                               <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg select-none">
                                 Admin Protected (Read-Only)
                               </span>
                               <Button 
                                 size="sm" 
                                 variant="outline"
                                 onClick={() => navigate(`/admin/users/${u.id}`)}
                                 className="h-7 px-2 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-1 shrink-0 text-[9px] font-extrabold"
                                 title="View Dossier Profile & Activity"
                               >
                                 <Activity className="w-2.5 h-2.5" /> Dossier
                               </Button>
                             </div>
                           ) : (
                             <div className="flex items-center gap-1.5 justify-end flex-wrap sm:flex-nowrap">
                               <Select 
                                 defaultValue={u.account_tier || (u.role === 'marketing_partner' ? 'marketing_partner' : u.is_premium ? 'premium' : 'free')}
                                 onValueChange={(val) => handlePromoteDemote(u.id, val)}
                               >
                                 <SelectTrigger className="h-7 w-28 text-[9px] px-1.5 font-bold border-slate-200 bg-white rounded-lg select-none outline-none font-sans">
                                   <SelectValue placeholder="SET TIER" />
                                 </SelectTrigger>
                                 <SelectContent className="font-sans">
                                   <SelectItem value="free">FREE</SelectItem>
                                   <SelectItem value="premium">PREMIUM</SelectItem>
                                   <SelectItem value="author">AUTHOR</SelectItem>
                                   <SelectItem value="marketing_partner">MARKETING PARTNER</SelectItem>
                                   <SelectItem value="admin">ADMIN</SelectItem>
                                 </SelectContent>
                               </Select>

                               <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => requestUserSuspend(u, !u.is_suspended)}
                                  className={`h-7 px-2 text-[9px] font-extrabold rounded-lg shrink-0 select-none ${u.is_suspended ? 'border-emerald-250 text-emerald-600 hover:bg-emerald-50' : 'border-slate-200 text-slate-500 hover:text-red-650 hover:border-red-200 hover:bg-red-50'}`}
                               >
                                  {u.is_suspended ? 'Unblock' : 'Suspend'}
                               </Button>

                               <Button 
                                 size="sm" 
                                 variant="outline"
                                 onClick={() => navigate(`/admin/users/${u.id}`)}
                                 className="h-7 px-2 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-1 shrink-0 text-[9px] font-extrabold"
                                 title="View Dossier Profile & Activity"
                               >
                                 <Activity className="w-2.5 h-2.5" /> Dossier
                               </Button>

                               <Button 
                                 variant="outline" 
                                 size="sm" 
                                 onClick={() => navigate(`/earnings?userId=${u.id}`)}
                                 className="h-7 px-2 border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 text-[9px] font-black rounded-lg shrink-0 font-sans"
                               >
                                 Stats
                               </Button>
                             </div>
                           )}
                        </td>
                      </tr>
                    );
                   })}
                  </tbody>

                </table>
              </div>
            </CardContent>
          </Card>

          {editingPayout && selectedUser && (
             <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl space-y-6"
               >
                 <div>
                   <h2 className="text-2xl font-black text-gray-900 mb-1">Edit Payout Details</h2>
                   <p className="text-sm text-gray-500">Update bank details for {selectedUser.full_name || selectedUser.email}</p>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-2">
                       <Label className="text-xs font-black uppercase text-gray-400">Bank Name</Label>
                       <Input 
                         value={payoutForm.bank_name}
                         onChange={(e) => setPayoutForm({ ...payoutForm, bank_name: e.target.value })}
                         placeholder="e.g. Zenith Bank"
                         className="rounded-xl border-gray-200 h-12"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-xs font-black uppercase text-gray-400">Account Number</Label>
                       <Input 
                         value={payoutForm.account_number}
                         onChange={(e) => setPayoutForm({ ...payoutForm, account_number: e.target.value })}
                         placeholder="10 digits"
                         className="rounded-xl border-gray-200 h-12 font-mono"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-xs font-black uppercase text-gray-400">Account Holder Name</Label>
                       <Input 
                         value={payoutForm.account_name}
                         onChange={(e) => setPayoutForm({ ...payoutForm, account_name: e.target.value })}
                         placeholder="Exact name as in bank"
                         className="rounded-xl border-gray-200 h-12"
                       />
                    </div>
                 </div>

                 <div className="flex gap-3 pt-2">
                    <Button 
                      variant="ghost" 
                      className="flex-1 font-black rounded-xl h-12"
                      onClick={() => setEditingPayout(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 font-black rounded-xl h-12 shadow-lg shadow-indigo-100"
                      onClick={handleSavePayout}
                    >
                      Save Details
                    </Button>
                 </div>
               </motion.div>
             </div>
          )}
          </>
        )}

        {activeTab === 'health' && (
           <div className="space-y-6">
              <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white/70 backdrop-blur-md">
                 <CardHeader className="bg-indigo-600 text-white p-8">
                    <div className="flex items-center gap-3">
                       <div className="p-3 bg-white/20 rounded-2xl">
                          <ShieldCheck className="w-6 h-6" />
                       </div>
                       <div>
                          <CardTitle className="text-2xl font-black uppercase tracking-tighter italic">System Integrity & Repair</CardTitle>
                          <CardDescription className="text-indigo-100 font-medium">Verify database schema and fix inconsistencies without technical console.</CardDescription>
                       </div>
                    </div>
                 </CardHeader>
                 <CardContent className="p-8 space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                       <div className="space-y-4">
                          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                             <Database className="w-4 h-4" /> Quick Diagnostic
                          </h3>
                          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col gap-4">
                             <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500 uppercase">Database Health</span>
                                <Badge className={!dbOffline ? "bg-emerald-500" : "bg-red-500"}>
                                   {!dbOffline ? "OPERATIONAL" : "CONFIG ERROR"}
                                </Badge>
                             </div>
                             <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500 uppercase">Tier System</span>
                                <Badge className="bg-blue-500">ACTIVE</Badge>
                             </div>
                             <Button 
                               onClick={checkSystemHealth}
                               disabled={loading}
                               className="w-full h-12 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs uppercase"
                             >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Run Full Scan"}
                             </Button>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                             <Activity className="w-4 h-4" /> Manual Tier Override
                          </h3>
                          <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 space-y-4">
                             <Input 
                               id="manual-fix-email" 
                               placeholder="User Email" 
                               className="bg-white border-indigo-100 rounded-xl h-10 text-xs"
                             />
                             <div className="flex gap-2">
                                <Button 
                                  size="sm"
                                  onClick={() => {
                                    const emailInput = document.getElementById('manual-fix-email') as HTMLInputElement;
                                    if (emailInput?.value) handlePromoteDemoteByEmail(emailInput.value, 'premium', 30);
                                    else alert("Enter email first");
                                  }}
                                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] rounded-lg h-9"
                                >
                                   SET PREMIUM (30D)
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const emailInput = document.getElementById('manual-fix-email') as HTMLInputElement;
                                    if (emailInput?.value) handlePromoteDemoteByEmail(emailInput.value, 'author');
                                    else alert("Enter email first");
                                  }}
                                  className="flex-1 border-indigo-200 text-indigo-600 font-black text-[10px] rounded-lg h-9"
                                >
                                   SET AUTHOR
                                </Button>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                             <ShieldCheck className="w-4 h-4" /> Env Diagnostics
                          </h3>
                          <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-3">
                             <div className="flex items-center justify-between text-xs font-mono">
                                <span className="font-bold text-slate-500 uppercase">VITE_SUPABASE_URL</span>
                                <span className={import.meta.env.VITE_SUPABASE_URL ? "text-emerald-600 font-extrabold" : "text-rose-600 font-extrabold"}>
                                   {import.meta.env.VITE_SUPABASE_URL ? '✅ SET' : '❌ MISSING'}
                                </span>
                             </div>
                             <div className="flex items-center justify-between text-xs font-mono border-t border-slate-100 pt-2">
                                <span className="font-bold text-slate-500 uppercase">VITE_SUPABASE_ANON_KEY</span>
                                <span className={import.meta.env.VITE_SUPABASE_ANON_KEY ? "text-emerald-600 font-extrabold" : "text-rose-600 font-extrabold"}>
                                   {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ SET' : '❌ MISSING'}
                                </span>
                             </div>
                             <div className="flex items-center justify-between text-xs font-mono border-t border-slate-100 pt-2">
                                <span className="font-bold text-slate-500 uppercase">VITE_API_BASE_URL</span>
                                <span className="text-blue-600 font-bold max-w-[120px] truncate border-none">
                                   {import.meta.env.VITE_API_BASE_URL || '(empty)'}
                                </span>
                             </div>
                             <div className="pt-1">
                                <Link 
                                   to="/env-debug" 
                                   target="_blank" 
                                   className="w-full flex items-center justify-center gap-1.5 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase transition-all shadow-sm"
                                >
                                   <span>Verify Full Details</span>
                                   <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                             </div>
                          </div>
                       </div>
                    </div>

                     {/* Real-time Content Availability diagnostic tool */}
                     <div className="space-y-4 pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                           <div>
                              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                 <Database className="w-4 h-4" /> Database Content Availability Diagnostic
                              </h3>
                              <p className="text-xs text-slate-500 font-medium">Validate the active volume of eBooks, articles/blogs, and verified author profiles retrieved directly from live Supabase tables.</p>
                           </div>
                           <Button 
                              onClick={fetchRealtimeCounts}
                              disabled={dbCounts.loading}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-2 h-10 rounded-xl flex items-center gap-1.5 shadow-sm transition-all animate-none"
                           >
                              <RefreshCcw className={`w-3.5 h-3.5 ${dbCounts.loading ? 'animate-spin' : ''}`} /> 
                              {dbCounts.loading ? 'Refetching...' : 'Refresh Data'}
                           </Button>
                        </div>

                        {dbCounts.error && (
                           <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-mono font-medium">
                              Error retrieving live counts: {dbCounts.error}
                           </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           {/* eBooks Counter */}
                           <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                              <div>
                                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Live eBooks</p>
                                 <h4 className="text-4xl font-black text-slate-800 mt-2 tracking-tight">
                                    {dbCounts.loading ? '...' : dbCounts.books}
                                 </h4>
                              </div>
                              <div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 self-start px-2 py-1 rounded-lg">
                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                 <span>Online & Discoverable</span>
                              </div>
                           </div>

                           {/* Blogs Counter */}
                           <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                              <div>
                                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Blog Articles</p>
                                 <h4 className="text-4xl font-black text-slate-800 mt-2 tracking-tight">
                                    {dbCounts.loading ? '...' : dbCounts.blogs}
                                 </h4>
                              </div>
                              <div className="mt-4 flex items-center gap-2 text-[10px] text-blue-600 font-bold uppercase tracking-wider bg-blue-50 self-start px-2 py-1 rounded-lg font-mono">
                                 <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                 <span>Rendered Editorial</span>
                              </div>
                           </div>

                           {/* Authors Counter */}
                           <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                              <div>
                                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Registered Authors</p>
                                 <h4 className="text-4xl font-black text-slate-800 mt-2 tracking-tight">
                                    {dbCounts.loading ? '...' : dbCounts.authors}
                                 </h4>
                              </div>
                              <div className="mt-4 flex items-center gap-2 text-[10px] text-indigo-600 font-bold uppercase tracking-wider bg-indigo-50 self-start px-2 py-1 rounded-lg font-mono">
                                 <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                 <span>Verified Contributors</span>
                              </div>
                           </div>
                        </div>
                     </div>

                    <div className="space-y-4">
                       <div className="flex items-center justify-between flex-wrap gap-2">
                          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                             <LayoutDashboard className="w-4 h-4" /> Component Verification
                          </h3>
                          <Button 
                             onClick={() => {
                               checkSystemHealth();
                             }}
                             className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 h-9 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                          >
                             <RefreshCcw className="w-3.5 h-3.5" /> RE-CALCULATE & VERIFY FIXED
                          </Button>
                       </div>
                       <div className="overflow-x-auto rounded-3xl border border-slate-100 w-full min-w-0">
                          <table className="w-full text-sm text-left responsive-table">
                             <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                   <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px]">Component</th>
                                   <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px]">Status</th>
                                   <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px]">Resolution Hint</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                                {healthChecks.map((check, i) => (
                                   <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-6 py-4">
                                         <p className="font-bold text-slate-700 uppercase tracking-tighter flex items-center gap-2">
                                            {check.column ? <Activity className="w-3 h-3 text-indigo-400" /> : <Database className="w-3 h-3 text-amber-500" />}
                                            {check.label}
                                         </p>
                                         <p className="text-[9px] text-slate-400 font-mono mt-0.5">{check.table}{check.column ? `.${check.column}` : ' (Table)'}</p>
                                      </td>
                                      <td className="px-6 py-4">
                                         <Badge className={check.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-600 border-none text-[8px]' : 'bg-red-500/10 text-red-600 border-none text-[8px]'}>
                                            {check.status.toUpperCase()}
                                         </Badge>
                                      </td>
                                      <td className="px-6 py-4 text-[10px] text-slate-500 font-medium italic">
                                         {check.status === 'healthy' ? 'Operational.' : `Fix Required: Run Migration SQL.`}
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 </CardContent>
              </Card>
           </div>
        )}

        {activeTab === 'upgrades' && (
          <div className="space-y-4 pt-8">
            <div className="bg-slate-900 text-white p-6 rounded-[2rem] border border-slate-800 shadow relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <ShieldCheck className="w-20 h-20 text-white" />
               </div>
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                     <h2 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">OWNER CONTROLS</h2>
                     <h3 className="text-xl font-black text-white tracking-tight uppercase italic flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-400" /> Direct Upgrade Portal
                     </h3>
                     <p className="text-slate-400 text-[11px] font-medium mt-1">Force upgrade testing, gift tiers, or bypass payment gateways using secure temporal tokens.</p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* Generation Mini-Card */}
               <Card className="border-none shadow bg-indigo-900 text-white overflow-hidden p-6 rounded-[2rem] flex flex-col justify-between">
                  <div>
                     <h4 className="font-serif italic font-bold text-base mb-1 flex items-center gap-1"><Zap className="w-4 h-4 text-amber-400" /> Temporal Link Generator</h4>
                     <p className="text-[10px] text-indigo-200 mb-4 font-medium">Bypass gateway & onboard specific readers or writers securely.</p>
                     <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                           <span className="text-[9px] uppercase font-bold text-indigo-300">Target Email</span>
                           <Input 
                              placeholder="leave empty for free-for-all"
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/30 rounded-lg h-9 text-xs"
                              value={newTokenForm.email}
                              onChange={(e) => setNewTokenForm({...newTokenForm, email: e.target.value})}
                           />
                        </div>
                        <div className="space-y-1">
                           <span className="text-[9px] uppercase font-bold text-indigo-300">Grant Tier</span>
                           <Select 
                              value={newTokenForm.tier} 
                              onValueChange={(val) => setNewTokenForm({...newTokenForm, tier: val})}
                           >
                              <SelectTrigger className="bg-white/10 border-white/20 text-white rounded-lg h-9 text-xs">
                                 <SelectValue placeholder="Tier" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="premium">PREMIUM</SelectItem>
                                 <SelectItem value="author">AUTHOR</SelectItem>
                                 <SelectItem value="admin">ADMIN (CEO privileges)</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-1">
                           <span className="text-[9px] uppercase font-bold text-indigo-300">Link Expires (Days)</span>
                           <Input 
                              type="number"
                              className="bg-white/10 border-white/20 text-white rounded-lg h-9 text-xs"
                              value={newTokenForm.expires_in_days}
                              onChange={(e) => setNewTokenForm({...newTokenForm, expires_in_days: parseInt(e.target.value) || 1})}
                           />
                        </div>
                        <div className="space-y-1">
                           <span className="text-[9px] uppercase font-bold text-indigo-300">Access Duration (Days)</span>
                           <Input 
                              type="number"
                              placeholder="Forever if empty"
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/30 rounded-lg h-9 text-xs"
                              value={newTokenForm.benefit_duration_days || ''}
                              onChange={(e) => setNewTokenForm({...newTokenForm, benefit_duration_days: parseInt(e.target.value) || null})}
                           />
                        </div>
                     </div>
                  </div>
                  <Button 
                     onClick={handleGenerateToken}
                     className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[11px] h-9 rounded-xl mt-4 flex items-center justify-center gap-1 shadow-sm uppercase tracking-wider"
                  >
                     <ShieldCheck className="w-3.5 h-3.5" /> Generate Token
                  </Button>
               </Card>

               {/* Direct Overrides & Mini eBook Unlocks */}
               <Card className="border border-slate-100 shadow bg-slate-50 overflow-hidden p-6 rounded-[2rem] flex flex-col justify-between">
                  <div className="space-y-3">
                     <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1"><Activity className="w-4 h-4 text-indigo-500" /> Direct Database Modification</h4>
                     
                     {/* Tier Override fields */}
                     <div className="p-3.5 bg-white border border-slate-100 rounded-2xl flex flex-col gap-2">
                        <span className="text-[9px] font-black uppercase text-slate-400">Target User UUID</span>
                        <div className="flex gap-2">
                           <Input 
                              id="direct-target-uuid"
                              placeholder="Paste User ID from log or directory"
                              className="bg-slate-50 border-slate-100 rounded-lg h-9 text-xs flex-1"
                           />
                           <Select 
                              defaultValue="premium"
                              onValueChange={(val) => {
                                 const elId = document.getElementById('direct-target-uuid') as HTMLInputElement;
                                 if (elId && elId.value) {
                                    handlePromoteDemote(elId.value, val);
                                 } else {
                                    alert("Enter User UUID first");
                                 }
                              }}
                           >
                              <SelectTrigger className="w-[120px] bg-slate-50 border-slate-100 rounded-lg h-9 text-xs font-bold text-indigo-600">
                                 <SelectValue placeholder="Set Tier" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="free">FREE</SelectItem>
                                 <SelectItem value="premium">PREMIUM</SelectItem>
                                 <SelectItem value="author">AUTHOR</SelectItem>
                                 <SelectItem value="admin">ADMIN</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>
                     </div>

                     {/* eBook Unlock custom fields */}
                     <div className="p-3.5 bg-indigo-50 border border-indigo-100/40 rounded-2xl flex flex-col gap-2">
                        <span className="text-[9px] font-black uppercase text-indigo-600">Manual eBook Access Unlock</span>
                        <div className="flex gap-2">
                           <Input 
                              placeholder="Email or UUID"
                              className="bg-white border-indigo-100 rounded-lg h-9 text-xs flex-1"
                              value={unlockForm.userIdentifier}
                              onChange={(e) => setUnlockForm({ ...unlockForm, userIdentifier: e.target.value })}
                           />
                           <Select 
                              value={unlockForm.bookId}
                              onValueChange={(val) => setUnlockForm({ ...unlockForm, bookId: val })}
                           >
                              <SelectTrigger className="w-[120px] bg-white border-indigo-100 rounded-lg h-9 text-xs">
                                 <SelectValue placeholder="Choose Book" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[250px]">
                                 {pendingBooks.map((b) => (
                                    <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>
                        <Button 
                           size="sm"
                           onClick={async () => {
                              if (!unlockForm.userIdentifier.trim() || !unlockForm.bookId) {
                                 alert("Please enter recipient email/UUID and choose a book");
                                 return;
                              }
                              try {
                                 const userIdentifierStr = unlockForm.userIdentifier.trim();
                                 const bookIdStr = unlockForm.bookId;

                                 let userQuery = supabase.from("profiles").select("id, email, full_name");
                                 if (userIdentifierStr.includes("@")) {
                                   userQuery = userQuery.eq("email", userIdentifierStr);
                                 } else {
                                   userQuery = userQuery.eq("id", userIdentifierStr);
                                 }

                                 const { data: userData, error: userError } = await userQuery.maybeSingle();
                                 if (userError || !userData) {
                                   throw new Error("User not found. Check if the provided Email or ID is accurate.");
                                 }

                                 const { data: bookData, error: bookError } = await supabase.from("events").select("id, title")
                                   .eq("id", bookIdStr)
                                   .maybeSingle();
                                 if (bookError || !bookData) {
                                   throw new Error("Book not found.");
                                 }

                                  const saleAmount = Number(unlockForm.amount) || 0;

                                 const { data: existingTx } = await supabase
                                   .from("transactions")
                                   .select("id")
                                   .eq("user_id", userData.id)
                                   .eq("book_id", bookIdStr)
                                   .eq("type", "purchase")
                                   .eq("status", "successful")
                                   .maybeSingle();

                                 if (existingTx) {
                                   throw new Error("User already has access to/purchased this book!");
                                 }

                                 const { error: txErr } = await supabase.from("transactions").insert({
                                   user_id: userData.id,
                                   book_id: bookIdStr,
                                   buyer_email: userData.email,
                                   amount: Math.round(saleAmount),
                                   type: "purchase",
                                   status: "successful",
                                   paystack_reference: `MANUAL-ADMIN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                                 });

                                 if (txErr) throw txErr;

                                 try {
                                   const { data: existingEpic } = await supabase
                                     .from("event_tickets").select("*").eq("user_id", userData.id).eq("event_id", bookIdStr)
                                     .maybeSingle();

                                   if (!existingEpic) {
                                      await supabase.from("event_tickets").insert({ user_id: userData.id, event_id: bookIdStr });
                                   }
                                 } catch (e: any) {
                                   console.warn("ebook_purchases insert failed:", e);
                                 }

                                 alert(`Successfully manually unlocked "${bookData.title}" for user ${userData.email}!`);
                                 setUnlockForm({ userIdentifier: '', bookId: '', amount: '' });
                                 fetchAdminData(false);
                              } catch (err: any) {
                                 alert("Manually unlocking failed: " + (err.message || err));
                              }
                           }}
                           className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[9px] h-8 rounded-lg mt-1 w-full"
                        >
                           Grant Lifetime eBook Access
                        </Button>
                     </div>
                  </div>
               </Card>
            </div>

            {/* Active Tokens log bar */}
            <div className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
               <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1">Active Temporal Tokens</h4>
                  <Badge className="bg-indigo-100 text-indigo-700 text-[10px] font-black">{upgradeTokens.length} Active</Badge>
               </div>
               <div className="overflow-y-auto max-h-[150px] rounded-xl border border-slate-100 text-xs w-full min-w-0">
                  <table className="w-full text-left responsive-table">
                     <thead className="bg-slate-50 border-b">
                        <tr>
                           <th className="py-2.5 px-3 font-bold text-slate-400 text-[9px]">Token URL</th>
                           <th className="py-2.5 px-3 font-bold text-slate-400 text-[9px]">Target</th>
                           <th className="py-2.5 px-3 font-bold text-slate-400 text-[9px]">Tier</th>
                           <th className="py-2.5 px-3 font-bold text-slate-400 text-[9px] text-right">Action</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50 font-mono text-[10px]">
                        {upgradeTokens.map(tk => (
                           <tr key={tk.id} className="hover:bg-slate-50/55">
                              <td className="py-2 px-3">
                                 <div className="flex items-center gap-1.5">
                                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-indigo-600 font-bold">{tk.token}</code>
                                    <Button 
                                       variant="ghost" 
                                       size="icon" 
                                       className="h-5 w-5 hover:bg-indigo-50" 
                                       onClick={() => {
                                          const url = `${getAppUrl()}/redeem?token=${tk.token}`;
                                          navigator.clipboard.writeText(url);
                                          alert('Temporal Link copied dynamically!');
                                       }}
                                    >
                                       <ExternalLink className="w-3 h-3 text-slate-400" />
                                    </Button>
                                 </div>
                              </td>
                              <td className="py-2 px-3 font-sans font-bold">{tk.user_email || 'PUBLIC (OPEN)'}</td>
                              <td className="py-2 px-3">
                                 <Badge className="text-[8px] py-0 px-2 uppercase bg-amber-500 text-white font-extrabold rounded">
                                    {tk.target_tier}
                                 </Badge>
                              </td>
                              <td className="py-2 px-3 text-right">
                                 <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleDeleteToken(tk.id)}
                                    className="text-red-500 h-6 w-6 p-0 hover:bg-red-50"
                                 >
                                    <Trash2 className="w-3.5 h-3.5" />
                                 </Button>
                              </td>
                           </tr>
                        ))}
                        {upgradeTokens.length === 0 && (
                           <tr>
                              <td colSpan={4} className="py-6 text-center text-slate-400 italic">No active temporal tokens generated.</td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Support Management</h2>
              <div className="flex gap-4">
                <Select value={supportFilter.status} onValueChange={(val) => { setSupportFilter({...supportFilter, status: val}); setSupportPage(1); }}>
                  <SelectTrigger className="w-40 rounded-xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={supportFilter.type} onValueChange={(val) => { setSupportFilter({...supportFilter, type: val}); setSupportPage(1); }}>
                  <SelectTrigger className="w-40 rounded-xl">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Payment">Payment</SelectItem>
                    <SelectItem value="Bug">Bug</SelectItem>
                    <SelectItem value="Withdrawal">Withdrawal</SelectItem>
                    <SelectItem value="Data Reward">Data Reward</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-6">
              {(() => {
                const filtered = supportRequests.filter(req => {
                  const sMatch = supportFilter.status === 'all' || req.status === supportFilter.status;
                  const tMatch = supportFilter.type === 'all' || req.type === supportFilter.type;
                  return sMatch && tMatch;
                });
                
                const totalPages = Math.ceil(filtered.length / 5);
                const paginated = filtered.slice((supportPage - 1) * 5, supportPage * 5);

                return (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      {paginated.map(req => (
                        <Card key={req.id} className={`border-none shadow-lg rounded-[24px] overflow-hidden ${req.status === 'pending' ? 'ring-2 ring-amber-500/20' : 'opacity-80'}`}>
                          <CardContent className="p-8">
                            <div className="flex justify-between items-start mb-6">
                              <div className="flex items-start gap-4">
                                <div className={`p-4 rounded-2xl ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                  <MessageSquare className="w-6 h-6" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="font-bold text-[10px] tracking-widest">
                                      {(req.type || (req.message?.startsWith('[Type:') ? req.message.split(']')[0].replace('[Type: ', '') : 'General')).toUpperCase()}
                                    </Badge>
                                    <h3 className="font-black text-xl text-gray-900 leading-tight">{req.subject}</h3>
                                  </div>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    From: {req.users?.full_name || req.users?.email} • {new Date(req.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <Badge className={req.status === 'pending' || req.status === 'open' ? 'bg-amber-500' : (req.status === 'resolved' || req.status === 'granted' || req.status === 'completed') ? 'bg-green-600' : 'bg-slate-400'}>
                                {req.status?.toUpperCase()}
                              </Badge>
                            </div>
                            
                            <div className="bg-slate-50 p-6 rounded-2xl text-slate-700 font-medium mb-6 leading-relaxed">
                              {req.type === 'Data Reward' ? (() => {
                                const phone = req.message?.match(/Phone:\s*(.+)/)?.[1]?.trim() || '';
                                const net = req.message?.match(/Network:\s*(.+)/)?.[1]?.trim() || '';
                                const amt = req.message?.match(/Amount:\s*(.+)/)?.[1]?.trim() || '';
                                const notes = req.message?.split('Notes:')?.[1]?.trim() || '';
                                return (
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2 mb-2">
                                      <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 font-black px-4 py-1.5 rounded-xl text-xs">📞 {phone}</Badge>
                                      <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 font-black px-4 py-1.5 rounded-xl text-xs">🌐 NETWORK: {net.toUpperCase()}</Badge>
                                      <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200 font-black px-4 py-1.5 rounded-xl text-xs">🎁 PACKAGE: {amt} MB</Badge>
                                    </div>
                                    {notes && notes !== req.message && <div className="text-sm font-normal text-slate-500 border-t pt-2 mt-2">Notes: {notes}</div>}
                                  </div>
                                );
                              })() : req.message?.replace(/^\[Type: .*?\] /, '')}
                            </div>

                            {req.admin_response ? (
                              <div className="p-6 bg-green-50 border-l-4 border-green-500 rounded-r-2xl">
                                <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-2">Previous Response</p>
                                <p className="text-sm text-green-900 italic font-medium">"{req.admin_response}"</p>
                              </div>
                            ) : (
                              <div className="space-y-4 pt-4 border-t">
                                <div className="flex gap-4">
                                  <div className="flex-1 space-y-2">
                                     <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Admin Response</Label>
                                     <Textarea 
                                       placeholder="Provide solution or update for user..." 
                                       className="rounded-xl border-slate-200"
                                       value={supportResponse?.id === req.id ? supportResponse.text : ''}
                                       onChange={(e) => setSupportResponse({ id: req.id, text: e.target.value, status: 'resolved' })}
                                     />
                                  </div>
                                  <div className="w-48 space-y-2">
                                     <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">New Status</Label>
                                     <Select 
                                       value={supportResponse?.id === req.id ? supportResponse.status : 'resolved'} 
                                       onValueChange={(val) => setSupportResponse({ ...supportResponse, id: req.id, text: supportResponse?.text || '', status: val })}
                                     >
                                        <SelectTrigger className="rounded-xl h-10">
                                           <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="completed">Completed</SelectItem>
                                          <SelectItem value="granted">Granted</SelectItem>
                                           <SelectItem value="resolved">Resolved</SelectItem>
                                           <SelectItem value="closed">Closed</SelectItem>
                                           <SelectItem value="in_review">In Review</SelectItem>
                                        </SelectContent>
                                     </Select>
                                  </div>
                                </div>
                                <div className="flex justify-end">
                                   <Button 
                                     onClick={() => handleSupportRespond(req.id)}
                                     disabled={supportResponse?.id !== req.id || !supportResponse.text}
                                     className="bg-green-700 hover:bg-green-800 font-black rounded-xl px-10 h-12"
                                   >
                                      Apply Response
                                   </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      {filtered.length === 0 && (
                        <div className="text-center py-24 bg-white rounded-[32px] border-2 border-dashed text-gray-400 italic">
                          <Inbox className="w-12 h-12 mx-auto mb-4 opacity-20" />
                          No support requests in the system.
                        </div>
                      )}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={supportPage === 1}
                          onClick={() => setSupportPage(prev => Math.max(prev - 1, 1))}
                          className="rounded-xl font-bold h-10 px-4"
                        >
                          Previous
                        </Button>
                        <span className="text-xs font-black text-slate-500">
                          Page {supportPage} of {totalPages} ({filtered.length} requests)
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={supportPage === totalPages}
                          onClick={() => setSupportPage(prev => Math.min(prev + 1, totalPages))}
                          className="rounded-xl font-bold h-10 px-4"
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'refunds' && <AdminRefundsSection />}
        {activeTab === 'feedback' && <AdminFeedbackSection />}
        {activeTab === 'emaillogs' && <AdminEmailLogsSection />}

        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <h2 className="text-2xl font-black text-gray-900 tracking-tight">Payment Verification Queue</h2>
               <Select value={paymentFilter.status} onValueChange={(val) => setPaymentFilter({status: val})}>
                  <SelectTrigger className="w-48 rounded-xl h-12">
                     <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="all">All Submissions</SelectItem>
                     <SelectItem value="pending">Pending Only</SelectItem>
                     <SelectItem value="approved">Approved</SelectItem>
                     <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
               </Select>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {paymentVerifications.filter(pv => paymentFilter.status === 'all' || pv.status === paymentFilter.status).map(pv => (
                <Card key={pv.id} className="border-none shadow-xl rounded-[32px] overflow-hidden">
                  <CardContent className="p-0">
                     <div className="flex flex-col lg:flex-row">
                        <div className="lg:w-1/3 h-64 lg:h-auto bg-slate-100 relative group overflow-hidden">
                           {pv.proof_image_url ? (
                              <img src={pv.proof_image_url} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Proof" />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 italic">No image provided</div>
                           )}
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button asChild variant="secondary" className="font-bold gap-2">
                                 <a href={pv.proof_image_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4"/> Full View</a>
                              </Button>
                           </div>
                        </div>
                        <div className="flex-1 p-8 border-l border-slate-100 bg-white space-y-6">
                           <div className="flex justify-between items-start">
                              <div>
                                 <h3 className="text-2xl font-black text-slate-900">{pv.transaction_type.replace('_', ' ').toUpperCase()}</h3>
                                 <p className="text-sm font-bold text-slate-500">From: {pv.users?.full_name || pv.users?.email}</p>
                              </div>
                              <Badge className={pv.status === 'pending' ? 'bg-amber-500' : pv.status === 'approved' ? 'bg-emerald-600' : 'bg-red-600'}>
                                 {pv.status.toUpperCase()}
                              </Badge>
                           </div>

                           <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                              <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</p>
                                 <p className="text-lg font-black text-emerald-700">₦{pv.amount.toLocaleString()}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</p>
                                 <p className="text-sm font-bold text-slate-700">{pv.payment_method.toUpperCase()}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference</p>
                                 <p className="text-sm font-bold text-slate-700">{pv.transaction_ref}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Submit Date</p>
                                 <p className="text-sm font-bold text-slate-700">{new Date(pv.created_at).toLocaleDateString()}</p>
                              </div>
                           </div>

                           <div className="space-y-4">
                              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Admin Resolution Note</Label>
                              <Textarea 
                                placeholder="Add internal note or reason for rejection..." 
                                className="rounded-xl h-20"
                                value={paymentNote?.id === pv.id ? paymentNote.text : (pv.admin_note || '')}
                                onChange={(e) => setPaymentNote({ id: pv.id, text: e.target.value })}
                                disabled={pv.status !== 'pending'}
                              />
                           </div>

                           {pv.status === 'pending' && (
                              <div className="flex gap-4 pt-2">
                                 <Button 
                                   onClick={() => handlePaymentVerify(pv.id, 'reject')}
                                   variant="outline" 
                                   className="flex-1 h-14 rounded-2xl font-black text-red-600 border-red-200 hover:bg-red-50 gap-2"
                                 >
                                    <XCircle className="w-5 h-5" /> REJECT PROOF
                                 </Button>
                                 <Button 
                                   onClick={() => handlePaymentVerify(pv.id, 'approve')}
                                   className="flex-1 h-14 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-100"
                                 >
                                    <CheckCircle2 className="w-5 h-5" /> APPROVE & CREDIT
                                 </Button>
                              </div>
                           )}
                        </div>
                     </div>
                  </CardContent>
                </Card>
              ))}
              {paymentVerifications.length === 0 && (
                 <div className="py-24 text-center border-2 border-dashed rounded-[40px] text-slate-300">
                    <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="font-bold italic">No payment verifications found.</p>
                 </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'vault' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-purple-50 p-6 rounded-[2.5rem] border border-purple-100">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-purple-950 flex items-center gap-2">
                  <ShieldCheck className="w-7 h-7 text-purple-600" />
                  Secure Trivia & Puzzle Vault
                </h2>
                <p className="text-sm text-purple-700 font-medium">
                  Centralized repository for used/unused puzzles and trivia questions. Items auto-delete upon winner usage.
                </p>
              </div>
              
              <Button 
                onClick={() => navigate('/ai-magic')}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 px-6 rounded-2xl shrink-0"
              >
                <Plus className="w-5 h-5 mr-2" /> Launch Puzzle Maker
              </Button>
            </div>

            <div className="bg-white border rounded-[2rem] overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-150 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800">Cerebral Items Pool ({vaultItems.length})</h3>
                  <p className="text-xs text-slate-400">View active items awaiting winner triggers</p>
                </div>
              </div>

              <div className="overflow-x-auto w-full min-w-0">
                <table className="w-full text-left border-collapse responsive-table">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="p-6">Title / Name</th>
                      <th className="p-6">Origin Type</th>
                      <th className="p-6">Difficulty</th>
                      <th className="p-6">Cerebral Tags</th>
                      <th className="p-6">Created Date</th>
                      <th className="p-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vaultItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-6">
                          <div className="space-y-1 max-w-sm">
                            <p className="font-bold text-slate-900 leading-snug">{item.title}</p>
                            <p className="text-xs text-slate-400 truncate leading-relaxed">
                              {typeof item.content === 'string' ? item.content : (item.content?.question || item.content?.text || JSON.stringify(item.content))}
                            </p>
                          </div>
                        </td>
                        <td className="p-6">
                          <Badge variant="outline" className={`font-mono text-[9px] tracking-wider uppercase ${
                            item.type === 'puzzle' ? 'text-pink-600 border-pink-100 bg-pink-50' : 'text-blue-600 border-blue-100 bg-blue-50'
                          }`}>
                            {item.type}
                          </Badge>
                        </td>
                        <td className="p-6">
                          <Badge className={`font-black text-[9px] uppercase border-none ${
                            item.difficulty === 'easy' ? 'bg-emerald-105 text-emerald-700' :
                            item.difficulty === 'medium' ? 'bg-amber-105 text-amber-700' : 'bg-red-105 text-red-700'
                          }`}>
                            {item.difficulty}
                          </Badge>
                        </td>
                        <td className="p-6 font-mono text-[10px] text-slate-500 font-bold">{item.tags || 'none'}</td>
                        <td className="p-6 text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString()}</td>
                        <td className="p-6 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={async () => {
                              if (!confirm('Are you sure you want to permanently delete this Vault item?')) return;
                              try {
                                const { error } = await supabase.from('vault').delete().eq('id', item.id);
                                if (error) throw error;
                                setVaultItems(vaultItems.filter(v => v.id !== item.id));
                              } catch (err: any) {
                                alert('Failed to delete vault item: ' + err.message);
                              }
                            }}
                            className="bg-red-55 text-red-650 hover:bg-red-100 hover:text-red-700 font-bold rounded-xl"
                          >
                            <Trash2 className="w-4 h-4 mr-1.5" /> Purge
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {vaultItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-20 bg-slate-50/50">
                          <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-purple-300 opacity-40 animate-pulse" />
                          <p className="font-extrabold text-purple-900 leading-none mb-1">Vault Pool is Empty</p>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed mt-2">
                             No puzzles or custom trivia questions loaded yet. Use the tool to populate questions for user rewards challenges.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Announcement</CardTitle>
                <CardDescription>Publish updates or news to all users.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input 
                      placeholder="Maintenance Update..." 
                      value={newPost.title}
                      onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <select 
                      className="w-full h-10 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm"
                      value={newPost.type}
                      onChange={(e) => setNewPost({...newPost, type: e.target.value})}
                    >
                      <option value="announcement">Announcement</option>
                      <option value="update">Platform Update</option>
                      <option value="news">Internal News</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea 
                    placeholder="Describe the update in detail..." 
                    className="min-h-[100px]"
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  />
                </div>
                <Button 
                  onClick={async () => {
                    try {
                      const { error } = await supabase.from('announcements').insert([{
                        title: newPost.title,
                        content: newPost.content,
                        type: newPost.type,
                        link_url: newPost.linkUrl || null
                      }]);
                      if (error) throw error;
                      setNewPost({ title: '', content: '', type: 'announcement', linkUrl: '' });
                      fetchAdminData();
                    } catch (err: any) {
                      alert('Failed to post announcement: ' + err.message);
                    }
                  }}
                  className="bg-green-700 font-bold"
                  disabled={!newPost.title || !newPost.content}
                >
                  Publish Announcement
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Past Announcements</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto w-full min-w-0">
                  <table className="w-full text-sm text-left responsive-table">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px]">Title</th>
                        <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px]">Type</th>
                        <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px]">Date</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {posts.map(post => (
                        <tr key={post.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-bold">{post.title}</td>
                          <td className="px-6 py-4 capitalize">
                             <Badge variant="outline">{post.type}</Badge>
                          </td>
                          <td className="px-6 py-4 text-gray-500">{new Date(post.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right">
                             <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => {
                                if(confirm('Delete announcement?')) {
                                   const { error } = await supabase.from('announcements').delete().eq('id', post.id);
                                   if(!error) fetchAdminData();
                                }
                             }}>
                                <Trash2 className="w-4 h-4" />
                             </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'trivias' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Trivia Submissions & Queue</h2>
                <p className="text-sm text-gray-500">Review, approve, or reject trivia requests submitted by Authors and Premium users.</p>
              </div>
              <Button onClick={() => fetchAdminData(false)} className="bg-slate-900 text-xs font-bold rounded-xl">Refresh Queue</Button>
            </div>

            <Card className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto w-full min-w-0">
                  <table className="w-full text-left text-xs responsive-table">
                    <thead className="bg-slate-50 uppercase text-slate-500 font-bold border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Trivia Title</th>
                        <th className="px-6 py-4">Submitted By</th>
                        <th className="px-6 py-4">Book Link</th>
                        <th className="px-6 py-4">T-Points Reward / Cost</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Submitted At</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {triviaSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                            No trivia submissions found.
                          </td>
                        </tr>
                      ) : (
                        triviaSubmissions.map((sub: any) => {
                          const isPending = sub.status === 'pending';
                          const isApproved = sub.status === 'active';
                          const isRejected = sub.status === 'rejected';

                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 font-bold text-slate-900">{sub.title}</td>
                              <td className="px-6 py-4 text-slate-600">{sub.creator?.email || 'Premium User'}</td>
                              <td className="px-6 py-4">
                                {sub.book_id ? (
                                  <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none rounded-lg text-[10px]">
                                    Book Linked
                                  </Badge>
                                ) : (
                                  <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none rounded-lg text-[10px]">
                                    General
                                  </Badge>
                                )}
                              </td>
                              <td className="px-6 py-4 text-slate-600">
                                <span className="text-emerald-600">+{sub.reward_points || 100} PTS</span>
                                <span className="mx-1 text-slate-300">/</span>
                                <span className="text-amber-600">-{sub.price || 200} PTS</span>
                              </td>
                              <td className="px-6 py-4">
                                {isPending && <Badge className="bg-amber-50 text-amber-700 border-none rounded-lg text-[10px]">Pending Review</Badge>}
                                {isApproved && <Badge className="bg-emerald-50 text-emerald-700 border-none rounded-lg text-[10px]">Active / Live</Badge>}
                                {isRejected && <Badge className="bg-red-50 text-red-700 border-none rounded-lg text-[10px]">Rejected</Badge>}
                              </td>
                              <td className="px-6 py-4 text-slate-500 font-mono">
                                {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTriviaReview(sub);
                                    setTriviaFeedback("");
                                  }}
                                  className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-3 h-8 rounded-lg"
                                >
                                  Review & Decision
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Review Modal */}
            {selectedTriviaReview && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
                  <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[10px] uppercase tracking-widest px-2 mb-1">Trivia Submission Review</Badge>
                      <h3 className="text-xl font-black text-slate-950 tracking-tight">{selectedTriviaReview.title}</h3>
                    </div>
                    <button
                      onClick={() => setSelectedTriviaReview(null)}
                      className="text-slate-400 hover:text-slate-600 font-bold p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs font-medium">
                      <div>
                        <span className="text-slate-500 block uppercase text-[9px] font-bold">Requestor</span>
                        <span className="text-slate-900">{selectedTriviaReview.creator?.email || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block uppercase text-[9px] font-bold">Target Book ID</span>
                        <span className="text-slate-900 font-mono text-[10px]">{selectedTriviaReview.book_id || 'General Knowledge'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block uppercase text-[9px] font-bold">Reward Points</span>
                        <span className="text-emerald-600 font-bold">+{selectedTriviaReview.reward_points || 100} T-Points</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block uppercase text-[9px] font-bold">Price to Play</span>
                        <span className="text-amber-600 font-bold">{selectedTriviaReview.price || 200} T-Points</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
                      <p className="text-slate-700 text-sm">{selectedTriviaReview.description}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Questions Submitted</h4>
                      <div className="space-y-4">
                        {(() => {
                          try {
                            const qs = JSON.parse(selectedTriviaReview.promotional_writeup || '[]');
                            if (!Array.isArray(qs) || qs.length === 0) {
                              return <p className="text-slate-400 text-xs italic">No questions attached or invalid format.</p>;
                            }
                            return qs.map((q: any, idx: number) => (
                              <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 space-y-2">
                                <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Question #{idx + 1} ({q.difficulty || 'Medium'})</span>
                                <p className="text-slate-950 font-bold text-xs">{q.question}</p>
                                <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                                  {q.options?.map((opt: string, oIdx: number) => {
                                    const char = String.fromCharCode(65 + oIdx);
                                    const isCorrect = q.correct_answer === char;
                                    return (
                                      <div key={oIdx} className={`p-2 rounded-lg border ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-white border-slate-100 text-slate-600'}`}>
                                        {char}. {opt}
                                      </div>
                                    );
                                  })}
                                </div>
                                {q.explanation && (
                                  <p className="text-[11px] text-slate-500 italic mt-1 font-mono">Explanation: {q.explanation}</p>
                                )}
                              </div>
                            ));
                          } catch (err) {
                            return <p className="text-red-500 text-xs">Error parsing questions: {selectedTriviaReview.promotional_writeup}</p>;
                          }
                        })()}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Review Note / Rejection Feedback</label>
                      <textarea
                        value={triviaFeedback}
                        onChange={(e) => setTriviaFeedback(e.target.value)}
                        placeholder="Add a feedback message or approval/rejection note..."
                        className="w-full border border-slate-200 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-slate-900"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between shrink-0">
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedTriviaReview(null)}
                      className="rounded-xl text-slate-500"
                      disabled={isTriviaReviewing}
                    >
                      Cancel
                    </Button>

                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          if (!window.confirm("Reject this trivia submission?")) return;
                          setIsTriviaReviewing(true);
                          try {
                            const { error } = await supabase
                              .from('trivias')
                              .update({
                                status: 'rejected',
                                description: `${selectedTriviaReview.description}\n\n[Feedback]: ${triviaFeedback}`
                              })
                              .eq('id', selectedTriviaReview.id);
                            if (error) throw error;
                            
                            alert("Trivia submission rejected successfully.");
                            setSelectedTriviaReview(null);
                            await fetchAdminData(false);
                          } catch (err: any) {
                            alert(`Failed to reject submission: ${err.message}`);
                          } finally {
                            setIsTriviaReviewing(false);
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl px-4"
                        disabled={isTriviaReviewing}
                      >
                        Reject Submission
                      </Button>

                      <Button
                        onClick={async () => {
                          if (!window.confirm("Approve this trivia submission and make it LIVE?")) return;
                          setIsTriviaReviewing(true);
                          try {
                            const { error: tErr } = await supabase
                              .from('trivias')
                              .update({
                                status: 'active',
                                description: triviaFeedback ? `${selectedTriviaReview.description}\n\n[Note]: ${triviaFeedback}` : selectedTriviaReview.description
                              })
                              .eq('id', selectedTriviaReview.id);
                            if (tErr) throw tErr;

                            const qs = JSON.parse(selectedTriviaReview.promotional_writeup || '[]');
                            if (Array.isArray(qs) && qs.length > 0) {
                              const isGeneral = !selectedTriviaReview.book_id;
                              
                              if (isGeneral) {
                                await supabase
                                  .from("trivia_questions")
                                  .delete()
                                  .is("ebook_id", null);
                              } else {
                                await supabase
                                  .from("trivia_questions")
                                  .delete()
                                  .eq("ebook_id", selectedTriviaReview.book_id);
                              }

                              const { error: qErr } = await supabase
                                .from('trivia_questions')
                                .insert(qs.map((q: any, idx: number) => ({
                                  ebook_id: selectedTriviaReview.book_id || null,
                                  question: q.question,
                                  options: q.options,
                                  correct_answer: q.correct_answer,
                                  explanation: q.explanation || '',
                                  difficulty: q.difficulty || 'Medium',
                                  points: q.points || 10,
                                  order_number: idx + 1,
                                  is_active: true
                                })));

                              if (qErr) throw qErr;
                            }

                            alert("Trivia approved successfully and is now LIVE!");
                            setSelectedTriviaReview(null);
                            await fetchAdminData(false);
                          } catch (err: any) {
                            alert(`Failed to approve submission: ${err.message}`);
                          } finally {
                            setIsTriviaReviewing(false);
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-4"
                        disabled={isTriviaReviewing}
                      >
                        Approve & Launch Live
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'authors' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Author Hub</h2>
                <p className="text-sm text-gray-500">Manage author application requests and review their uploaded eBook submissions.</p>
              </div>
              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <Button
                  size="sm"
                  variant={authorSubTab === 'applications' ? 'default' : 'ghost'}
                  onClick={() => setAuthorSubTab('applications')}
                  className={`rounded-lg px-4 h-8 text-[11px] font-black uppercase tracking-wider transition-all ${authorSubTab === 'applications' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
                >
                  Applications
                </Button>
                <Button
                  size="sm"
                  variant={authorSubTab === 'submissions' ? 'default' : 'ghost'}
                  onClick={() => setAuthorSubTab('submissions')}
                  className={`rounded-lg px-4 h-8 text-[11px] font-black uppercase tracking-wider transition-all ${authorSubTab === 'submissions' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
                >
                  eBook Submissions
                </Button>
              </div>
            </div>

            {authorSubTab === 'applications' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {authorApplications.length === 0 ? (
                    <Card><CardContent className="p-8 text-center text-gray-500">No applications found.</CardContent></Card>
                  ) : (
                    authorApplications.map((app) => (
                      <Card key={app.id} className="overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                {app.users?.full_name?.charAt(0) || <Users className="w-6 h-6" />}
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900">{app.users?.full_name || 'Anonymous User'}</h3>
                                <p className="text-sm text-gray-500">{app.users?.email}</p>
                                <div className="flex items-center gap-4 mt-2">
                                  <Badge variant="outline" className="font-bold text-[10px]">FEE: ₦{app.fee_paid.toLocaleString()}</Badge>
                                  <Badge className={
                                    app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                    app.status === 'approved' ? 'bg-green-100 text-green-700' :
                                    'bg-red-100 text-red-700'
                                  }>{app.status.toUpperCase()}</Badge>
                                </div>
                              </div>
                            </div>

                            {app.status === 'pending' && (
                              <div className="flex items-center gap-2">
                                 <Button 
                                   onClick={() => handleResolveAuthorApplication(app.id, 'approve')}
                                   className="bg-green-600 hover:bg-green-700 font-black rounded-lg gap-2"
                                 >
                                   <CheckCircle2 className="w-4 h-4" /> Approve
                                 </Button>
                                 <Button 
                                   variant="outline"
                                   onClick={() => handleResolveAuthorApplication(app.id, 'reject')}
                                   className="border-red-200 text-red-600 hover:bg-red-50 font-black rounded-lg gap-2"
                                 >
                                   <XCircle className="w-4 h-4" /> Reject
                                 </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            {authorSubTab === 'submissions' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>eBook Submissions Queue</CardTitle>
                    <CardDescription>Review pending eBook submissions from Authors and Approve or Reject with feedback.</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input 
                      placeholder="Search submissions..." 
                      className="pl-10 w-64"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto w-full min-w-0">
                    <table className="w-full text-sm text-left responsive-table">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4 font-medium text-gray-500">Cover</th>
                          <th className="px-6 py-4 font-medium text-gray-500">Title</th>
                          <th className="px-6 py-4 font-medium text-gray-500">Author</th>
                          <th className="px-6 py-4 font-medium text-gray-500">Price</th>
                          <th className="px-6 py-4 font-medium text-gray-500">Status</th>
                          <th className="px-6 py-4 font-medium text-gray-500">Submitted At</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pendingBooks.filter(b => {
                          const type = b.admin_note?.includes('type:') ? b.admin_note.split('type:')[1].split(',')[0] : 'ebook';
                          const matchesSearch = b.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                              b.users?.email?.toLowerCase().includes(searchQuery.toLowerCase());
                          const isPending = b.status === 'pending_review' || b.status === 2 || b.status === 0 || b.status === 'pending';
                          return type === 'ebook' && isPending && matchesSearch;
                        }).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic font-medium">
                              No pending eBook submissions found.
                            </td>
                          </tr>
                        ) : (
                          pendingBooks.filter(b => {
                            const type = b.admin_note?.includes('type:') ? b.admin_note.split('type:')[1].split(',')[0] : 'ebook';
                            const matchesSearch = b.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                b.users?.email?.toLowerCase().includes(searchQuery.toLowerCase());
                            const isPending = b.status === 'pending_review' || b.status === 2 || b.status === 0 || b.status === 'pending';
                            return type === 'ebook' && isPending && matchesSearch;
                          }).map(book => (
                            <tr key={book.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="w-12 h-16 relative overflow-hidden rounded-xl bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center p-0.5">
                                  {book.cover_image ? (
                                    <img 
                                      src={book.cover_image} 
                                      alt={book.title} 
                                      className="w-full h-full object-cover rounded-lg"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <BookOpen className="w-5 h-5 text-slate-400" />
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 font-medium text-indigo-900">{book.title}</td>
                              <td className="px-6 py-4 text-gray-500">{book.users?.email || book.user_id}</td>
                              <td className="px-6 py-4 font-bold">₦{book.price}</td>
                              <td className="px-6 py-4">
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 font-extrabold text-[10px] uppercase">
                                  {(book.status === 'pending_review' || book.status === 2) ? 'PENDING REVIEW' : 'DRAFT/PENDING'}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                {book.created_at ? new Date(book.created_at).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end items-center gap-1.5">
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleBookAction(book.id, 'approve')} 
                                    className="bg-emerald-600 hover:bg-emerald-700 font-extrabold rounded-xl px-3 h-8 text-white shadow-sm text-[11px]"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setDeclineModalBook({ id: book.id, title: book.title });
                                      setDeclineReason(book.admin_note || '');
                                    }} 
                                    className="border-red-200 text-red-600 hover:bg-red-50 font-extrabold rounded-xl px-3 h-8 text-[11px]"
                                  >
                                    <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleOpenReview(book)} 
                                    className="bg-indigo-600 hover:bg-indigo-700 font-extrabold rounded-xl px-3 h-8 text-white text-[11px]"
                                  >
                                    Preview
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    onClick={() => navigate(`/edit/${book.id}`)} 
                                    className="bg-slate-900 hover:bg-black font-extrabold rounded-xl px-3 h-8 text-white text-[11px]"
                                  >
                                    Edit
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => handleDeleteBook(book.id, book.title, 'eBook')} 
                                    className="text-red-500 hover:bg-red-50 hover:text-red-700 h-8 w-8 p-0 rounded-xl"
                                    title="Delete Submitted eBook"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Content Reports</h2>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto w-full min-w-0">
                  <table className="w-full text-sm text-left responsive-table">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px]">Book ID</th>
                        <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px]">Reason</th>
                        <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px]">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {reports.map(report => (
                        <tr key={report.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-mono text-xs text-gray-500">{report.book_id}</td>
                          <td className="px-6 py-4 font-medium">{report.reason}</td>
                          <td className="px-6 py-4">
                            <Badge variant={report.status === 'pending' ? 'secondary' : 'default'}>{report.status.toUpperCase()}</Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <Button size="sm" variant="ghost" onClick={async () => {
                               const { error } = await supabase.from('reported_content').update({ status: 'resolved' }).eq('id', report.id);
                               if (!error) fetchAdminData();
                             }} className="text-indigo-600 font-bold hover:bg-indigo-50">Mark Resolved</Button>
                          </td>
                        </tr>
                      ))}
                      {reports.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic font-medium">No reports found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Platform Transactions</h2>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto w-full min-w-0">
                  <table className="w-full text-sm text-left responsive-table">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px]">Type</th>
                        <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px]">Amount</th>
                        <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px]">Date</th>
                        <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px]">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transactions.slice(0, 50).map(tx => (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 capitalize font-bold text-slate-700">{tx.type.replace('_', ' ')}</td>
                          <td className={`px-6 py-4 font-black ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            ₦{Math.abs(tx.amount).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-gray-500 font-medium">{new Date(tx.created_at).toLocaleString()}</td>
                          <td className="px-6 py-4 text-[10px] font-mono text-gray-400">{tx.paystack_reference || 'INTERNAL'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}











        {activeTab === 'health' && (
          <div className="space-y-8">
            {/* Header with manual re-scan switch */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Activity className={`w-5 h-5 text-indigo-600 ${healthChecking ? 'animate-spin' : ''}`} />
                  System Diagnosis & Repairs Hub
                </h2>
                <p className="text-xs text-slate-400 font-medium font-bold">Auto-scans database column integrity, RLS policies, and email config metrics every 10 seconds.</p>
              </div>
              <Button
                onClick={() => checkSystemHealth(false)}
                disabled={healthChecking}
                className="bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest px-6 h-11 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                {healthChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> SCANNING...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="w-4 h-4" /> FORCE RE-RUN SCAN
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-red-200 bg-red-50 md:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-800 text-lg font-black">
                      <ShieldCheck className="w-5 h-5" />
                      CRITICAL REPAIR
                    </CardTitle>
                    <CardDescription className="text-red-700 text-xs font-medium">FIX "INFINITE RECURSION" loop blocking your database.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {healthChecks.length > 0 && healthChecks.every((h: any) => h.status === 'healthy') ? (
                        <div className="p-4 bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 rounded-2xl space-y-1">
                          <p className="font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5 text-emerald-700">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0 animate-pulse" />
                            RESOLVED ✅ SYSTEM OPERATIONAL
                          </p>
                          <p className="text-[10px] text-emerald-600/90 font-medium">
                            No RLS policy loops, infinite loops, or missing schema tables are present. Live check verified integrity status is 100% active and persistent!
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-red-100/50 rounded-xl border border-red-200">
                          <p className="text-[10px] text-red-800 font-bold uppercase mb-1">Status: Unresolved anomalies</p>
                          <p className="text-[9px] text-red-600 font-medium font-bold">Copy the instant repair SQL below to patch database schemas to correct standards.</p>
                        </div>
                      )}

                      <div className="p-3 bg-red-100/50 rounded-xl border border-red-200">
                        <p className="text-[10px] text-red-800 font-bold uppercase mb-2">Instant Fix (Recommended):</p>
                        
                        <div className="bg-black/90 p-2 rounded-lg mb-3">
                           <textarea 
                              readOnly 
                              className="w-full bg-transparent text-green-400 font-mono text-[9px] h-24 resize-none outline-none border-none"
                              value={migrations.RECURSION_FIX_SQL}
                              onFocus={(e) => e.target.select()}
                           />
                        </div>

                        <Button 
                          onClick={() => {
                            const sql = migrations.RECURSION_FIX_SQL;
                            const textarea = document.createElement('textarea');
                            textarea.value = sql;
                            document.body.appendChild(textarea);
                            textarea.select();
                            try {
                              document.execCommand('copy');
                              alert('✅ RECURSION FIX COPIED!\n\n1. Go to Supabase SQL Editor\n2. Paste and click RUN.');
                            } catch (err) {
                              alert('Copy failed. Please copy the code manually from the black box above.');
                            }
                            document.body.removeChild(textarea);
                          }}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xs h-12 rounded-xl shadow-lg flex gap-2"
                        >
                          <ShieldCheck className="w-5 h-5 shrink-0" /> KEY: CLICK TO COPY
                        </Button>
                      </div>
                      
                      <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Full Setup:</p>
                        
                        <div className="bg-slate-800 p-2 rounded-lg mb-3">
                           <textarea 
                              readOnly 
                              className="w-full bg-transparent text-slate-300 font-mono text-[9px] h-20 resize-none outline-none border-none"
                              value={migrations.FULL_SUPABASE_SQL}
                              onFocus={(e) => e.target.select()}
                           />
                        </div>

                        <Button 
                          variant="ghost"
                          onClick={() => {
                            const sql = migrations.FULL_SUPABASE_SQL;
                            const textarea = document.createElement('textarea');
                            textarea.value = sql;
                            document.body.appendChild(textarea);
                            textarea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textarea);
                            alert('✅ FULL SCHEMA COPIED!');
                          }}
                          className="w-full border-slate-300 text-slate-700 hover:bg-slate-200 font-bold text-[10px] h-10 rounded-xl shadow-sm"
                        >
                          <FileText className="w-3 h-3" /> COPY FULL SETUP SQL
                        </Button>
                      </div>

                      <div className="p-3 bg-amber-100 rounded-xl border border-amber-200">
                        <p className="text-[10px] text-amber-800 font-bold uppercase mb-2">Trivia System Repair:</p>
                        
                        <div className="bg-slate-800 p-2 rounded-lg mb-3">
                           <textarea 
                              readOnly 
                              className="w-full bg-transparent text-amber-300 font-mono text-[9px] h-20 resize-none outline-none border-none"
                              value={(migrations as any).TRIVIA_SYSTEM_SQL}
                              onFocus={(e) => e.target.select()}
                           />
                        </div>

                        <Button 
                          variant="ghost"
                          onClick={() => {
                            const sql = (migrations as any).TRIVIA_SYSTEM_SQL;
                            const textarea = document.createElement('textarea');
                            textarea.value = sql;
                            document.body.appendChild(textarea);
                            textarea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textarea);
                            alert('✅ TRIVIA REPAIR SQL COPIED!\n\nRun this in Supabase SQL editor.');
                          }}
                          className="w-full border-amber-300 text-amber-700 hover:bg-amber-200 font-bold text-[10px] h-10 rounded-xl shadow-sm"
                        >
                          <BrainCircuit className="w-3 h-3 mr-1" /> COPY TRIVIA REPAIR SQL
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

               <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative md:col-span-1">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <ShieldCheck className="w-24 h-24" />
                  </div>
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-green-400" />
                        System Connectivity
                     </CardTitle>
                  </CardHeader>
                  <CardContent>
                     <p className="text-3xl font-black mb-2">{dbOffline ? 'EMERGENCY MODE' : 'ONLINE'}</p>
                     <p className="text-xs text-slate-400 uppercase font-black tracking-widest">
                        {dbOffline ? 'Running on hardcoded bypass' : 'Database connection active'}
                     </p>
                  </CardContent>
               </Card>

               <Card className="md:col-span-2">
                  <CardHeader>
                     <CardTitle className="text-xl font-black">Environment Key Detection</CardTitle>
                     <CardDescription>Verify which keys are successfully loaded from the "Secret Box".</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">SUPABASE_URL</p>
                              <div className="flex items-center justify-between">
                                 <div>
                                    <code className="text-sm font-bold block">{mask(backendHealth?.config?.url)}</code>
                                    {backendHealth?.config?.projectRef && (
                                       <span className="text-[10px] font-mono text-slate-400">Ref: {backendHealth.config.projectRef}</span>
                                    )}
                                 </div>
                                 <Badge variant={backendHealth?.config?.url?.includes('placeholder') ? 'outline' : 'default'} className="text-[10px]">
                                    {backendHealth?.config?.url?.includes('placeholder') ? 'PLACEHOLDER' : 'CUSTOM'}
                                 </Badge>
                              </div>
                           </div>
                           <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">SERVICE_ROLE_KEY</p>
                              <div className="flex items-center justify-between">
                                 <div>
                                    <code className="text-sm font-bold block">{mask(backendHealth?.config?.key)}</code>
                                    {backendHealth?.config?.keyProjectRef && (
                                       <span className="text-[10px] font-mono text-slate-400">Ref: {backendHealth.config.keyProjectRef}</span>
                                    )}
                                 </div>
                                 <Badge variant={backendHealth?.config?.key?.includes('ref:wgdcr') ? 'outline' : 'default'} className="text-[10px]">
                                     {backendHealth?.config?.key?.includes('ref:wgdcr') ? 'PLACEHOLDER' : 'CUSTOM'}
                                 </Badge>
                              </div>
                           </div>
                        </div>
                        
                        {backendHealth?.configStatus?.reason && !backendHealth.configStatus.ok && (
                           <div className="p-4 bg-red-50 border border-red-100 rounded-xl animate-pulse">
                              <div className="flex items-center gap-2 text-red-700 font-black mb-1 text-sm uppercase">
                                 <AlertTriangle className="w-5 h-5" />
                                 Security Mismatch Detected
                              </div>
                              <p className="text-xs text-red-600 font-mono italic mb-4">"{backendHealth.configStatus.reason}"</p>
                              
                              <div className="grid grid-cols-2 gap-4 text-center">
                                 <div className="p-3 bg-white rounded-lg border border-red-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">URL PROJECT</p>
                                    <p className="text-sm font-black text-slate-700">{backendHealth.config?.projectRef || '???'}</p>
                                 </div>
                                 <div className="p-3 bg-white rounded-lg border border-red-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">KEY PROJECT</p>
                                    <p className="text-sm font-black text-slate-700">{backendHealth.config?.keyProjectRef || '???'}</p>
                                 </div>
                              </div>
                              
                              <div className="mt-4 p-3 bg-red-600 text-white rounded-xl text-[11px] font-bold">
                                 THE VALUES ABOVE MUST MATCH. If they don't, copy BOTH URL and Key from the SAME Supabase project into AI Studio Settings.
                              </div>
                           </div>
                        )}
                        
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-xs text-amber-800 space-y-2">
                           <p className="font-bold uppercase tracking-tight">How to fix "Mismatched Project":</p>
                           <p>1. Ensure both <strong>SUPABASE_URL</strong> and <strong>SUPABASE_ANON_KEY</strong> are present in AI Studio Settings.</p>
                           <p>2. Ensure they are both using the <strong>Exact Same Case</strong> (Uppercase recommended).</p>
                           <p>3. If they are correct and you've saved them, refresh this page to check the discovery status.</p>
                        </div>
                     </div>
                  </CardContent>
               </Card>

               {/* Project Archive & Source Downloader */}
               <Card className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white border-none shadow-xl overflow-hidden relative md:col-span-1">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <Download className="w-24 h-24 text-white" />
                  </div>
                  <CardHeader className="relative z-10">
                     <CardTitle className="flex items-center gap-2 text-white">
                        <Download className="w-5 h-5 text-indigo-300" />
                        Project Downloader
                     </CardTitle>
                     <CardDescription className="text-indigo-200/60 text-xs font-medium">Export and backup complete project codebase.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 relative z-10">
                     <p className="text-3xl font-black mb-1">Backup Source</p>
                     <p className="text-xs text-indigo-200/80 leading-relaxed font-medium">
                        Retrieve the fully bundled code as a standard ZIP file. Excellent for deployment on hosting platforms like Netlify/Vercel or for local backups.
                     </p>
                     <Button
                       onClick={handleDownloadProjectZip}
                       disabled={downloadPending}
                       className="w-full bg-indigo-600 hover:bg-indigo-505 text-white font-bold text-xs h-11 rounded-xl shadow-lg border-none uppercase tracking-wider flex gap-2 items-center justify-center transition-all active:scale-[0.98] mt-2 cursor-pointer"
                     >
                       {downloadPending ? (
                         <>
                           <Loader2 className="w-4 h-4 animate-spin text-white" />
                           ZIPPING ASSETS...
                         </>
                       ) : (
                         <>
                           <Download className="w-4 h-4 text-white" />
                           DOWNLOAD FULL ZIP
                         </>
                       )}
                     </Button>
                  </CardContent>
               </Card>
            </div>

            {/* FIX 2: AUTO-UPLOAD FOR BOOK COVERS */}
            <Card className="border border-slate-100 shadow-md rounded-[2rem] bg-white overflow-hidden">
               <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
                  <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-3">
                     <Image className="w-5 h-5 text-indigo-600" /> Auto-Link Book Covers Tool
                  </CardTitle>
                  <CardDescription className="text-slate-500 text-xs font-semibold font-sans">
                     Select any eBook to instantly upload its cover page directly to your 'media' bucket, fetch the public URL, and update the catalog database.
                  </CardDescription>
               </CardHeader>
               <CardContent className="p-6 space-y-4 font-sans">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-1.5 font-sans">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Select eBook from catalog</label>
                        <select
                           value={selectedHealthBookId}
                           onChange={(e) => {
                              setSelectedHealthBookId(e.target.value);
                              setHealthUploadSuccess('');
                              setHealthUploadError('');
                           }}
                           className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl h-11 px-3 text-sm font-semibold outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                        >
                           <option value="">-- Choose Book --</option>
                           {healthBooks.map((b) => (
                              <option key={b.id} value={b.id}>
                                 {b.title} {b.cover_image ? '📸 (Has Cover)' : '❌ (No Cover)'}
                              </option>
                           ))}
                        </select>
                     </div>

                     <div className="space-y-1.5 font-sans">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Choose Image Asset</label>
                        <div className="flex items-center gap-2">
                           <input
                              type="file"
                              accept="image/*"
                              id="health-cover-file-input"
                              onChange={(e) => {
                                 if (e.target.files && e.target.files[0]) {
                                    setHealthCoverFile(e.target.files[0]);
                                    setHealthUploadSuccess('');
                                    setHealthUploadError('');
                                 }
                              }}
                              className="hidden"
                           />
                           <label
                              htmlFor="health-cover-file-input"
                              className="flex-1 flex items-center justify-between border border-dashed border-slate-300 hover:border-indigo-500/80 bg-slate-50/50 hover:bg-slate-50/100 p-3 rounded-xl cursor-pointer text-xs font-semibold text-slate-600 select-none transition-all h-11 font-sans"
                           >
                              <span className="truncate max-w-[200px] font-sans">
                                 {healthCoverFile ? healthCoverFile.name : 'Choose cover image file...'}
                              </span>
                              <Upload className="w-4 h-4 text-slate-400 shrink-0 select-none ml-2" />
                           </label>
                           
                           <Button
                              onClick={handleHealthUploadCover}
                              disabled={uploadingHealthCover || !selectedHealthBookId || !healthCoverFile}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 h-11 rounded-xl shadow-lg border-none flex items-center gap-2 shrink-0 transition-transform active:scale-95 disabled:opacity-50 font-sans"
                           >
                              {uploadingHealthCover ? (
                                 <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                                 </>
                              ) : (
                                 'Upload & Link'
                              )}
                           </Button>
                        </div>
                     </div>
                  </div>

                  {healthUploadSuccess && (
                     <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-bold flex items-start gap-2 animate-fadeIn transition-all font-sans">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 mt-1 font-sans" />
                        <span>{healthUploadSuccess}</span>
                     </div>
                  )}

                  {healthUploadError && (
                     <div className="p-3 bg-red-50 text-red-800 border border-red-100 rounded-xl text-xs font-bold flex items-start gap-2 animate-fadeIn transition-all font-sans">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0 mt-1 font-sans" />
                        <span>{healthUploadError}</span>
                     </div>
                  )}
               </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-black">Database Schema Integrity</CardTitle>
                <CardDescription>Scan results for missing tables or columns in your specific project.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto w-full min-w-0">
                   <table className="w-full text-sm text-left responsive-table">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px]">Database Component</th>
                        <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px]">Status</th>
                        <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px]">Resolution Hint</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {healthChecks.map((check, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-900 uppercase tracking-tighter flex items-center gap-2">
                               {check.column ? <Activity className="w-3 h-3 text-indigo-400" /> : <Database className="w-3 h-3 text-amber-500" />}
                               {check.label}
                            </p>
                            <p className="text-[9px] text-gray-400 font-mono mt-0.5">{check.table}{check.column ? `.${check.column}` : ' (Table)'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={check.status === 'healthy' ? 'bg-emerald-600 text-[9px] font-black' : 'bg-red-600 text-[9px] font-black'}>
                              {check.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-[10px] text-gray-500 font-medium italic">
                            {check.status === 'healthy' ? 'Verified operational.' : `Error: ${check.error || 'Schema missing. Run migrations.'}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center gap-4 py-8">
               <Button 
                onClick={async () => {
                  try {
                    const session = await supabase.auth.getSession();
                    const res = await axios.post('/api/admin/run-migrations', {}, {
                      headers: { Authorization: `Bearer ${session.data.session?.access_token}` }
                    });
                    alert(res.data.message || 'Verification complete.');
                    fetchAdminData();
                    checkSystemHealth();
                  } catch (err: any) {
                    alert('Verification failed: ' + (err.response?.data?.error || err.message));
                  }
                }}
                className="bg-slate-700 h-12 px-8 rounded-xl font-black text-white hover:bg-slate-800"
               >
                 Verify Database Schema
                </Button>
             </div>

             {/* Emailing & Delivery Insights Guide Card */}
             <Card className="border-none shadow-md rounded-[2.5rem] bg-indigo-50 border border-indigo-100 overflow-hidden mb-6">
               <CardHeader className="bg-indigo-600/5 p-8 border-b border-indigo-100/30">
                 <CardTitle className="text-xl font-black text-indigo-950 flex items-center gap-3">
                    <FileText className="w-6 h-6 text-indigo-600" /> Email Sending Architecture (Brevo vs Supabase)
                 </CardTitle>
                 <CardDescription className="text-indigo-900/60 font-medium">How custom notification alerts and foundational credentials work together on the platform</CardDescription>
               </CardHeader>
               <CardContent className="p-8 space-y-4 text-indigo-950">
                 <p className="text-sm font-semibold leading-relaxed">
                   Your platform utilizes a split dispatch email design ensuring 100% deliverability for core workflows:
                 </p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                   <div className="bg-white p-6 rounded-3xl border border-indigo-100/55 shadow-sm space-y-2">
                     <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">1. Transactional Alerts & System Emails (Brevo API)</p>
                     <p className="text-xs font-medium text-slate-600 leading-relaxed">
                       All custom application actions—such as support ticket replies, manual payment approvals, system payouts, and direct manual eBook unlocks—are routed immediately via Brevo using your <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono">BREVO_API_KEY</code> and customized templates for highly deliverable transactional messages.
                     </p>
                   </div>
                   <div className="bg-white p-6 rounded-3xl border border-indigo-100/55 shadow-sm space-y-2">
                     <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">2. Account Authentication Emails (Supabase SMTP)</p>
                     <p className="text-xs font-medium text-slate-600 leading-relaxed font-sans">
                       Core User Account commands—such as Signup Confirmations, Invite Links, and Account Password Resets—are triggered automatically by Supabase Auth (GoTrue server) on the database itself. 
                     </p>
                     <p className="text-[11px] font-bold text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-100/70">
                       💡 <strong>To route Supabase Auth emails through Brevo:</strong> Please navigate to your <strong>Supabase Dashboard &gt; Project Settings &gt; Auth &gt; SMTP Settings</strong>, toggle on <em>&quot;Enable Custom SMTP&quot;</em>, and insert your <strong>Brevo SMTP Credentials</strong> (Server: <code className="font-mono">smtp-relay.brevo.com</code>, Port: <code className="font-mono">587</code>). This ensures auth emails are delivered by your Brevo account instead of the default Supabase mailer.
                     </p>
                   </div>
                 </div>
               </CardContent>
             </Card>

             {/* Direct Purchase Database Logs */}
             <Card className="border-none shadow-md rounded-[2.5rem] bg-white border border-slate-100 overflow-hidden mb-6">
               <CardHeader className="bg-slate-50 border-b border-slate-100 p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div>
                   <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
                     <Coins className="w-5 h-5 text-emerald-600 animate-pulse" /> Verified Paystack Purchases & Database Logs
                   </CardTitle>
                   <CardDescription className="text-slate-500 text-xs font-semibold">
                     Live checkout transactions from Paystack webhooks and client records
                   </CardDescription>
                 </div>
                 <Button
                   type="button"
                   onClick={() => {
                     if (backendHealth?.rawTransactions && backendHealth.rawTransactions.length > 0) {
                       try {
                         const jsonText = JSON.stringify(backendHealth.rawTransactions, null, 2);
                         const textarea = document.createElement('textarea');
                         textarea.value = jsonText;
                         document.body.appendChild(textarea);
                         textarea.select();
                         document.execCommand('copy');
                         document.body.removeChild(textarea);
                         alert("✅ Raw transaction database logs copied to clipboard!");
                       } catch (err) {
                         alert("Failed to copy. Please highlight and copy manually.");
                       }
                     } else {
                       alert("No transaction logs available in the current database session.");
                     }
                   }}
                   variant="outline"
                   className="h-10 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl px-4 flex gap-1.5"
                 >
                   <Copy className="w-3.5 h-3.5" /> Copy Log Dump (JSON)
                 </Button>
               </CardHeader>
               <CardContent className="p-4 sm:p-8">
                 <div className="overflow-x-auto rounded-3xl border border-slate-100 w-full min-w-0">
                   <table className="w-full text-sm text-left responsive-table">
                     <thead className="bg-slate-50 border-b border-slate-200">
                       <tr>
                         <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px]">Buyer Email</th>
                         <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px]">Product / Book</th>
                         <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px]">Reference Code</th>
                         <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px]">Amount Paid</th>
                         <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px]">Grant Status</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {backendHealth?.richRecentPurchases && backendHealth.richRecentPurchases.length > 0 ? (
                         backendHealth.richRecentPurchases.map((log: any, i: number) => (
                           <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                             <td className="px-6 py-4 font-bold text-slate-800 break-all max-w-[200px]">
                               {log.email}
                             </td>
                             <td className="px-6 py-4 font-semibold text-slate-600">
                               {log.bookTitle}
                             </td>
                             <td className="px-6 py-4 font-mono text-xs text-slate-400 select-all">
                               {log.reference}
                             </td>
                             <td className="px-6 py-4 font-black text-slate-900">
                               ₦{log.amount.toLocaleString()}
                             </td>
                             <td className="px-6 py-4">
                               <Badge className={log.status === 'successful' || log.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-black' : 'bg-rose-500/10 text-rose-600 border-none text-[9px] font-black'}>
                                 {log.status.toUpperCase()}
                               </Badge>
                             </td>
                           </tr>
                         ))
                       ) : (
                         <tr>
                           <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                             No recent live checkout or purchase transactions found in the database.
                           </td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                 </div>
               </CardContent>
             </Card>

             {/* Dedicated Live Console Log Terminal */}
             <Card className="border-none shadow-2xl bg-slate-950 text-slate-100 rounded-[2.5rem] overflow-hidden mt-8 mb-6">
                <CardHeader className="bg-slate-900 border-b border-slate-800/60 p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                      <Activity className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <CardTitle className="text-md md:text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
                        Live System Logger
                        <span className="inline-flex items-center h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-xs font-mono">Real-time application execution log and diagnosis terminal</CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Level Filters */}
                    <div className="flex rounded-lg bg-slate-850 p-1 text-xs bg-slate-800">
                      {(['all', 'log', 'warn', 'error'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setLogFilter(lvl)}
                          className={`px-3 py-1 rounded-md font-bold uppercase text-[9px] tracking-wider transition-all cursor-pointer ${
                            logFilter === lvl
                              ? 'bg-slate-950 text-emerald-400 shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                    
                    <Button
                      type="button"
                      onClick={downloadLogsAsText}
                      disabled={logs.length === 0}
                      variant="ghost"
                      className="h-8 text-[11px] font-black text-slate-300 hover:text-white border border-slate-700 bg-slate-800 hover:bg-slate-700 rounded-lg px-3 uppercase cursor-pointer"
                    >
                      Export Logs
                    </Button>
                    <Button
                      type="button"
                      onClick={clearLogs}
                      variant="ghost"
                      className="h-8 text-[11px] font-black text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 rounded-lg px-3 uppercase cursor-pointer"
                    >
                      Clear Console
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="p-8">
                  {/* Logs Box */}
                  <div className="bg-slate-950 font-mono text-[11px] leading-relaxed rounded-2xl p-6 border border-slate-800 h-96 overflow-y-auto shadow-inner space-y-1.5 flex flex-col justify-start">
                    {logs
                      .filter(l => logFilter === 'all' || l.type === logFilter)
                      .map((logItem, index) => {
                        let textColors = 'text-green-400';
                        let prefix = '⚙️ [LOG]';
                        if (logItem.type === 'warn') {
                          textColors = 'text-amber-400';
                          prefix = '⚠️ [WARN]';
                        } else if (logItem.type === 'error') {
                          textColors = 'text-red-400 font-bold';
                          prefix = '🚨 [ERROR]';
                        }
                        
                        return (
                          <div key={index} className={`flex items-start gap-2 border-b border-slate-900/40 pb-1.5 last:border-b-0 ${textColors} text-left`}>
                            <span className="text-slate-500 select-none text-[9px] whitespace-nowrap pt-0.5">[{logItem.time}]</span>
                            <span className="font-semibold select-none text-[9px] tracking-wider whitespace-nowrap pt-0.5 opacity-80">{prefix}</span>
                            <span className="whitespace-pre-wrap break-all select-text">{logItem.message}</span>
                          </div>
                        );
                      })}
                      
                    {logs.filter(l => logFilter === 'all' || l.type === logFilter).length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500 py-24 italic space-y-2">
                        <Activity className="w-8 h-8 text-slate-700 stroke-[1.5]" />
                        <p className="text-xs">System logs are clean. No active telemetry buffered.</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-500 font-medium font-mono px-1">
                    <div>
                      Showing {logs.filter(l => logFilter === 'all' || l.type === logFilter).length} logs (Filtered) • Captured buffer: {logs.length}/500 logs
                    </div>
                    <div className="text-slate-600">
                      Note: Debug info is securely contained in memory logs and only exposed on your Admin account.
                    </div>
                  </div>
                </CardContent>
              </Card>
          </div>
        )}
      </div>
      {/* User Activity Modal */}
      {selectedUserActivity && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <motion.div 
             initial={{ opacity: 0, scale: 0.9, y: 20 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             className="bg-white rounded-[3rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
           >
              <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-indigo-600" />
                    User Intelligence Dashboard
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">{selectedUserActivity.profile.email} • ID: {selectedUserActivity.profile.id} • Registered: {selectedUserActivity.profile.created_at ? new Date(selectedUserActivity.profile.created_at).toLocaleDateString() : 'Unknown'}</p>
                </div>
                <Button variant="ghost" onClick={() => setSelectedUserActivity(null)} className="rounded-full w-12 h-12 p-0">
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                 {/* Top Row: Quick Profile */}
                 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card className="rounded-[2rem] border-none bg-indigo-50 p-6 flex flex-col items-center justify-center text-center">
                       <Label className="text-[10px] font-black uppercase text-indigo-400 mb-2">Current Tier</Label>
                       <Badge className="bg-indigo-600 text-white h-10 px-6 rounded-full font-black uppercase tracking-widest text-xs">
                          {selectedUserActivity.profile.account_tier || 'FREE'}
                       </Badge>
                       {selectedUserActivity.profile.tier_expires_at && (
                         <p className="text-[10px] text-indigo-400 mt-2 font-bold italic">
                           Expires: {new Date(selectedUserActivity.profile.tier_expires_at).toLocaleDateString()}
                         </p>
                       )}
                    </Card>
                    <Card className="rounded-[2rem] border-none bg-emerald-50 p-6 flex flex-col items-center justify-center text-center">
                       <Label className="text-[10px] font-black uppercase text-emerald-400 mb-2">Wallet Balance</Label>
                       <span className="text-xl font-black text-emerald-700 italic font-mono">₦{selectedUserActivity.profile.wallet_balance?.toLocaleString()}</span>
                    </Card>
                    <Card className="rounded-[2rem] border-none bg-blue-50 p-6 flex flex-col items-center justify-center text-center">
                       <Label className="text-[10px] font-black uppercase text-blue-400 mb-2">Books Published</Label>
                       <span className="text-xl font-black text-blue-700 italic font-mono">{selectedUserActivity.books.length}</span>
                    </Card>
                    <Card className="rounded-[2rem] border-none bg-rose-50 p-6 flex flex-col items-center justify-center text-center">
                       <Label className="text-[10px] font-black uppercase text-rose-500 mb-2">Online Monitor</Label>
                       {(() => {
                          const lastActive = selectedUserActivity.session?.last_active_at || selectedUserActivity.profile?.last_active_at;
                          if (!lastActive) return <Badge variant="outline" className="text-slate-400 border-slate-300">Never active</Badge>;
                          const diffMinutes = Math.floor((Date.now() - new Date(lastActive).getTime()) / 60000);
                          const isOnline = diffMinutes < 5 && diffMinutes >= 0;
                          return (
                            <div className="flex flex-col items-center gap-1">
                              <Badge className={isOnline ? "bg-emerald-600 text-white animate-pulse" : "bg-slate-500 text-white"}>
                                {isOnline ? "🟢 Online" : "Offline"}
                              </Badge>
                              <span className="text-[9px] text-slate-500 font-bold font-mono mt-0.5">
                                {isOnline ? "Active now" : `Seen: ${new Date(lastActive).toLocaleDateString()}`}
                              </span>
                            </div>
                          );
                       })()}
                    </Card>
                    <Card className="rounded-[2rem] border-none bg-amber-50 p-6 flex flex-col items-center justify-center text-center">
                       <Label className="text-[10px] font-black uppercase text-amber-400 mb-2">Status</Label>
                       <Badge variant={selectedUserActivity.profile.is_suspended ? 'destructive' : 'default'} className="rounded-full">
                          {selectedUserActivity.profile.is_suspended ? 'SUSPENDED' : 'ACTIVE'}
                       </Badge>
                    </Card>
                 </div>

                 {/* Upgrades & Author Applications section */}
                 <div className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                       <ShieldCheck className="w-5 h-5 text-indigo-600" /> Author Applications & Upgrades
                    </h3>
                    {(!selectedUserActivity.applications || selectedUserActivity.applications.length === 0) ? (
                       <p className="text-xs text-slate-400 italic font-mono">No author applications or premium upgrade submissions recorded for this user.</p>
                    ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedUserActivity.applications.map((app: any) => (
                             <Card key={app.id} className="p-4 rounded-2xl bg-white border border-slate-100 flex flex-col justify-between space-y-3 shadow-sm hover:shadow transition-shadow">
                                <div>
                                   <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-black text-indigo-900 uppercase font-mono">Author Subscription</span>
                                      <Badge className={
                                         app.status === 'pending' ? 'bg-amber-500 text-white' :
                                         app.status === 'approved' ? 'bg-emerald-600 text-white' :
                                         'bg-rose-500 text-white'
                                      }>
                                         {app.status.toUpperCase()}
                                      </Badge>
                                   </div>
                                   <div className="text-[11px] text-slate-500 mt-1.5 space-y-0.5">
                                      <p>Reference: <span className="font-mono font-bold text-slate-700">{app.paystack_reference}</span></p>
                                      <p>Fee Paid: <span className="font-bold text-slate-700">₦{app.fee_paid?.toLocaleString() || '5,000'}</span></p>
                                      <p>Applied At: <span className="font-bold text-slate-700 font-mono">{new Date(app.created_at).toLocaleString()}</span></p>
                                   </div>
                                   {app.admin_note && (
                                      <p className="text-[10px] bg-rose-50 p-2 border border-rose-100 rounded-lg mt-2 text-rose-700 italic">
                                         Admin Note: {app.admin_note}
                                      </p>
                                   )}
                                </div>
                                {app.status === 'pending' && (
                                   <div className="flex gap-2">
                                      <Button 
                                         size="sm" 
                                         className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold h-7 flex-1"
                                         onClick={async () => {
                                            if (confirm("Approve this author application?")) {
                                               await handleResolveAuthorApplication(app.id, 'approve');
                                               fetchUserActivity(selectedUserActivity.profile.id);
                                            }
                                         }}
                                      >
                                         Approve
                                      </Button>
                                      <Button 
                                         size="sm" 
                                         variant="outline"
                                         className="border-rose-200 text-rose-500 hover:bg-rose-50 text-[10px] font-bold h-7 flex-1"
                                         onClick={async () => {
                                            const note = prompt("Enter rejection reason:");
                                            if (note !== null) {
                                               await handleResolveAuthorApplication(app.id, 'reject', note || undefined);
                                               fetchUserActivity(selectedUserActivity.profile.id);
                                            }
                                         }}
                                      >
                                         Reject
                                      </Button>
                                   </div>
                                )}
                             </Card>
                          ))}
                       </div>
                    )}
                 </div>

                 {/* History Tabs */}
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 1. Activity Trail */}
                    <div className="space-y-4">
                       <h3 className="text-lg font-black text-slate-900 border-b pb-2 flex items-center gap-2">
                          <Activity className="w-5 h-5 text-indigo-600 animate-pulse" /> Activity Trail
                       </h3>
                       <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                          {(selectedUserActivity.activities || []).map((act: any) => (
                             <div key={act.id} className="p-3 bg-slate-50 rounded-2xl flex flex-col gap-1 border border-transparent hover:border-slate-200 transition-all font-mono text-[10px]">
                                <div className="flex justify-between items-center gap-2">
                                   <Badge className="bg-slate-950 text-white font-black text-[8px] tracking-widest uppercase">{act.action}</Badge>
                                   <span className="text-[9px] text-slate-400 font-bold">{new Date(act.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                {act.metadata && (
                                   <p className="text-[9px] text-slate-600 break-words mt-1 bg-white p-1.5 rounded-lg border border-slate-100">
                                      {typeof act.metadata === 'object' ? JSON.stringify(act.metadata) : String(act.metadata)}
                                   </p>
                                )}
                                <span className="text-[8px] text-slate-350 self-end mt-0.5">{new Date(act.created_at).toLocaleDateString()}</span>
                             </div>
                          ))}
                          {(!selectedUserActivity.activities || selectedUserActivity.activities.length === 0) && (
                             <p className="text-center py-12 text-slate-400 italic">No activity logs recorded.</p>
                          )}
                       </div>
                    </div>

                    {/* 2. Transaction History */}
                    <div className="space-y-4">
                       <h3 className="text-lg font-black text-slate-900 border-b pb-2 flex items-center gap-2">
                          <Coins className="w-5 h-5 text-emerald-600" /> Transaction History
                       </h3>
                       <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {selectedUserActivity.transactions.map((tx: any) => (
                             <div key={tx.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-transparent hover:border-slate-200 transition-all">
                                <div>
                                   <p className="text-sm font-black text-slate-700 uppercase tracking-tight">{tx.type.replace('_', ' ')}</p>
                                   <p className="text-[10px] text-slate-400 font-medium italic">{new Date(tx.created_at).toLocaleString()}</p>
                                </div>
                                <span className={`font-black ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                   {tx.amount > 0 ? '+' : ''}₦{tx.amount.toLocaleString()}
                                </span>
                             </div>
                          ))}
                          {selectedUserActivity.transactions.length === 0 && (
                             <p className="text-center py-12 text-slate-400 italic">No financial movements recorded.</p>
                          )}
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h3 className="text-lg font-black text-slate-900 border-b pb-2 flex items-center gap-2">
                          <BookCheck className="w-5 h-5 text-indigo-600" /> Catalog items
                       </h3>
                       <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {selectedUserActivity.books.map((book: any) => (
                             <div key={book.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-transparent hover:border-slate-200 transition-all">
                                <div className="flex items-center gap-3">
                                   {book.cover_image && <img src={book.cover_image} className="w-10 h-14 object-cover rounded-md shadow-sm" />}
                                   <div>
                                      <p className="text-sm font-black text-slate-700 line-clamp-1">{book.title}</p>
                                      <p className="text-[10px] text-slate-400 font-medium">₦{book.price.toLocaleString()} • {book.is_published ? 'LIVE' : 'DRAFT'}</p>
                                   </div>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/book/${book.public_slug}`)} className="text-indigo-600">
                                   <ExternalLink className="w-4 h-4" />
                                </Button>
                             </div>
                          ))}
                          {selectedUserActivity.books.length === 0 && (
                             <p className="text-center py-12 text-slate-400 italic">User has not created any content.</p>
                          )}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-8 bg-slate-50 border-t flex justify-end gap-4">
                 <Button 
                   disabled={isPlatformAdminEmail(selectedUserActivity.profile.email)}
                    onClick={() => !isPlatformAdminEmail(selectedUserActivity.profile.email) && requestUserSuspend(selectedUserActivity.profile, !selectedUserActivity.profile.is_suspended)}
                   className={`disabled:hidden ${selectedUserActivity.profile.is_suspended ? 'bg-emerald-600' : 'bg-red-600'} hover:opacity-90 text-white font-black rounded-2xl h-12 px-8 flex gap-2`}
                 >
                    <AlertTriangle className="w-4 h-4" /> {selectedUserActivity.profile.is_suspended ? 'Reactivate ID' : 'Suspend ID'}
                 </Button>
                 <Button 
                   variant="outline" 
                   onClick={() => setSelectedUserActivity(null)}
                   className="font-black border-slate-300 rounded-2xl h-12 px-8"
                 >
                    Close Dossier
                 </Button>
              </div>
           </motion.div>
        </div>
      )}
       {/* Decline / Revision Feedback Modal */}
       {declineModalBook && (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-6">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                   <XCircle className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="font-black text-lg text-slate-900">Decline & Request Revisions</h3>
                   <p className="text-xs text-slate-500 font-medium truncate max-w-[280px]">For: {declineModalBook.title}</p>
                 </div>
               </div>
               <button onClick={() => setDeclineModalBook(null)} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100">
                 <X className="w-5 h-5" />
               </button>
             </div>

             <div className="space-y-2">
               <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                 Instructions & Feedback for Author
               </label>
               <textarea
                 value={declineReason}
                 onChange={(e) => setDeclineReason(e.target.value)}
                 placeholder="Specify what changes are needed (e.g. update chapter headings, format card text, replace low-res cover image)..."
                 rows={4}
                 className="w-full rounded-2xl border border-slate-200 p-4 text-sm font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
               />
               <p className="text-[11px] text-slate-400 font-medium">
                 This feedback will be emailed to the author and displayed in their dashboard.
               </p>
             </div>

             <div className="flex items-center justify-end gap-3 pt-2">
               <Button
                 variant="outline"
                 onClick={() => setDeclineModalBook(null)}
                 disabled={declineSubmitting}
                 className="rounded-xl font-bold h-11 px-5"
               >
                 Cancel
               </Button>
               <Button
                 onClick={async () => {
                   setDeclineSubmitting(true);
                   await handleBookAction(declineModalBook.id, 'reject', declineReason);
                   setDeclineSubmitting(false);
                   setDeclineModalBook(null);
                 }}
                 disabled={declineSubmitting}
                 className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-rose-100"
               >
                 {declineSubmitting ? 'Sending...' : 'Send Feedback & Decline'}
               </Button>
             </div>
           </motion.div>
         </div>
       )}

       {/* Safety Confirmation Modal */}
       <AdminConfirmModal
         isOpen={confirmModal.isOpen}
         onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
         onConfirm={confirmModal.onConfirm}
         title={confirmModal.title}
         description={confirmModal.description}
         actionName={confirmModal.actionName}
         requiredWord={confirmModal.requiredWord}
         targetId={confirmModal.targetId}
         targetType={confirmModal.targetType}
         details={confirmModal.details}
       />
    </AdminLayout>
  );
};
