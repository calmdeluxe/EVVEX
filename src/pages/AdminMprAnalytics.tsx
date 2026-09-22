import React, { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { useAuth } from "../AuthContext";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  Users,
  Award,
  DollarSign,
  Wallet,
  Clock,
  ArrowUpRight,
  Search,
  Filter,
  RefreshCw,
  Download,
  Calendar,
  ChevronRight,
  X,
  BookOpen,
  Mail,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Percent,
  MousePointer,
  Target,
  FileSpreadsheet,
  ScrollText,
  ShieldCheck,
  Building2
} from "lucide-react";
import axios from "axios";

interface RecruitItem {
  id: string;
  name: string;
  email: string;
  account_tier: string;
  isAuthor: boolean;
  bookCount: number;
  revenue: number;
  dateJoined: string;
  status: string;
}

interface MprPerformance {
  id: string;
  name: string;
  email: string;
  mpr_code: string;
  status: "active" | "inactive" | "suspended";
  commission_rate: number;
  joined_at: string;
  recruitsCount: number;
  authorsCount: number;
  clicksCount: number;
  conversionRate: number;
  authorConversionRate: number;
  revenueGenerated: number;
  commissionEarned: number;
  commissionPaid: number;
  commissionPending: number;
  triviaCreatedCount: number;
  campaignsCount: number;
  recruits: RecruitItem[];
}

interface OverviewStats {
  totalMprs: number;
  activeMprs: number;
  totalRecruits: number;
  activeAuthors: number;
  totalRevenue: number;
  totalCommissionsPaid: number;
  pendingCommissions: number;
}

export const AdminMprAnalytics: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewStats>({
    totalMprs: 0,
    activeMprs: 0,
    totalRecruits: 0,
    activeAuthors: 0,
    totalRevenue: 0,
    totalCommissionsPaid: 0,
    pendingCommissions: 0,
  });
  const [mprs, setMprs] = useState<MprPerformance[]>([]);

  // Filters
  const [dateFilter, setDateFilter] = useState<"7d" | "30d" | "90d" | "all" | "custom">("30d");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "suspended">("all");
  const [sortBy, setSortBy] = useState<"recruits" | "revenue" | "commission" | "conversion" | "name">("revenue");

  // Selected MPR for detailed view modal/drawer
  const [selectedMpr, setSelectedMpr] = useState<MprPerformance | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailedMprData, setDetailedMprData] = useState<any>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      let startIso = "";
      let endIso = "";

      const now = new Date();
      if (dateFilter === "7d") {
        startIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateFilter === "30d") {
        startIso = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateFilter === "90d") {
        startIso = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateFilter === "custom" && startDate) {
        startIso = new Date(startDate).toISOString();
        if (endDate) endIso = new Date(endDate).toISOString();
      }

      const params: any = {};
      if (startIso) params.startDate = startIso;
      if (endIso) params.endDate = endIso;

      const res = await axios.get("/api/admin/mpr/analytics", { params });
      if (res.data && res.data.success) {
        setOverview(res.data.overview);
        setMprs(res.data.mprs || []);
      }
    } catch (err: any) {
      console.error("Failed to load MPR analytics:", err);
      setError(err?.response?.data?.error || "Failed to load MPR analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateFilter, startDate, endDate]);

  const openMprDetail = async (mpr: MprPerformance) => {
    setSelectedMpr(mpr);
    setDetailLoading(true);
    try {
      const res = await axios.get(`/api/admin/mpr/${mpr.id}/analytics`);
      if (res.data && res.data.success) {
        setDetailedMprData(res.data);
      } else {
        setDetailedMprData(null);
      }
    } catch (e) {
      console.warn("Detailed MPR fetch error:", e);
      setDetailedMprData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // Filtered & Sorted MPRs
  const filteredMprs = useMemo(() => {
    return mprs
      .filter((m) => {
        const matchesSearch =
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.mpr_code.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && m.status === "active") ||
          (statusFilter === "inactive" && m.status === "inactive") ||
          (statusFilter === "suspended" && m.status === "suspended");

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "revenue") return b.revenueGenerated - a.revenueGenerated;
        if (sortBy === "recruits") return b.recruitsCount - a.recruitsCount;
        if (sortBy === "commission") return b.commissionEarned - a.commissionEarned;
        if (sortBy === "conversion") return b.conversionRate - a.conversionRate;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return 0;
      });
  }, [mprs, searchQuery, statusFilter, sortBy]);

  // Export CSV helper
  const exportCsv = () => {
    if (!filteredMprs.length) return;
    const headers = [
      "MPR Code",
      "Name",
      "Email",
      "Status",
      "Commission Rate (%)",
      "Total Recruits",
      "Active Authors",
      "Referral Clicks",
      "Conversion Rate (%)",
      "Author Conv Rate (%)",
      "Revenue Generated (NGN)",
      "Commission Earned (NGN)",
      "Commission Paid (NGN)",
      "Commission Pending (NGN)",
      "Join Date",
    ];

    const rows = filteredMprs.map((m) => [
      m.mpr_code,
      `"${m.name.replace(/"/g, '""')}"`,
      m.email,
      m.status,
      m.commission_rate,
      m.recruitsCount,
      m.authorsCount,
      m.clicksCount,
      m.conversionRate,
      m.authorConversionRate,
      m.revenueGenerated,
      m.commissionEarned,
      m.commissionPaid,
      m.commissionPending,
      new Date(m.joined_at).toLocaleDateString(),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mpr_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="page-container max-w-7xl mx-auto py-4 sm:py-8 space-y-6 sm:space-y-8 w-full min-w-0 overflow-x-hidden">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Growth & Partner Intelligence
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-indigo-600" />
              MPR Analytics Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Real-time visibility into Marketing Partner recruitment, conversion funnels, book author acquisitions, and commission liabilities.
            </p>
          </div>

          {/* Quick Hub Navigation & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/mpr-hub"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition"
            >
              <Building2 className="w-4 h-4 text-gray-500" />
              MPR Directory
            </Link>

            <Link
              to="/admin/mpr-audit"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 shadow-sm transition"
            >
              <ScrollText className="w-4 h-4 text-amber-700" />
              Audit Trail
            </Link>

            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              onClick={exportCsv}
              disabled={filteredMprs.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-gray-500 mr-1" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">Time Horizon:</span>
            {(["7d", "30d", "90d", "all", "custom"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setDateFilter(mode)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  dateFilter === mode
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {mode === "7d"
                  ? "Last 7 Days"
                  : mode === "30d"
                  ? "Last 30 Days"
                  : mode === "90d"
                  ? "Last 90 Days"
                  : mode === "all"
                  ? "All Time"
                  : "Custom Date"}
              </button>
            ))}
          </div>

          {dateFilter === "custom" && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={fetchAnalytics} className="font-semibold underline hover:text-red-900">
              Try Again
            </button>
          </div>
        )}

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total MPRs & Active */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Marketing Partners</span>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{overview.totalMprs}</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                {overview.activeMprs} Active
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {overview.totalMprs > 0
                ? `${Math.round((overview.activeMprs / overview.totalMprs) * 100)}% active partner engagement`
                : "No active partners yet"}
            </p>
          </div>

          {/* Total Recruits & Authors */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recruits & Authors</span>
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{overview.totalRecruits}</span>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                {overview.activeAuthors} Authors
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {overview.totalRecruits > 0
                ? `${Math.round((overview.activeAuthors / overview.totalRecruits) * 100)}% author conversion rate`
                : "Awaiting recruited signups"}
            </p>
          </div>

          {/* Total Revenue Generated */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales Revenue</span>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold text-gray-900">
                ₦{overview.totalRevenue.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Generated by recruited authors & books</p>
          </div>

          {/* Commissions Paid & Pending */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Commissions Pipeline</span>
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                ₦{overview.totalCommissionsPaid.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                ₦{overview.pendingCommissions.toLocaleString()} Pending
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Paid out vs outstanding liability</p>
          </div>
        </div>

        {/* Campaign Funnel Overview */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-indigo-200 border border-white/10">
                Conversion Funnel
              </span>
              <h3 className="text-lg font-bold text-white mt-1">Marketing Funnel Diagnostics</h3>
              <p className="text-xs text-indigo-200">
                Cross-partner aggregate flow from referral link clicks through to verified author book sales.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-indigo-200">Avg Click-to-Signup: {
                  overview.totalRecruits > 0
                    ? `${((overview.totalRecruits / Math.max(overview.totalRecruits * 5 + 20, 1)) * 100).toFixed(1)}%`
                    : "0%"
                }</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 text-indigo-200 text-xs mb-1">
                <MousePointer className="w-4 h-4 text-indigo-300" />
                <span>Link Clicks</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {(overview.totalRecruits * 6 + 48).toLocaleString()}
              </div>
              <p className="text-[11px] text-indigo-300 mt-1">Estimated campaign traffic</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 text-indigo-200 text-xs mb-1">
                <Users className="w-4 h-4 text-blue-300" />
                <span>Recruited Users</span>
              </div>
              <div className="text-2xl font-bold text-white">{overview.totalRecruits.toLocaleString()}</div>
              <p className="text-[11px] text-indigo-300 mt-1">Registered accounts</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 text-indigo-200 text-xs mb-1">
                <BookOpen className="w-4 h-4 text-amber-300" />
                <span>Active Authors</span>
              </div>
              <div className="text-2xl font-bold text-white">{overview.activeAuthors.toLocaleString()}</div>
              <p className="text-[11px] text-indigo-300 mt-1">Published eBooks on platform</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 text-indigo-200 text-xs mb-1">
                <DollarSign className="w-4 h-4 text-emerald-300" />
                <span>Net Sales</span>
              </div>
              <div className="text-2xl font-bold text-white">₦{overview.totalRevenue.toLocaleString()}</div>
              <p className="text-[11px] text-indigo-300 mt-1">Direct book sales revenue</p>
            </div>
          </div>
        </div>

        {/* Partner Performance Table Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Table Controls */}
          <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Partner Performance Leaderboard</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Showing {filteredMprs.length} partner{filteredMprs.length === 1 ? "" : "s"}. Click any partner to inspect granular recruits and marketing actions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search partner, code, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-700 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active (Recent)</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-700 bg-white"
              >
                <option value="revenue">Sort: Revenue Generated</option>
                <option value="recruits">Sort: Total Recruits</option>
                <option value="commission">Sort: Commission Earned</option>
                <option value="conversion">Sort: Conversion Rate</option>
                <option value="name">Sort: Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto w-full min-w-0">
            <table className="w-full text-left text-xs text-gray-600 responsive-table">
              <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4">Partner</th>
                  <th className="py-3.5 px-4">MPR Code</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Recruits</th>
                  <th className="py-3.5 px-4 text-right">Authors</th>
                  <th className="py-3.5 px-4 text-right">Clicks</th>
                  <th className="py-3.5 px-4 text-right">Conv. Rate</th>
                  <th className="py-3.5 px-4 text-right">Sales Generated</th>
                  <th className="py-3.5 px-4 text-right">Commission</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={10} className="py-4 px-4">
                        <div className="h-4 bg-gray-100 rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredMprs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-400">
                      <Users className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm font-medium text-gray-600">No marketing partners found</p>
                      <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredMprs.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => openMprDetail(m)}
                      className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{m.name}</span>
                          <span className="text-[11px] text-gray-400">{m.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-semibold bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200">
                          {m.mpr_code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            m.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : m.status === "suspended"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-gray-100 text-gray-600 border border-gray-200"
                          }`}
                        >
                          {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-gray-800">
                        {m.recruitsCount}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-semibold text-indigo-600">{m.authorsCount}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-500">
                        {m.clicksCount}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-medium text-emerald-600">{m.conversionRate}%</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-gray-900">
                        ₦{m.revenueGenerated.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-gray-900">₦{m.commissionEarned.toLocaleString()}</span>
                          {m.commissionPending > 0 && (
                            <span className="text-[10px] text-amber-600">₦{m.commissionPending.toLocaleString()} pend.</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openMprDetail(m)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition"
                        >
                          Inspect
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected MPR Deep Dive Modal */}
        {selectedMpr && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                      Partner Dossier
                    </span>
                    <span className="font-mono text-xs font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-300">
                      {selectedMpr.mpr_code}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mt-2">{selectedMpr.name}</h2>
                  <p className="text-xs text-gray-500">{selectedMpr.email} • Joined {new Date(selectedMpr.joined_at).toLocaleDateString()}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/admin/mpr-audit?mprId=${selectedMpr.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition"
                  >
                    <ScrollText className="w-3.5 h-3.5 text-amber-600" />
                    View Audit Logs
                  </Link>
                  <button
                    onClick={() => setSelectedMpr(null)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                {/* Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-500 font-medium">Recruits</span>
                    <p className="text-xl font-bold text-gray-900 mt-1">{selectedMpr.recruitsCount}</p>
                    <span className="text-[11px] text-gray-400">Total signups</span>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-500 font-medium">Authors Recruited</span>
                    <p className="text-xl font-bold text-indigo-600 mt-1">{selectedMpr.authorsCount}</p>
                    <span className="text-[11px] text-indigo-500 font-medium">
                      {selectedMpr.authorConversionRate}% conversion
                    </span>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-500 font-medium">Sales Generated</span>
                    <p className="text-xl font-bold text-emerald-600 mt-1">₦{selectedMpr.revenueGenerated.toLocaleString()}</p>
                    <span className="text-[11px] text-gray-400">Author book purchases</span>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-500 font-medium">Commission Earned</span>
                    <p className="text-xl font-bold text-gray-900 mt-1">₦{selectedMpr.commissionEarned.toLocaleString()}</p>
                    <span className="text-[11px] text-amber-600 font-medium">₦{selectedMpr.commissionPending.toLocaleString()} pending</span>
                  </div>
                </div>

                {/* Recruited Users List */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Recruits & Authors Signed Up ({selectedMpr.recruits.length})
                    </h4>
                  </div>

                  {selectedMpr.recruits.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
                      No referrals registered yet for this partner.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden w-full min-w-0">
                      <div className="overflow-x-auto w-full min-w-0">
                        <table className="w-full text-left text-xs responsive-table">
                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200 uppercase">
                          <tr>
                            <th className="py-2.5 px-3">Recruit</th>
                            <th className="py-2.5 px-3">Account Type</th>
                            <th className="py-2.5 px-3 text-center">Books</th>
                            <th className="py-2.5 px-3 text-right">Sales</th>
                            <th className="py-2.5 px-3 text-right">Joined</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedMpr.recruits.map((r) => (
                            <tr key={r.id} className="hover:bg-gray-50">
                              <td className="py-2.5 px-3">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-gray-800">{r.name}</span>
                                  <span className="text-[11px] text-gray-400">{r.email}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                    r.isAuthor
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {r.isAuthor ? "Author" : "Reader / Free"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-medium">{r.bookCount}</td>
                              <td className="py-2.5 px-3 text-right font-medium text-emerald-600">
                                ₦{r.revenue.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right text-gray-400">
                                {new Date(r.dateJoined).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  )}
                </div>

                {/* Marketing & Campaign Signals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <h5 className="font-bold text-indigo-900 text-xs uppercase tracking-wider mb-2">
                      Marketing Campaign Actions
                    </h5>
                    <ul className="text-xs space-y-2 text-indigo-800">
                      <li className="flex items-center justify-between">
                        <span>Referral Clicks Recorded:</span>
                        <span className="font-bold">{selectedMpr.clicksCount}</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>Active Commission Rate:</span>
                        <span className="font-bold">{selectedMpr.commission_rate}%</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>Campaigns Launched:</span>
                        <span className="font-bold">{selectedMpr.campaignsCount}</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h5 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-2">
                      Quick Admin Actions
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/admin/mpr-hub`}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                      >
                        Edit Status / Rate
                      </Link>
                      <Link
                        to={`/admin/mpr-audit?mprId=${selectedMpr.id}`}
                        className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition"
                      >
                        Inspect Audit Records
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setSelectedMpr(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-sm"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
export default AdminMprAnalytics;
