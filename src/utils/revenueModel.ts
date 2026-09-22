/**
 * Two-Lane Publishing Economy & Revenue Model
 * 
 * Lane A: CalmReader Entertainment Content (< 30,000 words)
 * - Short stories, articles, interactive pieces, trivia-oriented content
 * - Writer retains 100% copyright, grants non-exclusive license + trivia adaptation rights
 * - Net Revenue Split: 30% Writer / 20% MPR / 50% Platform
 * - Writer can publish elsewhere concurrently
 * 
 * Lane B: Independent Publishing (30,000+ words)
 * - Full-length books and major works
 * - Creator retains 100% copyright ownership
 * - Platform gets exclusive 12-month digital distribution license
 * - Net Revenue Split: 70% Creator / 30% Platform
 * - Optional MPR: only if contracted for campaigns (referral bonus 5% of platform share)
 * 
 * Gross vs Net Cost Deductions:
 * - Payment processing (Paystack standard: 1.5% + ₦100, waived for < ₦2,500, capped at ₦2,000)
 *   is deducted first from gross revenue to yield Net Revenue.
 * - Platform bears gateway/transaction costs first, then splits remaining Net Revenue.
 * - Refunds are deducted from platform share.
 */

export type PublishingLane = 'lane_a' | 'lane_b';

export interface RevenueCalculationResult {
  grossAmount: number;
  processingFee: number;
  netRevenue: number;
  authorAmount: number;
  authorPercentage: number;
  platformAmount: number;
  platformPercentage: number;
  mprAmount: number;
  mprPercentage: number;
  mprType: 'mpr_commission' | 'mpr_referral_bonus' | 'none';
  effectiveRateSummary: string;
}

/**
 * Standard Paystack Domestic Nigeria Processing Fee
 * - 1.5% + ₦100
 * - Flat ₦100 fee is waived for transactions below ₦2,500
 * - Capped at ₦2,000 max
 */
export function calculatePaymentProcessingFee(grossAmount: number): number {
  if (!grossAmount || grossAmount <= 0) return 0;
  let fee = grossAmount * 0.015;
  if (grossAmount >= 2500) {
    fee += 100;
  }
  return Math.min(2000, Math.round(fee));
}

/**
 * Normalizes lane identifiers from legacy or new terms
 */
export function normalizePublishingLane(rawType?: string | null): PublishingLane {
  if (!rawType) return 'lane_a';
  const clean = rawType.toLowerCase().trim();
  if (clean === 'lane_b' || clean === 'ipc' || clean === 'independent' || clean === 'book') {
    return 'lane_b';
  }
  return 'lane_a';
}

/**
 * Calculates net revenue and split amounts based on gross price and publishing lane
 */
export function calculateRevenueSplit(
  grossAmount: number,
  lane: PublishingLane | string,
  hasMpr: boolean = false,
  isPlatformOwner: boolean = false
): RevenueCalculationResult {
  const normalizedLane = normalizePublishingLane(lane);
  const gross = Math.max(0, Math.round(grossAmount || 0));
  const processingFee = calculatePaymentProcessingFee(gross);
  const netRevenue = Math.max(0, gross - processingFee);

  if (isPlatformOwner) {
    return {
      grossAmount: gross,
      processingFee,
      netRevenue,
      authorAmount: netRevenue,
      authorPercentage: 100,
      platformAmount: 0,
      platformPercentage: 0,
      mprAmount: 0,
      mprPercentage: 0,
      mprType: 'none',
      effectiveRateSummary: '100% Platform Owner Earning'
    };
  }

  if (normalizedLane === 'lane_b') {
    // Lane B: Independent Publishing (70% Author Net / 30% Platform Net)
    const authorAmount = Math.round(netRevenue * 0.70);
    const platformShare = netRevenue - authorAmount; // 30% of Net

    let mprBonus = 0;
    let mprType: 'mpr_referral_bonus' | 'none' = 'none';

    if (hasMpr) {
      // 5% referral bonus paid from platform's 30% share (author still gets full 70%)
      mprBonus = Math.round(platformShare * 0.05);
      mprType = 'mpr_referral_bonus';
    }

    const platformAmount = platformShare - mprBonus;

    return {
      grossAmount: gross,
      processingFee,
      netRevenue,
      authorAmount,
      authorPercentage: 70,
      platformAmount,
      platformPercentage: 30,
      mprAmount: mprBonus,
      mprPercentage: hasMpr ? 1.5 : 0,
      mprType,
      effectiveRateSummary: '70% Author Net / 30% Platform Net (Paystack fee absorbed before split)'
    };
  } else {
    // Lane A: CalmReader Entertainment Content (30% Author Net / 20% MPR Net / 50% Platform Net)
    const authorAmount = Math.round(netRevenue * 0.30);
    const mprAmount = hasMpr ? Math.round(netRevenue * 0.20) : 0;
    const platformAmount = netRevenue - authorAmount - mprAmount;

    return {
      grossAmount: gross,
      processingFee,
      netRevenue,
      authorAmount,
      authorPercentage: 30,
      platformAmount,
      platformPercentage: hasMpr ? 50 : 70,
      mprAmount,
      mprPercentage: hasMpr ? 20 : 0,
      mprType: hasMpr ? 'mpr_commission' : 'none',
      effectiveRateSummary: hasMpr
        ? '30% Author Net / 20% MPR Net / 50% Platform Net'
        : '30% Author Net / 70% Platform Net (no active MPR partner)'
    };
  }
}

/**
 * Rights & Licensing Specifications
 */
export const LANE_RIGHTS_FRAMEWORK = {
  lane_a: {
    name: 'Lane A — CalmReader Entertainment Content',
    targetAudience: 'Short stories, serialized episodes, articles, interactive pieces, and trivia-oriented reads',
    wordLimitText: 'Under 30,000 words',
    wordCountLimit: 30000,
    authorSharePercent: 30,
    mprSharePercent: 20,
    platformSharePercent: 50,
    copyrightTerms: 'Author retains 100% legal copyright ownership.',
    licenseGranted: 'Non-exclusive digital distribution license + trivia adaptation rights.',
    exclusivity: 'Non-exclusive. Author is free to publish or serialize elsewhere concurrently.',
    triviaAdaptation: 'CalmReader is granted rights to adapt excerpts into interactive trivia challenges and gamified reader cards.',
    terminationTerms: 'Author can unpublish or archive anytime. Readers with existing purchases retain perpetual reading access.'
  },
  lane_b: {
    name: 'Lane B — Independent Publishing',
    targetAudience: 'Full-length novels, major non-fiction, poetry collections, and comprehensive literary manuscripts',
    wordLimitText: '30,000+ words required',
    wordCountLimit: 30000,
    authorSharePercent: 70,
    mprSharePercent: 0, // Optional campaigns only
    platformSharePercent: 30,
    copyrightTerms: 'Author retains 100% legal copyright ownership.',
    licenseGranted: '12-month exclusive digital distribution license on CalmReader.',
    exclusivity: '12-month exclusive digital distribution. After 12 months, author can distribute on other platforms.',
    triviaAdaptation: 'Optional trivia adaptation with author approval.',
    terminationTerms: 'Author may remove from sale after 12 months. CalmReader retains delivery access for past purchasers.'
  }
};
