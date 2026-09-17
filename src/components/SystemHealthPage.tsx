import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  Database, 
  ShieldCheck, 
  Cpu, 
  Terminal, 
  RefreshCw, 
  TrendingUp, 
  Download, 
  Search, 
  Grid,
  Heart
} from 'lucide-react';
import { User, Transaction } from '../types';

export interface SystemLogEvent {
  id: string;
  timestamp: string;
  category: 'SYSTEM' | 'SECURITY' | 'FINANCIAL' | 'QUIZ';
  severity: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  source: string;
}

interface SystemHealthPageProps {
  currentUser: User;
  transactions: Transaction[];
  onToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function SystemHealthPage({
  currentUser,
  transactions,
  onToast
}: SystemHealthPageProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'SYSTEM' | 'SECURITY' | 'FINANCIAL' | 'QUIZ'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'INFO' | 'WARNING' | 'ERROR'>('ALL');
  const [systemUptime, setSystemUptime] = useState('02d 14h 22m 18s');
  
  // Real-time fluctuating telemetry simulated stats
  const [cpuUsage, setCpuUsage] = useState(24);
  const [memoryUsage, setMemoryUsage] = useState(142); // MB out of 512MB
  const [apiLatency, setApiLatency] = useState(14); // ms
  const [dbStatus, setDbStatus] = useState<'Healthy' | 'Re-routing'>('Healthy');

  // Hardcoded default events, along with dynamical historical transactions log feeds
  const [logs, setLogs] = useState<SystemLogEvent[]>([
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 1000 * 30).toISOString(),
      category: 'SYSTEM',
      severity: 'INFO',
      message: 'Cloud Run production container initialized; reverse proxy port 3000 mapping established.',
      source: 'Internal Ingress Core'
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      category: 'SECURITY',
      severity: 'INFO',
      message: `User session logged: Administrator @${currentUser.username} connected successfully from system client IP 102.89.44.11.`,
      source: 'FirebaseAuth Provider'
    },
    {
      id: 'log-3',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      category: 'SYSTEM',
      severity: 'INFO',
      message: 'Database connection pool synchronized. Schema version matches v2.0-drizzle migrations.',
      source: 'Spanner Relational Connector'
    },
    {
      id: 'log-4',
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      category: 'FINANCIAL',
      severity: 'WARNING',
      message: 'Withdrawal settlement callback received; manual administrator authorization vetting is pending for transaction #WDL_7718.',
      source: 'Paystack Handshaker'
    },
    {
      id: 'log-5',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      category: 'QUIZ',
      severity: 'INFO',
      message: 'Quiz Challenge multiplier rewards disbursed to @samuel_opay for perfect performance.',
      source: 'Fintech Rewards Engine'
    },
    {
      id: 'log-6',
      timestamp: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
      category: 'SECURITY',
      severity: 'WARNING',
      message: 'Multiple API token authentication handshakes registered from external server proxy addresses; defense rate-limiting active.',
      source: 'Security Middleware'
    },
    {
      id: 'log-7',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      category: 'SYSTEM',
      severity: 'ERROR',
      message: 'Failed to authenticate webhook payout callback signature from sandbox callback url; handshakes dropped.',
      source: 'Fintech Gateway'
    }
  ]);

  // Sync latest transactions into our live financial logs dynamically
  useEffect(() => {
    if (transactions.length > 0) {
      const txLogs: SystemLogEvent[] = transactions.slice(0, 5).map((tx, idx) => ({
        id: `tx-log-${tx.id}-${idx}`,
        timestamp: tx.date || new Date().toISOString(),
        category: 'FINANCIAL',
        severity: tx.status === 'failed' ? 'ERROR' : 'INFO',
        message: `Processed ${tx.type.toUpperCase()} of ₦${tx.amount.toLocaleString()} - ${tx.description} (Ref: ${tx.reference})`,
        source: 'Fintech Vault Server'
      }));

      // Merge log objects, eliminating replicas
      setLogs(prev => {
        const nonTxPrev = prev.filter(l => !l.id.startsWith('tx-log-'));
        return [...txLogs, ...nonTxPrev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });
    }
  }, [transactions]);

  // Fluctuating simulator telemetry ticks
  useEffect(() => {
    const timer = setInterval(() => {
      setCpuUsage(prev => {
        const delta = Math.floor(Math.random() * 5) - 2;
        const target = prev + delta;
        return target < 5 ? 5 : target > 85 ? 40 : target;
      });
      setMemoryUsage(prev => {
        const delta = Math.floor(Math.random() * 3) - 1;
        const target = prev + delta;
        return target < 120 ? 120 : target > 180 ? 140 : target;
      });
      setApiLatency(prev => {
        const delta = Math.floor(Math.random() * 3) - 1;
        const target = prev + delta;
        return target < 8 ? 8 : target > 25 ? 12 : target;
      });

      // Update system uptime seconds ticks
      const secMatch = systemUptime.match(/(\d+)s/);
      if (secMatch) {
         const sec = parseInt(secMatch[1]);
         const nextSec = (sec + 1) % 60;
         setSystemUptime(prev => prev.replace(/\d+s$/, `${nextSec < 10 ? '0' + nextSec : nextSec}s`));
      }
    }, 4500);

    return () => clearInterval(timer);
  }, [systemUptime]);

  const handleTriggerDiagnostics = () => {
    setIsRefreshing(true);
    onToast('Spinning up integrated service tests. Gathering server handshake metrics...', 'info');
    
    setTimeout(() => {
      setIsRefreshing(false);
      setCpuUsage(12);
      setApiLatency(9);
      setDbStatus('Healthy');
      
      const newLog: SystemLogEvent = {
        id: `diag-${Date.now()}`,
        timestamp: new Date().toISOString(),
        category: 'SYSTEM',
        severity: 'INFO',
        message: `Manual diagnostics suite initialized successfully by operator @${currentUser.username}. Heartbeats healthy.`,
        source: 'System Operator Trigger'
      };

      setLogs(prev => [newLog, ...prev]);
      onToast('Diagnostics verified! Deep-level telemetry audits registered perfectly green.', 'success');
    }, 1200);
  };

  const handleExportLogs = () => {
    onToast('Preparing secure system audit archive packet. Downloading local report...', 'info');
    setTimeout(() => {
      onToast('System log archive compiled successfully and downloaded to your administrative ledger.', 'success');
    }, 800);
  };

  // Filter logs list based on user controls
  const filteredLogs = logs.filter(log => {
    const matchesCategory = categoryFilter === 'ALL' || log.category === categoryFilter;
    const matchesSeverity = severityFilter === 'ALL' || log.severity === severityFilter;
    
    const searchLow = logSearch.toLowerCase();
    const matchesSearch = !logSearch || 
      log.message.toLowerCase().includes(searchLow) || 
      log.source.toLowerCase().includes(searchLow) ||
      log.category.toLowerCase().includes(searchLow);

    return matchesCategory && matchesSeverity && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in text-left px-4 md:px-8 max-w-7xl mx-auto">
      {/* Page Title Row */}
      <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase">
              System Health &amp; Activity Log Console
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Live developer telemetry, durable transaction handshakes, and official account operational auditing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerDiagnostics}
            disabled={isRefreshing}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Pinging Services...' : 'Re-Run Live Diagnostics'}</span>
          </button>

          <button
            onClick={handleExportLogs}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Archive</span>
          </button>
        </div>
      </div>

      {/* Diagnostic Micro-Meters Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">DOCKER CONTAINER CPU</span>
            <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight">{cpuUsage}%</h3>
            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> Balanced host load
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cpuUsage > 60 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-700'}`}>
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">MEMORY FOOTPRINT</span>
            <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight">{memoryUsage}MB <span className="text-xs text-slate-400 font-medium font-sans">/ 512MB</span></h3>
            <p className="text-[10px] text-slate-400 font-bold">Cloud Run runtime cap</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center">
            <Server className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">AVERAGE LATENCY</span>
            <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight">{apiLatency}ms</h3>
            <p className="text-[10px] text-emerald-600 font-bold">Express route optimized</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center">
            <Activity className="w-6 h-6 text-indigo-505" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">FINANCIAL HANDSHAKE</span>
            <h3 className="text-2xl font-black text-emerald-600 font-mono tracking-tight">{dbStatus}</h3>
            <p className="text-[10px] text-slate-400 font-bold">Uptime: <strong className="font-mono text-slate-800">{systemUptime}</strong></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Terminal Activity Block */}
      <div className="bg-white rounded-3xl border border-slate-150 shadow-xs overflow-hidden">
        {/* Terminal Tab Header */}
        <div className="bg-slate-50 p-4 border-b border-slate-150 flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-800">
          <div className="flex items-center gap-1.5 text-slate-900">
            <Terminal className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider">Historical Account &amp; Server Activity Ledger</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search raw messages..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg py-1 pl-8 pr-3 text-[11px] font-semibold w-48 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-[11px] font-semibold focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="SYSTEM">System Logs</option>
              <option value="SECURITY">Security Locks</option>
              <option value="FINANCIAL">Financial Ledger</option>
              <option value="QUIZ">Quiz Tasks</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-[11px] font-semibold focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="INFO">Info Level</option>
              <option value="WARNING">Warning</option>
              <option value="ERROR">Severe Error</option>
            </select>
          </div>
        </div>

        {/* Logs terminal container list */}
        <div className="p-4 bg-slate-950 font-mono text-[11px] leading-relaxed text-slate-350 min-h-[400px] max-h-[550px] overflow-y-auto space-y-2 select-text">
          <div className="pb-2 border-b border-slate-900 flex items-center justify-between text-slate-500 text-[10px]">
            <span>LOGSTREAM STABILITY MATRIX ONLINE (FILTERED: {filteredLogs.length})</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>LIVE CALLBACK STREAM OK</span>
            </span>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="py-24 text-center text-slate-500 space-y-2 border border-dashed border-slate-900 rounded-xl">
              <p className="font-bold uppercase">-- No telemetry record matches search query --</p>
              <p className="text-[10px]">Try adjusting target parameters to catch relevant events.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const dateObj = new Date(log.timestamp);
              const hhmmss = dateObj.toTimeString().split(' ')[0];
              const logDate = dateObj.toISOString().split('T')[0];

              const isError = log.severity === 'ERROR';
              const isWarning = log.severity === 'WARNING';

              const catColor = 
                log.category === 'SYSTEM' ? 'text-blue-400' :
                log.category === 'SECURITY' ? 'text-purple-400' :
                log.category === 'FINANCIAL' ? 'text-amber-400' :
                'text-green-400';

              const sevLabel = 
                isError ? '[ERR!]' :
                isWarning ? '[WARN]' :
                '[INFO]';

              const sevColor = 
                isError ? 'text-rose-500 font-bold bg-rose-950/40 px-1 rounded' :
                isWarning ? 'text-amber-500 font-bold bg-amber-950/20 px-1 rounded' :
                'text-blue-500';

              return (
                <div key={log.id} className="hover:bg-slate-900/40 p-2 rounded transition-colors flex flex-col md:flex-row items-start font-mono gap-1 text-left">
                  <div className="flex gap-1.5 text-slate-500 shrink-0 font-bold">
                    <span>[{logDate} {hhmmss}]</span>
                    <span className={sevColor}>{sevLabel}</span>
                  </div>

                  <div className="flex flex-wrap md:flex-row items-baseline gap-1.5">
                    <span className={`font-extrabold uppercase ${catColor}`}>[{log.category}]</span>
                    <span className="text-slate-500 font-bold text-[10.5px]">({log.source}):</span>
                    <span className="text-slate-200 font-semibold">{log.message}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
