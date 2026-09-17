import React, { useState } from 'react';
import { 
  ClipboardList, 
  Plus, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  HelpCircle, 
  Check, 
  X 
} from 'lucide-react';
import { User, UserRequest } from '../types';

interface UserRequestsPageProps {
  requests: UserRequest[];
  currentUser: User;
  onSubmitRequest: (type: 'credits' | 'upgrade' | 'support' | 'other', details: string, amount?: number) => void;
  onGrantRequest?: (id: string) => void;
  onDeclineRequest?: (id: string) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function UserRequestsPage({
  requests,
  currentUser,
  onSubmitRequest,
  onGrantRequest,
  onDeclineRequest,
  onToast
}: UserRequestsPageProps) {
  // Determine if the logged in user is the system administrator
  const isAdminUser = currentUser.username.toLowerCase() === 'winbigonly' || currentUser.email.toLowerCase() === 'winbigonly@gmail.com';

  // Filters for Vetting Board
  const [reqStatusFilter, setReqStatusFilter] = useState<'all' | 'pending' | 'granted' | 'declined'>('all');
  const [reqTypeFilter, setReqTypeFilter] = useState<'all' | 'credits' | 'upgrade' | 'support' | 'other'>('all');
  const [reqSearch, setReqSearch] = useState('');

  // Form states for normal user
  const [requestType, setRequestType] = useState<'credits' | 'upgrade' | 'support' | 'other'>('credits');
  const [details, setDetails] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter requests that only belong to the current user (if client)
  const myRequests = requests.filter(r => r.userId === currentUser.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!details.trim()) {
      onToast('Please specify details describing your request objectives.', 'warning');
      return;
    }

    let parsedAmount: number | undefined = undefined;
    if (requestType === 'credits') {
      parsedAmount = Number(creditAmount);
      if (!parsedAmount || parsedAmount <= 0) {
        onToast('Please type a valid currency amount value.', 'warning');
        return;
      }
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onSubmitRequest(requestType, details, parsedAmount);
      setDetails('');
      setCreditAmount('');
      setIsSubmitting(false);
    }, 400);
  };

  // RENDER ADMIN VETTING VIEW (RECEIVE AND MANAGE REQUESTS)
  if (isAdminUser) {
    const pendingRequests = requests.filter(r => r.status === 'pending');
    const grantedRequests = requests.filter(r => r.status === 'granted');
    const declinedRequests = requests.filter(r => r.status === 'declined');

    return (
      <div className="space-y-6 animate-fade-in text-left px-4 md:px-8 max-w-7xl mx-auto">
        
        {/* Title header block */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">
                Client Requests Vetting Center (Executive Desk)
              </h1>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Inspect, check, grant, or reject balance refills and premium tier upgrades submitted by active platform contestants.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 py-1.5 px-3 rounded-lg select-none">
              Pending: {pendingRequests.length}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-1.5 px-3 rounded-lg select-none">
              Granted: {grantedRequests.length}
            </span>
          </div>
        </div>

        {/* Filters HubToolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter requests by username, details, or ID..."
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
              <option value="all">Vetting Status: All Statuses</option>
              <option value="pending">Vetting Status: Pending Approval</option>
              <option value="granted">Vetting Status: Granted (Approved)</option>
              <option value="declined">Vetting Status: Declined</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={reqTypeFilter}
              onChange={(e) => setReqTypeFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Objective Category: All</option>
              <option value="credits">Objective Category: Credits / Balance </option>
              <option value="upgrade">Objective Category: Tier Upgrades</option>
              <option value="support">Objective Category: Support &amp; Help</option>
              <option value="other">Objective Category: Misc Proposal</option>
            </select>
          </div>

          <div className="md:col-span-1 text-center">
            <button
              onClick={() => {
                setReqSearch('');
                setReqStatusFilter('all');
                setReqTypeFilter('all');
                onToast('Request filters reset to default.', 'info');
              }}
              className="p-2 text-slate-400 hover:text-slate-800 transition-colors focus:outline-none cursor-pointer"
              title="Reset Filters"
            >
              <RefreshCw className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </div>

        {/* Requests displaying list */}
        <div className="bg-white rounded-3xl border border-slate-150 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="p-4 pl-6">Client Identity</th>
                  <th className="p-4">Objective Category</th>
                  <th className="p-4 min-w-[300px]">Detailed Request Reason</th>
                  <th className="p-4 text-right">Requested Funds</th>
                  <th className="p-4">Submission Date</th>
                  <th className="p-4">Vetting Status</th>
                  <th className="p-4 pr-6 text-right">Action Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {requests.filter(req => {
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
                    <td colSpan={7} className="p-16 text-center text-slate-400">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold">No client requests matched your filters.</p>
                      <p className="text-[11px] text-slate-400">Administrator records indicate pristine queue states.</p>
                    </td>
                  </tr>
                ) : (
                  requests.filter(req => {
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
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6">
                          <div>
                            <span className="font-extrabold text-slate-900">@{req.username}</span>
                            <p className="text-[9px] font-mono text-slate-400 uppercase mt-0.5">ID: #{req.id.slice(0, 8)}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            req.type === 'credits' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            req.type === 'upgrade' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            req.type === 'support' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                            'bg-slate-50 text-slate-700 border border-slate-100'
                          }`}>
                            {req.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 max-w-sm">
                          <p className="text-slate-650 font-medium leading-relaxed" title={req.details}>
                            {req.details}
                          </p>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-slate-900">
                          {req.amount !== undefined ? `₦${req.amount.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-4 text-slate-400 text-[11px] font-bold">{req.date}</td>
                        <td className="p-4">
                          <span className={`text-[10px] font-black uppercase py-0.5 px-2 rounded-md flex items-center justify-center w-24 gap-1 ${
                            isGranted ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            isDeclined ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isGranted ? 'bg-emerald-400' : isDeclined ? 'bg-rose-400' : 'bg-amber-400'}`} />
                            {req.status}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          {isPending ? (
                            <div className="inline-flex gap-2">
                              {onGrantRequest && (
                                <button
                                  onClick={() => onGrantRequest(req.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase py-1.5 px-3 rounded-lg shadow-sm cursor-pointer transition-all flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" /> Grant
                                </button>
                              )}
                              {onDeclineRequest && (
                                <button
                                  onClick={() => onDeclineRequest(req.id)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase py-1.5 px-3 rounded-lg shadow-sm cursor-pointer transition-all flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" /> Decline
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase bg-slate-100/70 border border-slate-150 py-1 px-2.5 rounded-lg select-none">
                              {isGranted ? 'Granted' : 'Declined'}
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
    );
  }

  // RENDER STANDARD CLIENT SUBMIT / COMPOSE VIEW
  return (
    <div className="space-y-6 animate-fade-in text-left px-4 md:px-8 max-w-7xl mx-auto">
      {/* Title block */}
      <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase">
              Submit Official Administrative Request
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Request wallet balance refills, account plan level upgrades, or official permissions from CEO boards directly.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Submit Form Panel - Left Side */}
        <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs lg:col-span-5 text-left">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Plus className="w-4 h-4 text-indigo-600" /> Compose Request
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Request Objective Type</label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
              >
                <option value="credits">Naira Balance Refill / Credits Request</option>
                <option value="upgrade">Premium License / Level Upgrade Request</option>
                <option value="support">Official Account Moderation &amp; Support</option>
                <option value="other">Unspecified Miscellaneous Proposal</option>
              </select>
            </div>

            {requestType === 'credits' && (
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Requested Amount (₦)</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Details &amp; Reason (Reasoning)</label>
              <textarea
                rows={4}
                placeholder="Describe with clarity why this request should be approved and granted by active platform admins..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-650 hover:bg-indigo-750 text-white font-black text-xs py-3 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ClipboardList className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering with core LEDGER...' : 'Transmit Official Request'}</span>
            </button>
          </form>
        </div>

        {/* Previous Submissions Ledger List - Right Side */}
        <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs lg:col-span-7">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" /> My Request Transmission Trails
            </h2>
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Total logs: {myRequests.length}
            </span>
          </div>

          {myRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-450 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold">You have not submitted any official requests yet.</p>
              <p className="text-[11px] text-slate-400">Fill in the compose form to dispatch a proposal directly to the admin terminal.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {myRequests.map((req) => {
                const isPending = req.status === 'pending';
                const isGranted = req.status === 'granted';
                const isDeclined = req.status === 'declined';

                return (
                  <div key={req.id} className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col justify-between gap-3 text-left">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-black uppercase text-indigo-650 bg-indigo-50 py-0.5 px-2 rounded-md font-mono">
                          {req.type.toUpperCase()}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs mt-1.5">
                          Request ID: #{req.id.slice(0, 8)}
                        </h4>
                      </div>

                      <span className={`text-[10px] font-black uppercase py-0.5 px-2 rounded-md flex items-center gap-1 ${
                        isGranted ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        isDeclined ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                        'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                      }`}>
                        {isGranted && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                        {isDeclined && <XCircle className="w-3 h-3 text-rose-500" />}
                        {isPending && <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />}
                        {req.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-650 font-medium leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
                      {req.details}
                    </p>

                    <div className="flex justify-between items-center text-[11px] text-slate-400 font-bold">
                      {req.amount !== undefined ? (
                        <span className="text-slate-800">
                          Transfer Target Amount: <strong className="text-indigo-650 font-mono">₦{req.amount.toLocaleString()}</strong>
                        </span>
                      ) : (
                        <span>Non-monetary proposal</span>
                      )}
                      <span>Submitted: {req.date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
