export interface SessionData {
  user: any;
  profile: any;
  redirectAfterLogin: string | null;
  pendingPurchase: string | null;
  pendingTrivia: string | null;
}

class SessionManager {
  private static instance: SessionManager;

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // Clear all sensitive session storage keys
  clearSessionStorage(): void {
    const keys = [
      'redirectAfterLogin',
      'pendingPurchase',
      'pendingTrivia',
      'auth_redirect',
      'auth_attempt',
      'last_route',
      'lastVisitedPage'
    ];
    keys.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (e) {
        // ignore storage errors
      }
    });

    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('redirectAfterLogin') || k.startsWith('lastVisitedPage'))) {
          localStorage.removeItem(k);
        }
      }
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && (k.startsWith('redirectAfterLogin') || k.startsWith('lastVisitedPage'))) {
          sessionStorage.removeItem(k);
        }
      }
    } catch (e) {}
  }

  // Set a redirect URL for after login
  setRedirectAfterLogin(url: string): void {
    try {
      localStorage.setItem('redirectAfterLogin', url);
    } catch (e) {}
  }

  // Get and clear redirect URL
  getRedirectAfterLogin(): string | null {
    try {
      const url = localStorage.getItem('redirectAfterLogin');
      if (url) {
        localStorage.removeItem('redirectAfterLogin');
        return url;
      }
    } catch (e) {}
    return null;
  }

  // Set pending purchase
  setPendingPurchase(bookId: string): void {
    try {
      localStorage.setItem('pendingPurchase', bookId);
    } catch (e) {}
  }

  // Get and clear pending purchase
  getPendingPurchase(): string | null {
    try {
      const id = localStorage.getItem('pendingPurchase');
      if (id) {
        localStorage.removeItem('pendingPurchase');
        return id;
      }
    } catch (e) {}
    return null;
  }

  // Set pending trivia
  setPendingTrivia(triviaId: string): void {
    try {
      localStorage.setItem('pendingTrivia', triviaId);
    } catch (e) {}
  }

  // Get and clear pending trivia
  getPendingTrivia(): string | null {
    try {
      const id = localStorage.getItem('pendingTrivia');
      if (id) {
        localStorage.removeItem('pendingTrivia');
        return id;
      }
    } catch (e) {}
    return null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    try {
      return !!(localStorage.getItem('sb-access-token') || localStorage.getItem('supabase.auth.token'));
    } catch (e) {
      return false;
    }
  }

  // Get user tier from session
  getUserTier(): string | null {
    try {
      return sessionStorage.getItem('user_tier');
    } catch (e) {
      return null;
    }
  }

  // Set user tier
  setUserTier(tier: string): void {
    try {
      sessionStorage.setItem('user_tier', tier);
    } catch (e) {}
  }
}

export const sessionManager = SessionManager.getInstance();
