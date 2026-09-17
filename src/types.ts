/* EVEX Master TypeScript Architecture & Types */

export type AppRole = 'admin' | 'mpr' | 'creator' | 'attendee' | 'vendor' | 'event_host' | 'patron' | 'guest';

export type EventCategoryType = 
  | 'all'
  | 'birthdays' 
  | 'parties' 
  | 'concerts' 
  | 'church_praise' 
  | 'seminars' 
  | 'launches' 
  | 'food_events' 
  | 'pageantry' 
  | 'auctions_sales' 
  | 'podcasts' 
  | 'book_reading' 
  | 'social_events' 
  | 'custom_events';

export type EventLifecycleStatus = 
  | 'draft' 
  | 'planning' 
  | 'submitted' 
  | 'under_review' 
  | 'approved' 
  | 'published' 
  | 'registration_open' 
  | 'registration_closed' 
  | 'live' 
  | 'completed' 
  | 'archived' 
  | 'cancelled';

export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatar: string;
  referralCode: string;
  referredBy?: string;
  balance: number;
  challengeEarnings?: number;
  referralEarnings?: number;
  totalEarnings?: number;
  membershipStatus?: 'basic' | 'premium';
  isVip?: boolean;
  role?: 'ceo' | 'tutor' | 'premium' | 'free';
  originalRole?: 'ceo' | 'tutor' | 'premium' | 'free';
  appRole?: AppRole;
  promotionExpiresAt?: string;
}

export interface EventItem {
  id: string;
  created_by: string;
  title: string;
  slug?: string;
  tagline?: string;
  description?: string;
  category: string;
  cover_image?: string;
  venue_name: string;
  venue_address?: string;
  city?: string;
  state?: string;
  start_time: string;
  end_time?: string;
  age_restriction?: string;
  dress_code?: string;
  is_private?: boolean;
  is_patron_only?: boolean;
  is_vip_only?: boolean;
  is_featured?: boolean;
  status: EventLifecycleStatus;
  rejection_reason?: string;
  max_capacity?: number;
  current_attendee_count?: number;
  organizer_name?: string;
  organizer_email?: string;
  organizer_phone?: string;
  rules?: string[];
  what_to_expect?: string[];
  refund_policy?: string;
  access_instructions_sensitive?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TicketTier {
  id: string;
  event_id: string;
  name: string;
  tier_type: 'early_bird' | 'standard' | 'vip' | 'vvip' | 'table' | 'patron_exclusive';
  price_kobo: number;
  currency?: string;
  capacity: number;
  sold_count: number;
  is_patron_only?: boolean;
  perks?: string[];
}

export type TransactionType = 'deposit' | 'withdrawal' | 'transfer' | 'reward' | 'entry_fee' | 'purchase';
export type TransactionStatus = 'success' | 'pending' | 'failed' | 'completed';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  status: TransactionStatus;
  description: string;
  reference: string;
  recipientEmail?: string;
}

export type ChallengeStatus = 'active' | 'upcoming' | 'sponsored' | 'completed';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  category: string;
  prizePool: number;
  entryFee: number;
  participants: number;
  maxParticipants: number;
  timeLeft: string; // countdown format like "12h 30m"
  status: ChallengeStatus;
  questions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  timeLimit: number; // in seconds
}

export interface PurchasedTicket {
  id: string;
  ticket_number: string;
  event_id: string;
  event_title: string;
  tier_id: string;
  tier_name: string;
  tier_type?: string;
  user_id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  price_paid_kobo: number;
  paystack_reference?: string;
  payment_status?: 'pending' | 'success' | 'failed' | 'refunded';
  checked_in: boolean;
  checked_in_at?: string;
  checked_in_by?: string;
  scanned_by?: string;
  qr_code_hash: string;
  created_at?: string;
  purchase_date?: string;
  event_date?: string;
  event_venue?: string;
  event_city?: string;
  seat_or_table_number?: string;
  mpr_referral_code?: string;
}

export interface EventVendor {
  id: string;
  event_id: string;
  vendor_name: string;
  service_category: 'catering' | 'mc' | 'dj' | 'photography' | 'ushers' | 'security' | 'decor' | 'lighting';
  agreed_fee_kobo: number;
  contract_status: 'briefed' | 'accepted' | 'completed' | 'cancelled';
  notes?: string;
}

export interface EventStaff {
  id: string;
  event_id: string;
  user_id: string;
  role_title: 'gate_scanner' | 'usher' | 'stage_manager' | 'vip_host';
  staff_name: string;
  assigned_by: string;
}

export interface PayoutRequest {
  id: string;
  event_id: string;
  event_title: string;
  host_id: string;
  host_name: string;
  gross_revenue_kobo: number;
  platform_fee_kobo: number;
  net_payout_kobo: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed';
  rejection_reason?: string;
  created_at: string;
}

export interface FeedPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorRole: string; // e.g., "Creator", "Sponsor", "Admin"
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video_placeholder';
  likes: number;
  shares: number;
  commentsCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  isAnnouncement?: boolean;
  isSponsored?: boolean;
  sponsoredBy?: string;
  timestamp: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalTransactionsNum: number;
  totalCompetitions: number;
}

export interface ReportItem {
  id: string;
  reporter: string;
  targetType: 'user' | 'challenge' | 'post';
  targetId: string;
  reason: string;
  status: 'pending' | 'resolved';
  date: string;
}

export interface UserRequest {
  id: string;
  userId: string;
  username: string;
  type: 'credits' | 'upgrade' | 'support' | 'other';
  amount?: number;
  details: string;
  status: 'pending' | 'granted' | 'declined';
  date: string;
}

/* =========================================================================
   EVEX VENDOR ARCHITECTURE TYPES
   ========================================================================= */

export type VendorCategory = 
  | 'caterer' 
  | 'decorator' 
  | 'photographer' 
  | 'dj' 
  | 'mc' 
  | 'baker' 
  | 'shawarma_food' 
  | 'beauty_pageantry' 
  | 'security' 
  | 'rentals' 
  | 'transport' 
  | 'other';

export interface VendorProfile {
  id: string;
  user_id: string;
  business_name: string;
  tagline: string;
  category: VendorCategory;
  description: string;
  services: string[];
  price_range_text: string;
  min_budget_kobo: number;
  portfolio_images: string[];
  contact_phone: string;
  contact_email: string;
  service_area: string; // e.g., "Lagos (Island & Mainland)"
  is_available: boolean;
  is_verified: boolean;
  rating: number;
  completed_events_count: number;
}

export interface VendorOpportunity {
  id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  event_city: string;
  category_needed: VendorCategory;
  description: string;
  budget_kobo: number;
  deadline: string;
  applicant_count: number;
  status: 'open' | 'reviewing' | 'filled';
}

export interface VendorInvitation {
  id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  creator_name: string;
  category: VendorCategory;
  offered_amount_kobo: number;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface VendorAgreement {
  id: string;
  vendor_id: string;
  vendor_name: string;
  event_id: string;
  event_title: string;
  event_date: string;
  category: VendorCategory;
  agreed_fee_kobo: number;
  paid_amount_kobo: number;
  pending_amount_kobo: number;
  deliverables: string[];
  contract_status: 'drafted' | 'signed' | 'in_escrow' | 'completed' | 'disputed';
  created_at: string;
}

/* =========================================================================
   EVEX MPR (MARKETING PARTNER ROLE) TYPES — LOCKED
   ========================================================================= */

export interface MprCampaign {
  id: string;
  event_id: string;
  event_title: string;
  event_cover: string;
  event_city: string;
  event_date: string;
  commission_percentage: number; // e.g., 10%
  fixed_commission_kobo?: number; // or ₦1,000 per ticket
  target_audience: string;
  marketing_copy: string;
  status: 'active' | 'paused' | 'ended';
  total_promoters: number;
}

export interface MprReferral {
  id: string;
  mpr_id?: string;
  mpr_code?: string;
  campaign_id?: string;
  promoter_user_id?: string;
  promoter_code?: string;
  event_id: string;
  event_title: string;
  buyer_name: string;
  buyer_email?: string;
  ticket_count: number;
  tier_name: string;
  gross_sale_kobo: number;
  commission_earned_kobo: number;
  status: 'pending' | 'confirmed' | 'disbursed';
  created_at: string;
}

/* =========================================================================
   EVEX AI PLANNER & CHECKLIST TYPES
   ========================================================================= */

export interface EventChecklistTask {
  id: string;
  event_id: string;
  title: string;
  category: 'venue' | 'tickets' | 'vendors' | 'marketing' | 'logistics' | 'security';
  is_completed: boolean;
  dueDate?: string;
  due_date?: string;
  assigned_role?: string;
}

export interface AiEventPlan {
  estimated_budget_kobo?: number;
  suggested_timeline?: { milestone: string; date: string }[];
  suggested_vendors?: { category: VendorCategory; estimated_budget_kobo: number; note: string }[];
  key_checklists?: { category: string; tasks: string[] }[];
  suggestedBudgetBreakdown?: { category: string; allocatedKobo: number; notes: string }[];
  tasks?: { id: string; title: string; status: string; priority: string; dueDate: string }[];
  recommendedVendorCategories?: string[];
}


