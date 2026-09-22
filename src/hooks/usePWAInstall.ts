import { useState, useEffect } from 'react';

export interface PromptInstallResult {
  outcome: 'accepted' | 'dismissed' | 'manual-needed' | 'opened-tab' | 'error';
  error?: any;
}

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [justInstalled, setJustInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true
      );
    }
    return false;
  });

  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window !== 'undefined') {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
      const storedInstalled = localStorage.getItem('calmreader_pwa_installed') === 'true';
      return standalone || storedInstalled;
    }
    return false;
  });

  useEffect(() => {
    const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (navigator as any).standalone === true;
    if (isStandaloneMedia || isIOSStandalone) {
      setIsStandalone(true);
      setIsInstalled(true);
      return;
    }

    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('[PWA] beforeinstallprompt event fired and captured in React hook:', e);
      (window as any).deferredPrompt = e;
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      (window as any).deferredPrompt = null;
      setDeferredPrompt(null);
      setJustInstalled(true);
      setIsInstalled(true);
      try {
        localStorage.setItem('calmreader_pwa_installed', 'true');
      } catch (e) {}
    };

    const handleCustomEvent = (e: any) => {
      const prompt = e.detail?.deferredPrompt;
      if (prompt) {
        (window as any).deferredPrompt = prompt;
        setDeferredPrompt(prompt);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-installable', handleCustomEvent as any);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-installable', handleCustomEvent as any);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<PromptInstallResult> => {
    const activePrompt = deferredPrompt || (window as any).deferredPrompt;

    if (activePrompt && typeof activePrompt.prompt === 'function') {
      try {
        await activePrompt.prompt();
        const userChoice = await activePrompt.userChoice;
        (window as any).deferredPrompt = null;
        setDeferredPrompt(null);

        if (userChoice?.outcome === 'accepted') {
          console.log('[PWA] User accepted the install prompt');
          setJustInstalled(true);
          setIsInstalled(true);
          try {
            localStorage.setItem('calmreader_pwa_installed', 'true');
          } catch (e) {}
          return { outcome: 'accepted' };
        } else {
          console.log('[PWA] User dismissed the install prompt');
          return { outcome: 'dismissed' };
        }
      } catch (err) {
        console.error('[PWA] Error promptInstall:', err);
        return { outcome: 'error', error: err };
      }
    } else {
      const isIframe = window.self !== window.top;
      if (isIframe) {
        window.open(window.location.origin, '_blank');
        return { outcome: 'opened-tab' };
      }
      return { outcome: 'manual-needed' };
    }
  };

  const resetJustInstalled = () => setJustInstalled(false);

  return { 
    isStandalone, 
    isInstalled, 
    deferredPrompt, 
    justInstalled, 
    promptInstall, 
    resetJustInstalled 
  };
};



