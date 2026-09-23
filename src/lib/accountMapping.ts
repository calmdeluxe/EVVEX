import { 
  EvexAccountType, 
  EvexPlatformRole, 
  EvexEntitlement, 
  LegacyAccountTier, 
  ResolvedEvexUserContext 
} from '../types/account';

/** Authorized Platform Administrator Emails */
export const PLATFORM_ADMIN_EMAILS = [
  'samuelchukwuemeke05@gmail.com',
  'chukwuemekedaniella@gmail.com',
  'winbigonly@gmail.com'
].map(e => e.toLowerCase());

/**
 * Checks if a given email is a platform super-admin.
 */
export function isPlatformAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return PLATFORM_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/**
 * Resolves the EVEX Account Type (Identity Persona) from user profile data.
 * Mappings:
 * - Legacy 'author' / approved authors / 'vendor' -> VENDOR (Restructured Author = Shop/Vendor)
 * - 'event_host' -> EVENT_CREATOR
 * - Legacy 'free' / 'premium' / 'guest' -> PATRON
 */
export function resolveEvexAccountType(profileOrUser: any): EvexAccountType {
  if (!profileOrUser) return 'PATRON';

  const tier = (profileOrUser.account_tier || profileOrUser.accountTier || '').toLowerCase();
  const appRole = (profileOrUser.app_role || profileOrUser.role || '').toLowerCase();

  // Vendor check (Restructured Author is Vendor in EVVEX)
  if (
    tier === 'vendor' || 
    appRole === 'vendor' || 
    tier === 'author' || 
    profileOrUser.is_approved_author === true || 
    profileOrUser.is_author === true
  ) {
    return 'VENDOR';
  }

  // Event Creator check (dedicated event hosts)
  if (appRole === 'event_host') {
    return 'EVENT_CREATOR';
  }

  // Default identity persona is Patron
  return 'PATRON';
}

/**
 * Resolves the EVEX Platform Role (Privileged Authority) from user profile data.
 * Mappings:
 * - Admin email / is_admin / admin tier / admin app_role -> ADMIN
 * - MPR tier / marketing_partner tier or role / mpr app_role -> MPR
 * - Otherwise -> NONE
 */
export function resolveEvexPlatformRole(profileOrUser: any): EvexPlatformRole {
  if (!profileOrUser) return 'NONE';

  const email = (profileOrUser.email || '').toLowerCase();
  const tier = (profileOrUser.account_tier || profileOrUser.accountTier || '').toLowerCase();
  const appRole = (profileOrUser.app_role || profileOrUser.role || '').toLowerCase();

  // Admin Check
  if (
    isPlatformAdminEmail(email) || 
    profileOrUser.is_admin === true || 
    tier === 'admin' || 
    appRole === 'admin'
  ) {
    return 'ADMIN';
  }

  // MPR Check
  if (
    tier === 'mpr' || 
    tier === 'marketing_partner' || 
    appRole === 'mpr' || 
    appRole === 'marketing_partner' ||
    Boolean(profileOrUser.mpr_code)
  ) {
    return 'MPR';
  }

  return 'NONE';
}

/**
 * Resolves active entitlements (e.g. VIP / Premium benefits) without
 * confusing them with platform roles or account types.
 */
export function resolveEvexEntitlements(profileOrUser: any): EvexEntitlement[] {
  const entitlements: EvexEntitlement[] = ['STANDARD'];
  if (!profileOrUser) return entitlements;

  const tier = (profileOrUser.account_tier || profileOrUser.accountTier || '').toLowerCase();
  const isVipOrPremium = 
    profileOrUser.is_premium === true || 
    profileOrUser.is_vip === true || 
    tier === 'premium';

  if (isVipOrPremium) {
    entitlements.push('VIP_PREMIUM');
  }

  return entitlements;
}

/**
 * Returns a fully resolved EVEX user context while keeping complete backwards
 * compatibility with legacy CalmReader tiers.
 */
export function resolveEvexUserContext(profileOrUser: any): ResolvedEvexUserContext {
  const accountType = resolveEvexAccountType(profileOrUser);
  const platformRole = resolveEvexPlatformRole(profileOrUser);
  const entitlements = resolveEvexEntitlements(profileOrUser);
  const isVip = entitlements.includes('VIP_PREMIUM');
  const isAdmin = platformRole === 'ADMIN';
  const isMpr = platformRole === 'MPR' || isAdmin;
  const isEventCreator = accountType === 'EVENT_CREATOR';
  const isPatron = accountType === 'PATRON';
  const isVendor = accountType === 'VENDOR';
  
  const rawTier = (profileOrUser?.account_tier || profileOrUser?.accountTier || 'free') as LegacyAccountTier;

  return {
    rawProfile: profileOrUser,
    accountType,
    platformRole,
    entitlements,
    isVip,
    isAdmin,
    isMpr,
    isEventCreator,
    isPatron,
    isVendor,
    legacyTier: rawTier
  };
}
