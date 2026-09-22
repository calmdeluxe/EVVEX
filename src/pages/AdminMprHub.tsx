import React, { useState, useEffect } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { supabase } from "../supabase";
import {
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Ban,
  ShieldCheck,
  Edit,
  Mail,
  Send,
  Download,
  Plus,
  ArrowUpRight,
  ChevronRight,
  BookOpen,
  UserCheck,
  Building2,
  CreditCard,
  Percent,
  X,
  Check,
  BarChart3,
  ScrollText
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "../lib/utils";
import axios from "axios";

interface MPRPartner {
  id: string;
  name: string;
  email: string;
  mpr_code: string;
  status: "active" | "suspended" | string;
  commission_rate: number;
  total_recruits: number;
  total_authors: number;
  total_earnings: number;
  total_paid: number;
  pending_earnings: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  created_at: string;
}

export const AdminMprHub: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [mprs, setMprs] = useState<MPRPartner[]>([]);
  const [overview, setOverview] = useState({
    totalMprs: 0,
    activeMprs: 0,
    suspendedMprs: 0,
    totalRecruits: 0,
    totalAuthors: 0,
    totalCommissions: 0,
    totalPaidOut: 0,
    pendingCommissions: 0,
  });

  // Table Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [sortBy, setSortBy] = useState<"recruits" | "earnings" | "recent">("recent");

  // Detail View State
  const [selectedMprId, setSelectedMprId] = useState<string | null>(null);
  const [mprDetail, setMprDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<"profile" | "recruits" | "transactions" | "actions">("profile");

  // Action Modals State
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Rate Change Modal
  const [showRateModal, setShowRateModal] = useState(false);
  const [newRate, setNewRate] = useState<number>(10);

  // Balance Adjustment Modal
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  // Notification Modal
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifSubject, setNotifSubject] = useState("");
  const [notifMessage, setNotifMessage] = useState("");

  // Assign New MPR Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignUserSearch, setAssignUserSearch] = useState("");
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchHubData = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeader();
      const res = await axios.get("/api/admin/mpr/hub", { headers });
      if (res.data && res.data.success) {
        setMprs(res.data.mprs || []);
        setOverview(res.data.overview || {});
      }
    } catch (err: any) {
      console.warn("[Admin MPR Hub] API load warning, using database fallback:", err);
      // Direct Supabase Fallback
      fetchHubFallback();
    } finally {
      setLoading(false);
    }
  };

  const fetchHubFallback = async () => {
    try {
      const { data: rawUsers } = await supabase
        .from("users")
        .select("id, email, full_name, username, account_tier, role, mpr_code, mpr_commission_rate, total_mpr_earnings, pending_mpr_earnings, bank_name, account_number, account_name, created_at, is_suspended, status")
        .or("account_tier.eq.marketing_partner,account_tier.eq.mpr,role.eq.marketing_partner,mpr_code.not.is.null")
        .order("created_at", { ascending: false });

      const list: MPRPartner[] = (rawUsers || []).map((u: any) => ({
        id: u.id,
        name: u.full_name || u.username || u.email?.split("@")[0] || "MPR Partner",
        email: u.email,
        mpr_code: u.mpr_code || `MPR-${u.id.substring(0, 6).toUpperCase()}`,
        status: u.is_suspended || u.status === "suspended" ? "suspended" : (u.status || "active"),
        commission_rate: u.mpr_commission_rate || 10,
        total_recruits: 0,
        total_authors: 0,
        total_earnings: u.total_mpr_earnings || 0,
        total_paid: 0,
        pending_earnings: u.pending_mpr_earnings || 0,
        bank_name: u.bank_name || "",
        account_number: u.account_number || "",
        account_name: u.account_name || "",
        created_at: u.created_at,
      }));

      setMprs(list);
      setOverview({
        totalMprs: list.length,
        activeMprs: list.filter(m => m.status === "active").length,
        suspendedMprs: list.filter(m => m.status === "suspended").length,
        totalRecruits: 0,
        totalAuthors: 0,
        totalCommissions: list.reduce((s, m) => s + m.total_earnings, 0),
        totalPaidOut: 0,
        pendingCommissions: list.reduce((s, m) => s + m.pending_earnings, 0),
      });
    } catch (e) {
      console.error("[Admin MPR Fallback] Error:", e);
    }
  };

  useEffect(() => {
    fetchHubData();
  }, []);

  const openMprDetail = async (mprId: string) => {
    setSelectedMprId(mprId);
    setLoadingDetail(true);
    setDetailTab("profile");
    setActionFeedback(null);
    try {
      const headers = await getAuthHeader();
      const res = await axios.get(`/api/admin/mpr/${mprId}`, { headers });
      if (res.data && res.data.success) {
        setMprDetail(res.data);
        setNewRate(res.data.mpr.mpr_commission_rate || 10);
      }
    } catch (err: any) {
      console.error("[Admin MPR Detail] Error loading details:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleExecuteAction = async (action: string, payload: any) => {
    if (!selectedMprId) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const headers = await getAuthHeader();
      const res = await axios.post(`/api/admin/mpr/${selectedMprId}/action`, { action, payload }, { headers });
      if (res.data?.success) {
        setActionFeedback({ type: "success", message: res.data.message || "Action executed successfully." });
        // Refresh details & hub data
        openMprDetail(selectedMprId);
        fetchHubData();
        setShowRateModal(false);
        setShowBalanceModal(false);
        setShowNotifModal(false);
      }
    } catch (err: any) {
      setActionFeedback({ type: "error", message: err.response?.data?.error || "Action failed to execute." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearchUsers = async (query: string) => {
    setAssignUserSearch(query);
    if (!query.trim() || query.length < 2) {
      setFoundUsers([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const { data: users } = await supabase
        .from("users")
        .select("id, email, full_name, username, account_tier, mpr_code")
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(10);
      setFoundUsers(users || []);
    } catch (e) {
      console.error("Error searching users:", e);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleAssignMpr = async (userId: string) => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeader();
      const res = await axios.post(`/api/admin/mpr/${userId}/action`, { action: "assign_mpr", payload: {} }, { headers });
      if (res.data?.success) {
        setShowAssignModal(false);
        setAssignUserSearch("");
        setFoundUsers([]);
        fetchHubData();
        openMprDetail(userId);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to assign MPR role");
    } finally {
      setActionLoading(false);
    }
  };

  const exportMprCsv = () => {
    if (mprs.length === 0) return;
    const headers = ["MPR Code", "Name", "Email", "Status", "Commission Rate (%)", "Total Recruits", "Authors", "Total Earnings (NGN)", "Pending (NGN)", "Bank Name", "Account Number", "Account Name", "Joined Date"];
    const rows = mprs.map(m => [
      `"${m.mpr_code}"`,
      `"${m.name}"`,
      `"${m.email}"`,
      `"${m.status}"`,
      m.commission_rate,
      m.total_recruits,
      m.total_authors,
      m.total_earnings,
      m.pending_earnings,
      `"${m.bank_name || ''}"`,
      `"${m.account_number || ''}"`,
      `"${m.account_name || ''}"`,
      `"${new Date(m.created_at).toLocaleDateString()}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `calmreader_mpr_partners_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and sort MPR list
  const filteredMprs = mprs
    .filter(m => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.mpr_code.toLowerCase().includes(searchQuery.toLowerCase());
      if (statusFilter === "active") return matchesSearch && m.status === "active";
      if (statusFilter === "suspended") return matchesSearch && m.status === "suspended";
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "recruits") return b.total_recruits - a.total_recruits;
      if (sortBy === "earnings") return b.total_earnings - a.total_earnings;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <AdminLayout>
      <div className="page-container space-y-6 pb-16 w-full max-w-full overflow-x-hidden">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-bold px-2.5 py-0.5 uppercase tracking-wider text-xs">
                Partner Ecosystem
              </Badge>
              <span className="text-xs text-gray-500 font-mono">Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1 tracking-tight">
              MPR Account Hub
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Monitor, regulate, and empower Marketing Partners (MPRs) across CalmReader.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              to="/admin/mpr-analytics"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition shadow-xs h-9"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>MPR Analytics</span>
            </Link>

            <Link
              to="/admin/mpr-audit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition shadow-xs h-9"
            >
              <ScrollText className="w-3.5 h-3.5 text-amber-700" />
              <span>Audit Trail</span>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchHubData}
              disabled={loading}
              className="font-bold text-xs h-9 gap-1.5 cursor-pointer"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              <span>Sync</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportMprCsv}
              className="font-bold text-xs h-9 gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setShowAssignModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Assign New MPR</span>
            </Button>
          </div>
        </div>

        {/* Overview Stats Cards (4x1 Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total MPRs */}
          <Card className="rounded-2xl border-gray-200 shadow-xs bg-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total MPR Partners</span>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                  {overview.totalMprs}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs font-semibold">
                  <span className="text-emerald-600 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {overview.activeMprs} Active
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-amber-600 flex items-center gap-0.5">
                    <Ban className="w-3.5 h-3.5" /> {overview.suspendedMprs} Suspended
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Total Recruits */}
          <Card className="rounded-2xl border-gray-200 shadow-xs bg-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Recruits</span>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                  {overview.totalRecruits}
                </h3>
                <p className="text-xs font-semibold text-blue-600 mt-1 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> {overview.totalAuthors} Active Authors Recruited
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Total Commissions Paid */}
          <Card className="rounded-2xl border-gray-200 shadow-xs bg-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Paid Out</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-3xl font-black text-gray-900 tracking-tight truncate">
                  ₦{(overview.totalPaidOut || 0).toLocaleString()}
                </h3>
                <p className="text-xs font-semibold text-gray-500 mt-1">
                  Lifetime Generated: ₦{(overview.totalCommissions || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Pending Payouts */}
          <Card className="rounded-2xl border-gray-200 shadow-xs bg-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Pending Commissions</span>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-3xl font-black text-amber-700 tracking-tight truncate">
                  ₦{(overview.pendingCommissions || 0).toLocaleString()}
                </h3>
                <p className="text-xs font-semibold text-amber-600 mt-1">
                  Available in Partner Balances
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Layout: Table and Detail Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left / Main: MPR List Table */}
          <div className={cn("transition-all duration-300", selectedMprId ? "lg:col-span-7" : "lg:col-span-12")}>
            <Card className="rounded-2xl border-gray-200 shadow-xs bg-white overflow-hidden">
              <CardHeader className="p-5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-gray-900">Marketing Partners Directory</CardTitle>
                    <CardDescription className="text-xs text-gray-500">
                      Showing {filteredMprs.length} registered partners
                    </CardDescription>
                  </div>

                  {/* Filter Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative w-48 sm:w-56">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search MPR code, name..."
                        className="pl-8 h-8 text-xs bg-white rounded-lg"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      aria-label="Filter partners by status"
                      className="h-8 text-xs rounded-lg border border-gray-200 bg-white px-2 font-medium text-gray-700 outline-none"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      aria-label="Sort partners list"
                      className="h-8 text-xs rounded-lg border border-gray-200 bg-white px-2 font-medium text-gray-700 outline-none"
                    >
                      <option value="recent">Recently Joined</option>
                      <option value="recruits">Most Recruits</option>
                      <option value="earnings">Highest Earnings</option>
                    </select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {loading ? (
                  <div className="py-16 text-center">
                    <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-500">Loading MPR Partners Directory...</p>
                  </div>
                ) : filteredMprs.length === 0 ? (
                  <div className="py-16 text-center text-gray-400 space-y-2">
                    <Users className="w-10 h-10 mx-auto text-gray-300" />
                    <p className="text-sm font-semibold">No Marketing Partners match your query.</p>
                    <Button size="sm" variant="outline" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
                      Reset Filters
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full min-w-0">
                    <table className="w-full text-left text-xs responsive-table">
                      <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3">MPR Partner</th>
                          <th className="px-3 py-3">Code</th>
                          <th className="px-3 py-3">Recruits</th>
                          <th className="px-3 py-3">Commission</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {filteredMprs.map((m) => {
                          const isSelected = selectedMprId === m.id;
                          return (
                            <tr
                              key={m.id}
                              onClick={() => openMprDetail(m.id)}
                              className={cn(
                                "hover:bg-purple-50/50 transition-colors cursor-pointer",
                                isSelected && "bg-purple-50/80 font-semibold"
                              )}
                            >
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="text-gray-900 font-bold text-xs">{m.name}</span>
                                  <span className="text-gray-400 text-[11px] font-normal truncate max-w-[160px]">{m.email}</span>
                                </div>
                              </td>

                              <td className="px-3 py-3">
                                <span className="font-mono font-bold text-[11px] bg-gray-100 text-purple-900 px-2 py-0.5 rounded">
                                  {m.mpr_code}
                                </span>
                              </td>

                              <td className="px-3 py-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-gray-900">{m.total_recruits}</span>
                                  <span className="text-[10px] text-gray-400">({m.total_authors} authors)</span>
                                </div>
                              </td>

                              <td className="px-3 py-3">
                                <div className="flex flex-col">
                                  <span className="font-bold text-emerald-700">₦{m.total_earnings.toLocaleString()}</span>
                                  <span className="text-[10px] text-gray-400">{m.commission_rate}% rate</span>
                                </div>
                              </td>

                              <td className="px-3 py-3">
                                <Badge
                                  className={cn(
                                    "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                    m.status === "active"
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                      : "bg-red-100 text-red-800 border-red-200"
                                  )}
                                >
                                  {m.status}
                                </Badge>
                              </td>

                              <td className="px-4 py-3 text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 rounded-lg text-gray-400 hover:text-purple-700 hover:bg-purple-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openMprDetail(m.id);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: MPR Detail Inspector Panel */}
          {selectedMprId && (
            <div className="lg:col-span-5">
              <Card className="rounded-2xl border-gray-200 shadow-lg bg-white sticky top-20 overflow-hidden">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-sm shrink-0">
                      {mprDetail?.mpr?.full_name?.charAt(0) || "M"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm truncate">
                        {mprDetail?.mpr?.full_name || mprDetail?.mpr?.email}
                      </h3>
                      <p className="text-[11px] text-purple-200 font-mono">
                        {mprDetail?.mpr?.mpr_code}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/admin/mpr-audit?mprId=${selectedMprId}`}
                      className="p-1 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
                      title="Inspect Audit Trail"
                    >
                      <ScrollText className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => setSelectedMprId(null)}
                      className="p-1 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subnav Tabs */}
                <div className="flex border-b border-gray-100 bg-gray-50/70 p-1.5 gap-1 text-xs">
                  <button
                    onClick={() => setDetailTab("profile")}
                    className={cn(
                      "flex-1 py-1.5 rounded-md font-bold transition-all cursor-pointer text-center",
                      detailTab === "profile" ? "bg-white text-purple-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setDetailTab("recruits")}
                    className={cn(
                      "flex-1 py-1.5 rounded-md font-bold transition-all cursor-pointer text-center",
                      detailTab === "recruits" ? "bg-white text-purple-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    Recruits ({mprDetail?.recruits?.length || 0})
                  </button>
                  <button
                    onClick={() => setDetailTab("transactions")}
                    className={cn(
                      "flex-1 py-1.5 rounded-md font-bold transition-all cursor-pointer text-center",
                      detailTab === "transactions" ? "bg-white text-purple-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    History
                  </button>
                  <button
                    onClick={() => setDetailTab("actions")}
                    className={cn(
                      "flex-1 py-1.5 rounded-md font-bold transition-all cursor-pointer text-center",
                      detailTab === "actions" ? "bg-white text-purple-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    Controls
                  </button>
                </div>

                {/* Feedback Banner */}
                {actionFeedback && (
                  <div
                    className={cn(
                      "p-3 text-xs font-semibold flex items-center gap-2",
                      actionFeedback.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border-b border-emerald-100"
                        : "bg-red-50 text-red-800 border-b border-red-100"
                    )}
                  >
                    {actionFeedback.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    )}
                    <span>{actionFeedback.message}</span>
                  </div>
                )}

                {/* Content Body */}
                <CardContent className="p-4 max-h-[calc(100vh-280px)] overflow-y-auto space-y-4">
                  {loadingDetail ? (
                    <div className="py-12 text-center">
                      <RefreshCw className="w-6 h-6 text-purple-600 animate-spin mx-auto mb-2" />
                      <p className="text-xs text-gray-500 font-semibold">Loading partner intelligence...</p>
                    </div>
                  ) : !mprDetail ? (
                    <p className="text-xs text-gray-400 text-center py-8">Select an MPR to view details.</p>
                  ) : (
                    <>
                      {/* TAB 1: PROFILE */}
                      {detailTab === "profile" && (
                        <div className="space-y-4 text-xs">
                          {/* Financial Overview Card */}
                          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-3.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Earnings Summary</span>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                              <div>
                                <span className="text-gray-400 text-[10px]">Lifetime Earnings</span>
                                <p className="text-base font-black text-gray-900">
                                  ₦{(mprDetail.mpr.total_mpr_earnings || 0).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400 text-[10px]">Commission Rate</span>
                                <p className="text-base font-black text-purple-700">
                                  {mprDetail.mpr.mpr_commission_rate || 10}%
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Bank & Payout Details */}
                          <div className="border border-gray-200 rounded-xl p-3.5 space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5" /> Bank Payout Details
                            </span>
                            <div className="space-y-1 text-gray-700">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Bank Name:</span>
                                <span className="font-bold">{mprDetail.mpr.bank_name || "Not Configured"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Account Number:</span>
                                <span className="font-mono font-bold">{mprDetail.mpr.account_number || "—"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Account Name:</span>
                                <span className="font-bold">{mprDetail.mpr.account_name || "—"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Account Info */}
                          <div className="border border-gray-200 rounded-xl p-3.5 space-y-2 text-gray-700">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">System Records</span>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Email:</span>
                                <span className="font-semibold">{mprDetail.mpr.email}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">User ID:</span>
                                <span className="font-mono text-[10px] text-gray-500">{mprDetail.mpr.id}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Status:</span>
                                <Badge className={mprDetail.mpr.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>
                                  {mprDetail.mpr.status}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Member Since:</span>
                                <span>{new Date(mprDetail.mpr.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 2: RECRUITS */}
                      {detailTab === "recruits" && (
                        <div className="space-y-3 text-xs">
                          {mprDetail.recruits.length === 0 ? (
                            <p className="text-gray-400 text-center py-6">No recruited authors or users yet.</p>
                          ) : (
                            mprDetail.recruits.map((rec: any) => (
                              <div key={rec.id} className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-gray-900">{rec.name}</span>
                                  <Badge className={rec.isAuthor ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-600"}>
                                    {rec.isAuthor ? "Author" : "User"}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between text-gray-500 text-[11px]">
                                  <span>{rec.email}</span>
                                  <span>{rec.bookCount} eBooks published</span>
                                </div>
                                <div className="text-[10px] text-gray-400">
                                  Joined: {new Date(rec.dateJoined).toLocaleDateString()}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* TAB 3: TRANSACTIONS / HISTORY */}
                      {detailTab === "transactions" && (
                        <div className="space-y-3 text-xs">
                          <span className="font-bold text-gray-900">Recent Commission Logs</span>
                          {mprDetail.transactions.length === 0 ? (
                            <p className="text-gray-400 text-center py-6">No transaction records found.</p>
                          ) : (
                            mprDetail.transactions.slice(0, 10).map((tx: any) => (
                              <div key={tx.id} className="border border-gray-100 rounded-lg p-2.5 flex items-center justify-between bg-white">
                                <div>
                                  <p className="font-bold text-gray-900">{tx.type.replace(/_/g, " ").toUpperCase()}</p>
                                  <p className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                                </div>
                                <span className="font-bold text-emerald-600">+₦{parseFloat(tx.amount || 0).toLocaleString()}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* TAB 4: ADMIN CONTROLS */}
                      {detailTab === "actions" && (
                        <div className="space-y-3 text-xs">
                          {/* 1. Status Toggle */}
                          <div className="border border-gray-200 rounded-xl p-3.5 space-y-2">
                            <span className="font-bold text-gray-900 block">Account Status Control</span>
                            <div className="flex items-center gap-2">
                              {mprDetail.mpr.status === "active" ? (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleExecuteAction("set_status", { status: "suspended" })}
                                  disabled={actionLoading}
                                  className="w-full text-xs font-bold gap-1.5"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Suspend Partner Account</span>
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleExecuteAction("set_status", { status: "active" })}
                                  disabled={actionLoading}
                                  className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Reactivate Partner Account</span>
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* 2. Commission Rate Tuning */}
                          <div className="border border-gray-200 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900">Custom Commission Rate</span>
                              <span className="font-mono font-bold text-purple-700">{mprDetail.mpr.mpr_commission_rate || 10}%</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowRateModal(true)}
                              className="w-full text-xs font-bold gap-1.5 cursor-pointer"
                            >
                              <Percent className="w-3.5 h-3.5" />
                              <span>Adjust Commission Rate</span>
                            </Button>
                          </div>

                          {/* 3. Manual Balance Adjustment */}
                          <div className="border border-gray-200 rounded-xl p-3.5 space-y-2">
                            <span className="font-bold text-gray-900 block">Manual Balance Correction</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowBalanceModal(true)}
                              className="w-full text-xs font-bold gap-1.5 cursor-pointer"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Credit / Debit Balance</span>
                            </Button>
                          </div>

                          {/* 4. Direct Notification */}
                          <div className="border border-gray-200 rounded-xl p-3.5 space-y-2">
                            <span className="font-bold text-gray-900 block">Communication</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowNotifModal(true)}
                              className="w-full text-xs font-bold gap-1.5 cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Send Official Email Notice</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* MODAL: Adjust Commission Rate */}
        {showRateModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-gray-900">Adjust Commission Rate</h3>
                <button onClick={() => setShowRateModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Set a custom commission percentage for this marketing partner (standard default is 10%).
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">New Commission Rate (%)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={newRate}
                    onChange={(e) => setNewRate(parseFloat(e.target.value))}
                    className="pr-8 text-sm font-bold"
                  />
                  <Percent className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowRateModal(false)} className="w-1/2">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleExecuteAction("set_rate", { rate: newRate })}
                  disabled={actionLoading}
                  className="w-1/2 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  Save Rate
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Balance Adjustment */}
        {showBalanceModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-gray-900">Manual Balance Adjustment</h3>
                <button onClick={() => setShowBalanceModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={adjustType === "credit" ? "default" : "outline"}
                  onClick={() => setAdjustType("credit")}
                  className={cn("w-1/2 text-xs font-bold", adjustType === "credit" && "bg-emerald-600 hover:bg-emerald-700 text-white")}
                >
                  + Credit (Add)
                </Button>
                <Button
                  size="sm"
                  variant={adjustType === "debit" ? "default" : "outline"}
                  onClick={() => setAdjustType("debit")}
                  className={cn("w-1/2 text-xs font-bold", adjustType === "debit" && "bg-red-600 hover:bg-red-700 text-white")}
                >
                  - Debit (Deduct)
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Adjustment Amount (₦)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="text-sm font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Reason / Audit Memo</Label>
                <Input
                  placeholder="e.g. Special campaign promotion bonus"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowBalanceModal(false)} className="w-1/2">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleExecuteAction("adjust_balance", { amount: adjustAmount, reason: adjustReason, type: adjustType })}
                  disabled={actionLoading || !adjustAmount}
                  className="w-1/2 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  Apply Balance
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Send Notification */}
        {showNotifModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-gray-900">Send Partner Notification</h3>
                <button onClick={() => setShowNotifModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Email Subject</Label>
                <Input
                  placeholder="e.g. Important Update on CalmReader Partner Commissions"
                  value={notifSubject}
                  onChange={(e) => setNotifSubject(e.target.value)}
                  className="text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Message Content</Label>
                <textarea
                  rows={4}
                  placeholder="Type your official announcement or notification message here..."
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2.5 text-xs text-gray-800 outline-none focus:border-purple-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowNotifModal(false)} className="w-1/2">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleExecuteAction("send_notification", { subject: notifSubject, message: notifMessage })}
                  disabled={actionLoading || !notifMessage}
                  className="w-1/2 bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Email</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Assign New MPR */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-gray-900">Assign Marketing Partner Role</h3>
                  <p className="text-xs text-gray-500">Search an existing CalmReader user to grant MPR status.</p>
                </div>
                <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by user email or name..."
                  value={assignUserSearch}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {searchingUsers ? (
                  <p className="text-xs text-gray-400 text-center py-4">Searching user records...</p>
                ) : foundUsers.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">
                    {assignUserSearch ? "No users found matching query." : "Type at least 2 characters to search."}
                  </p>
                ) : (
                  foundUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-2.5 rounded-lg border border-gray-100 hover:bg-purple-50 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-gray-900">{u.full_name || u.username || "User"}</p>
                        <p className="text-gray-400 text-[11px]">{u.email}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAssignMpr(u.id)}
                        disabled={actionLoading}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-7 text-xs px-2.5"
                      >
                        Assign MPR
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};
