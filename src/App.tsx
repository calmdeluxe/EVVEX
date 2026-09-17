import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { 
  User, EventItem, TicketTier, PurchasedTicket, PayoutRequest, 
  Transaction, AppRole, VendorProfile, VendorOpportunity, 
  VendorAgreement, MprCampaign, MprReferral, AdminStats 
} from './types';
import {
  DEFAULT_USER,
  INITIAL_EVENTS,
  INITIAL_TICKET_TIERS,
  INITIAL_TICKETS,
  INITIAL_VENDOR_PROFILES,
  INITIAL_VENDOR_OPPORTUNITIES,
  INITIAL_VENDOR_AGREEMENTS,
  INITIAL_MPR_CAMPAIGNS,
  INITIAL_MPR_REFERRALS,
  INITIAL_PAYOUT_REQUESTS,
  INITIAL_ADMIN_STATS,
  INITIAL_TRANSACTIONS
} from './data';

// EVEX Core Components
import { EvexNavbar } from './components/evex/EvexNavbar';
import { EvexLandingPage } from './components/evex/EvexLandingPage';
import { DiscoverEventsPage } from './components/evex/DiscoverEventsPage';
import { EventDetailsPage } from './components/evex/EventDetailsPage';
import { TicketSelectionPage } from './components/evex/TicketSelectionPage';
import { CheckoutPage } from './components/evex/CheckoutPage';
import { PaymentConfirmationPage } from './components/evex/PaymentConfirmationPage';
import { AttendeeDashboard } from './components/evex/AttendeeDashboard';
import { CreatorDashboard } from './components/evex/CreatorDashboard';
import { VendorDashboard } from './components/evex/VendorDashboard';
import { MprDashboard } from './components/evex/MprDashboard';
import { AdminDashboard } from './components/evex/AdminDashboard';
import { AuthModal } from './components/evex/AuthModal';

function AppContent() {
  const { user: authUser, profile, appRole: authAppRole, signOut } = useAuth();

  // Active User State
  const [currentUser, setCurrentUser] = useState<User>(() => {
    return {
      ...DEFAULT_USER,
      id: profile?.id || authUser?.id || DEFAULT_USER.id,
      email: profile?.email || authUser?.email || DEFAULT_USER.email,
      username: profile?.username || profile?.full_name || DEFAULT_USER.username,
      appRole: authAppRole || 'attendee',
      balance: profile?.balance !== undefined ? Number(profile.balance) : DEFAULT_USER.balance
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
  }, [profile, authUser, authAppRole]);

  // Master Navigation View State
  const [currentView, setCurrentView] = useState<string>('landing');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Interactive Flow Context State
  const [selectedEvent, setSelectedEvent] = useState<EventItem>(INITIAL_EVENTS[0]);
  const [activeTicketSelection, setActiveTicketSelection] = useState<{
    tier: TicketTier;
    quantity: number;
    addOns: { id: string; name: string; priceKobo: number }[];
    totalKobo: number;
  } | null>(null);
  const [latestPurchasedTicket, setLatestPurchasedTicket] = useState<PurchasedTicket | null>(null);

  // Platform Data Collections
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>(INITIAL_TICKET_TIERS);
  const [purchasedTickets, setPurchasedTickets] = useState<PurchasedTicket[]>(INITIAL_TICKETS);
  const [vendorProfiles, setVendorProfiles] = useState<VendorProfile[]>(INITIAL_VENDOR_PROFILES);
  const [vendorOpportunities, setVendorOpportunities] = useState<VendorOpportunity[]>(INITIAL_VENDOR_OPPORTUNITIES);
  const [vendorAgreements, setVendorAgreements] = useState<VendorAgreement[]>(INITIAL_VENDOR_AGREEMENTS);
  const [mprCampaigns, setMprCampaigns] = useState<MprCampaign[]>(INITIAL_MPR_CAMPAIGNS);
  const [mprReferrals, setMprReferrals] = useState<MprReferral[]>(INITIAL_MPR_REFERRALS);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>(INITIAL_PAYOUT_REQUESTS);
  const [adminStats, setAdminStats] = useState<AdminStats>(INITIAL_ADMIN_STATS);
  const [usersList, setUsersList] = useState<User[]>([currentUser]);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');

  // Navigation Helper
  const handleNavigate = (view: string) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Switch Role Handler (Testing Switcher)
  const handleSwitchRole = (newRole: AppRole) => {
    setCurrentUser(prev => ({
      ...prev,
      appRole: newRole,
      isVip: newRole === 'patron' || prev.isVip
    }));

    // Auto-route to role's home view
    if (newRole === 'creator') handleNavigate('creator-dashboard');
    else if (newRole === 'vendor') handleNavigate('vendor-dashboard');
    else if (newRole === 'mpr') handleNavigate('mpr-dashboard');
    else if (newRole === 'admin') handleNavigate('admin-dashboard');
    else handleNavigate('attendee-dashboard');
  };

  // Event Selection Handler
  const handleSelectEvent = (event: EventItem) => {
    setSelectedEvent(event);
    handleNavigate('event-details');
  };

  // Proceed from Event Details to Ticket Selection
  const handleSelectTicketsForEvent = (event: EventItem) => {
    setSelectedEvent(event);
    handleNavigate('ticket-select');
  };

  // Proceed from Ticket Selection to Checkout
  const handleProceedToCheckout = (selection: {
    tier: TicketTier;
    quantity: number;
    addOns: { id: string; name: string; priceKobo: number }[];
    totalKobo: number;
  }) => {
    setActiveTicketSelection(selection);
    handleNavigate('checkout');
  };

  // Complete Payment & Generate Verified Cryptographic Pass
  const handlePaymentComplete = (paymentData: {
    attendeeName: string;
    attendeeEmail: string;
    attendeePhone: string;
    paymentMethod: 'wallet' | 'paystack';
    mprCode?: string;
  }) => {
    if (!activeTicketSelection) return;

    const totalKobo = activeTicketSelection.totalKobo;
    const ticketNumber = `EVX-${Math.floor(100000 + Math.random() * 900000)}`;
    const qrHash = `0x${Math.random().toString(16).substring(2, 10).toUpperCase()}-${ticketNumber}`;

    const newTicket: PurchasedTicket = {
      id: `tkt_${Date.now()}`,
      user_id: currentUser.id,
      ticket_number: ticketNumber,
      qr_code_hash: qrHash,
      event_id: selectedEvent.id,
      event_title: selectedEvent.title,
      event_date: new Date(selectedEvent.start_time).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
      }),
      event_venue: selectedEvent.venue_name,
      event_city: selectedEvent.city,
      tier_id: activeTicketSelection.tier.id,
      tier_name: activeTicketSelection.tier.name,
      tier_type: activeTicketSelection.tier.tier_type,
      seat_or_table_number: (activeTicketSelection.tier.tier_type === 'table' || activeTicketSelection.tier.tier_type === 'vvip') ? 'Table A-4' : undefined,
      attendee_name: paymentData.attendeeName,
      attendee_email: paymentData.attendeeEmail,
      attendee_phone: paymentData.attendeePhone,
      price_paid_kobo: totalKobo,
      purchase_date: new Date().toISOString(),
      checked_in: false,
      mpr_referral_code: paymentData.mprCode
    };

    // Update state
    setPurchasedTickets(prev => [newTicket, ...prev]);
    setLatestPurchasedTicket(newTicket);

    // If paid with wallet, deduct balance
    if (paymentData.paymentMethod === 'wallet') {
      setCurrentUser(prev => ({
        ...prev,
        balance: Math.max(0, prev.balance - totalKobo / 100)
      }));
    }

    // If MPR code provided, record commission referral
    if (paymentData.mprCode) {
      const commissionKobo = Math.round(totalKobo * 0.10); // 10%
      const newRef: MprReferral = {
        id: `ref_${Date.now()}`,
        campaign_id: 'mpr_camp_1',
        event_id: selectedEvent.id,
        event_title: selectedEvent.title,
        promoter_user_id: 'usr_tunde_mpr',
        promoter_code: paymentData.mprCode,
        buyer_name: paymentData.attendeeName,
        buyer_email: paymentData.attendeeEmail,
        ticket_count: activeTicketSelection.quantity,
        tier_name: activeTicketSelection.tier.name,
        gross_sale_kobo: totalKobo,
        commission_earned_kobo: commissionKobo,
        status: 'confirmed',
        created_at: new Date().toISOString()
      };
      setMprReferrals(prev => [newRef, ...prev]);
    }

    handleNavigate('confirmation');
  };

  // Creator Actions
  const handleCreateEvent = (newEvent: Partial<EventItem>, tiers: Partial<TicketTier>[]) => {
    const fullEvent: EventItem = {
      id: `ev_${Date.now()}`,
      created_by: currentUser.id,
      title: newEvent.title || 'Untitled Event',
      slug: (newEvent.title || 'event').toLowerCase().replace(/\s+/g, '-'),
      tagline: newEvent.tagline || '',
      description: newEvent.description || '',
      category: newEvent.category || 'concerts',
      cover_image: newEvent.cover_image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200',
      venue_name: newEvent.venue_name || 'Lagos Arena',
      venue_address: newEvent.venue_address || 'Victoria Island',
      city: newEvent.city || 'Lagos',
      start_time: newEvent.start_time || new Date(Date.now() + 86400000 * 7).toISOString(),
      end_time: newEvent.end_time,
      status: 'under_review',
      is_featured: false,
      max_capacity: newEvent.max_capacity || 500,
      current_attendee_count: 0,
      organizer_name: currentUser.username,
      organizer_email: currentUser.email
    };

    const fullTiers: TicketTier[] = tiers.map((t, idx) => ({
      id: `tier_${Date.now()}_${idx}`,
      event_id: fullEvent.id,
      name: t.name || 'Regular Access',
      description: 'Standard admission',
      price_kobo: t.price_kobo || 1000000,
      capacity: t.capacity || 200,
      sold_count: 0,
      is_active: true,
      perks: t.perks || ['Access to Event'],
      tier_type: t.tier_type || 'standard'
    }));

    setEvents(prev => [fullEvent, ...prev]);
    setTicketTiers(prev => [...prev, ...fullTiers]);
  };

  const handleRequestPayout = (payout: Partial<PayoutRequest>) => {
    const newPayout: PayoutRequest = {
      id: `po_${Date.now()}`,
      event_id: payout.event_id || selectedEvent.id,
      event_title: payout.event_title || selectedEvent.title,
      host_id: currentUser.id,
      host_name: currentUser.username,
      gross_revenue_kobo: payout.gross_revenue_kobo || 50000000,
      platform_fee_kobo: payout.platform_fee_kobo || 2500000,
      net_payout_kobo: payout.net_payout_kobo || 47500000,
      bank_name: payout.bank_name || 'Guaranty Trust Bank (GTBank)',
      account_number: payout.account_number || '0123456789',
      account_name: payout.account_name || currentUser.username,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    setPayoutRequests(prev => [newPayout, ...prev]);
  };

  // Vendor Actions
  const handleUpdateVendorProfile = (updated: Partial<VendorProfile>) => {
    setVendorProfiles(prev =>
      prev.map(v => (v.id === prev[0].id ? { ...v, ...updated } : v))
    );
  };

  const handleApplyVendorOpportunity = (oppId: string, quoteKobo: number, proposal: string) => {
    setVendorOpportunities(prev =>
      prev.map(o => (o.id === oppId ? { ...o, applicant_count: o.applicant_count + 1 } : o))
    );
  };

  // Admin Actions
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

  const handleVerifyVendor = (vendorId: string) => {
    setVendorProfiles(prev =>
      prev.map(v => (v.id === vendorId ? { ...v, is_verified: true } : v))
    );
  };

  const handleAuthLoginSuccess = (userPatch: Partial<User>) => {
    setCurrentUser(prev => ({
      ...prev,
      ...userPatch
    }));
    if (userPatch.appRole) {
      handleSwitchRole(userPatch.appRole);
    }
  };

  const selectedEventTiers = ticketTiers.filter(t => t.event_id === selectedEvent.id);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-amber-400 selection:text-slate-950 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Global EVEX Navbar with Master Role Switcher */}
      <EvexNavbar
        currentUser={currentUser}
        currentRole={currentUser.appRole || 'attendee'}
        currentView={currentView}
        onNavigate={handleNavigate}
        onSwitchRole={handleSwitchRole}
        onOpenAuth={(tab) => {
          setAuthModalTab(tab || 'signin');
          setIsAuthModalOpen(true);
        }}
        onSignOut={() => {
          setCurrentUser(DEFAULT_USER);
          handleNavigate('landing');
        }}
        myTicketsCount={purchasedTickets.length}
      />

      {/* Main View Router */}
      <main className="flex-1 w-full">
        {/* PAGE 1: PUBLIC LANDING & DISCOVERY HERO */}
        {currentView === 'landing' && (
          <EvexLandingPage
            events={events}
            onSelectEvent={handleSelectEvent}
            onExploreEvents={(catId) => {
              if (catId) setSelectedCategory(catId);
              handleNavigate('discover');
            }}
            onCreateEvent={() => {
              handleSwitchRole('creator');
              handleNavigate('creator-dashboard');
            }}
            onSignIn={() => {
              setAuthModalTab('signin');
              setIsAuthModalOpen(true);
            }}
          />
        )}

        {/* PAGE 2: DISCOVER EVENTS DIRECTORY */}
        {currentView === 'discover' && (
          <DiscoverEventsPage
            events={events.filter(e => e.status === 'published' || e.status === 'live')}
            ticketTiers={ticketTiers}
            selectedCategory={selectedCategory as any}
            onSelectEvent={handleSelectEvent}
            onBackToLanding={() => handleNavigate('landing')}
          />
        )}

        {/* PAGE 3: EVENT DETAILS */}
        {currentView === 'event-details' && (
          <EventDetailsPage
            event={selectedEvent}
            ticketTiers={selectedEventTiers.length > 0 ? selectedEventTiers : INITIAL_TICKET_TIERS.slice(0, 3)}
            onGetTickets={() => handleSelectTicketsForEvent(selectedEvent)}
            onBack={() => handleNavigate('discover')}
          />
        )}

        {/* PAGE 4: TICKET SELECTION & ADD-ONS */}
        {currentView === 'ticket-select' && (
          <TicketSelectionPage
            event={selectedEvent}
            ticketTiers={selectedEventTiers.length > 0 ? selectedEventTiers : INITIAL_TICKET_TIERS.slice(0, 3)}
            onProceedToCheckout={handleProceedToCheckout}
            onBack={() => handleNavigate('event-details')}
          />
        )}

        {/* PAGE 5: CHECKOUT & ATTENDEE DETAILS */}
        {currentView === 'checkout' && activeTicketSelection && (
          <CheckoutPage
            event={selectedEvent}
            selection={activeTicketSelection}
            currentUser={currentUser}
            onPaymentComplete={handlePaymentComplete}
            onBack={() => handleNavigate('ticket-select')}
          />
        )}

        {/* PAGE 6 & 7: PAYMENT CONFIRMATION & VERIFIED DIGITAL PASS */}
        {currentView === 'confirmation' && latestPurchasedTicket && (
          <PaymentConfirmationPage
            ticket={latestPurchasedTicket}
            event={selectedEvent}
            onGoToDashboard={() => handleNavigate('attendee-dashboard')}
            onExploreMore={() => handleNavigate('discover')}
          />
        )}

        {/* LAYER 2: ATTENDEE & VIP ACCOUNT DASHBOARD */}
        {(currentView === 'attendee-dashboard' || currentView === 'my-tickets') && (
          <AttendeeDashboard
            currentUser={currentUser}
            tickets={purchasedTickets}
            events={events}
            onExploreEvents={() => handleNavigate('discover')}
            onSelectEvent={handleSelectEvent}
          />
        )}

        {/* LAYER 3: CREATOR / ORGANIZER HUB */}
        {currentView === 'creator-dashboard' && (
          <CreatorDashboard
            currentUser={currentUser}
            events={events}
            ticketTiers={ticketTiers}
            purchasedTickets={purchasedTickets}
            onCreateEvent={handleCreateEvent}
            onRequestPayout={handleRequestPayout}
          />
        )}

        {/* LAYER 4: VENDOR BUSINESS PORTAL */}
        {currentView === 'vendor-dashboard' && (
          <VendorDashboard
            currentUser={currentUser}
            vendorProfile={vendorProfiles[0]}
            opportunities={vendorOpportunities}
            agreements={vendorAgreements}
            onUpdateProfile={handleUpdateVendorProfile}
            onApplyOpportunity={handleApplyVendorOpportunity}
          />
        )}

        {/* LAYER 5: MPR (MARKETING PARTNER) DASHBOARD */}
        {currentView === 'mpr-dashboard' && (
          <MprDashboard
            currentUser={currentUser}
            campaigns={mprCampaigns}
            referrals={mprReferrals}
          />
        )}

        {/* LAYER 5: ADMIN PLATFORM OPERATIONS CONSOLE */}
        {currentView === 'admin-dashboard' && (
          <AdminDashboard
            currentUser={currentUser}
            events={events}
            users={usersList}
            vendors={vendorProfiles}
            payouts={payoutRequests}
            stats={adminStats}
            onApproveEvent={handleApproveEvent}
            onRejectEvent={handleRejectEvent}
            onApprovePayout={handleApprovePayout}
            onVerifyVendor={handleVerifyVendor}
          />
        )}
      </main>

      {/* Persistent EVEX Platform Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-10 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-md shadow-amber-400/20">
              E
            </div>
            <div>
              <span className="font-black text-amber-400 font-['Syne'] text-base tracking-tight block">
                EVEX
              </span>
              <span className="text-slate-400 text-[11px]">
                Nigeria's Premier Event Discovery, Ticketing & Live Experience Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <button onClick={() => handleNavigate('discover')} className="hover:text-amber-400 transition">
              Explore Events
            </button>
            <button 
              onClick={() => {
                handleSwitchRole('creator');
                handleNavigate('creator-dashboard');
              }} 
              className="hover:text-amber-400 transition"
            >
              For Creators
            </button>
            <button 
              onClick={() => {
                handleSwitchRole('vendor');
                handleNavigate('vendor-dashboard');
              }} 
              className="hover:text-amber-400 transition"
            >
              For Vendors
            </button>
            <button 
              onClick={() => {
                handleSwitchRole('mpr');
                handleNavigate('mpr-dashboard');
              }} 
              className="hover:text-amber-400 transition"
            >
              MPR Program
            </button>
          </div>

          <p className="text-slate-500 text-[11px] text-center md:text-right">
            Victoria Island, Lagos • FCT Abuja • © {new Date().getFullYear()} EVEX Technologies Ltd.
          </p>
        </div>
      </footer>

      {/* Auth / Demo Profile Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialTab={authModalTab}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleAuthLoginSuccess}
      />
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
