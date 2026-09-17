import { useState, useEffect } from 'react';
import { User } from '../types';
import { useUserRole, UserRole } from './useUserRole';

export type AppView = 'landing' | 'signin' | 'signup' | 'forgot' | 'app';

export function useRoutes(currentUser: User | null) {
  const [view, setView] = useState<AppView>('landing');
  const [currentTab, setCurrentTab] = useState<string>('home');
  const { role, isAdmin, isTutor, isPremium } = useUserRole(currentUser);

  // Enforce protective route boundaries automatically on state transitions
  useEffect(() => {
    if (view === 'app') {
      // Direct only CEO role users to the administrator master console tab
      if ((currentTab === 'admin' || currentTab === 'ceo_quizzes' || currentTab === 'ceo_ebooks') && role !== 'ceo') {
        setCurrentTab('home');
      }
    }
  }, [view, currentTab, role]);

  const navigateToTab = (tabId: string) => {
    if ((tabId === 'admin' || tabId === 'ceo_quizzes' || tabId === 'ceo_ebooks') && role !== 'ceo') {
      return { success: false, reason: 'unauthorized_admin_access' };
    }
    setCurrentTab(tabId);
    return { success: true };
  };

  const setViewProtected = (targetView: AppView) => {
    if (targetView === 'app' && !currentUser) {
      setView('signin');
      return { success: false, reason: 'unauthenticated_user_access' };
    }
    setView(targetView);
    return { success: true };
  };

  return {
    view,
    setView: setViewProtected,
    currentTab,
    setCurrentTab: navigateToTab,
    role,
    isAdmin,
    isTutor,
    isPremium
  };
}
