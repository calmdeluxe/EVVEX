/**
 * EVVEX Platform Administrator Authorization
 * Centralized Single Source of Truth for Cloudflare Pages Functions
 */

export const PLATFORM_ADMIN_EMAILS = Object.freeze([
  "samuelchukwuemeke05@gmail.com",
  "chukwuemekedaniella@gmail.com",
  "winbigonly@gmail.com"
]);

/**
 * Checks if a given email is a platform super-admin.
 * @param {string|null|undefined} email
 * @returns {boolean}
 */
export function isPlatformAdminEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return PLATFORM_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/**
 * Verifies if a user has platform admin privileges based on email or DB profile.
 * @param {object} user - Supabase auth user object
 * @param {object} [profile] - Supabase database user/profile row
 * @returns {boolean}
 */
export function verifyAdminAccess(user, profile) {
  if (!user) return false;
  if (isPlatformAdminEmail(user.email)) return true;
  return profile?.is_admin === true || 
         profile?.account_tier === "admin" || 
         profile?.role === "admin" || 
         profile?.app_role === "admin";
}
