import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, CheckCircle, Smartphone, X, ExternalLink, Share, MoreVertical, PlusSquare, ArrowUpRight } from 'lucide-react';
import { Button } from './ui/button';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'banner' | 'sidebar' | 'menu-item' | 'icon' | 'hero';
  onClick?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '', 
  variant = 'button',
  onClick
}) => {
  const { 
    isStandalone, 
    justInstalled, 
    promptInstall, 
    resetJustInstalled 
  } = usePWAInstall();

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('android');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || '';
      const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
      const isAndroid = /Android/.test(ua);
      if (isIOS) setDeviceType('ios');
      else if (isAndroid) setDeviceType('android');
      else setDeviceType('desktop');
    }
  }, []);

  useEffect(() => {
    if (justInstalled) {
      setShowSuccessModal(true);
      setShowGuideModal(false);
    }
  }, [justInstalled]);

  // Do not render button if app is currently launched in true standalone display mode
  if (isStandalone) {
    return null;
  }

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const res = await promptInstall();

    if (res.outcome === 'accepted') {
      setShowSuccessModal(true);
    } else {
      setShowGuideModal(true);
    }

    if (onClick) onClick();
  };

  return (
    <>
      {/* Icon Variant */}
      {variant === 'icon' && (
        <button
          id="pwa-install-btn"
          onClick={handleInstallClick}
          title="Install EVVEX App"
          aria-label="Install App"
          className={`p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 dark:text-[#EAB308] transition-all cursor-pointer flex items-center justify-center shrink-0 ${className}`}
        >
          <Download className="w-4 h-4" />
        </button>
      )}

      {/* Hero Variant */}
      {variant === 'hero' && (
        <button
          id="pwa-install-btn"
          onClick={handleInstallClick}
          className={`h-12 px-6 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black shadow-lg shadow-amber-500/20 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>Install App</span>
        </button>
      )}

      {/* Sidebar / Menu-item Variant */}
      {(variant === 'sidebar' || variant === 'menu-item') && (
        <button
          id="pwa-install-btn"
          onClick={handleInstallClick}
          className={`flex items-center gap-3 text-left transition-colors cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Install App</span>
        </button>
      )}

      {/* Banner Variant */}
      {variant === 'banner' && (
        <div className={`p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
          <div className="flex items-center gap-3 text-left">
            <div className="p-3 bg-amber-500/20 rounded-xl text-amber-500 shrink-0">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Install EVVEX App</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Get instant access on your home screen or desktop with offline support.</p>
            </div>
          </div>
          <Button
            onClick={handleInstallClick}
            className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-5 h-10 rounded-xl shrink-0 cursor-pointer"
          >
            Install Now
          </Button>
        </div>
      )}

      {/* Button Variant (Default) */}
      {variant === 'button' && (
        <button
          id="pwa-install-btn"
          onClick={handleInstallClick}
          className={`bg-[#EAB308] hover:bg-[#EAB308]/90 text-black font-extrabold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 shadow-sm border-none cursor-pointer transition-all hover:scale-105 active:scale-95 ${className}`}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Install App</span>
        </button>
      )}

      {/* Manual Installation Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 shadow-2xl space-y-5">
            <button 
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black shadow-lg shrink-0">
                <Smartphone className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white">Install EVVEX</h3>
                <p className="text-xs text-amber-400 font-semibold">Add to your Home Screen</p>
              </div>
            </div>

            {/* Device-Specific Instructions */}
            <div className="space-y-4 pt-1">
              {deviceType === 'ios' && (
                <div className="space-y-3 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-xs text-slate-300">
                  <p className="font-bold text-amber-400 text-sm flex items-center gap-2">
                    <Share className="w-4 h-4 text-amber-400" />
                    iOS / Safari Instructions:
                  </p>
                  <ol className="space-y-2 list-decimal list-inside text-slate-200">
                    <li>Tap the <strong className="text-white">Share</strong> button at the bottom of Safari.</li>
                    <li>Scroll down and select <strong className="text-white">Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-amber-400" />.</li>
                    <li>Tap <strong className="text-white">Add</strong> in the top right corner.</li>
                  </ol>
                </div>
              )}

              {deviceType === 'android' && (
                <div className="space-y-3 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-xs text-slate-300">
                  <p className="font-bold text-amber-400 text-sm flex items-center gap-2">
                    <MoreVertical className="w-4 h-4 text-amber-400" />
                    Android / Chrome Instructions:
                  </p>
                  <ol className="space-y-2 list-decimal list-inside text-slate-200">
                    <li>Tap the <strong className="text-white">3 dots menu (⋮)</strong> in Chrome (top right).</li>
                    <li>Tap <strong className="text-white">Add to Home screen</strong> or <strong className="text-white">Install app</strong>.</li>
                    <li>Tap <strong className="text-white">Install</strong> to add the icon to your App Drawer & Home Screen.</li>
                  </ol>
                </div>
              )}

              {deviceType === 'desktop' && (
                <div className="space-y-3 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-xs text-slate-300">
                  <p className="font-bold text-amber-400 text-sm flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-amber-400" />
                    Desktop Browser Instructions:
                  </p>
                  <ol className="space-y-2 list-decimal list-inside text-slate-200">
                    <li>Look at your browser's address bar (top right).</li>
                    <li>Click the <strong className="text-white">Install icon</strong> <Download className="w-3.5 h-3.5 inline text-amber-400" /> or click menu (⋮) → <strong className="text-white">Install CalmReader</strong>.</li>
                  </ol>
                </div>
              )}

              <p className="text-xs text-slate-400 text-center">
                Once added, open EVVEX directly from your phone or desktop home screen!
              </p>

              <Button
                onClick={() => setShowGuideModal(false)}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold h-11 rounded-xl text-xs cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Got It
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-emerald-500/40 text-white rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-black text-xl text-white">EVVEX App Installed!</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                EVVEX has been added to your <strong className="text-amber-400">Home Screen</strong> and <strong className="text-amber-400">App Drawer</strong>.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                You can now launch EVVEX anytime from your device's home screen as a standalone app with fast offline support.
              </p>
            </div>

            <Button
              onClick={() => {
                setShowSuccessModal(false);
                resetJustInstalled();
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold h-11 rounded-xl text-xs cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </>
  );
};




