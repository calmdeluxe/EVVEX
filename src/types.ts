/* Quizoe Strong TypeScript Types */

export type AppRole = 'admin' | 'mpr' | 'event_host' | 'patron' | 'guest';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  referralCode: string;
  referredBy?: string;
  balance: number;
  challengeEarnings: number;
  referralEarnings: number;
  totalEarnings: number;
  membershipStatus: 'basic' | 'premium';
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
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'published' | 'completed' | 'archived' | 'cancelled';
  rejection_reason?: string;
  max_capacity?: number;
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
  user_id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  price_paid_kobo: number;
  paystack_reference: string;
  payment_status: 'pending' | 'success' | 'failed' | 'refunded';
  checked_in: boolean;
  checked_in_at?: string;
  checked_in_by?: string;
  qr_code_hash: string;
  created_at: string;
  event_date?: string;
  event_venue?: string;
  event_city?: string;
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

