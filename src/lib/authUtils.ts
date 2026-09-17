export function clearStoredRedirectIntent(): void {
  try {
    localStorage.removeItem('redirect_intent');
    localStorage.removeItem('auth_redirect');
    sessionStorage.removeItem('redirect_intent');
    sessionStorage.removeItem('auth_redirect');
  } catch (e) {
    // Ignore storage exceptions
  }
}

export function setStoredRedirectIntent(path: string): void {
  try {
    sessionStorage.setItem('redirect_intent', path);
  } catch (e) {}
}

export function getStoredRedirectIntent(): string | null {
  try {
    return sessionStorage.getItem('redirect_intent') || localStorage.getItem('redirect_intent');
  } catch (e) {
    return null;
  }
}
