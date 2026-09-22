import React, { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { useAuth } from "../AuthContext";
import { Link, useSearchParams } from "react-router-dom";
import {
  ScrollText,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Building2,
  BarChart3,
  User,
  Clock,
  Globe,
  AlertCircle,
  FileCode,
  Tag,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight
} from "lucide-react";
import axios from "axios";

interface AuditLog {
  id: string;
  mpr_id?: string | null;
  admin_id?: string | null;
  action_type: string;
  target_type: string;
  target_id: string;
  details: any;
  ip_address?: string | null;
  created_at: string;
  mpr?: {
    name: string;
    email: string;
    mpr_code?: string;
  } | null;
  admin?: {
    name: string;
    email: string;
  } | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const AdminMprAudit: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [actionTypeFilter, setActionTypeFilter] = useState(searchParams.get("action") || "all");
  const [targetTypeFilter, setTargetTypeFilter] = useState(searchParams.get("target") || "all");
  const [mprIdFilter, setMprIdFilter] = useState(searchParams.get("mprId") || "");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [currentPage, setCurrentPage] = useState(1);

  // Selected Log for detail modal
  const [inspectLog, setInspectLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: currentPage,
        limit: pagination.limit,
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (actionTypeFilter !== "all") params.actionType = actionTypeFilter;
      if (targetTypeFilter !== "all") params.targetType = targetTypeFilter;
      if (mprIdFilter.trim()) params.mprId = mprIdFilter.trim();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await axios.get("/api/admin/mpr/audit", { params });
      if (res.data && res.data.success) {
        setLogs(res.data.logs || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err: any) {
      console.error("Failed to load MPR audit log:", err);
      setError(err?.response?.data?.error || "Failed to load audit trail records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage, actionTypeFilter, targetTypeFilter, startDate, endDate, mprIdFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setActionTypeFilter("all");
    setTargetTypeFilter("all");
    setMprIdFilter("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "recruited_author":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Recruited Author</span>;
      case "recruited_user":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">Recruited User</span>;
      case "created_trivia":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">Created Trivia</span>;
      case "edited_trivia":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">Edited Trivia</span>;
      case "submitted_trivia":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-100 text-cyan-800 border border-cyan-200">Submitted Trivia</span>;
      case "approved_trivia":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-green-100 text-green-800 border border-green-200">Approved Trivia</span>;
      case "rejected_trivia":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">Rejected Trivia</span>;
      case "requested_payout":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">Requested Payout</span>;
      case "admin_updated_mpr":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">Admin Modified Partner</span>;
      case "shared_link":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-100 text-teal-800 border border-teal-200">Shared Link Click</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-800 border border-gray-200">{action}</span>;
    }
  };

  // Export CSV
  const exportCsv = () => {
    if (!logs.length) return;
    const headers = ["Timestamp", "Action Type", "Target Type", "Target ID", "Partner / Actor", "Admin", "IP Address", "Details"];
    const rows = logs.map((l) => [
      new Date(l.created_at).toISOString(),
      l.action_type,
      l.target_type,
      l.target_id,
      `"${(l.mpr?.name || l.mpr_id || "System").replace(/"/g, '""')}"`,
      `"${(l.admin?.name || l.admin_id || "").replace(/"/g, '""')}"`,
      l.ip_address || "N/A",
      `"${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mpr_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="page-container max-w-7xl mx-auto py-4 sm:py-8 space-y-6 w-full min-w-0 overflow-x-hidden">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Immutable Governance & Verification
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <ScrollText className="w-8 h-8 text-amber-700" />
              MPR Audit Trail
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Chronological log of all partner recruitment, trivia lifecycles, payout requests, and administrative overrides.
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
              to="/admin/mpr-analytics"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 shadow-sm transition"
            >
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              MPR Analytics
            </Link>

            <button
              onClick={fetchLogs}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition disabled:opacity-50"
              title="Refresh Audit Logs"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              onClick={exportCsv}
              disabled={logs.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-700 rounded-lg hover:bg-amber-800 shadow-sm transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search audit details, partner name, email, action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Action Type */}
            <select
              value={actionTypeFilter}
              onChange={(e) => {
                setActionTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-gray-700 bg-white"
            >
              <option value="all">All Actions</option>
              <option value="recruited_author">Recruited Author</option>
              <option value="recruited_user">Recruited User</option>
              <option value="created_trivia">Created Trivia</option>
              <option value="edited_trivia">Edited Trivia</option>
              <option value="submitted_trivia">Submitted Trivia</option>
              <option value="approved_trivia">Approved Trivia</option>
              <option value="rejected_trivia">Rejected Trivia</option>
              <option value="requested_payout">Requested Payout</option>
              <option value="admin_updated_mpr">Admin Modified Partner</option>
              <option value="shared_link">Shared Link Click</option>
            </select>

            {/* Target Type */}
            <select
              value={targetTypeFilter}
              onChange={(e) => {
                setTargetTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-gray-700 bg-white"
            >
              <option value="all">All Targets</option>
              <option value="trivia">Trivia</option>
              <option value="referral">Referral</option>
              <option value="profile">Profile / User</option>
              <option value="withdrawal">Withdrawal</option>
            </select>

            {/* Date Pickers */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                title="Start Date"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                title="End Date"
              />
            </div>

            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition"
            >
              Apply Filter
            </button>

            {(searchQuery || actionTypeFilter !== "all" || targetTypeFilter !== "all" || startDate || endDate || mprIdFilter) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Reset
              </button>
            )}
          </form>

          {mprIdFilter && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-xs text-amber-900">
              <span className="font-semibold">Filtered by Partner ID:</span>
              <span className="font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{mprIdFilter}</span>
              <button onClick={() => setMprIdFilter("")} className="text-gray-400 hover:text-gray-600 ml-1">
                <X className="w-3.5 h-3.5" />
              </button>
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
            <button onClick={fetchLogs} className="font-semibold underline hover:text-red-900">
              Retry
            </button>
          </div>
        )}

        {/* Audit Log Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden w-full min-w-0">
          <div className="overflow-x-auto w-full min-w-0">
            <table className="w-full text-left text-xs text-gray-600 responsive-table">
              <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Target</th>
                  <th className="py-3.5 px-4">Partner / Actor</th>
                  <th className="py-3.5 px-4">Context Details</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={7} className="py-4 px-4">
                        <div className="h-4 bg-gray-100 rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      <ScrollText className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm font-medium text-gray-600">No audit trail records found</p>
                      <p className="text-xs text-gray-400 mt-1">Actions performed by marketing partners will appear here chronologically.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setInspectLog(log)}
                      className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800">
                            {new Date(log.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {getActionBadge(log.action_type)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800 capitalize">{log.target_type}</span>
                          <span className="text-[10px] font-mono text-gray-400 truncate max-w-[120px]">
                            {log.target_id}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {log.mpr ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{log.mpr.name}</span>
                            <span className="text-[10px] text-gray-400">{log.mpr.email || log.mpr.mpr_code}</span>
                          </div>
                        ) : log.admin ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-indigo-900">Admin: {log.admin.name}</span>
                            <span className="text-[10px] text-gray-400">{log.admin.email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-mono text-[11px]">
                            {log.mpr_id ? log.mpr_id.substring(0, 8) : "System"}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-[240px]">
                        <div className="text-gray-600 truncate text-[11px]">
                          {log.details?.title
                            ? `Title: ${log.details.title}`
                            : log.details?.amount
                            ? `Amount: ₦${Number(log.details.amount).toLocaleString()}`
                            : log.details?.referrer_code
                            ? `Code: ${log.details.referrer_code}`
                            : log.details?.reason
                            ? `Reason: ${log.details.reason}`
                            : JSON.stringify(log.details || {})}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-gray-400 font-mono text-[11px] whitespace-nowrap">
                        {log.ip_address || "—"}
                      </td>

                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setInspectLog(log)}
                          className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 transition"
                          title="Inspect Payload"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
            <div>
              Showing {logs.length} of {pagination.total} audit events (Page {pagination.page} of {pagination.totalPages})
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1 || loading}
                className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              <span className="font-semibold text-gray-800 px-1">
                {currentPage} / {pagination.totalPages || 1}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, pagination.totalPages))}
                disabled={currentPage >= pagination.totalPages || loading}
                className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Event Inspection Modal */}
        {inspectLog && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-200 bg-amber-50/50 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {getActionBadge(inspectLog.action_type)}
                    <span className="font-mono text-xs text-gray-500">ID: {inspectLog.id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mt-2">Audit Event Record</h3>
                  <p className="text-xs text-gray-500">
                    Recorded at {new Date(inspectLog.created_at).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() => setInspectLog(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div>
                    <span className="text-gray-400 block font-medium">Target Type</span>
                    <span className="font-bold text-gray-800 uppercase">{inspectLog.target_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Target ID</span>
                    <span className="font-mono text-gray-800 truncate block">{inspectLog.target_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Partner / Actor</span>
                    <span className="font-medium text-gray-800">
                      {inspectLog.mpr?.name || inspectLog.admin?.name || inspectLog.mpr_id || "System"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Client IP Address</span>
                    <span className="font-mono text-gray-800">{inspectLog.ip_address || "Unavailable"}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-amber-700" />
                    Structured Context Payload (JSONB)
                  </h4>
                  <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800 shadow-inner">
                    {JSON.stringify(inspectLog.details || {}, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setInspectLog(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
export default AdminMprAudit;
