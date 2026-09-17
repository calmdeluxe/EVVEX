/* EVVEX Event Platform Data and Simulation Engine */
import { User, Challenge, FeedPost, Transaction, AdminStats, EventItem, TicketTier, PurchasedTicket, EventVendor, PayoutRequest } from './types';

export const DEFAULT_USER: User = {
  id: 'usr_9921',
  username: 'winbigonly',
  email: 'winbigonly@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150',
  referralCode: 'EVVEX_VIP99',
  referredBy: undefined,
  balance: 45000.00,
  challengeEarnings: 0.00,
  referralEarnings: 0.00,
  totalEarnings: 0.00,
  membershipStatus: 'premium',
  appRole: 'admin',
  role: 'ceo'
};

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: 'ev_1',
    created_by: 'usr_9921',
    title: 'Lagos Afro-Fusion Gala & Live Sound Experience',
    slug: 'lagos-afro-fusion-gala-2026',
    tagline: 'The biggest celebration of contemporary African sound, culinary crafts, and live stage artistry.',
    description: 'Join top African performing artists, tastemakers, and music lovers for a night of curated Afrobeat rhythms, gourmet small chops, cocktails, and immersive visual art installations under the Atlantic skies.',
    category: 'concert',
    cover_image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200',
    venue_name: 'Eko Atlantic Grand Arena',
    venue_address: 'Ahmadu Bello Way, Victoria Island',
    city: 'Lagos',
    state: 'Lagos State',
    start_time: '2026-10-24T19:00:00Z',
    end_time: '2026-10-25T03:00:00Z',
    age_restriction: '18+',
    dress_code: 'Afro-Chic / Black Tie Glow',
    is_private: false,
    is_patron_only: false,
    status: 'published',
    max_capacity: 1200,
    created_at: '2026-09-01T10:00:00Z'
  },
  {
    id: 'ev_2',
    created_by: 'usr_host_2',
    title: 'The Billionaire Patron Society: Exclusive Art & Wine Gala',
    slug: 'billionaire-patron-art-gala',
    tagline: 'Private patron-only showcase featuring modern contemporary Nigerian masterpieces and fine wine.',
    description: 'An ultra-exclusive evening dedicated to private collectors, patron tier members, and patrons of culture. Features an open champagne bar, classical string quartet, and private art viewing with featured artists.',
    category: 'auction',
    cover_image: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?q=80&w=1200',
    venue_name: 'The Civic Centre Waterfront Terrace',
    venue_address: 'Ozumba Mbadiwe Avenue, Victoria Island',
    city: 'Lagos',
    state: 'Lagos State',
    start_time: '2026-10-31T18:30:00Z',
    end_time: '2026-10-31T23:30:00Z',
    age_restriction: '21+',
    dress_code: 'Strict Black Tie / Haute Couture',
    is_private: true,
    is_patron_only: true,
    status: 'published',
    max_capacity: 150,
    created_at: '2026-09-05T12:00:00Z'
  },
  {
    id: 'ev_3',
    created_by: 'usr_host_3',
    title: 'Abuja Tech Founders & Creatives Sunset Mixer',
    slug: 'abuja-tech-founders-sunset-mixer',
    tagline: 'Connect with high-growth startup founders, venture partners, and digital creators over drinks.',
    description: 'A curated networking mixer bringing together Abuja tech leaders, angel investors, and product innovators. High-signal fireside chats followed by a sunset rooftop cocktail reception.',
    category: 'mixer',
    cover_image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1200',
    venue_name: 'Transcorp Hilton Rooftop Deck',
    venue_address: '1 Aguiyi Ironsi St, Maitama',
    city: 'Abuja',
    state: 'FCT',
    start_time: '2026-11-07T17:00:00Z',
    end_time: '2026-11-07T22:00:00Z',
    age_restriction: 'All Ages',
    dress_code: 'Smart Casual / Tech Minimal',
    is_private: false,
    is_patron_only: false,
    status: 'published',
    max_capacity: 300,
    created_at: '2026-09-10T14:00:00Z'
  },
  {
    id: 'ev_4',
    created_by: 'usr_9921',
    title: 'Mainland Food & Craft Beer Fiesta',
    slug: 'mainland-food-craft-beer-fiesta',
    tagline: '50+ artisan Nigerian street food vendors, live grills, palmwine bar, and DJ battle.',
    description: 'The ultimate foodie weekend on the Mainland! Taste signature Suya skewers, smoky Asun, seafood boil, gourmet puff-puff creations, and microbrewed craft beer alongside non-stop DJ sets.',
    category: 'food',
    cover_image: 'https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=1200',
    venue_name: 'Ndubuisi Kanu Park Pavilion',
    venue_address: 'Mobolaji Johnson Ave, Alausa, Ikeja',
    city: 'Lagos',
    state: 'Lagos State',
    start_time: '2026-11-14T12:00:00Z',
    end_time: '2026-11-14T22:00:00Z',
    age_restriction: 'All Ages',
    dress_code: 'Casual Streetwear',
    is_private: false,
    is_patron_only: false,
    status: 'under_review',
    max_capacity: 800,
    created_at: '2026-09-12T09:30:00Z'
  }
];

export const INITIAL_TICKET_TIERS: TicketTier[] = [
  // For ev_1
  {
    id: 'tier_1_early',
    event_id: 'ev_1',
    name: 'Early Bird Pass',
    tier_type: 'early_bird',
    price_kobo: 1000000, // ₦10,000
    capacity: 200,
    sold_count: 184,
    perks: ['Standard Gate Access', 'Complimentary Welcome Drink']
  },
  {
    id: 'tier_1_standard',
    event_id: 'ev_1',
    name: 'General Admission',
    tier_type: 'standard',
    price_kobo: 1500000, // ₦15,000
    capacity: 500,
    sold_count: 240,
    perks: ['Standard Gate Access', 'Concert Arena Floor', 'Access to Food Village']
  },
  {
    id: 'tier_1_vip',
    event_id: 'ev_1',
    name: 'VIP Lounge Pass',
    tier_type: 'vip',
    price_kobo: 5000000, // ₦50,000
    capacity: 150,
    sold_count: 98,
    perks: ['Fast-track VIP Gate', 'Elevated Viewing Deck', '2 Complimentary Cocktails', 'Private Restrooms']
  },
  {
    id: 'tier_1_table',
    event_id: 'ev_1',
    name: 'VVIP Royal Table of 6',
    tier_type: 'table',
    price_kobo: 50000000, // ₦500,000
    capacity: 20,
    sold_count: 14,
    perks: ['Dedicated Table for 6', '2 Premium Champagne Bottles', 'Dedicated Waiter Service', 'Valet Parking Pass']
  },
  // For ev_2 (Patron only)
  {
    id: 'tier_2_patron',
    event_id: 'ev_2',
    name: 'Patron Society All-Access Pass',
    tier_type: 'patron_exclusive',
    price_kobo: 7500000, // ₦75,000
    capacity: 150,
    sold_count: 62,
    is_patron_only: true,
    perks: ['Private Yacht Jetty Access', 'Catalogue of Exhibited Works', 'Open Vintage Wine & Canapes', 'Meet & Greet with Curators']
  },
  // For ev_3
  {
    id: 'tier_3_standard',
    event_id: 'ev_3',
    name: 'Founder / Investor Ticket',
    tier_type: 'standard',
    price_kobo: 800000, // ₦8,000
    capacity: 250,
    sold_count: 110,
    perks: ['Fireside Session Access', 'Rooftop Cocktail Networking', 'Attendee Directory Access']
  }
];

export const INITIAL_TICKETS: PurchasedTicket[] = [
  {
    id: 'tkt_001',
    ticket_number: 'EVX-2026-98124',
    event_id: 'ev_1',
    event_title: 'Lagos Afro-Fusion Gala & Live Sound Experience',
    tier_id: 'tier_1_vip',
    tier_name: 'VIP Lounge Pass',
    user_id: 'usr_9921',
    attendee_name: 'Samuel Chukwuemeka',
    attendee_email: 'winbigonly@gmail.com',
    attendee_phone: '+234 803 123 4567',
    price_paid_kobo: 5000000,
    paystack_reference: 'PSTK_EVX_9812401',
    payment_status: 'success',
    checked_in: false,
    qr_code_hash: 'EVX-QR-98124-LGS-AFRO',
    created_at: '2026-09-15T16:20:00Z',
    event_date: 'Oct 24, 2026 • 7:00 PM',
    event_venue: 'Eko Atlantic Grand Arena',
    event_city: 'Lagos'
  },
  {
    id: 'tkt_002',
    ticket_number: 'EVX-2026-74512',
    event_id: 'ev_2',
    event_title: 'The Billionaire Patron Society: Exclusive Art & Wine Gala',
    tier_id: 'tier_2_patron',
    tier_name: 'Patron Society All-Access Pass',
    user_id: 'usr_9921',
    attendee_name: 'Samuel Chukwuemeka',
    attendee_email: 'winbigonly@gmail.com',
    attendee_phone: '+234 803 123 4567',
    price_paid_kobo: 7500000,
    paystack_reference: 'PSTK_EVX_7451202',
    payment_status: 'success',
    checked_in: false,
    qr_code_hash: 'EVX-QR-74512-PATRON-ART',
    created_at: '2026-09-16T11:05:00Z',
    event_date: 'Oct 31, 2026 • 6:30 PM',
    event_venue: 'The Civic Centre Waterfront Terrace',
    event_city: 'Lagos'
  }
];

export const INITIAL_VENDORS: EventVendor[] = [
  {
    id: 'vnd_1',
    event_id: 'ev_1',
    vendor_name: 'Sizzle & Smoke Gourmet Grills',
    service_category: 'catering',
    agreed_fee_kobo: 65000000, // ₦650,000
    contract_status: 'accepted',
    notes: 'Provides 3 live grill stations with Asun, Lamb Chops, and Tiger Prawns'
  },
  {
    id: 'vnd_2',
    event_id: 'ev_1',
    vendor_name: 'DJ Spinall & Atlantic Sounds',
    service_category: 'dj',
    agreed_fee_kobo: 120000000, // ₦1,200,000
    contract_status: 'accepted',
    notes: 'Main stage live set from 10:00 PM to 2:00 AM'
  },
  {
    id: 'vnd_3',
    event_id: 'ev_1',
    vendor_name: 'Apex Elite Security & Bouncers',
    service_category: 'security',
    agreed_fee_kobo: 40000000, // ₦400,000
    contract_status: 'briefed',
    notes: '12 security operatives at gates and VIP enclosures'
  }
];

export const INITIAL_PAYOUT_REQUESTS: PayoutRequest[] = [
  {
    id: 'payout_1',
    event_id: 'ev_1',
    event_title: 'Lagos Afro-Fusion Gala',
    host_id: 'usr_9921',
    host_name: 'Samuel Chukwuemeka',
    gross_revenue_kobo: 1420000000, // ₦14.2M
    platform_fee_kobo: 71000000,   // ₦710,000 (5%)
    net_payout_kobo: 1349000000,   // ₦13.49M
    bank_name: 'Guaranty Trust Bank (GTBank)',
    account_number: '0123456789',
    account_name: 'EVVEX LIVE ENTERTAINMENT LTD',
    status: 'pending',
    created_at: '2026-09-16T18:00:00Z'
  }
];

export const NIGERIAN_BANKS = [
  'Guaranty Trust Bank (GTBank)',
  'Zenith Bank',
  'Access Bank',
  'First Bank of Nigeria',
  'United Bank for Africa (UBA)',
  'Stanbic IBTC Bank',
  'Kuda Bank',
  'Opay',
  'Palmpay',
  'Fidelity Bank',
  'Wema Bank (ALAT)'
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_1',
    type: 'deposit',
    amount: 50000,
    date: '2026-09-14 10:30',
    status: 'success',
    description: 'Paystack Card Top-up to EVVEX Wallet',
    reference: 'PAY-PSTK-0914-991'
  },
  {
    id: 'tx_2',
    type: 'entry_fee',
    amount: 5000,
    date: '2026-09-15 16:20',
    status: 'success',
    description: 'Purchased VIP Pass: Lagos Afro-Fusion Gala',
    reference: 'TKT-EVX-98124'
  }
];

export const INITIAL_CHALLENGES: Challenge[] = [];
export const INITIAL_FEED_POSTS: FeedPost[] = [];

export const INITIAL_ADMIN_STATS: AdminStats = {
  totalUsers: 14200,
  activeUsers: 6840,
  totalRevenue: 28450000.00, // ₦28.45M
  totalTransactionsNum: 18450,
  totalCompetitions: 38 // Total Events
};

export const INITIAL_REPORTS = [];

