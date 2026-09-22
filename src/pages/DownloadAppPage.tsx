import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Smartphone, 
  Download, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  FileText, 
  Sparkles, 
  ExternalLink, 
  Copy, 
  Check, 
  BookOpen, 
  ArrowLeft, 
  QrCode, 
  Lock, 
  Info,
  ChevronRight,
  HardDrive,
  Calendar,
  Layers,
  ArrowDownToLine
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

interface VersionInfo {
  version: string;
  versionCode?: number;
  releaseDate: string;
  fileSize: string;
  minAndroid: string;
  packageName?: string;
  notes: string;
  downloadUrl: string;
  latestDownloadUrl?: string;
  changelog?: string[];
}

const DEFAULT_VERSION: VersionInfo = {
  version: "1.0.1",
  versionCode: 2,
  releaseDate: "2026-09-04",
  fileSize: "7.1 MB",
  minAndroid: "Android 8.0+ (API 26)",
  packageName: "com.calmreader.mobile",
  notes: "Seamless offline reading, high-performance Trivia Hub, mobile-first MPR Partner Dashboard, and enhanced card reader animations.",
  downloadUrl: "/calmreader.apk",
  latestDownloadUrl: "/calmreader-latest.apk",
  changelog: [
    "Native safe-area header support for edge-to-edge Android displays",
    "Offline reading with robust local storage caching",
    "Instant T-Point syncing for trivia comprehension challenges",
    "Optimized MPR Partner recruitment dashboard & referral toolkit",
    "Performance tuning and reduced memory footprint"
  ]
};

export const DownloadAppPage: React.FC = () => {
  const [versionData, setVersionData] = useState<VersionInfo>(DEFAULT_VERSION);
  const [installedVersion, setInstalledVersion] = useState<string | null>(null);
  const [isNativeApp, setIsNativeApp] = useState<boolean>(false);
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [updateStatus, setUpdateStatus] = useState<"up-to-date" | "update-available" | "checked" | "idle">("idle");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  const handleDownloadApk = (url: string = versionData.downloadUrl, filename: string = "calmreader.apk") => {
    setDownloading(true);
    setDownloadMessage(`Downloading ${filename} (${versionData.fileSize})...`);

    // Ensure target URL routes to calmreader.qzz.io and never the parked calmreader.com domain
    let targetUrl = url || "/calmreader.apk";
    if (targetUrl.includes("calmreader.com")) {
      targetUrl = targetUrl.replace("calmreader.com", "calmreader.qzz.io");
    }

    try {
      const link = document.createElement("a");
      link.href = targetUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn("Direct download fallback:", e);
      window.location.href = targetUrl;
    }

    setTimeout(() => {
      setDownloading(false);
      setDownloadMessage(`Download started! Please check your browser downloads or notification bar for ${filename}.`);
    }, 1200);

    setTimeout(() => {
      setDownloadMessage(null);
    }, 7000);
  };

  const rawUrl = (versionData.downloadUrl || "/calmreader.apk").replace("calmreader.com", "calmreader.qzz.io");
  const fullDownloadUrl = rawUrl.startsWith("http")
    ? rawUrl
    : (typeof window !== "undefined" ? `${window.location.origin}${rawUrl}` : `https://calmreader.qzz.io${rawUrl}`);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(fullDownloadUrl)}`;

  // Detect native Capacitor app and fetch version
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
          console.warn("[DownloadAppPage] Could not retrieve native app info:", err);
        }
      } else {
        // Check if there is a simulated or stored version in localStorage
        const storedVer = localStorage.getItem("calmreader_installed_apk_version");
        if (storedVer) {
          setInstalledVersion(storedVer);
        }
      }
    };

    detectEnvironment();
  }, []);

  // Fetch version.json from server with cache busting
  const checkForUpdates = async (manual = false) => {
    setCheckingUpdate(true);
    try {
      // Query server with timestamp to guarantee bypass of any cache
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        }
      });

      if (response.ok) {
        const data: VersionInfo = await response.json();
        if (data.downloadUrl && data.downloadUrl.includes("calmreader.com")) {
          data.downloadUrl = data.downloadUrl.replace("calmreader.com", "calmreader.qzz.io");
        }
        if (data.latestDownloadUrl && data.latestDownloadUrl.includes("calmreader.com")) {
          data.latestDownloadUrl = data.latestDownloadUrl.replace("calmreader.com", "calmreader.qzz.io");
        }
        setVersionData(data);
        setLastCheckTime(new Date().toLocaleTimeString());

        // Compare versions if we know installed version
        if (installedVersion) {
          if (compareVersions(data.version, installedVersion) > 0) {
            setUpdateStatus("update-available");
          } else {
            setUpdateStatus("up-to-date");
          }
        } else {
          setUpdateStatus("checked");
        }
      } else {
        setUpdateStatus("checked");
      }
    } catch (err) {
      console.warn("[DownloadAppPage] Version check failed, using defaults:", err);
      setUpdateStatus("checked");
    } finally {
      setTimeout(() => {
        setCheckingUpdate(false);
      }, 500);
    }
  };

  useEffect(() => {
    checkForUpdates();
  }, [installedVersion]);

  // SemVer comparison helper: returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
  const compareVersions = (v1: string, v2: string): number => {
    const clean1 = v1.replace(/^v/, "").split(".").map(Number);
    const clean2 = v2.replace(/^v/, "").split(".").map(Number);
    for (let i = 0; i < Math.max(clean1.length, clean2.length); i++) {
      const num1 = clean1[i] || 0;
      const num2 = clean2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullDownloadUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const hasUpdate = updateStatus === "update-available" || (installedVersion && compareVersions(versionData.version, installedVersion) > 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#06060c] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0c0c14]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title="Return to CalmReader"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-700 to-emerald-600 dark:from-[#EAB308] dark:to-amber-500 flex items-center justify-center text-white dark:text-black font-black shadow-md">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-lg tracking-tight">CalmReader</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              to="/bookshelf" 
              className="hidden sm:inline-flex text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors px-3 py-1.5"
            >
              Explore Library
            </Link>
            <Link 
              to="/dashboard" 
              className="text-xs font-bold bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 px-3.5 py-1.5 rounded-lg transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">

        {/* Update Alert Banner (if newer version is available) */}
        {hasUpdate && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-green-500/15 border border-amber-500/30 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center shrink-0 font-bold shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-base text-amber-600 dark:text-amber-400">
                    Update Available: CalmReader v{versionData.version}
                  </span>
                  <Badge className="bg-amber-500 text-black font-bold text-[10px] uppercase">New</Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  A new APK build is ready with enhancements and bug fixes. Download to update without losing your saved books or data.
                </p>
              </div>
            </div>
            <a 
              href={rawUrl} 
              download="calmreader.apk"
              className="shrink-0 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black px-5 py-2.5 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <Download className="w-4 h-4" /> Download Update
            </a>
          </div>
        )}

        {/* Hero & Download Card */}
        <div className="relative rounded-3xl bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 dark:from-[#0d0d16] dark:via-[#090910] dark:to-[#0f1715] border border-slate-200 dark:border-white/10 p-6 sm:p-10 shadow-xl overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-green-600/10 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-600/10 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/40 border border-emerald-300/40 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Official Android Release</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Download CalmReader for Android
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                Experience swipeable micro-books, interactive trivia, and offline reading with the official CalmReader Android APK. Fast, lightweight, and battery-friendly.
              </p>

              {/* Specs Pills */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 pt-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold">
                  <Layers className="w-3.5 h-3.5 text-green-600 dark:text-amber-400" />
                  <span>Version: <strong>v{versionData.version}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold">
                  <HardDrive className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Size: <strong>{versionData.fileSize}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold">
                  <Smartphone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Requires: <strong>{versionData.minAndroid}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Released: <strong>{versionData.releaseDate}</strong></span>
                </div>
              </div>

              {/* Download CTA Group */}
              <div className="pt-3 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => handleDownloadApk(versionData.downloadUrl, "calmreader.apk")}
                  id="download-apk-button"
                  disabled={downloading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-600 hover:to-emerald-500 dark:from-[#EAB308] dark:to-amber-500 dark:hover:from-amber-400 dark:hover:to-[#EAB308] text-white dark:text-black font-extrabold text-sm sm:text-base px-8 py-3.5 rounded-2xl shadow-xl shadow-green-700/20 dark:shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 text-center cursor-pointer disabled:opacity-75"
                >
                  {downloading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Starting Download...</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="w-5 h-5" />
                      <span>Download CalmReader for Android ({versionData.fileSize})</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 transition-colors"
                  title="Copy direct APK link"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? "Link Copied!" : "Copy APK Link"}</span>
                </button>

                <button
                  onClick={() => setShowQrModal(!showQrModal)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 transition-colors"
                  title="Show QR Code for phone"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{showQrModal ? "Hide QR" : "Scan QR"}</span>
                </button>
              </div>

              {/* Download Feedback Banner */}
              {downloadMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-semibold">{downloadMessage}</span>
                </div>
              )}

              {/* Live Server Sync & Check Button */}
              <div className="pt-2 flex items-center justify-center md:justify-start gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  {lastCheckTime ? `Verified live: ${lastCheckTime}` : "Verified direct download"}
                </span>
                <span>•</span>
                <button
                  onClick={() => checkForUpdates(true)}
                  disabled={checkingUpdate}
                  className="hover:text-green-700 dark:hover:text-amber-400 inline-flex items-center gap-1 font-semibold underline underline-offset-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${checkingUpdate ? "animate-spin" : ""}`} />
                  <span>{checkingUpdate ? "Checking..." : "Check for Updates"}</span>
                </button>
              </div>
            </div>

            {/* QR Code & Phone Preview Panel */}
            <div className="shrink-0 flex flex-col items-center bg-white dark:bg-[#07070d] p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg text-center max-w-xs">
              <div className="relative group">
                <img 
                  src={qrCodeUrl} 
                  alt="CalmReader APK Download QR Code" 
                  className="w-40 h-40 sm:w-44 sm:h-44 rounded-xl border border-slate-100 dark:border-white/5 bg-white p-2"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                  <span className="text-white text-xs font-bold bg-black/80 px-2.5 py-1 rounded-lg">Point camera</span>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white mt-3 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-green-600 dark:text-amber-400" />
                <span>Scan to Download</span>
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Point your phone camera to download directly to your mobile device.
              </p>
            </div>
          </div>
        </div>

        {/* Grid: 2 Columns (Installation Steps + Version / Release Notes) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Installation Instructions (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] overflow-hidden shadow-sm">
              <CardHeader className="p-5 sm:p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <Smartphone className="w-4 h-4" />
                  <span>Installation Guide</span>
                </div>
                <CardTitle className="text-lg sm:text-xl font-bold mt-1">
                  How to Install CalmReader on Android
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Follow these 5 simple steps to install the APK file on any Android phone or tablet.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 space-y-4">
                {/* Step 1 */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                  <div className="w-7 h-7 rounded-lg bg-green-700 dark:bg-amber-500 text-white dark:text-black flex items-center justify-center font-extrabold text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Download the APK file
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Tap the <strong>"Download CalmReader for Android"</strong> button above or scan the QR code. The file <code className="text-emerald-700 dark:text-amber-400 font-mono text-[11px]">calmreader.apk</code> ({versionData.fileSize}) will save to your device.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                  <div className="w-7 h-7 rounded-lg bg-green-700 dark:bg-amber-500 text-white dark:text-black flex items-center justify-center font-extrabold text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Open the APK file on your phone
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Once the download completes, tap the completed notification in your notification tray, or open your phone's <strong>Files / Downloads</strong> folder and tap <code className="text-emerald-700 dark:text-amber-400 font-mono text-[11px]">calmreader.apk</code>.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                  <div className="w-7 h-7 rounded-lg bg-green-700 dark:bg-amber-500 text-white dark:text-black flex items-center justify-center font-extrabold text-xs shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Enable "Install from Unknown Sources" if prompted
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      If Android displays a security dialog:
                    </p>
                    <div className="mt-2 text-[11px] bg-slate-100 dark:bg-white/5 p-2.5 rounded-lg font-mono text-slate-700 dark:text-slate-300 space-y-1">
                      <div>• Go to <strong>Settings → Security → Unknown Sources</strong></div>
                      <div>• Or tap <strong>"Settings"</strong> on the prompt and toggle ON <strong>"Allow from this source"</strong> for Chrome or your File Manager</div>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                  <div className="w-7 h-7 rounded-lg bg-green-700 dark:bg-amber-500 text-white dark:text-black flex items-center justify-center font-extrabold text-xs shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Tap "Install" and wait for completion
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Confirm by tapping <strong>Install</strong>. The package manager will unpack and install CalmReader on your system within seconds.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                  <div className="w-7 h-7 rounded-lg bg-green-700 dark:bg-amber-500 text-white dark:text-black flex items-center justify-center font-extrabold text-xs shrink-0">
                    5
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Tap "Open" to launch CalmReader
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Tap <strong>Open</strong>, or find the CalmReader icon on your home screen or app drawer. Sign in or continue as a guest to read and play!
                    </p>
                  </div>
                </div>

                {/* Security Box */}
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 text-emerald-900 dark:text-emerald-300">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>🔐 Your data is safe. The app does not access your personal files without permission.</span>
                  </div>
                  <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400/80 mt-1 leading-relaxed">
                    CalmReader is built with Capacitor and contains no adware, tracking bloat, or invasive background services. All reading files and progress are securely stored in your isolated sandbox storage.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Android Warning Explanation FAQ */}
            <Card className="rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] p-5">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-2 text-slate-900 dark:text-white">
                <Info className="w-4 h-4 text-amber-500" />
                <span>Why does Android warn "File might be harmful"?</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Google Chrome and Android display a default precautionary alert for any application downloaded directly from a web server rather than the Google Play Store. You can safely tap <strong>"Download anyway"</strong>. CalmReader is completely safe and free from third-party advertising or telemetry.
              </p>
            </Card>
          </div>

          {/* RIGHT COLUMN: Version Info, Changelog & Update Workflow (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Version Card */}
            <Card className="rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3.5 mb-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Release Details</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>CalmReader v{versionData.version}</span>
                    <Badge className="bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20 text-[10px] font-bold">
                      Stable
                    </Badge>
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block">{versionData.fileSize}</span>
                  <span className="text-[10px] text-slate-400 block">{versionData.releaseDate}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">What's New in v{versionData.version}</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {versionData.notes}
                  </p>
                </div>

                {versionData.changelog && versionData.changelog.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Key Improvements</h5>
                    <ul className="space-y-2">
                      {versionData.changelog.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Package Metadata */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-col gap-1.5 text-[11px] text-slate-500 font-mono">
                <div className="flex justify-between">
                  <span>Package ID:</span>
                  <span className="text-slate-800 dark:text-slate-200">{versionData.packageName || "com.calmreader.mobile"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Target SDK:</span>
                  <span className="text-slate-800 dark:text-slate-200">Android 14 (API 34)</span>
                </div>
                <div className="flex justify-between">
                  <span>Min SDK:</span>
                  <span className="text-slate-800 dark:text-slate-200">{versionData.minAndroid}</span>
                </div>
              </div>
            </Card>

            {/* Automatic Update Workflow Card */}
            <Card className="rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw className="w-4 h-4 text-green-700 dark:text-[#EAB308]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Seamless Update Workflow
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                When a new APK release is published, you don't need to uninstall or reconfigure your account:
              </p>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</div>
                  <span>Simply download the new APK from this page.</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</div>
                  <span>Tap Install — Android automatically recognizes the update and keeps all your downloaded books, notes, and T-Points.</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</div>
                  <span>This page automatically syncs with <code className="font-mono text-[10px] text-amber-500">/version.json</code> to notify you of future updates.</span>
                </div>
              </div>
            </Card>

            {/* Download Mirrors Card */}
            <Card className="rounded-2xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a0a10] p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Alternative Download Mirrors</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3.5">
                Both mirror links download the complete, authentic CalmReader Android APK ({versionData.fileSize}):
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handleDownloadApk("/calmreader-latest.apk", "calmreader-latest.apk")}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-emerald-500/40 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors text-left group"
                >
                  <span className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="block text-slate-900 dark:text-white">Download Mirror 1 (/calmreader-latest.apk)</span>
                      <span className="text-[11px] font-normal text-slate-500">Direct Android APK ({versionData.fileSize})</span>
                    </div>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => handleDownloadApk("/calmreader.apk", "calmreader.apk")}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-emerald-500/40 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors text-left group"
                >
                  <span className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="block text-slate-900 dark:text-white">Download Mirror 2 (/calmreader.apk)</span>
                      <span className="text-[11px] font-normal text-slate-500">Root fallback APK ({versionData.fileSize})</span>
                    </div>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Updater Technical Manifest link */}
              <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span>Auto-updater metadata</span>
                <a
                  href="/version.json"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-amber-500 transition-colors text-slate-500 underline"
                  title="View JSON manifest used by app auto-updater"
                >
                  <FileText className="w-3 h-3 text-amber-500" />
                  <span>Inspect version.json</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </Card>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-[#08080f] text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-green-700 dark:text-[#EAB308]" />
            <span className="font-bold text-slate-900 dark:text-white">CalmReader Android</span>
            <span>•</span>
            <span>v{versionData.version}</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link to="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms of Service</Link>
            <Link to="/support" className="hover:text-slate-900 dark:hover:text-white transition-colors">Help & Support</Link>
          </div>
          <p>© 2026 CalmReader. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default DownloadAppPage;
