/* EVEX Event Platform Data and Simulation Engine */
import { 
  User, 
  EventItem, 
  TicketTier, 
  PurchasedTicket, 
  EventVendor, 
  PayoutRequest, 
  Transaction, 
  AdminStats,
  VendorProfile,
  VendorOpportunity,
  VendorAgreement,
  MprCampaign,
  MprReferral,
  EventCategoryType
} from './types';

export const EVENT_CATEGORIES: { id: EventCategoryType; name: string; iconName: string; count: number }[] = [
  { id: 'all', name: 'All Events', iconName: 'Sparkles', count: 10 },
  { id: 'concerts', name: 'Concerts', iconName: 'Music', count: 1 },
  { id: 'parties', name: 'Parties', iconName: 'PartyPopper', count: 1 },
  { id: 'seminars', name: 'Seminars', iconName: 'GraduationCap', count: 1 },
  { id: 'church_praise', name: 'Church/Praise Events', iconName: 'HeartHandshake', count: 1 },
  { id: 'food_events', name: 'Food Events', iconName: 'Utensils', count: 1 },
  { id: 'launches', name: 'Launches', iconName: 'Rocket', count: 1 },
  { id: 'birthdays', name: 'Birthdays', iconName: 'Gift', count: 1 },
  { id: 'pageantry', name: 'Pageantry', iconName: 'Crown', count: 1 },
  { id: 'podcasts', name: 'Podcasts', iconName: 'Mic', count: 1 },
  { id: 'auctions_sales', name: 'Auctions/Sales', iconName: 'Tag', count: 1 },
  { id: 'book_reading', name: 'Book/Reading Events', iconName: 'BookOpen', count: 1 },
  { id: 'social_events', name: 'Social Events', iconName: 'Users', count: 1 },
  { id: 'custom_events', name: 'Custom Events', iconName: 'CalendarPlus', count: 0 }
];

export const DEFAULT_USER: User = {
  id: 'usr_9921',
  username: 'winbigonly',
  email: 'winbigonly@gmail.com',
  phone: '+234 803 123 4567',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150',
  referralCode: 'EVEX_VIP99',
  referredBy: undefined,
  balance: 45000.00,
  isVip: true,
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
    description: 'Join top African performing artists, tastemakers, and music lovers for an unforgettable night of curated Afrobeat rhythms, gourmet small chops, bespoke cocktails, and immersive visual art installations under the Atlantic skies.',
    category: 'concerts',
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
    organizer_name: 'Soundwave Africa Live',
    organizer_email: 'concerts@soundwave.africa',
    organizer_phone: '+234 802 334 9901',
    rules: [
      'Digital or physical QR ticket must be verified at security checkpoint.',
      'No illicit substances, weapons, or outside beverages permitted.',
      'Strict adherence to Afro-Chic / Black Tie Glow dress code.',
      'Re-entry is only permitted with active wristband authentication.'
    ],
    what_to_expect: [
      '3 Live performing headline African artists and 5 premier DJs',
      'Curated food village with 12 artisan African grill stalls',
      'VIP elevated mezzanine with private bottle service and restrooms',
      'Professional photography booths and souvenir gifting'
    ],
    refund_policy: 'Full refund if cancelled at least 72 hours prior to doors opening. No refunds within 48 hours.',
    access_instructions_sensitive: 'VIP ticket holders use Gate 3 North (VIP Red Carpet corridor). Tables check in at Concierge Suite B for wristband and table escorts.',
    created_at: '2026-09-01T10:00:00Z'
  },
  {
    id: 'ev_2',
    created_by: 'usr_host_2',
    title: 'The Billionaire Patron Society: Exclusive Art & Wine Gala',
    slug: 'billionaire-patron-art-gala',
    tagline: 'Private VIP showcase featuring modern contemporary Nigerian masterpieces and vintage champagne.',
    description: 'An ultra-exclusive evening dedicated to private collectors, VIP members, and patrons of arts. Features an open champagne bar, classical string quartet, and private art viewing with award-winning master sculptors.',
    category: 'auctions_sales',
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
    is_vip_only: true,
    status: 'published',
    max_capacity: 150,
    organizer_name: 'Heritage Art Foundation',
    organizer_email: 'curator@heritageart.ng',
    rules: [
      'Strict guest list RSVP verification; government ID required.',
      'Photography strictly prohibited in private bidding chamber.',
      'Black tie formal mandatory; guests without formal attire will be denied entry.'
    ],
    what_to_expect: [
      'Live auction of 25 curated West African contemporary masterworks',
      'Vintage champagne tasting guided by French sommelier',
      'Classical cello and harp live accompaniments'
    ],
    refund_policy: 'Patron donations and table reservations are non-refundable but transferable with 24-hour advance notice.',
    access_instructions_sensitive: 'Valet parking at Civic Centre Jetty entrance. Private elevator code: 8492 to Terrace.',
    created_at: '2026-09-05T12:00:00Z'
  },
  {
    id: 'ev_3',
    created_by: 'usr_host_3',
    title: 'Abuja Tech Founders & Creatives Sunset Mixer',
    slug: 'abuja-tech-founders-sunset-mixer',
    tagline: 'Connect with high-growth startup founders, venture partners, and digital creators over drinks.',
    description: 'A curated networking mixer bringing together Abuja tech leaders, angel investors, and product innovators. High-signal fireside chats followed by a sunset rooftop cocktail reception overlooking the city hills.',
    category: 'seminars',
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
    organizer_name: 'Silicon FCT Network',
    organizer_email: 'hello@siliconfct.org',
    rules: [
      'Name tag collection begins at 4:30 PM.',
      'Fireside sessions are off-the-record unless specified otherwise.'
    ],
    what_to_expect: [
      'Keynote on Venture Capital in West Africa 2026',
      'Cocktail buffet and networking breakouts',
      'Founder demo booths and pitch feedback'
    ],
    refund_policy: '100% refund up to 48 hours before the event.',
    access_instructions_sensitive: 'Elevator to 8th Floor Rooftop, proceed through Glass Pavilion B.',
    created_at: '2026-09-10T14:00:00Z'
  },
  {
    id: 'ev_4',
    created_by: 'usr_9921',
    title: 'Mainland Food & Craft Beer Fiesta',
    slug: 'mainland-food-craft-beer-fiesta',
    tagline: '50+ artisan Nigerian street food vendors, live grills, palmwine bar, and DJ battle.',
    description: 'The ultimate foodie weekend on the Mainland! Taste signature Suya skewers, smoky Asun, seafood boil, gourmet puff-puff creations, and microbrewed craft beer alongside non-stop DJ sets.',
    category: 'food_events',
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
    status: 'published',
    max_capacity: 800,
    organizer_name: 'Lagos Food Crawlers',
    organizer_email: 'foodies@lagosfood.ng',
    rules: [
      'Food tasting tokens can be purchased at central cashless kiosks.',
      'Family friendly environment; children under 10 enter free with adult.'
    ],
    what_to_expect: ['Live grilling competitions', 'Craft beer & fresh palmwine stalls', 'Children play zone'],
    refund_policy: 'Refundable up to 24 hours prior to event.',
    access_instructions_sensitive: 'Main pedestrian gate on Mobolaji Johnson Ave. Scanner booth 1-4.',
    created_at: '2026-09-12T09:30:00Z'
  },
  {
    id: 'ev_5',
    created_by: 'usr_host_5',
    title: 'Unbroken Worship: Night of Grace & Atmospheric Praise',
    slug: 'unbroken-worship-night-of-grace',
    tagline: 'An uplifting night of sacred music, orchestral worship, and spiritual renewal.',
    description: 'Gather with thousands of believers for an uninterrupted night of deep worship, choral hymns, and heartfelt praise led by prominent gospel ministers and mass gospel choirs.',
    category: 'church_praise',
    cover_image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200',
    venue_name: 'House on the Rock Sanctuary',
    venue_address: 'The Rock Cathedral, Lekki Phase 1',
    city: 'Lagos',
    state: 'Lagos State',
    start_time: '2026-11-20T20:00:00Z',
    end_time: '2026-11-21T04:00:00Z',
    age_restriction: 'All Ages',
    dress_code: 'Modest White / Church Attire',
    is_private: false,
    is_patron_only: false,
    status: 'published',
    max_capacity: 5000,
    organizer_name: 'Grace & Life Ministries',
    organizer_email: 'info@gracelife.org',
    rules: ['Free registration RSVP required for seat reservations', 'Please keep mobile phones on silent'],
    what_to_expect: ['30-piece orchestra', 'Live gospel worship leaders', 'Free prayer communion booklets'],
    refund_policy: 'Free community event; donations welcome.',
    access_instructions_sensitive: 'Gate 2 parking lot open from 6:30 PM. Ushers at Main Lobby Foyer.',
    created_at: '2026-09-13T10:00:00Z'
  },
  {
    id: 'ev_6',
    created_by: 'usr_host_6',
    title: 'PayForge 3.0: Africa Fintech Launch & Product Summit',
    slug: 'payforge-3-fintech-product-launch',
    tagline: 'Unveiling next-generation cross-border payment infrastructure for African commerce.',
    description: 'Industry leaders, banking executives, and global technology innovators gather for the public launch of PayForge 3.0 API engine, developer showcases, and institutional panels.',
    category: 'launches',
    cover_image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200',
    venue_name: 'Landmark Centre Event Hall 1',
    venue_address: 'Water Corporation Drive, Oniru, Victoria Island',
    city: 'Lagos',
    state: 'Lagos State',
    start_time: '2026-11-28T09:00:00Z',
    end_time: '2026-11-28T16:00:00Z',
    age_restriction: 'Professional',
    dress_code: 'Business Formal / Smart Executive',
    is_private: false,
    is_patron_only: false,
    status: 'published',
    max_capacity: 650,
    organizer_name: 'PayForge Technologies Inc.',
    organizer_email: 'launch@payforge.africa',
    rules: ['Badge lanyard must be worn at all times in Exhibition Halls'],
    what_to_expect: ['Keynote live demos', 'Developer hack lounge', 'Executive catered luncheon'],
    refund_policy: 'Tickets refundable up to 7 days before event.',
    access_instructions_sensitive: 'Badge pickup starts at 8:00 AM at Registration Desk 3.',
    created_at: '2026-09-14T11:00:00Z'
  },
  {
    id: 'ev_7',
    created_by: 'usr_host_7',
    title: 'Royal Velvet 30th Milestone Birthday Soirée',
    slug: 'royal-velvet-30th-birthday',
    tagline: 'An intimate evening of fine dining, luxury gifting, and celebratory memories.',
    description: 'Celebrating 30 years of grace and impact. An exclusive evening featuring personalized three-course plated dining, saxophone serenades, and rooftop midnight toast.',
    category: 'birthdays',
    cover_image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=1200',
    venue_name: 'The Wheatbaker Boutique Hotel',
    venue_address: '4 Onitolo Rd, Ikoyi',
    city: 'Lagos',
    state: 'Lagos State',
    start_time: '2026-12-05T18:00:00Z',
    end_time: '2026-12-05T23:30:00Z',
    age_restriction: '18+',
    dress_code: 'Emerald Green & Gold Royalty',
    is_private: true,
    is_patron_only: false,
    status: 'published',
    max_capacity: 80,
    organizer_name: 'Adunni Couture & Events',
    rules: ['Strictly by invitation; confirmed QR pass required.'],
    what_to_expect: ['Custom 3-course dinner', 'Champagne fountain', 'Live jazz quartet'],
    refund_policy: 'Private guest list; RSVP confirmation required.',
    access_instructions_sensitive: 'Proceed to Private Garden Pavilion. Hostess table outside Room 102.',
    created_at: '2026-09-14T15:00:00Z'
  },
  {
    id: 'ev_8',
    created_by: 'usr_host_8',
    title: 'Uncensored Naija: Live Podcast Recording & Fan Meet',
    slug: 'uncensored-naija-live-podcast',
    tagline: 'Nigeria’s #1 culture podcast live on stage with special guest interviews.',
    description: 'Be in the room as the hosts break down pop culture, tech, politics, and relationships with zero filter. Audience microphone Q&A and VIP creator meet & greet after the show.',
    category: 'podcasts',
    cover_image: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=1200',
    venue_name: 'Terra Kulture Theatre',
    venue_address: 'Plot 1376 Tiamiyu Savage St, Victoria Island',
    city: 'Lagos',
    state: 'Lagos State',
    start_time: '2026-12-12T16:00:00Z',
    end_time: '2026-12-12T20:00:00Z',
    age_restriction: '18+',
    dress_code: 'Trendy Urban Casual',
    is_private: false,
    is_patron_only: false,
    status: 'published',
    max_capacity: 400,
    organizer_name: 'Uncensored Media House',
    rules: ['No unauthorized video streaming during live broadcast'],
    what_to_expect: ['Live audio/video recording', 'Audience prize giveaways', 'Signed merchandise'],
    refund_policy: 'Refundable up to 5 days before recording.',
    access_instructions_sensitive: 'Auditorium doors lock at 4:15 PM sharp for studio sound check.',
    created_at: '2026-09-15T08:00:00Z'
  }
];

export const INITIAL_TICKET_TIERS: TicketTier[] = [
  // For ev_1 (Concert)
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
  // For ev_3 (Tech Mixer)
  {
    id: 'tier_3_standard',
    event_id: 'ev_3',
    name: 'Founder / Investor Ticket',
    tier_type: 'standard',
    price_kobo: 800000, // ₦8,000
    capacity: 250,
    sold_count: 110,
    perks: ['Fireside Session Access', 'Rooftop Cocktail Networking', 'Attendee Directory Access']
  },
  // For ev_4 (Food fiesta)
  {
    id: 'tier_4_standard',
    event_id: 'ev_4',
    name: 'Foodie Tasting Pass',
    tier_type: 'standard',
    price_kobo: 350000, // ₦3,500
    capacity: 600,
    sold_count: 220,
    perks: ['Entry to Festival', '3 Food Tasting Vouchers', 'Free Beer Sampling']
  },
  // For ev_5 (Worship)
  {
    id: 'tier_5_free',
    event_id: 'ev_5',
    name: 'General Sanctuary RSVP',
    tier_type: 'standard',
    price_kobo: 0, // Free
    capacity: 5000,
    sold_count: 3200,
    perks: ['Sanctuary Seat', 'Free Programme Guide']
  },
  // For ev_6 (Fintech)
  {
    id: 'tier_6_delegate',
    event_id: 'ev_6',
    name: 'Executive Delegate Pass',
    tier_type: 'standard',
    price_kobo: 2500000, // ₦25,000
    capacity: 400,
    sold_count: 185,
    perks: ['Main Stage Access', 'Executive Buffet Lunch', 'Fintech Whitepaper Report']
  },
  // For ev_8 (Podcast)
  {
    id: 'tier_8_fan',
    event_id: 'ev_8',
    name: 'Fan Pit Ticket',
    tier_type: 'standard',
    price_kobo: 500000, // ₦5,000
    capacity: 300,
    sold_count: 190,
    perks: ['Live Theatre Seating', 'Q&A Participation Opportunity']
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

export const INITIAL_VENDOR_PROFILES: VendorProfile[] = [
  {
    id: 'vp_1',
    user_id: 'usr_vnd_1',
    business_name: 'Sizzle & Smoke Gourmet Grills',
    tagline: 'Artisanal live charcoal grills, prime Asun, and gourmet seafood skewers',
    category: 'caterer',
    description: 'Providing elite catering services for high-profile weddings, galas, and corporate mixers. We bring authentic flavor with hygienic presentation and uniformed culinary staff.',
    services: ['Live Grill Stations', 'Smoky Asun Platter', 'Seafood Boil Bar', 'Small Chops Buffet'],
    price_range_text: '₦350,000 - ₦2,500,000 per event',
    min_budget_kobo: 35000000,
    portfolio_images: [
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=400',
      'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=400'
    ],
    contact_phone: '+234 809 111 2233',
    contact_email: 'catering@sizzlesmoke.ng',
    service_area: 'Lagos & Ogun State',
    is_available: true,
    is_verified: true,
    rating: 4.9,
    completed_events_count: 42
  },
  {
    id: 'vp_2',
    user_id: 'usr_vnd_2',
    business_name: 'Lumina Stage Lighting & Visuals',
    tagline: 'Concert grade moving heads, laser shows, and 4K LED backdrop screens',
    category: 'decorator',
    description: 'Turn your venue into a spectacle with dynamic architectural illumination, cold pyro sparks, and immersive projection mapping.',
    services: ['LED Video Wall (P2.9)', 'Intelligent Beam Lighting', 'Cold Spark Fountains', 'Stage Trussing'],
    price_range_text: '₦500,000 - ₦4,000,000 per event',
    min_budget_kobo: 50000000,
    portfolio_images: [
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=400',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=400'
    ],
    contact_phone: '+234 803 777 8899',
    contact_email: 'info@luminapro.ng',
    service_area: 'Lagos, Abuja, Port Harcourt',
    is_available: true,
    is_verified: true,
    rating: 4.8,
    completed_events_count: 29
  },
  {
    id: 'vp_3',
    user_id: 'usr_vnd_3',
    business_name: 'DJ Spinall & Atlantic Sounds',
    tagline: 'International club & festival resident DJ with state-of-the-art Pioneer rigs',
    category: 'dj',
    description: 'High energy afrobeat, amapiano, hip-hop, and throwback sets tailored strictly to crowd energy and event prestige.',
    services: ['Live DJ Set (4-6 Hours)', 'Pioneer CDJ-3000 Rig', 'Wireless Shure Mic Kit', 'Crowd Hype Interludes'],
    price_range_text: '₦400,000 - ₦1,500,000',
    min_budget_kobo: 40000000,
    portfolio_images: [
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=400'
    ],
    contact_phone: '+234 812 445 6677',
    contact_email: 'bookings@spinalllive.com',
    service_area: 'Nationwide & International',
    is_available: true,
    is_verified: true,
    rating: 5.0,
    completed_events_count: 65
  }
];

export const INITIAL_VENDOR_OPPORTUNITIES: VendorOpportunity[] = [
  {
    id: 'opp_1',
    event_id: 'ev_1',
    event_title: 'Lagos Afro-Fusion Gala 2026',
    event_date: 'Oct 24, 2026',
    event_city: 'Lagos (Victoria Island)',
    category_needed: 'caterer',
    description: 'Looking for 2 artisanal small chops & cocktail vendors to serve VIP lounge guests (approx 200 guests).',
    budget_kobo: 80000000, // ₦800,000
    deadline: 'Oct 10, 2026',
    applicant_count: 4,
    status: 'open'
  },
  {
    id: 'opp_2',
    event_id: 'ev_3',
    event_title: 'Abuja Tech Founders Sunset Mixer',
    event_date: 'Nov 07, 2026',
    event_city: 'Abuja (Maitama)',
    category_needed: 'photographer',
    description: 'Experienced corporate event photographer needed for 5 hours. High-res delivery within 24 hours for press release.',
    budget_kobo: 25000000, // ₦250,000
    deadline: 'Oct 25, 2026',
    applicant_count: 7,
    status: 'open'
  },
  {
    id: 'opp_3',
    event_id: 'ev_4',
    event_title: 'Mainland Food & Craft Beer Fiesta',
    event_date: 'Nov 14, 2026',
    event_city: 'Lagos (Ikeja)',
    category_needed: 'security',
    description: 'Professional crowd control and gate security team of 8 certified bouncers needed for outdoor park perimeter.',
    budget_kobo: 35000000, // ₦350,000
    deadline: 'Nov 01, 2026',
    applicant_count: 3,
    status: 'open'
  }
];

export const INITIAL_VENDOR_AGREEMENTS: VendorAgreement[] = [
  {
    id: 'agr_1',
    vendor_id: 'vp_1',
    vendor_name: 'Sizzle & Smoke Gourmet Grills',
    event_id: 'ev_1',
    event_title: 'Lagos Afro-Fusion Gala',
    event_date: 'Oct 24, 2026',
    category: 'caterer',
    agreed_fee_kobo: 65000000, // ₦650,000
    paid_amount_kobo: 32500000, // 50% deposit
    pending_amount_kobo: 32500000,
    deliverables: [
      'Setup 3 live grill counters by 5:00 PM',
      'Provide 400 portions of seasoned Asun & grilled prawns',
      'Uniformed food handlers with hygiene certification'
    ],
    contract_status: 'in_escrow',
    created_at: '2026-09-12T14:00:00Z'
  }
];

export const INITIAL_MPR_CAMPAIGNS: MprCampaign[] = [
  {
    id: 'camp_1',
    event_id: 'ev_1',
    event_title: 'Lagos Afro-Fusion Gala & Live Sound',
    event_cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600',
    event_city: 'Lagos',
    event_date: 'Oct 24, 2026',
    commission_percentage: 10,
    fixed_commission_kobo: 150000, // ₦1,500 per standard ticket
    target_audience: 'Afrobeats lovers, party goers, mainland & island young professionals',
    marketing_copy: 'Experience the electric Lagos Afro-Fusion Gala on Oct 24! Headline stars, top gourmet grills and VIP sound at Eko Atlantic. Use my exclusive link for instant verified entry passes.',
    status: 'active',
    total_promoters: 34
  },
  {
    id: 'camp_2',
    event_id: 'ev_3',
    event_title: 'Abuja Tech Founders & Creatives Sunset Mixer',
    event_cover: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=600',
    event_city: 'Abuja',
    event_date: 'Nov 07, 2026',
    commission_percentage: 12,
    fixed_commission_kobo: 100000, // ₦1,000
    target_audience: 'Startups, developers, angel investors, digital executives in Abuja',
    marketing_copy: 'High-signal networking at Transcorp Hilton Rooftop! Connect with top Nigerian tech founders and venture partners this November.',
    status: 'active',
    total_promoters: 18
  },
  {
    id: 'camp_3',
    event_id: 'ev_4',
    event_title: 'Mainland Food & Craft Beer Fiesta',
    event_cover: 'https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=600',
    event_city: 'Lagos',
    event_date: 'Nov 14, 2026',
    commission_percentage: 10,
    fixed_commission_kobo: 35000, // ₦350 per ticket
    target_audience: 'Foodies, families, weekend chill seekers on the Mainland',
    marketing_copy: 'Lagos Mainland Food & Beer Fiesta is live at Ikeja! 50+ street food stalls, live music, and cold drinks. Grab your tasting pass early!',
    status: 'active',
    total_promoters: 25
  }
];

export const INITIAL_MPR_REFERRALS: MprReferral[] = [
  {
    id: 'ref_1',
    mpr_id: 'usr_9921',
    mpr_code: 'EVEX_VIP99',
    event_id: 'ev_1',
    event_title: 'Lagos Afro-Fusion Gala',
    buyer_name: 'Damilola Adebayo',
    ticket_count: 2,
    tier_name: 'VIP Lounge Pass',
    gross_sale_kobo: 10000000, // ₦100,000
    commission_earned_kobo: 1000000, // ₦10,000 (10%)
    status: 'confirmed',
    created_at: '2026-09-14T11:20:00Z'
  },
  {
    id: 'ref_2',
    mpr_id: 'usr_9921',
    mpr_code: 'EVEX_VIP99',
    event_id: 'ev_3',
    event_title: 'Abuja Tech Founders Sunset Mixer',
    buyer_name: 'Chinedu Okeke',
    ticket_count: 1,
    tier_name: 'Founder / Investor Ticket',
    gross_sale_kobo: 800000, // ₦8,000
    commission_earned_kobo: 96000, // ₦960
    status: 'confirmed',
    created_at: '2026-09-15T09:45:00Z'
  },
  {
    id: 'ref_3',
    mpr_id: 'usr_9921',
    mpr_code: 'EVEX_VIP99',
    event_id: 'ev_1',
    event_title: 'Lagos Afro-Fusion Gala',
    buyer_name: 'Zainab Mohammed',
    ticket_count: 1,
    tier_name: 'General Admission',
    gross_sale_kobo: 1500000, // ₦15,000
    commission_earned_kobo: 150000, // ₦1,500
    status: 'pending',
    created_at: '2026-09-16T14:10:00Z'
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
    account_name: 'EVEX LIVE ENTERTAINMENT LTD',
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
    description: 'Paystack Card Top-up to EVEX Wallet',
    reference: 'PAY-PSTK-0914-991'
  },
  {
    id: 'tx_2',
    type: 'purchase',
    amount: 50000,
    date: '2026-09-15 16:20',
    status: 'completed',
    description: 'Purchased VIP Pass: Lagos Afro-Fusion Gala',
    reference: 'TKT-EVX-98124'
  }
];

export const INITIAL_ADMIN_STATS: AdminStats = {
  totalUsers: 14200,
  activeUsers: 6840,
  totalRevenue: 28450000.00, // ₦28.45M
  totalTransactionsNum: 18450,
  totalCompetitions: 38 // Total Events
};


