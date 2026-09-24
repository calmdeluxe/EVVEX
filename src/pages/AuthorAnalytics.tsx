// LEGACY: CalmReader file, not part of EVEX product.
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  BookOpen, 
  Eye, 
  Award, 
  BarChart3, 
  RefreshCw, 
  Percent, 
  ArrowUpRight,
  ShieldAlert,
  Calendar,
  Layers,
  Sparkles,
  Users,
  Share2,
  Bookmark,
  CheckCircle2,
  Lock,
  Zap
} from 'lucide-react';
import axios from 'axios';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../AuthContext';
import { Link } from 'react-router-dom';
import { AuthorAnalyticsWidget } from '../components/analytics/AuthorAnalyticsWidget';
import { supabase } from '../supabase';

export const AuthorAnalytics: React.FC = () => {
  const { user, profile, accountTier } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<'author' | 'affiliate' | 'reader'>('author');

  const isAuthor = accountTier === 'author' || accountTier === 'admin' || !!profile?.is_approved_author || !!profile?.is_author;
  const isAffiliate = accountTier === 'marketing_partner' || accountTier === 'mpr' || accountTier === 'premium' || accountTier === 'admin';
  const isMpr = 
    accountTier === 'marketing_partner' || 
    accountTier === 'mpr' || 
    (user as any)?.account_tier === 'mpr' ||
    (user as any)?.role === 'marketing_partner' ||
    profile?.account_tier === 'marketing_partner' || 
    profile?.account_tier === 'mpr' || 
    profile?.role === 'marketing_partner' || 
    accountTier === 'admin';

  useEffect(() => {
    if (isAuthor) {
      setActiveView('author');
    } else if (isAffiliate) {
      setActiveView('affiliate');
    } else {
      setActiveView('reader');
    }
  }, [accountTier, profile]);

  const fetchAnalytics = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setIsRefreshing(true);
      else setLoading(true);
      setError(null);

      // Check client-side 3-minute cache first if not force refreshed
      if (!forceRefresh) {
        const cachedRaw = sessionStorage.getItem('calmreader_user_analytics');
        if (cachedRaw) {
          try {
            const parsed = JSON.parse(cachedRaw);
            const isFresh = Date.now() - parsed.timestamp < 3 * 60 * 1000;
            if (isFresh && parsed.data) {
              setAnalytics(parsed.data);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn('Cache parse error:', e);
          }
        }
      }

      // Fetch with Supabase Auth session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.get('/api/author/analytics', { headers });
      if (res.data && res.data.success) {
        setAnalytics(res.data);
        sessionStorage.setItem('calmreader_user_analytics', JSON.stringify({
          timestamp: Date.now(),
          data: res.data
        }));
      } else {
        throw new Error(res.data?.error || 'Failed to load analytics');
      }
    } catch (err: any) {
      console.warn('[AuthorAnalytics] API fetch fallback to direct Supabase query:', err);
      try {
        if (!user?.id) throw new Error("No user logged in");
        
        // 1. Fetch user books
        const { data: userBooks } = await supabase
          .from('books')
          .select('id, title, price, cover_image, created_at, is_published, views')
          .eq('user_id', user.id);

        const books = userBooks || [];
        const bookIds = books.map(b => b.id);

        // 2. Fetch transactions for these books
        let transactions: any[] = [];
        if (bookIds.length > 0) {
          const { data: txs } = await supabase
            .from('transactions')
            .select('*')
            .in('book_id', bookIds)
            .eq('status', 'successful');
          if (txs) transactions = txs;
        }

        // 3. Fetch referrals count
        let refCount = 0;
        try {
          const { data: refs } = await supabase
            .from('users')
            .select('id')
            .eq('referred_by', user.id);
          refCount = refs ? refs.length : 0;
        } catch {
          // ignore
        }

        const totalSales = transactions.length;
        const totalEarnings = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const totalViews = books.reduce((acc, b) => acc + (Number(b.views) || 0), 0);

        const fallbackData = {
          success: true,
          role: accountTier,
          isAuthor,
          isAffiliate,
          totalSales,
          totalEarnings,
          thisMonthSales: totalSales,
          thisMonthEarnings: totalEarnings,
          totalViews,
          conversionRate: totalViews > 0 ? ((totalSales / totalViews) * 100).toFixed(1) : "0.0",
          bestSellingBook: books[0] ? { title: books[0].title, sales: totalSales, earnings: totalEarnings } : null,
          topBooks: books.map(b => ({ ...b, salesCount: 0, earningsTotal: 0, conversionRate: "0.0" })),
          salesTrend: [],
          monthlyEarnings: [],
          viewsTrend: books.map(b => ({ title: b.title || 'eBook', views: b.views || 0 })),
          books: books.map(b => ({ ...b, salesCount: 0, earningsTotal: 0, conversionRate: "0.0" })),
          referralsCount: refCount,
          bookshelfCount: 0,
          affiliateEarnings: refCount * 2000
        };

        setAnalytics(fallbackData);
      } catch (fbErr: any) {
        setError(err.response?.data?.error || err.message || 'Could not load analytics data.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <p className="text-gray-500 font-medium text-sm">Loading your performance analytics...</p>
        </div>
      </DashboardLayout>
    );
  }

  const roleTitle = isAuthor 
    ? "Author Intelligence & Sales" 
    : isAffiliate 
    ? "Partner & Affiliate Analytics" 
    : "Reader Activity & Stats";

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-12 px-2 sm:px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300">
                {roleTitle}
              </Badge>
              {analytics?.cached && (
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded">
                  Cached (3m)
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              Performance & Growth Analytics
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Real-time metrics, engagement data, royalties, and referral statistics personalized for your account.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAnalytics(true)}
              disabled={isRefreshing}
              className="gap-2 border-gray-200 dark:border-white/10"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Updating...' : 'Refresh'}
            </Button>
            {isAuthor ? (
              <Link to="/my-books">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  <BookOpen className="w-4 h-4" /> Manage Books
                </Button>
              </Link>
            ) : (
              <Link to="/apply/author">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  <Zap className="w-4 h-4" /> Upgrade to Author
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* View Switcher Tabs (For Multi-role users) */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveView('author')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'author'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Author & Sales Metrics
          </button>
          <button
            onClick={() => setActiveView('affiliate')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'affiliate'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <Share2 className="w-4 h-4" /> Referrals & Affiliates
          </button>
          <button
            onClick={() => setActiveView('reader')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'reader'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <Bookmark className="w-4 h-4" /> Reader Activity
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl p-4 flex items-center justify-between gap-3 text-red-700 dark:text-red-300 text-sm">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 text-red-600" />
              <p>{error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => fetchAnalytics(true)} className="shrink-0 border-red-300 text-red-700 hover:bg-red-100 dark:hover:bg-red-900/40">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* ================= VIEW 1: AUTHOR METRICS ================= */}
        {activeView === 'author' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Top 4 KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Sales */}
              <Card className="border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#0d0d15]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Sales</span>
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(analytics?.totalSales || 0).toLocaleString()} <span className="text-xs text-gray-400 font-normal">copies</span>
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      This month: <span className="font-semibold text-emerald-600">{(analytics?.thisMonthSales || 0).toLocaleString()} sales</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Total Earnings */}
              <Card className="border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#0d0d15]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Royalties</span>
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-600 dark:text-amber-400">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      ₦{(analytics?.totalEarnings || 0).toLocaleString()}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      This month: <span className="font-semibold text-amber-600">₦{(analytics?.thisMonthEarnings || 0).toLocaleString()}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Aggregate Views */}
              <Card className="border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#0d0d15]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Book Views</span>
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600 dark:text-blue-400">
                      <Eye className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(analytics?.totalViews || 0).toLocaleString()} <span className="text-xs text-gray-400 font-normal">views</span>
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Unique readers inspecting covers & previews
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Conversion Rate */}
              <Card className="border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#0d0d15]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Conversion Rate</span>
                    <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded-lg text-purple-600 dark:text-purple-400">
                      <Percent className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {analytics?.conversionRate || '0.0'}%
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Ratio of reader views converted into paid sales
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* If author has no published books yet */}
            {(!analytics?.books || analytics.books.length === 0) && (
              <Card className="border-dashed border-2 border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-6 text-center rounded-2xl">
                <div className="max-w-md mx-auto space-y-3">
                  <BookOpen className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Publish Your First eBook</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Once you create and publish eBooks on CalmReader, reader views, purchases, and royalties will populate your analytics in real time.
                  </p>
                  <Link to="/create-book?type=ebook" className="inline-block">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2">
                      <Sparkles className="w-4 h-4" /> Go to eBook Studio
                    </Button>
                  </Link>
                </div>
              </Card>
            )}

            {/* Best Seller Banner */}
            {analytics?.bestSellingBook && (
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Award className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Top Performing Title</span>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                      "{analytics.bestSellingBook.title}"
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Generated <span className="font-bold text-gray-900 dark:text-white">{analytics.bestSellingBook.sales} sales</span> and <span className="font-bold text-emerald-600">₦{analytics.bestSellingBook.earnings.toLocaleString()}</span> in royalties.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Visual Recharts Section */}
            {analytics && <AuthorAnalyticsWidget analytics={analytics} />}

            {/* Detailed per-eBook Table */}
            <Card className="border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#0d0d15]">
              <CardHeader>
                <CardTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Per-Book Performance Breakdown
                </CardTitle>
                <CardDescription className="text-xs">Granular analysis across your entire eBook catalog</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-semibold">
                      <th className="p-3.5 pl-6">Book Title</th>
                      <th className="p-3.5">Price</th>
                      <th className="p-3.5">Views</th>
                      <th className="p-3.5">Sales</th>
                      <th className="p-3.5">Conversion</th>
                      <th className="p-3.5 pr-6">Total Earnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {analytics?.books && analytics.books.length > 0 ? (
                      analytics.books.map((b: any) => (
                        <tr key={b.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                          <td className="p-3.5 pl-6 font-semibold text-gray-900 dark:text-white flex items-center gap-2.5">
                            {b.cover_image && (
                              <img src={b.cover_image} alt="" className="w-6 h-8 object-cover rounded shadow-xs" />
                            )}
                            <span>{b.title}</span>
                          </td>
                          <td className="p-3.5 text-gray-600 dark:text-gray-300">
                            {b.price ? `₦${b.price.toLocaleString()}` : 'Free'}
                          </td>
                          <td className="p-3.5 text-gray-600 dark:text-gray-300 font-mono">
                            {(b.views || 0).toLocaleString()}
                          </td>
                          <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {b.salesCount || 0}
                          </td>
                          <td className="p-3.5 text-gray-600 dark:text-gray-300 font-mono">
                            {b.conversionRate}%
                          </td>
                          <td className="p-3.5 pr-6 font-bold text-gray-900 dark:text-white font-mono">
                            ₦{(b.earningsTotal || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400">
                          No published books found for this account.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ================= VIEW 2: AFFILIATE & REFERRAL METRICS ================= */}
        {activeView === 'affiliate' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#0d0d15]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Total Referrals</span>
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(analytics?.referralsCount || 0).toLocaleString()}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Users registered via your invite</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#0d0d15]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Estimated Commission</span>
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold text-emerald-600">
                      ₦{(analytics?.affiliateEarnings || 0).toLocaleString()}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Earned through affiliate bonuses</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#0d0d15]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Your Referral Code</span>
                    <Share2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="mt-4">
                    <div className="font-mono font-bold text-lg bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-lg inline-block text-gray-900 dark:text-white">
                      {analytics?.userProfile?.referralCode || profile?.referral_code || user?.id?.slice(0, 8) || 'CALM'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Share with friends to earn ₦2,000 per referral</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* MPR / Partner Call to action */}
            {isMpr && (
              <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold">Looking for Advanced Marketing Partner Features?</h3>
                  <p className="text-xs text-purple-200 mt-1">
                    Access recruitment pipelines, custom QR codes, marketing templates, and instant withdrawal in the Partner Center.
                  </p>
                </div>
                <Link to="/mpr">
                  <Button className="bg-white text-purple-900 hover:bg-purple-50 font-bold text-xs gap-2 shrink-0">
                    Open MPR Partner Center <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ================= VIEW 3: READER ACTIVITY ================= */}
        {activeView === 'reader' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#0d0d15]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Books on Shelf</span>
                    <Bookmark className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {analytics?.bookshelfCount || 0}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">eBooks saved to your personal library</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#0d0d15]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Account Status</span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="mt-4">
                    <h3 className="text-xl font-bold capitalize text-emerald-600">
                      {accountTier || 'Free Reader'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Full access to reading and community trivia</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#0d0d15]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Explore Catalog</span>
                    <BookOpen className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="mt-4">
                    <Link to="/ebooks">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1">
                        Browse New Releases <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <p className="text-xs text-gray-500 mt-2">Discover inspiring titles and authors</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AuthorAnalytics;
