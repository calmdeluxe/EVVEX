import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Download, 
  ArrowLeft, 
  CheckCircle2, 
  QrCode, 
  Smartphone, 
  ShieldCheck,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { FrameworkBackground } from "../components/FrameworkBackground";
import { EvvexLogo } from "../components/EvvexLogo";

interface VersionInfo {
  version: string;
  versionCode?: number;
  releaseDate: string;
  fileSize: string;
  minAndroid: string;
  downloadUrl: string;
  latestDownloadUrl?: string;
  notes?: string;
}

const DEFAULT_VERSION: VersionInfo = {
  version: "1.0.1",
  versionCode: 2,
  releaseDate: "2026-09-27",
  fileSize: "7.1 MB",
  minAndroid: "Android 8.0+",
  downloadUrl: "/evvex-latest.apk",
  latestDownloadUrl: "/evvex-latest.apk",
  notes: "EVVEX Live Gatherings, VIP Passes & Instant Check-In."
};

export const DownloadAppPage: React.FC = () => {
  const [versionData, setVersionData] = useState<VersionInfo>(DEFAULT_VERSION);
  const [installedVersion, setInstalledVersion] = useState<string | null>(null);
  const [isNativeApp, setIsNativeApp] = useState<boolean>(false);
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Detect native runtime
  useEffect(() => {
    const detectEnvironment = async () => {
      const isNative = Capacitor.isNativePlatform();
      setIsNativeApp(isNative);

      if (isNative) {
        try {
          const appInfo = await CapApp.getInfo();
          if (appInfo && appInfo.version) {
            setInstalledVersion(appInfo.version);
          }
        } catch (err) {
          console.warn("[DownloadAppPage] Native info warning:", err);
        }
      }
    };

    detectEnvironment();
  }, []);

  // Fetch version info with cache buster
  const fetchLatestVersion = async () => {
    setCheckingUpdate(true);
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });
      if (res.ok) {
        const data = await res.json();
        setVersionData(data);
      }
    } catch (err) {
      console.warn("[DownloadAppPage] Version fetch notice:", err);
    } finally {
      setTimeout(() => setCheckingUpdate(false), 500);
    }
  };

  useEffect(() => {
    fetchLatestVersion();
  }, []);

  // Guaranteed fresh download handler
  const handleDownload = () => {
    setDownloading(true);
    setDownloadNotice("Fetching the latest APK build...");

    // Append unique timestamp parameter so browser/CDN never serves a stale cached binary
    const baseTarget = versionData.latestDownloadUrl || versionData.downloadUrl || "/evvex-latest.apk";
    const cacheBuster = `t=${Date.now()}`;
    const freshUrl = baseTarget.includes("?") 
      ? `${baseTarget}&${cacheBuster}` 
      : `${baseTarget}?${cacheBuster}`;

    try {
      const link = document.createElement("a");
      link.href = freshUrl;
      link.setAttribute("download", "evvex.apk");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      window.location.href = freshUrl;
    }

    setTimeout(() => {
      setDownloading(false);
      setDownloadNotice("Download started! Check your notification bar or downloads folder.");
    }, 1200);

    setTimeout(() => {
      setDownloadNotice(null);
    }, 6000);
  };

  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "https://evex.live";
  const directApkUrl = `${currentOrigin}/evvex-latest.apk`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(directApkUrl)}`;

  return (
    <FrameworkBackground overlayOpacity="from-[#1E140F]/90 via-[#15100D]/80 to-[#0B0806]/95">
      <div className="min-h-screen flex flex-col justify-between selection:bg-[#FDE68A] selection:text-[#1E140F]">
        {/* ── TOP NAV BAR ── */}
        <header className="w-full px-6 py-5 max-w-5xl mx-auto flex items-center justify-between">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-xs font-bold text-[#FDE68A]/80 hover:text-[#FDE68A] transition-colors py-1 px-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Gatherings</span>
          </Link>

          <Link to="/" className="hover:opacity-90 transition-opacity">
            <EvvexLogo size="sm" variant="light" />
          </Link>
        </header>

        {/* ── MAIN HERO CARD ── */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="relative w-full max-w-md">
            {/* Lanyard Brass Hook Pin */}
            <div className="relative flex items-center justify-center mb-4">
              <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#FEF08A] to-[#B45309] shadow-lg border border-[#FFFBEB]/40 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-[#78350F]" />
              </div>
              <div className="absolute top-6 w-[2px] h-3.5 bg-[#FEF08A]/40" />
            </div>

            {/* Artisan Pass Container */}
            <div 
              className="relative rounded-3xl p-8 sm:p-10 flex flex-col items-center text-center shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9)] border border-[#FDE68A]/35 backdrop-blur-md overflow-hidden"
              style={{
                background: 'linear-gradient(155deg, rgba(147, 61, 30, 0.92) 0%, rgba(30, 20, 15, 0.96) 100%)',
              }}
            >
              {/* Perimeter Stitching Border */}
              <div className="absolute inset-2.5 rounded-2xl pointer-events-none border border-dashed border-[#FDE68A]/30" />

              {/* Radiant Logo Emblem */}
              <div className="relative mb-6">
                <div 
                  className="absolute -inset-4 rounded-full opacity-60 filter blur-xl animate-pulse"
                  style={{
                    background: 'radial-gradient(circle, rgba(245, 158, 11, 0.6) 0%, rgba(194, 65, 12, 0.2) 60%, transparent 100%)',
                    animationDuration: '2.8s',
                  }}
                />
                <div className="relative">
                  <EvvexLogo size="xl" showText={false} variant="light" />
                </div>
              </div>

              {/* Title & Tagline */}
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-serif mb-2">
                Download EVVEX
              </h1>
              <p className="text-xs sm:text-sm text-[#FDE68A]/80 font-medium max-w-xs mb-6">
                Live Gatherings, VIP Access & Instant Gate Passes
              </p>

              {/* Version & Build Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 border border-[#FDE68A]/20 text-[11px] font-medium text-[#FDE68A] mb-8">
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>v{versionData.version}</span>
                <span className="opacity-40">•</span>
                <span>{versionData.fileSize}</span>
                <span className="opacity-40">•</span>
                <span>{versionData.minAndroid}</span>
              </div>

              {/* ── PRIMARY DOWNLOAD ACTION ── */}
              <div className="w-full space-y-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-[#FEF08A] via-[#F59E0B] to-[#D97706] hover:from-[#FFFBEB] hover:via-[#FBBF24] hover:to-[#B45309] text-[#1E140F] font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-[0_8px_25px_rgba(245,158,11,0.35)] hover:shadow-[0_10px_35px_rgba(245,158,11,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-75"
                >
                  <Download className={`w-5 h-5 ${downloading ? 'animate-bounce' : ''}`} />
                  <span>{downloading ? 'Starting Download...' : 'Download APK (Latest Release)'}</span>
                </button>

                <p className="text-[11px] text-[#FDE68A]/60 font-medium">
                  Guaranteed latest build • Direct APK install for Android
                </p>
              </div>

              {/* Status & Feedback Toast */}
              {downloadNotice && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center justify-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{downloadNotice}</span>
                </div>
              )}

              {/* Secondary Options: QR Code & Refresh */}
              <div className="mt-8 pt-6 border-t border-white/10 w-full flex items-center justify-center gap-4 text-xs">
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="inline-flex items-center gap-1.5 text-[#FDE68A]/80 hover:text-white transition-colors"
                >
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span>Scan to Download</span>
                </button>

                <span className="text-white/20">•</span>

                <button
                  type="button"
                  onClick={fetchLatestVersion}
                  disabled={checkingUpdate}
                  className="inline-flex items-center gap-1.5 text-[#FDE68A]/80 hover:text-white transition-colors disabled:opacity-50"
                  title="Check for newest updates"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin text-amber-400' : ''}`} />
                  <span>{checkingUpdate ? 'Checking...' : 'Check Updates'}</span>
                </button>
              </div>

              {/* Safety Badge */}
              <div className="mt-6 flex items-center gap-1.5 text-[11px] text-white/50">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Safe & Signed Official Package</span>
              </div>
            </div>
          </div>
        </main>

        {/* ── FOOTER ── */}
        <footer className="w-full py-4 text-center text-[11px] text-white/40">
          <p>© {new Date().getFullYear()} EVVEX Technologies • Lagos & Abuja</p>
        </footer>

        {/* ── QR CODE MODAL ── */}
        {showQrModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
            onClick={() => setShowQrModal(false)}
          >
            <div 
              className="relative p-6 sm:p-8 bg-[#1E140F] border border-[#FDE68A]/30 rounded-3xl max-w-xs w-full text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-white font-serif mb-2">
                Scan with Phone Camera
              </h3>
              <p className="text-xs text-[#FDE68A]/70 mb-4">
                Scan this code on your Android device to download the latest EVVEX APK instantly.
              </p>

              <div className="p-3 bg-white rounded-2xl shadow-inner inline-block mb-4">
                <img 
                  src={qrCodeUrl} 
                  alt="EVVEX APK QR Code" 
                  className="w-48 h-48 block"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </FrameworkBackground>
  );
};

export default DownloadAppPage;
