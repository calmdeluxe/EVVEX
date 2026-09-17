import React, { useState } from 'react';
import { PurchasedTicket, Transaction, User } from '../../types';
import { Ticket, Wallet, ArrowDownLeft, ArrowUpRight, QrCode, Calendar, MapPin, CheckCircle2, Copy } from 'lucide-react';

interface MyTicketsAndWalletProps {
  currentUser: User;
  tickets: PurchasedTicket[];
  transactions: Transaction[];
  onOpenDeposit: () => void;
  onToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const MyTicketsAndWallet: React.FC<MyTicketsAndWalletProps> = ({
  currentUser,
  tickets,
  transactions,
  onOpenDeposit,
  onToast
}) => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'wallet'>('tickets');
  const [activeQrModalTicket, setActiveQrModalTicket] = useState<PurchasedTicket | null>(null);

  const myTickets = tickets.filter(t => t.user_id === currentUser.id);

  const copyTicketCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    onToast(`Ticket code ${code} copied to clipboard!`, 'info');
  };

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Header with quick tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            My Passes & EVVEX Wallet
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Access your verified entry QR codes and manage Naira transactions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tickets'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>My Entry Passes ({myTickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'wallet'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Wallet & Balance</span>
          </button>
        </div>
      </div>

      {/* Tab: Tickets */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {myTickets.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Tickets Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You haven't reserved any event passes yet. Browse live experiences in Lagos, Abuja, or Port Harcourt to book.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {myTickets.map(ticket => (
                <div
                  key={ticket.id}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-400/40 rounded-3xl p-6 relative overflow-hidden transition-all shadow-lg flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase font-bold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-md border border-amber-400/20">
                        {ticket.tier_name}
                      </span>
                      <h4 className="text-lg font-bold text-white font-['Syne'] mt-1">
                        {ticket.event_title}
                      </h4>
                      <div className="text-xs text-slate-400 space-y-0.5 pt-1">
                        <p className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {ticket.event_date}
                        </p>
                        <p className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {ticket.event_venue}, {ticket.event_city}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        ticket.checked_in
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {ticket.checked_in ? 'Checked In' : 'Active Pass'}
                      </span>
                    </div>
                  </div>

                  {/* Cutout Ticket Divider */}
                  <div className="border-t-2 border-dashed border-slate-800 -mx-6 px-6 pt-4 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Ticket Code</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-bold text-white">{ticket.ticket_number}</span>
                        <button
                          onClick={() => copyTicketCode(ticket.ticket_number)}
                          className="text-slate-500 hover:text-amber-400 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveQrModalTicket(ticket)}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-400/20 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Show QR Pass</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Wallet */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          {/* Naira Balance Card */}
          <div className="bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
            <div>
              <span className="text-xs text-emerald-400 uppercase font-bold tracking-wider block">
                Available EVVEX Naira Balance
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white font-mono mt-1">
                ₦{currentUser.balance.toLocaleString('en-NG')}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Instant checkout for all Nigerian live events and patron experiences.
              </p>
            </div>

            <button
              onClick={onOpenDeposit}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-2xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4 stroke-[3]" />
              <span>Top Up with Paystack</span>
            </button>
          </div>

          {/* Transactions Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white font-['Syne']">Recent Activity Log</h3>
            <div className="divide-y divide-slate-800 text-xs">
              {transactions.length === 0 ? (
                <p className="text-slate-500 py-4 text-center">No transactions recorded yet.</p>
              ) : (
                transactions.map(tx => (
                  <div key={tx.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="font-bold text-white">{tx.description}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{tx.date} • Ref: {tx.reference}</p>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold text-sm ${
                        tx.type === 'deposit' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {tx.type === 'deposit' ? '+' : '-'}₦{tx.amount.toLocaleString('en-NG')}
                      </span>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">{tx.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Pass Modal */}
      {activeQrModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-amber-400/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 text-center shadow-2xl relative">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Gate Entrance Pass</span>
              <h3 className="text-lg font-bold text-white font-['Syne']">{activeQrModalTicket.event_title}</h3>
              <p className="text-xs text-slate-400">{activeQrModalTicket.tier_name}</p>
            </div>

            {/* QR Visual */}
            <div className="bg-white p-5 rounded-2xl max-w-[220px] mx-auto shadow-xl">
              <div className="w-44 h-44 border-4 border-dashed border-slate-900/30 rounded-xl flex items-center justify-center bg-slate-100">
                <div className="text-center">
                  <p className="font-mono text-base font-black text-slate-900 tracking-tighter">|||||||||||||||||||</p>
                  <p className="font-mono text-xs font-bold text-slate-800 mt-2">{activeQrModalTicket.ticket_number}</p>
                  <p className="font-mono text-[9px] text-emerald-600 font-bold uppercase mt-1">● VERIFIED TICKET</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-2 font-medium">Present to scanner staff</p>
            </div>

            <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 text-left space-y-1">
              <p><span className="text-slate-500">Attendee:</span> <strong className="text-white">{activeQrModalTicket.attendee_name}</strong></p>
              <p><span className="text-slate-500">Venue:</span> <span className="text-white">{activeQrModalTicket.event_venue}</span></p>
            </div>

            <button
              onClick={() => setActiveQrModalTicket(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
