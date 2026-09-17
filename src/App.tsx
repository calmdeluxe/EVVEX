import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { User, EventItem, TicketTier, PurchasedTicket, PayoutRequest, Transaction, AppRole } from './types';
import {
  DEFAULT_USER,
  INITIAL_EVENTS,
  INITIAL_TICKET_TIERS,
  INITIAL_TICKETS,
  INITIAL_PAYOUT_REQUESTS,
  INITIAL_TRANSACTIONS
} from './data';
import { EvvexNavbar } from './components/evvex/EvvexNavbar';
import { EventsExplorer } from './components/evvex/EventsExplorer';
import { EventDetailModal } from './components/evvex/EventDetailModal';
import { HostHub } from './components/evvex/HostHub';
import { GateScanner } from './components/evvex/GateScanner';
import { AdminMprHub } from './components/evvex/AdminMprHub';
import { MyTicketsAndWallet } from './components/evvex/MyTicketsAndWallet';
import { PatronLounge } from './components/evvex/PatronLounge';
import { DepositModal } from './components/evvex/DepositModal';
import Toast, { ToastMessage } from './components/Toast';

function AppContent() {
  const { user: authUser, profile, isAdmin: authIsAdmin, appRole: authAppRole, signOut } = useAuth();

  // Active User State
  const [currentUser, setCurrentUser] = useState<User>(() => {
    return {
      ...DEFAULT_USER,
      id: profile?.id || authUser?.id || DEFAULT_USER.id,
      email: profile?.email || authUser?.email || DEFAULT_USER.email,
      username: profile?.username || profile?.full_name || 'Samuel Chukwuemeka',
      appRole: authAppRole || 'admin',
      balance: profile?.balance !== undefined ? Number(profile.balance) : 45000
    };
  });

  // Keep currentUser in sync when auth profile updates
  useEffect(() => {
    if (profile || authUser) {
      setCurrentUser(prev => ({
        ...prev,
        id: profile?.id || authUser?.id || prev.id,
        email: profile?.email || authUser?.email || prev.email,
        username: profile?.username || profile?.full_name || prev.username,
        appRole: authAppRole || profile?.app_role || prev.appRole,
        balance: profile?.balance !== undefined ? Number(profile.balance) : prev.balance
      }));
    }
  }, [profile, authUser, authIsAdmin, authAppRole]);

  // Tab State
  const [activeTab, setActiveTab] = useState<
    'explore' | 'my-tickets' | 'host-hub' | 'gate-scanner' | 'patron-lounge' | 'admin-queue' | 'wallet'
  >('explore');

  // EVVEX Platform Data Collections
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>(INITIAL_TICKET_TIERS);
  const [purchasedTickets, setPurchasedTickets] = useState<PurchasedTicket[]>(INITIAL_TICKETS);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>(INITIAL_PAYOUT_REQUESTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  // Modals
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<EventItem | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Switch role handler for testing all permissions
  const handleSwitchRole = (newRole: AppRole) => {
    setCurrentUser(prev => ({
      ...prev,
      appRole: newRole
    }));
    addToast(`Switched active view to ${newRole.toUpperCase().replace('_', ' ')} persona`, 'info');
  };

  // Ticket checkout handler
  const handleTicketPurchased = (ticket: PurchasedTicket, updatedUser: User) => {
    setPurchasedTickets(prev => [ticket, ...prev]);
    setCurrentUser(updatedUser);
    // Update tier sold count
    setTicketTiers(prev =>
      prev.map(t => (t.id === ticket.tier_id ? { ...t, sold_count: t.sold_count + 1 } : t))
    );
    // Add transaction record
    setTransactions(prev => [
      {
        id: `tx_${Date.now()}`,
        type: 'purchase',
        amount: ticket.price_paid_kobo / 100,
        date: 'Today',
        status: 'completed',
        reference: ticket.paystack_reference,
        description: `Ticket: ${ticket.event_title} (${ticket.tier_name})`
      },
      ...prev
    ]);
  };

  // Check-In Ticket at Gate
  const handleCheckInTicket = (ticketId: string) => {
    const nowTime = new Date().toLocaleTimeString();
    setPurchasedTickets(prev =>
      prev.map(t =>
        t.id === ticketId
          ? {
              ...t,
              checked_in: true,
              checked_in_at: nowTime,
              scanned_by: currentUser.username
            }
          : t
      )
    );
  };

  // Add New Event from Host
  const handleAddEvent = (newEvent: EventItem, newTiers: TicketTier[]) => {
    setEvents(prev => [newEvent, ...prev]);
    setTicketTiers(prev => [...prev, ...newTiers]);
  };

  // Request Payout
  const handleRequestPayout = (payout: PayoutRequest) => {
    setPayoutRequests(prev => [payout, ...prev]);
  };

  // Admin / MPR Approvals
  const handleApproveEvent = (eventId: string) => {
    setEvents(prev =>
      prev.map(e => (e.id === eventId ? { ...e, status: 'published' } : e))
    );
  };

  const handleRejectEvent = (eventId: string, reason: string) => {
    setEvents(prev =>
      prev.map(e => (e.id === eventId ? { ...e, status: 'draft' } : e))
    );
  };

  const handleApprovePayout = (payoutId: string) => {
    setPayoutRequests(prev =>
      prev.map(p => (p.id === payoutId ? { ...p, status: 'disbursed' } : p))
    );
  };

  const handleUpdateUserRole = (userId: string, newRole: AppRole) => {
    if (currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, appRole: newRole }));
    }
  };

  // Deposit Success
  const handleDepositSuccess = (updatedUser: User, newTx: Transaction) => {
    setCurrentUser(updatedUser);
    setTransactions(prev => [newTx, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-amber-400 selection:text-slate-950">
      {/* EVVEX Navigation Bar */}
      <EvvexNavbar
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onSwitchRole={handleSwitchRole}
        onOpenDeposit={() => setIsDepositModalOpen(true)}
      />

      {/* Main Body View */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeTab === 'explore' && (
          <EventsExplorer
            events={events}
            ticketTiers={ticketTiers}
            isPatron={currentUser.appRole === 'patron' || currentUser.appRole === 'admin'}
            onSelectEvent={setSelectedEventForDetail}
            onOpenCreateEvent={() => setActiveTab('host-hub')}
          />
        )}

        {activeTab === 'my-tickets' && (
          <MyTicketsAndWallet
            currentUser={currentUser}
            tickets={purchasedTickets}
            transactions={transactions}
            onOpenDeposit={() => setIsDepositModalOpen(true)}
            onToast={addToast}
          />
        )}

        {activeTab === 'host-hub' && (
          <HostHub
            currentUser={currentUser}
            events={events}
            ticketTiers={ticketTiers}
            payoutRequests={payoutRequests}
            onAddEvent={handleAddEvent}
            onRequestPayout={handleRequestPayout}
            onToast={addToast}
          />
        )}

        {activeTab === 'gate-scanner' && (
          <GateScanner
            tickets={purchasedTickets}
            onCheckInTicket={handleCheckInTicket}
            onToast={addToast}
          />
        )}

        {activeTab === 'patron-lounge' && (
          <PatronLounge
            currentUser={currentUser}
            events={events}
            onSelectEvent={setSelectedEventForDetail}
            onUpgradeToPatron={() => handleSwitchRole('patron')}
          />
        )}

        {activeTab === 'admin-queue' && (
          <AdminMprHub
            currentUser={currentUser}
            events={events}
            payoutRequests={payoutRequests}
            allUsers={[currentUser]}
            onApproveEvent={handleApproveEvent}
            onRejectEvent={handleRejectEvent}
            onApprovePayout={handleApprovePayout}
            onUpdateUserRole={handleUpdateUserRole}
            onToast={addToast}
          />
        )}

        {activeTab === 'wallet' && (
          <MyTicketsAndWallet
            currentUser={currentUser}
            tickets={purchasedTickets}
            transactions={transactions}
            onOpenDeposit={() => setIsDepositModalOpen(true)}
            onToast={addToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-amber-400 font-['Syne'] text-base tracking-tight">EVVEX</span>
            <span>• Nigeria Premier Events & VIP Ticketing Platform</span>
          </div>
          <p className="text-slate-400">
            Victoria Island, Lagos • Central Business District, Abuja • All rights reserved.
          </p>
        </div>
      </footer>

      {/* Interactive Event Checkout Modal */}
      <EventDetailModal
        event={selectedEventForDetail}
        ticketTiers={ticketTiers}
        currentUser={currentUser}
        onClose={() => setSelectedEventForDetail(null)}
        onTicketPurchased={handleTicketPurchased}
        onToast={addToast}
      />

      {/* Paystack Deposit Modal */}
      {isDepositModalOpen && (
        <DepositModal
          currentUser={currentUser}
          onClose={() => setIsDepositModalOpen(false)}
          onDepositSuccess={handleDepositSuccess}
          onToast={addToast}
        />
      )}

      {/* Floating Toast Notification System */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
