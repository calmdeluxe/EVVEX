import React, { useState } from 'react';
import { PurchasedTicket } from '../../types';
import { Scan, CheckCircle2, AlertTriangle, XCircle, Search, ShieldCheck, Clock, Users, ArrowRight } from 'lucide-react';

interface GateScannerProps {
  tickets: PurchasedTicket[];
  onCheckInTicket: (ticketId: string) => void;
  onToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const GateScanner: React.FC<GateScannerProps> = ({
  tickets,
  onCheckInTicket,
  onToast
}) => {
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState<{
    status: 'valid' | 'already_scanned' | 'invalid';
    ticket?: PurchasedTicket;
    time?: string;
  } | null>(null);

  const checkedInCount = tickets.filter(t => t.checked_in).length;
  const totalTickets = tickets.length;

  const handleScanCode = (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    const matched = tickets.find(
      t => t.ticket_number.toLowerCase() === clean.toLowerCase() ||
           t.qr_code_hash.toLowerCase() === clean.toLowerCase()
    );

    if (!matched) {
      setLastScanned({
        status: 'invalid'
      });
      onToast(`INVALID TICKET: Code "${clean}" not recognized in gate registry.`, 'error');
      return;
    }

    if (matched.checked_in) {
      setLastScanned({
        status: 'already_scanned',
        ticket: matched,
        time: matched.checked_in_at || 'Earlier'
      });
      onToast(`DUPLICATE ENTRY ALERT: Ticket #${matched.ticket_number} was already scanned!`, 'warning');
      return;
    }

    // Success check in
    onCheckInTicket(matched.id);
    const nowTime = new Date().toLocaleTimeString();
    setLastScanned({
      status: 'valid',
      ticket: { ...matched, checked_in: true, checked_in_at: nowTime },
      time: nowTime
    });
    setManualCode('');
    onToast(`ACCESS GRANTED: ${matched.attendee_name} (${matched.tier_name})`, 'success');
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Scanner Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 text-xs font-bold uppercase tracking-widest">
            <Scan className="w-3.5 h-3.5" />
            Gate Verification Station
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            EVVEX Live Access Scanner
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time digital pass verification and counterfeit deterrence at gate entrance.
          </p>
        </div>

        {/* Live Attendance Counter */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left w-full sm:w-auto">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Checked In Gate</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-2xl font-black text-emerald-400">{checkedInCount}</span>
            <span className="text-xs text-slate-500 font-bold">/ {totalTickets} Passes</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scanner Camera Viewfinder Simulation */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-['Syne']">
            <Scan className="w-4 h-4 text-amber-400" />
            QR Code Camera Viewfinder
          </h3>

          <div className="relative aspect-square max-w-[320px] mx-auto bg-slate-950 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center p-6 text-center overflow-hidden group">
            {/* Viewfinder target corners */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-400" />

            {/* Scanning Laser Line */}
            <div className="absolute inset-x-4 h-0.5 bg-emerald-400 shadow-lg shadow-emerald-400/80 animate-pulse top-1/2 -translate-y-1/2" />

            <Scan className="w-12 h-12 text-slate-600 mb-2" />
            <p className="text-xs font-bold text-slate-300">Point Camera at Attendee Pass</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
              Or click any sample pass below to trigger instant gate scan.
            </p>
          </div>

          {/* Manual Input Form */}
          <div className="space-y-2 pt-2">
            <label className="text-xs text-slate-400 block font-semibold">Manual Ticket Code / Hash</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. EVX-2026-98124"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScanCode(manualCode)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={() => handleScanCode(manualCode)}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer"
              >
                Scan
              </button>
            </div>
          </div>

          {/* Quick Click Simulation from Registry */}
          <div className="border-t border-slate-800 pt-3 space-y-2">
            <span className="text-[11px] text-slate-500 uppercase font-bold block">Simulate Pass Scan:</span>
            <div className="flex flex-wrap gap-1.5">
              {tickets.slice(0, 3).map(t => (
                <button
                  key={t.id}
                  onClick={() => handleScanCode(t.ticket_number)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono transition-all cursor-pointer ${
                    t.checked_in
                      ? 'bg-slate-950 text-slate-500 border-slate-850'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-400/30'
                  }`}
                >
                  {t.ticket_number} ({t.attendee_name.split(' ')[0]})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scan Result Feedback Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-['Syne']">
            Verification Output
          </h3>

          {lastScanned ? (
            <div className="space-y-4 my-auto">
              {lastScanned.status === 'valid' && (
                <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-6 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Access Authorized</span>
                    <h4 className="text-xl font-black text-white mt-1 font-['Syne']">
                      {lastScanned.ticket?.attendee_name}
                    </h4>
                    <p className="text-xs text-amber-400 font-mono font-bold mt-0.5">
                      {lastScanned.ticket?.tier_name}
                    </p>
                  </div>
                  <div className="text-left text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-1 text-slate-300">
                    <p className="flex justify-between">
                      <span className="text-slate-500">Ticket #:</span>
                      <span className="font-mono font-bold text-white">{lastScanned.ticket?.ticket_number}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">Event:</span>
                      <span className="truncate max-w-[180px] font-medium text-white">{lastScanned.ticket?.event_title}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">Check-In Time:</span>
                      <span className="font-mono text-emerald-400">{lastScanned.time}</span>
                    </p>
                  </div>
                </div>
              )}

              {lastScanned.status === 'already_scanned' && (
                <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-6 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/40">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">Duplicate Entry Alert</span>
                    <h4 className="text-lg font-black text-white mt-1">Ticket Already Used</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      This ticket was checked in previously at {lastScanned.time}. Please escort attendee to Helpdesk.
                    </p>
                  </div>
                </div>
              )}

              {lastScanned.status === 'invalid' && (
                <div className="bg-red-950/30 border border-red-500/40 rounded-2xl p-6 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/40">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-widest text-red-400 font-bold">Invalid / Counterfeit</span>
                    <h4 className="text-lg font-black text-white mt-1">Pass Not Recognized</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      No matching ticket was found in EVVEX verified issuer records.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 space-y-3 my-auto">
              <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-400">Scanner Ready</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Waiting for guest pass barcode or QR code scan.
              </p>
            </div>
          )}

          {/* Quick Check-In History */}
          <div className="border-t border-slate-800 pt-3">
            <span className="text-[11px] text-slate-400 uppercase font-bold block mb-2">Recent Gate Entries:</span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {tickets.filter(t => t.checked_in).map(t => (
                <div key={t.id} className="flex items-center justify-between text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850">
                  <span className="font-semibold text-white truncate max-w-[140px]">{t.attendee_name}</span>
                  <span className="text-emerald-400 font-mono text-[11px]">{t.tier_name}</span>
                  <span className="text-slate-500 text-[10px]">{t.checked_in_at || 'Just now'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
