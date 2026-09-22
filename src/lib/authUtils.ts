import { isPlatformAdminEmail, resolveEvexAccountType, resolveEvexPlatformRole, resolveEvexEntitlements, resolveEvexUserContext } from './accountMapping';
import { isPlatformAdmin, isEventCreator, isVip } from './authorization';

export * from './accountMapping';
export * from './authorization';

export interface UserProfileSummary {
  id?: string;
  email?: string;
  account_tier?: string;
  accountTier?: string;
  app_role?: string;
  is_admin?: boolean;
  is_premium?: boolean;
}

/**
 * Validates a requested redirect URL against the user's role and account tier
 * to prevent redirect intent bleeding across user sessions.
 */
export const getValidRedirect = (
  user: UserProfileSummary | null | undefined,
  requestedPath: string | null | undefined
): string => {
  if (!requestedPath || requestedPath === '/' || requestedPath === '/login' || requestedPath === '/signup') {
    return '/dashboard';
  }

  const path = requestedPath.trim();
  const lowerPath = path.toLowerCase();

  const isAdmin = isPlatformAdmin(user);
  const isAuthor = isAdmin || isEventCreator(user);
  const isPremium = isAdmin || isAuthor || isVip(user) || user?.accountTier === 'premium' || user?.account_tier === 'premium';

  // If the requested path is admin-only and user is not admin
  if (lowerPath.startsWith('/admin') && !isAdmin) {
    return '/dashboard';
  }

  // If the requested path is author-only and user is not author or admin
  if ((lowerPath.startsWith('/author') || lowerPath.startsWith('/apply/author') || lowerPath.startsWith('/create-book') || lowerPath.startsWith('/my-books') || lowerPath.startsWith('/sell') || lowerPath.startsWith('/earnings')) && !isAuthor) {
    return '/dashboard';
  }

  // If requested path is premium-only and user is not premium
  if (lowerPath.startsWith('/anonymous') && !isPremium) {
    return '/dashboard';
  }

  return path;
};

/**
 * Completely clears any stored redirect intents or last-visited page traces
 * from localStorage and sessionStorage to avoid session bleed upon logout or unauthorized access.
 */
export const clearStoredRedirectIntent = () => {
  try {
    localStorage.removeItem('redirectAfterLogin');
    sessionStorage.removeItem('redirectAfterLogin');
    sessionStorage.removeItem('lastVisitedPage');
    localStorage.removeItem('lastVisitedPage');

    const localKeysToClean: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('redirectAfterLogin') || key.startsWith('lastVisitedPage'))) {
        localKeysToClean.push(key);
      }
    }
    localKeysToClean.forEach(k => localStorage.removeItem(k));

    const sessionKeysToClean: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('redirectAfterLogin') || key.startsWith('lastVisitedPage'))) {
        sessionKeysToClean.push(key);
      }
    }
    sessionKeysToClean.forEach(k => sessionStorage.removeItem(k));
  } catch (err) {
    console.warn('[AuthUtils] Storage cleanup error:', err);
  }
};
