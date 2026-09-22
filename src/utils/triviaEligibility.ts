/**
 * Authoritative Trivia Eligibility Engine for CalmReader
 * 
 * Defines eligibility and access control rules for the two types of Trivia:
 * 1. Marketing Trivia ('marketing'):
 *    - Purpose: Discover and engage readers with a book or general topic.
 *    - Requirements: Active + unexpired.
 *    - Book purchase/reading is OPTIONAL (not required). Open to everyone.
 * 
 * 2. Reader-Reward Trivia ('reader_reward'):
 *    - Purpose: Reward genuine readers who consumed the content.
 *    - Requirements: Active + unexpired + owned/purchased eBook + read >= 90%.
 *    - Book purchase/reading is REQUIRED.
 */

export type TriviaType = 'marketing' | 'reader_reward';

export type TriviaIneligibleReason =
  | 'TRIVIA_NOT_ACTIVE'
  | 'TRIVIA_EXPIRED'
  | 'ENTRY_FEE_REQUIRED'
  | 'PREMIUM_REQUIRED'
  | 'ALREADY_PLAYED'
  | 'BOOK_NOT_PURCHASED'
  | 'READING_INCOMPLETE';

export interface TriviaEligibilityContext {
  hasPurchasedBook?: boolean;
  hasCompletedReading?: boolean; // e.g. read progress >= 90% or completed === true
  alreadyPlayed?: boolean;
  hasPaidEntryFee?: boolean;
}

export interface TriviaEligibilityResult {
  eligible: boolean;
  reason: TriviaIneligibleReason | null;
  message: string;
}

/**
 * Role-based administrator verification.
 * Does NOT rely on hardcoded email addresses.
 */
export function isAdmin(user: any): boolean {
  if (!user) return false;
  return (
    user.role === 'admin' ||
    user.account_tier === 'admin' ||
    user.is_admin === true ||
    user.is_admin === 'true' ||
    user.isAdmin === true
  );
}

/**
 * Single Authoritative Function to determine whether a user can play a trivia.
 * 
 * @param user Current authenticated user object or profile
 * @param trivia The trivia session record or object
 * @param context Optional additional computed context (purchase status, reading completion, participation history, entry fee)
 */
export function canPlayTrivia(
  user: any,
  trivia: any,
  context?: TriviaEligibilityContext
): TriviaEligibilityResult {
  // If user has administrative privileges -> bypass all gates
  if (isAdmin(user)) {
    return {
      eligible: true,
      reason: null,
      message: 'Admin access granted.',
    };
  }

  // 1. Check if trivia is active
  const rawStatus = (trivia?.status || 'active').toLowerCase();
  const isActive =
    trivia?.is_active === true ||
    trivia?.is_active === 1 ||
    String(trivia?.is_active) === 'true' ||
    rawStatus === 'active' ||
    rawStatus === 'published' ||
    rawStatus === 'launched';

  if (!isActive) {
    return {
      eligible: false,
      reason: 'TRIVIA_NOT_ACTIVE',
      message: 'This trivia is not currently active or launched.',
    };
  }

  // 2. Check if trivia is expired
  const expiry = trivia?.expiry_at || trivia?.expires_at;
  if (expiry && new Date() > new Date(expiry)) {
    return {
      eligible: false,
      reason: 'TRIVIA_EXPIRED',
      message: 'This trivia challenge has expired.',
    };
  }

  // 3. Check entry fee requirement if price > 0
  const price = Number(trivia?.price || trivia?.entry_fee || 0);
  const entryFeePaid = context?.hasPaidEntryFee ?? user?.hasPaidEntryFee ?? false;
  if (price > 0 && !entryFeePaid) {
    return {
      eligible: false,
      reason: 'ENTRY_FEE_REQUIRED',
      message: `An entry fee of ₦${price.toLocaleString()} is required to participate in this trivia.`,
    };
  }

  // 4. Check subscription tier requirement
  const targetTier = (trivia?.target_tier || trivia?.tier_requirement || 'all').toLowerCase();
  const userTier = (user?.account_tier || 'free').toLowerCase();
  if ((targetTier === 'premium' || price > 0) && userTier === 'free' && !entryFeePaid) {
    return {
      eligible: false,
      reason: 'PREMIUM_REQUIRED',
      message: 'This exclusive trivia is reserved for Premium tier subscribers.',
    };
  }

  // 5. Check repeat participation (already played)
  const alreadyPlayed =
    context?.alreadyPlayed ??
    user?.alreadyPlayed ??
    trivia?.alreadyAttempted ??
    false;

  if (alreadyPlayed) {
    return {
      eligible: false,
      reason: 'ALREADY_PLAYED',
      message: 'You have already played this trivia. Check back for the next scheduled session!',
    };
  }

  // 6. Determine Trivia Type
  // Default to 'marketing' if not explicitly marked as 'reader_reward', or if general knowledge
  const isGeneral = trivia?.id === 'general' || !trivia?.book_id;
  const triviaType: TriviaType =
    !isGeneral && trivia?.type === 'reader_reward'
      ? 'reader_reward'
      : 'marketing';

  // If Marketing Trivia: Book purchase and reading are OPTIONAL (skip all book gates!)
  if (triviaType === 'marketing') {
    return {
      eligible: true,
      reason: null,
      message: 'Eligible to play marketing trivia challenge.',
    };
  }

  // If Reader-Reward Trivia: Enforce Book Ownership and Reading Completion (>= 90%)
  if (triviaType === 'reader_reward' && trivia?.book_id) {
    const hasPurchased =
      context?.hasPurchasedBook ??
      user?.hasPurchasedBook ??
      trivia?.hasAccess ??
      false;

    if (!hasPurchased) {
      return {
        eligible: false,
        reason: 'BOOK_NOT_PURCHASED',
        message: 'Book purchase required: You must own this eBook to unlock Reader-Reward trivia.',
      };
    }

    const hasCompletedReading =
      context?.hasCompletedReading ??
      user?.hasCompletedReading ??
      trivia?.readingCompleted ??
      false;

    if (!hasCompletedReading) {
      return {
        eligible: false,
        reason: 'READING_INCOMPLETE',
        message: 'Reading incomplete: Read at least 90% of the eBook to qualify for Reader-Reward T-Points.',
      };
    }
  }

  return {
    eligible: true,
    reason: null,
    message: 'Eligible to play trivia.',
  };
}

/**
 * Returns human-readable badges/labels for ineligibility reasons.
 */
export function getReasonLabel(reason: TriviaIneligibleReason | null): string {
  switch (reason) {
    case 'BOOK_NOT_PURCHASED':
      return 'eBook Purchase Required';
    case 'READING_INCOMPLETE':
      return 'Read 90% to Unlock';
    case 'PREMIUM_REQUIRED':
      return 'Premium Tier Required';
    case 'ALREADY_PLAYED':
      return 'Already Participated';
    case 'TRIVIA_NOT_ACTIVE':
      return 'Trivia Not Active';
    case 'TRIVIA_EXPIRED':
      return 'Trivia Expired';
    case 'ENTRY_FEE_REQUIRED':
      return 'Entry Fee Required';
    default:
      return 'Ineligible';
  }
}
