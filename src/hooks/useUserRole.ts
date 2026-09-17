import { useState, useEffect } from 'react';
import { User, AppRole } from '../types';

export type UserRole = 'ceo' | 'tutor' | 'premium' | 'free';

export function useUserRole(currentUser: User | null) {
  const [role, setRole] = useState<UserRole>('free');
  const [appRole, setAppRole] = useState<AppRole>('guest');

  useEffect(() => {
    if (!currentUser) {
      setRole('free');
      setAppRole('guest');
      return;
    }

    const emailLower = currentUser.email?.toLowerCase() || '';

    // Rigorous security configuration - only specific emails are permitted CEO tier
    const isOwnerEmail = emailLower === 'winbigonly@gmail.com' || emailLower === 'samuelchukwuemeke05@gmail.com';

    if (isOwnerEmail || currentUser.appRole === 'admin') {
      setRole('ceo');
      setAppRole('admin');
      return;
    }

    if (currentUser.appRole === 'mpr') {
      setRole('ceo');
      setAppRole('mpr');
      return;
    }

    // Process promotion expirations
    if (currentUser.promotionExpiresAt) {
      const isExpired = new Date(currentUser.promotionExpiresAt).getTime() < Date.now();
      if (isExpired) {
        setRole('free');
        setAppRole('guest');
        return;
      }
    }

    if (currentUser.appRole) {
      setAppRole(currentUser.appRole);
      if (currentUser.appRole === 'event_host') setRole('tutor');
      else if (currentUser.appRole === 'patron') setRole('premium');
      else setRole('free');
    } else if (currentUser.role && currentUser.role !== 'ceo') {
      setRole(currentUser.role as UserRole);
      if (currentUser.role === 'tutor') setAppRole('event_host');
      else if (currentUser.role === 'premium') setAppRole('patron');
      else setAppRole('guest');
    } else {
      // Fallback based on membershipStatus
      if (currentUser.membershipStatus === 'premium') {
        setRole('premium');
        setAppRole('patron');
      } else {
        setRole('free');
        setAppRole('guest');
      }
    }
  }, [currentUser]);

  return {
    role,
    appRole,
    setRole,
    setAppRole,
    isAdmin: role === 'ceo' || appRole === 'admin',
    isMpr: appRole === 'mpr',
    isHost: role === 'tutor' || appRole === 'event_host' || appRole === 'admin',
    isPatron: role === 'premium' || role === 'ceo' || appRole === 'patron' || appRole === 'admin',
    isGuest: true,
    isTutor: role === 'tutor' || appRole === 'event_host',
    isPremium: role === 'premium' || role === 'ceo' || appRole === 'patron' || appRole === 'admin',
    isFree: role === 'free' || appRole === 'guest'
  };
}
