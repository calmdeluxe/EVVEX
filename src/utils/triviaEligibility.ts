export function isAdmin(user: any): boolean {
  if (!user) return false;
  const emailLower = (user.email || '').toLowerCase();
  if (emailLower === 'winbigonly@gmail.com' || emailLower === 'samuelchukwuemeke05@gmail.com') return true;
  return user.is_admin === true || user.account_tier === 'admin' || user.app_role === 'admin';
}

export function canPlayTrivia(user: any, session: any, options?: any): { eligible: boolean; message?: string; allowed: boolean; reason?: string } {
  if (!user) {
    return { eligible: false, message: 'Authentication required to participate in trivia sessions.', allowed: false, reason: 'Authentication required to participate in trivia sessions.' };
  }
  return { eligible: true, message: '', allowed: true, reason: '' };
}
