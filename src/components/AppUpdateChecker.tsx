import React, { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { 
  ArrowDownToLine, 
  Sparkles, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink 
} from "lucide-react";

export interface VersionPayload {
  version: string;
  downloadUrl: string;
  versionCode?: number;
  releaseDate?: string;
  fileSize?: string;
  notes?: string;
  changelog?: string[];
}

// SemVer comparison: returns > 0 if v1 > v2, < 0 if v1 < v2, 0 if equal
export function compareSemver(v1: string, v2: string): number {
  const clean1 = (v1 || "").replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
  const clean2 = (v2 || "").replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
  const maxLen = Math.max(clean1.length, clean2.length, 1);
  for (let i = 0; i < maxLen; i++) {
    const num1 = clean1[i] !== undefined ? clean1[i] : 0;
    const num2 = clean2[i] !== undefined ? clean2[i] : 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export const AppUpdateChecker: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [installedVersion, setInstalledVersion] = useState<string>("1.0.0");
  const [latestVersionData, setLatestVersionData] = useState<VersionPayload | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  const fetchRemoteVersion = async (): Promise<VersionPayload | null> => {
    // Attempt to query the live remote server first to bypass local assets in Capacitor wrapper
    const candidates = [
      "https://calmreader.qzz.io/version.json",
      "https://evvex-token.pages.dev/version.json",
      "/version.json"
    ];

    for (const url of candidates) {
      try {
        const res = await fetch(`${url}?t=${Date.now()}`, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache"
          }
        });
        if (res.ok) {
          const data: VersionPayload = await res.json();
          if (data && data.version && data.downloadUrl) {
            return data;
          }
        }
      } catch {
        // Try next candidate
      }
    }
    return null;
  };

  const checkForUpdates = async () => {
    try {
      // Check if dismissed in this session
      const sessionDismissed = sessionStorage.getItem("calmreader_update_dismissed");
      if (sessionDismissed) {
        return;
      }

      let currentVer = "1.0.0";
      let currentCode = 1;
      const isNative = Capacitor.isNativePlatform();

      let stored: string | null = null;
      if (isNative) {
        try {
          const info = await CapApp.getInfo();
          if (info && info.version) {
            currentVer = info.version;
          }
          if (info && info.build) {
            const parsed = parseInt(info.build, 10);
            if (!isNaN(parsed)) currentCode = parsed;
          }
        } catch (e) {
          console.warn("[AppUpdate] Failed reading native app info:", e);
        }
      } else {
        // Also check localStorage for manual testing or saved version
        stored = localStorage.getItem("calmreader_installed_apk_version");
        if (stored) currentVer = stored;
      }

      setInstalledVersion(currentVer);

      const remoteData = await fetchRemoteVersion();
      if (!remoteData) return;

      setLatestVersionData(remoteData);

      const isNewerVersion = compareSemver(remoteData.version, currentVer) > 0;
      const isNewerCode = remoteData.versionCode && remoteData.versionCode > currentCode;

      // In native Capacitor, prompt if remote is newer
      if (isNative) {
        if (isNewerVersion || isNewerCode) {
          setUpdateAvailable(true);
        }
      } else {
        // In web preview or browser, only show if specifically requested or if simulated
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has("check_update") || isNewerVersion) {
          // If stored or url parameter explicitly testing
          if (stored || urlParams.has("check_update")) {
            setUpdateAvailable(true);
          }
        }
      }
    } catch (err) {
      console.warn("[AppUpdate] Version check silent error:", err);
    }
  };

  useEffect(() => {
    // Initial check on app startup with a brief delay so the initial screen finishes mounting
    const timer = setTimeout(() => {
      checkForUpdates();
    }, 1200);

    // Listen for manual trigger events from settings or download page
    const handleManualTrigger = () => {
      sessionStorage.removeItem("calmreader_update_dismissed");
      setIsDismissed(false);
      checkForUpdates();
    };

    window.addEventListener("calmreader-check-update", handleManualTrigger);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("calmreader-check-update", handleManualTrigger);
    };
  }, []);

  const handleDownload = () => {
    if (!latestVersionData) return;
    setDownloading(true);

    let downloadUrl = latestVersionData.downloadUrl || "https://calmreader.qzz.io/calmreader.apk";
    if (downloadUrl.includes("calmreader.com")) {
      downloadUrl = downloadUrl.replace("calmreader.com", "calmreader.qzz.io");
    }

    try {
      if (Capacitor.isNativePlatform()) {
        // Open in native system browser / download manager
        window.open(downloadUrl, "_system");
      } else {
        // Standard browser download link
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = "calmreader.apk";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch {
      window.location.href = downloadUrl;
    }

    setTimeout(() => {
      setDownloading(false);
    }, 2000);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setUpdateAvailable(false);
    sessionStorage.setItem("calmreader_update_dismissed", Date.now().toString());
  };

  if (!updateAvailable || isDismissed || !latestVersionData) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden ring-1 ring-slate-900/10 dark:ring-white/10"
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 text-white relative">
          <button
            onClick={handleDismiss}
            aria-label="Close update prompt"
            className="absolute top-4 right-4 p-2 rounded-full bg-black/15 hover:bg-black/30 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full">
                New Version Available
              </span>
              <h2 className="text-xl font-black tracking-tight mt-1">
                Update EVVEX
              </h2>
            </div>
          </div>

          <p className="text-xs text-white/90 leading-relaxed font-medium mt-2">
            A newer release of EVVEX is ready with the latest platform features and bug fixes.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Version comparison row */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Installed</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono">v{installedVersion}</p>
            </div>
            <div className="text-center font-black text-amber-500 text-base">→</div>
            <div>
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Latest</p>
              <p className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">v{latestVersionData.version}</p>
            </div>
            {latestVersionData.fileSize && (
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Size</p>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{latestVersionData.fileSize}</p>
              </div>
            )}
          </div>

          {/* Highlights / Notes */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              What's in this update:
            </p>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              {latestVersionData.changelog && latestVersionData.changelog.length > 0 ? (
                latestVersionData.changelog.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))
              ) : (
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{latestVersionData.notes || "Performance enhancements, author tier prize update (₦5,000), and bug fixes."}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2.5">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <ArrowDownToLine className="w-4 h-4" />
              {downloading ? "Starting Download..." : "Download & Install Update (APK)"}
            </button>

            <div className="flex items-center justify-between text-xs px-1">
              <button
                onClick={handleDismiss}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold transition-colors cursor-pointer py-1"
              >
                Remind Me Later
              </button>

              <a
                href="/download-app"
                onClick={() => handleDismiss()}
                className="text-amber-600 dark:text-amber-400 hover:underline font-semibold flex items-center gap-1"
              >
                <span>Release Notes</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
