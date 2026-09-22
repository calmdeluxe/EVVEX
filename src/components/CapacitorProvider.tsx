import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AppUpdateChecker } from './AppUpdateChecker';

export const CapacitorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // 1. Configure Status Bar for Android
    const setupStatusBar = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0F172A' });
      } catch (e) {
        console.warn('[Capacitor] StatusBar configuration warning:', e);
      }
    };
    setupStatusBar();

    // 2. Configure Hardware Back Button
    const backButtonHandler = CapApp.addListener('backButton', ({ canGoBack }) => {
      const currentPath = window.location.hash ? window.location.hash.replace(/^#/, '') : window.location.pathname;
      const rootPaths = ['/', '/dashboard', '/login'];

      if (rootPaths.includes(currentPath)) {
        // At root views, let Android minimize/exit
        CapApp.exitApp();
      } else if (canGoBack || window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/dashboard');
      }
    });

    // 3. Configure Deep Link & OAuth URL Handling
    const urlOpenHandler = CapApp.addListener('appUrlOpen', (event) => {
      console.log('[Capacitor] App opened with URL:', event.url);
      try {
        const url = new URL(event.url);
        const routePath = url.pathname + url.search + url.hash;
        if (routePath) {
          navigate(routePath);
        }
      } catch (err) {
        console.warn('[Capacitor] Failed to parse incoming deep link:', err);
      }
    });

    return () => {
      backButtonHandler.then(h => h.remove()).catch(() => {});
      urlOpenHandler.then(h => h.remove()).catch(() => {});
    };
  }, [navigate]);

  return (
    <>
      <AppUpdateChecker />
      {children}
    </>
  );
};

export default CapacitorProvider;
