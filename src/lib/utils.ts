import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the stable application URL.
 * Prioritizes VITE_APP_URL secret, falls back to dynamic origin.
 * Automatically handles the case where we don't want to share -dev- links by accident.
 */
export function getAppUrl(): string {
  // 0. Prioritize VITE_API_BASE_URL if it is configured to a valid absolute domain
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (apiBaseUrl && apiBaseUrl.startsWith('http') && !apiBaseUrl.includes('localhost') && !apiBaseUrl.includes('127.0.0.1')) {
    try {
      const parsed = new URL(apiBaseUrl);
      return parsed.origin;
    } catch (e) {
      return apiBaseUrl.replace(/\/$/, '');
    }
  }

  // 1. Explicitly configured URL from secrets (The "Shared App URL")
  // User should set VITE_APP_URL to the "Shared App URL" provided in AI Studio
  const configuredUrl = import.meta.env.VITE_APP_URL;
  if (configuredUrl && !configuredUrl.includes('MY_APP_URL') && configuredUrl.length > 5) {
    try {
      const parsed = new URL(configuredUrl);
      return parsed.origin;
    } catch (e) {
      return configuredUrl.replace(/\/$/, ''); // Remove trailing slash
    }
  }

  // 2. Fallback to current origin
  const origin = window.location.origin;

  // 3. Heuristic: If we are in a -dev- environment, it's often better to 
  // at least point to the shared version if the user hasn't configured it.
  // We can attempt to swap -dev- for -pre- if we see the pattern.
  if (origin.includes('.ais-dev-') && !configuredUrl) {
     return origin.replace('.ais-dev-', '.ais-pre-');
  }
  
  return origin;
}

/**
 * Returns a user-friendly referral code derived from their ID.
 */
export function getReferralCode(userId: string | undefined): string {
  if (!userId) return '';
  return userId.split('-')[0]; // Use the first segment of the UUID (8 chars)
}
