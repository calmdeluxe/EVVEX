// LEGACY: CalmReader file, not part of EVEX product.
import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  DollarSign, 
  ChevronLeft, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles,
  BarChart3,
  UserCheck
} from 'lucide-react';

export const AdminAnalytics: React.FC = () => {
  const { isAdmin, isAuthReady, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    authorsCount: 0,
    marketingPartnersCount: 0,
    totalBooks: 0,
    publishedBooks: 0,
    totalRevenue: 0,
    activeReaders: 0,
  });

  const isMarketingPartner = profile?.account_tier === 'marketing_partner' || profile?.role === 'marketing_partner';

  useEffect(() => {
    if (isAuthReady) {
      if (!isAdmin && !isMarketingPartner) {
        navigate('/dashboard');
      } else {
        fetchAnalytics();
      }
    }
  }, [isAuthReady, isAdmin, isMarketingPartner, navigate]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users stats
      let totalUsersCount = 0;
      let premiumCount = 0;
      let authors = 0;
      let partners = 0;

      const { data: usersData } = await supabase
        .from('user_profiles_public')
        .select('account_tier, is_premium, is_approved_author, role');

      const sourceUsers = usersData || [];
      totalUsersCount = sourceUsers.length;
      
      sourceUsers.forEach((u: any) => {
        if (u.account_tier === 'premium' || u.is_premium) premiumCount++;
        if (u.account_tier === 'author' || u.is_approved_author) authors++;
        if (u.account_tier === 'marketing_partner' || u.role === 'marketing_partner') partners++;
      });

      // If user_profiles_public yielded 0, fallback query to users
      if (totalUsersCount === 0) {
        const { data: fallbackUsers } = await supabase
          .from('users')
          .select('account_tier, is_premium, is_approved_author, role');
        
        if (fallbackUsers) {
          totalUsersCount = fallbackUsers.length;
          fallbackUsers.forEach((u: any) => {
            if (u.account_tier === 'premium' || u.is_premium) premiumCount++;
            if (u.account_tier === 'author' || u.is_approved_author) authors++;
            if (u.account_tier === 'marketing_partner' || u.role === 'marketing_partner') partners++;
          });
        }
      }

      // 2. Fetch Books stats
      const { data: booksData } = await supabase
        .from('books')
        .select('id, is_published, status')
        .neq('status', -1);

      const totalBooksCount = (booksData || []).length;
      const publishedCount = (booksData || []).filter((b: any) => b.is_published === 1 || b.is_published === true || b.status === 1).length;

      // 3. Fetch Revenue
      let totalRev = 0;
      const { data: verifications } = await supabase
        .from('payment_verifications')
        .select('amount, status')
        .or('status.eq.approved,status.eq.1,status.eq.APPROVED');

      if (verifications) {
        totalRev = verifications.reduce((sum: number, v: any) => sum + (parseFloat(v.amount) || 0), 0);
      }

      // 4. Fetch Active Readers (unique buyers/readers)
      const { data: purchases } = await supabase
        .from('purchases')
        .select('user_id');

      const activeReadersCount = new Set((purchases || []).map((p: any) => p.user_id)).size;

      setAnalytics({
        totalUsers: totalUsersCount,
        premiumUsers: premiumCount,
        authorsCount: authors,
        marketingPartnersCount: partners,
        totalBooks: totalBooksCount,
        publishedBooks: publishedCount,
        totalRevenue: totalRev,
        activeReaders: activeReadersCount,
      });
    } catch (err) {
      console.error("[AdminAnalytics] Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthReady || (!isAdmin && !isMarketingPartner)) return null;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => navigate('/admin')}
              variant="ghost" 
              className="rounded-xl h-10 px-3 flex items-center gap-2 text-slate-500 hover:text-green-700 transition-all font-black"
            >
              <ChevronLeft className="w-5 h-5" /> Back to Admin
            </Button>
          </div>
          <Button 
            onClick={fetchAnalytics}
            variant="outline"
            className="rounded-2xl h-11 px-4 font-bold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            Analytics Overview
            {isMarketingPartner && (
              <span className="text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-full uppercase tracking-wider">
                Marketing Partner (Read-Only)
              </span>
            )}
          </h1>
          <p className="text-gray-500 font-medium mt-1">Real-time application metrics and growth analytics.</p>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-green-700" />
            <p className="font-bold text-xs uppercase tracking-widest">Gathering Analytics...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="rounded-[28px] border-none shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
                <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Total Users</CardTitle>
                  <div className="p-3 bg-white/10 rounded-2xl">
                    <Users className="w-6 h-6 text-emerald-400" />
                  </div>
                </CardHeader>
                <CardContent className="p-0 pt-4">
                  <div className="text-3xl font-black">{analytics.totalUsers.toLocaleString()}</div>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Registered accounts</p>
                </CardContent>
              </Card>

              <Card className="rounded-[28px] border-none shadow-sm bg-emerald-50 border border-emerald-100 p-6">
                <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-800">Premium Users</CardTitle>
                  <div className="p-3 bg-emerald-100 rounded-2xl">
                    <Sparkles className="w-6 h-6 text-emerald-700" />
                  </div>
                </CardHeader>
                <CardContent className="p-0 pt-4">
                  <div className="text-3xl font-black text-emerald-900">{analytics.premiumUsers.toLocaleString()}</div>
                  <p className="text-xs text-emerald-700 font-semibold mt-1">Active subscriptions</p>
                </CardContent>
              </Card>

              <Card className="rounded-[28px] border-none shadow-sm bg-blue-50 border border-blue-100 p-6">
                <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-blue-800">Total eBooks</CardTitle>
                  <div className="p-3 bg-blue-100 rounded-2xl">
                    <BookOpen className="w-6 h-6 text-blue-700" />
                  </div>
                </CardHeader>
                <CardContent className="p-0 pt-4">
                  <div className="text-3xl font-black text-blue-900">{analytics.totalBooks.toLocaleString()}</div>
                  <p className="text-xs text-blue-700 font-semibold mt-1">{analytics.publishedBooks} Published</p>
                </CardContent>
              </Card>

              <Card className="rounded-[28px] border-none shadow-sm bg-purple-50 border border-purple-100 p-6">
                <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-purple-800">Total Revenue</CardTitle>
                  <div className="p-3 bg-purple-100 rounded-2xl">
                    <DollarSign className="w-6 h-6 text-purple-700" />
                  </div>
                </CardHeader>
                <CardContent className="p-0 pt-4">
                  <div className="text-3xl font-black text-purple-900">₦{analytics.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-purple-700 font-semibold mt-1">Approved verifications</p>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="rounded-[28px] border-slate-100 p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-amber-50 rounded-2xl text-amber-700">
                    <UserCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Authors Count</p>
                    <p className="text-2xl font-black text-slate-900">{analytics.authorsCount}</p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[28px] border-slate-100 p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-700">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Active Readers</p>
                    <p className="text-2xl font-black text-slate-900">{analytics.activeReaders}</p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[28px] border-slate-100 p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-pink-50 rounded-2xl text-pink-700">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Marketing Partners</p>
                    <p className="text-2xl font-black text-slate-900">{analytics.marketingPartnersCount}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
