import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { DashboardLayout } from "../components/DashboardLayout";
import { supabase } from "../supabase";
import {
  Users,
  Wallet,
  TrendingUp,
  Share2,
  Copy,
  Check,
  QrCode,
  Download,
  BarChart3,
  Settings,
  Mail,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ArrowUpRight,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Send,
  Award,
  Layers,
  DollarSign,
  UserCheck,
  Image as ImageIcon,
  FileText,
  BookOpen,
  Plus,
  Trash2,
  HelpCircle,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "../lib/utils";
import axios from "axios";
import { generateAiContent } from "../lib/ai";

export const MprDashboard: React.FC = () => {
  const { user, profile, accountTier, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const effectiveTier = (user as any)?.account_tier || profile?.account_tier || accountTier;
  const effectiveRole = (user as any)?.role || profile?.role;
  const isMpr = 
    isAdmin ||
    effectiveTier === 'mpr' ||
    effectiveTier === 'marketing_partner' ||
    effectiveRole === 'marketing_partner';

  if (!isMpr) {
    return <Navigate to="/dashboard" replace />;
  }

  const [activeTab, setActiveTab] = useState<
    "overview" | "referrals" | "recruitment" | "commissions" | "marketing" | "analytics" | "settings"
  >("overview");

  useEffect(() => {
    const pathParts = location.pathname.split("/").filter(Boolean);
    const subRoute = pathParts[1] || "overview";
    if (["overview", "referrals", "recruitment", "commissions", "marketing", "analytics", "settings"].includes(subRoute)) {
      setActiveTab(subRoute as any);
    }
  }, [location.pathname]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as any);
    if (tabId === "overview") {
      navigate("/mpr");
    } else {
      navigate(`/mpr/${tabId}`);
    }
  };

  const handleBack = () => {
    if (activeTab !== "overview") {
      handleTabChange("overview");
    } else {
      navigate("/dashboard");
    }
  };

  const [loading, setLoading] = useState(true);
  const [mprData, setMprData] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [savingCode, setSavingCode] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [codeSuccess, setCodeSuccess] = useState("");

  // Search & Filter for Recruits
  const [recruitSearch, setRecruitSearch] = useState("");
  const [recruitFilter, setRecruitFilter] = useState<"all" | "approved" | "pending">("all");

  // Withdrawal Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBank, setWithdrawBank] = useState("");
  const [withdrawAccountNum, setWithdrawAccountNum] = useState("");
  const [withdrawAccountName, setWithdrawAccountName] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Settings Form State
  const [settingsBank, setSettingsBank] = useState("");
  const [settingsAccountNum, setSettingsAccountNum] = useState("");
  const [settingsAccountName, setSettingsAccountName] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Notification Preferences
  const [notifNewRecruit, setNotifNewRecruit] = useState(true);
  const [notifCommission, setNotifCommission] = useState(true);
  const [notifPayouts, setNotifPayouts] = useState(true);

  // Copied text trackers for marketing tools
  const [copiedPostIndex, setCopiedPostIndex] = useState<number | null>(null);
  const [copiedEmailIndex, setCopiedEmailIndex] = useState<number | null>(null);

  // Create Trivia Modal State for MPR
  const [showCreateTriviaModal, setShowCreateTriviaModal] = useState(false);
  const [triviaBooks, setTriviaBooks] = useState<any[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [triviaTitle, setTriviaTitle] = useState("");
  const [triviaDesc, setTriviaDesc] = useState("");
  const [triviaReward, setTriviaReward] = useState("100");
  const [triviaPrice, setTriviaPrice] = useState("0");
  const [triviaDuration, setTriviaDuration] = useState("15");
  const [triviaInputMode, setTriviaInputMode] = useState<"builder" | "import">("builder");
  const [bulkQuestionsText, setBulkQuestionsText] = useState("");
  const [builderQuestions, setBuilderQuestions] = useState<any[]>([
    { question: "", options: ["", "", "", ""], correct_answer: "A", explanation: "", difficulty: "Medium" }
  ]);
  const [submittingTrivia, setSubmittingTrivia] = useState(false);
  const [generatingAiTrivia, setGeneratingAiTrivia] = useState(false);
  const [triviaMsg, setTriviaMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPublishedBooks = async () => {
    setLoadingBooks(true);
    try {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author_name, price")
        .order("title", { ascending: true });
      if (data) {
        setTriviaBooks(data);
      }
    } catch (e: any) {
      console.warn("Could not load published books for trivia dropdown:", e.message);
    } finally {
      setLoadingBooks(false);
    }
  };

  const handleAiGenerateQuestions = async () => {
    setGeneratingAiTrivia(true);
    setTriviaMsg(null);
    try {
      const selectedBook = triviaBooks.find(b => b.id === selectedBookId);
      const topic = selectedBook ? `eBook "${selectedBook.title}" by ${selectedBook.author_name || "Author"}` : (triviaTitle || "General Knowledge, African Literature, and Reading");
      const prompt = `Generate 5 engaging multiple-choice trivia questions for ${topic}.
Return strictly JSON format:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "A",
      "explanation": "Why this answer is correct",
      "difficulty": "Medium"
    }
  ]
}`;
      const res = await generateAiContent(prompt, {
        responseMimeType: "application/json",
        model: "google/gemini-2.5-flash"
      });

      let qs: any[] = [];
      if (res.data?.questions && Array.isArray(res.data.questions)) {
        qs = res.data.questions;
      } else if (Array.isArray(res.data)) {
        qs = res.data;
      } else if (typeof res.text === "string") {
        const parsed = JSON.parse(res.text.replace(/```json\n?|\n?```/g, "").trim());
        qs = parsed?.questions || (Array.isArray(parsed) ? parsed : []);
      }

      if (qs.length > 0) {
        setBuilderQuestions(qs);
        setTriviaMsg({ type: "success", text: `Generated ${qs.length} trivia questions with AI successfully!` });
      } else {
        throw new Error("AI returned an empty question list. Please try again or type questions manually.");
      }
    } catch (err: any) {
      setTriviaMsg({ type: "error", text: err.message || "Failed to generate trivia questions with AI." });
    } finally {
      setGeneratingAiTrivia(false);
    }
  };

  const handleSubmitTrivia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triviaTitle.trim()) {
      setTriviaMsg({ type: "error", text: "Please enter a title for the trivia challenge." });
      return;
    }

    let finalQuestions: any[] = [];
    if (triviaInputMode === "import") {
      if (!bulkQuestionsText.trim()) {
        setTriviaMsg({ type: "error", text: "Please paste your questions into the text box." });
        return;
      }
      try {
        if (bulkQuestionsText.trim().startsWith("[") || bulkQuestionsText.trim().startsWith("{")) {
          const parsed = JSON.parse(bulkQuestionsText.replace(/```json\n?|\n?```/g, "").trim());
          finalQuestions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
        } else {
          const blocks = bulkQuestionsText.split(/\n\s*\n/);
          for (const block of blocks) {
            const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
            if (lines.length >= 3) {
              const qText = lines[0].replace(/^Q\d*[:.]\s*/i, "");
              const optA = lines.find(l => /^A[).:]/i.test(l))?.replace(/^A[).:]\s*/i, "") || "";
              const optB = lines.find(l => /^B[).:]/i.test(l))?.replace(/^B[).:]\s*/i, "") || "";
              const optC = lines.find(l => /^C[).:]/i.test(l))?.replace(/^C[).:]\s*/i, "") || "";
              const optD = lines.find(l => /^D[).:]/i.test(l))?.replace(/^D[).:]\s*/i, "") || "";
              const ansLine = lines.find(l => /^(Answer|Correct)[:.]/i.test(l));
              const ansMatch = ansLine ? ansLine.match(/[A-D]/i) : null;
              const correct_answer = ansMatch ? ansMatch[0].toUpperCase() : "A";
              const expLine = lines.find(l => /^Explanation[:.]/i.test(l));
              const explanation = expLine ? expLine.replace(/^Explanation[:.]\s*/i, "") : "";

              if (qText) {
                finalQuestions.push({
                  question: qText,
                  options: [optA || "Option A", optB || "Option B", optC || "Option C", optD || "Option D"],
                  correct_answer,
                  explanation,
                  difficulty: "Medium"
                });
              }
            }
          }
        }
      } catch (err: any) {
        setTriviaMsg({ type: "error", text: "Could not parse imported questions. Please check format or use Builder mode." });
        return;
      }
    } else {
      finalQuestions = builderQuestions.filter(q => q.question.trim());
    }

    if (finalQuestions.length === 0) {
      setTriviaMsg({ type: "error", text: "Please provide at least 1 question with options." });
      return;
    }

    setSubmittingTrivia(true);
    setTriviaMsg(null);
    try {
      const { error: insertErr } = await supabase.from("trivias").insert({
        title: triviaTitle.trim(),
        description: triviaDesc.trim(),
        book_id: selectedBookId || null,
        reward_points: parseInt(triviaReward) || 100,
        price: parseInt(triviaPrice) || 0,
        duration_seconds: parseInt(triviaDuration) || 15,
        status: "pending",
        is_active: false,
        type: "marketing",
        requires_premium: false,
        starts_at: new Date().toISOString(),
        creator_id: user?.id || null,
        promotional_writeup: JSON.stringify(finalQuestions),
        created_at: new Date().toISOString()
      });

      if (insertErr) throw insertErr;

      setTriviaMsg({
        type: "success",
        text: "Trivia submitted successfully! It is now pending Admin approval and will appear in the Trivia Hub once verified."
      });

      setTimeout(() => {
        setTriviaTitle("");
        setTriviaDesc("");
        setSelectedBookId("");
        setBulkQuestionsText("");
        setBuilderQuestions([{ question: "", options: ["", "", "", ""], correct_answer: "A", explanation: "", difficulty: "Medium" }]);
      }, 2500);
    } catch (err: any) {
      console.error("[MPR Dashboard] Failed to insert trivia:", err);
      setTriviaMsg({ type: "error", text: err.message || "Failed to submit trivia. Please try again." });
    } finally {
      setSubmittingTrivia(false);
    }
  };

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchMprData = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeader();
      const res = await axios.get("/api/mpr/dashboard", { headers });
      if (res.data && res.data.success) {
        setMprData(res.data);
        setCustomCode(res.data.profile.mpr_code || "");
        setSettingsBank(res.data.profile.bank_name || "");
        setSettingsAccountNum(res.data.profile.account_number || "");
        setSettingsAccountName(res.data.profile.account_name || "");
        setWithdrawBank(res.data.profile.bank_name || "");
        setWithdrawAccountNum(res.data.profile.account_number || "");
        setWithdrawAccountName(res.data.profile.account_name || "");
      }
    } catch (err: any) {
      console.warn("[MPR] Error loading dashboard from API, using fallback data:", err);
      // Construct robust fallback
      setMprData({
        profile: {
          mpr_code: profile?.mpr_code || profile?.referral_code || `MPR-${user?.id?.substring(0, 6).toUpperCase()}`,
          bank_name: profile?.bank_name || "",
          account_number: profile?.account_number || "",
          account_name: profile?.account_name || ""
        },
        stats: {
          totalRecruits: 0,
          totalAuthors: 0,
          totalEarnings: 0,
          pendingCommissions: 0,
          conversionRate: "0%"
        },
        recruits: [],
        payouts: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMprData();
  }, []);

  const mprCode = mprData?.profile?.mpr_code || customCode || `MPR-${user?.id?.substring(0, 6).toUpperCase()}`;
  const baseUrl = window.location.origin;
  const referralUrl = `${baseUrl}/signup?ref=${mprCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(mprCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleSaveCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCode.trim()) return;
    setSavingCode(true);
    setCodeError("");
    setCodeSuccess("");
    try {
      const headers = await getAuthHeader();
      const res = await axios.post("/api/mpr/update-code", { mpr_code: customCode }, { headers });
      if (res.data?.success) {
        setCodeSuccess("MPR Referral Code updated successfully!");
        fetchMprData();
      }
    } catch (err: any) {
      setCodeError(err.response?.data?.error || "Failed to update code.");
    } finally {
      setSavingCode(false);
    }
  };

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || parseFloat(withdrawAmount) < 1000) {
      setWithdrawMsg({ type: "error", text: "Minimum payout request amount is ₦1,000." });
      return;
    }
    setWithdrawLoading(true);
    setWithdrawMsg(null);
    try {
      const headers = await getAuthHeader();
      const res = await axios.post("/api/mpr/withdraw", {
        amount: withdrawAmount,
        bank_name: withdrawBank,
        account_number: withdrawAccountNum,
        account_name: withdrawAccountName,
      }, { headers });
      if (res.data?.success) {
        setWithdrawMsg({ type: "success", text: "Payout request submitted! Admin will process your transfer." });
        setWithdrawAmount("");
        setTimeout(() => setShowWithdrawModal(false), 2500);
        fetchMprData();
      }
    } catch (err: any) {
      setWithdrawMsg({ type: "error", text: err.response?.data?.error || "Withdrawal failed." });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMsg(null);
    try {
      const headers = await getAuthHeader();
      const res = await axios.post("/api/mpr/settings", {
        bank_name: settingsBank,
        account_number: settingsAccountNum,
        account_name: settingsAccountName,
        mpr_code: customCode,
      }, { headers });
      if (res.data?.success) {
        setSettingsMsg({ type: "success", text: "Payout bank settings saved successfully!" });
        fetchMprData();
      }
    } catch (err: any) {
      setSettingsMsg({ type: "error", text: err.response?.data?.error || "Failed to save settings." });
    } finally {
      setSavingSettings(false);
    }
  };

  // Social Share Handlers
  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Become an author on CalmReader & earn 85% royalties on your eBooks! Join now: ${referralUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`, "_blank");
  };

  const shareTwitter = () => {
    const text = encodeURIComponent(`Publish your eBooks on CalmReader and connect with thousands of readers worldwide. Sign up using my link: ${referralUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  // Pre-written social media posts
  const socialPosts = [
    {
      platform: "WhatsApp / Status",
      content: `📚 Attention Authors & Content Creators! 🚀\n\nPublish your eBooks on CalmReader and keep up to 85% of your sales royalties!\n\n✨ Instant Publishing\n✨ Direct Bank Payouts\n✨ Built-in Reader Audience\n\nSign up today: ${referralUrl}`
    },
    {
      platform: "Twitter / X",
      content: `Are you an author looking to publish your eBooks and reach thousands of readers in Africa? 🌍\n\n@CalmReader gives you top royalties, analytics, and instant publishing.\n\nSign up here 👇\n${referralUrl}`
    },
    {
      platform: "Facebook / LinkedIn",
      content: `Exciting news for writers and publishers! 📖 CalmReader is empowering authors to publish eBooks, monetise their content, and build an audience with ease.\n\nKey Benefits:\n- Up to 85% royalty rate\n- Instant publishing approval\n- Transparent revenue dashboard\n\nGet started now: ${referralUrl}`
    }
  ];

  // Pre-written email templates
  const emailTemplates = [
    {
      title: "Author Invitation - Earn Royalties on CalmReader",
      subject: "Invitation to Publish Your Books on CalmReader",
      body: `Hello,\n\nI hope this email finds you well.\n\nI am reaching out to invite you to join CalmReader — Nigeria's leading digital eBook publishing and reader community.\n\nAs a Marketing Partner with CalmReader, I want to help you publish your work and monetise your content effortlessly. CalmReader offers:\n- 85% royalty payouts directly to your bank account\n- Instant author tools & sales analytics\n- A growing network of passionate readers\n\nYou can register your author account here:\n${referralUrl}\n\nFeel free to reply if you have any questions!\n\nBest regards,\nCalmReader Marketing Partner`
    }
  ];

  const recruitsList = mprData?.recruits || [];
  const filteredRecruits = recruitsList.filter((r: any) => {
    const name = r.name || r.full_name || "";
    const email = r.email || "";
    const matchesSearch =
      name.toLowerCase().includes(recruitSearch.toLowerCase()) ||
      email.toLowerCase().includes(recruitSearch.toLowerCase());
    if (recruitFilter === "approved") return matchesSearch && (r.status === "approved" || r.isAuthor || r.account_tier === "author");
    if (recruitFilter === "pending") return matchesSearch && r.status === "pending" && !r.isAuthor;
    return matchesSearch;
  });

  const navigationTabs = [
    { id: "overview", label: "Overview", icon: Layers },
    { id: "recruitment", label: "Recruits", icon: Users },
    { id: "commissions", label: "Commissions", icon: DollarSign },
    { id: "marketing", label: "Marketing Tools", icon: Sparkles },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <DashboardLayout hideMobileHeader={true}>
      <div className="min-h-screen bg-slate-50 dark:bg-[#07070b] text-slate-900 dark:text-slate-100 flex flex-col w-full max-w-full overflow-x-hidden">
        {/* 1. Safe-Area Header */}
        <header
          style={{
            paddingTop: "max(16px, env(safe-area-inset-top, 16px))",
            minHeight: "56px",
            paddingLeft: "16px",
            paddingRight: "16px",
          }}
          className="sticky top-0 z-40 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 text-white shadow-md border-b border-purple-900/40 flex items-center justify-between gap-2 sm:gap-3 w-full"
        >
          {/* 🔙 MPR Partner */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={handleBack}
              className="p-1.5 -ml-1 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 rounded-lg transition-all cursor-pointer shrink-0"
              aria-label="Back"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-sm sm:text-lg tracking-tight truncate leading-tight">
                MPR Partner
              </h1>
              {activeTab !== "overview" && (
                <p className="text-[10px] sm:text-[11px] font-semibold text-purple-200 capitalize -mt-0.5 truncate">
                  {activeTab === "recruitment"
                    ? "Recruit Authors"
                    : activeTab === "commissions"
                    ? "Earnings"
                    : activeTab === "marketing"
                    ? "Marketing Tools"
                    : activeTab}
                </p>
              )}
            </div>
          </div>

          {/* MPR-380B0E [📋] [💰] */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-white/10 border border-white/15 rounded-lg px-1.5 sm:px-2 py-1">
              <span className="text-[11px] sm:text-xs font-mono font-bold text-purple-200">{mprCode}</span>
              <button
                onClick={handleCopyCode}
                title="Copy MPR Code"
                className="p-0.5 text-purple-300 hover:text-white active:scale-95 transition-all cursor-pointer"
                aria-label="Copy code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={() => {
                fetchPublishedBooks();
                setShowCreateTriviaModal(true);
              }}
              title="Create Trivia"
              className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Create Trivia</span>
            </button>

            <button
              onClick={() => setShowWithdrawModal(true)}
              title="Payout"
              className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Payout</span>
            </button>
          </div>
        </header>

        {/* Sub-tab navigation strip if user is in a sub-tab */}
        {activeTab !== "overview" && (
          <div className="bg-purple-950/90 border-b border-purple-900/30 px-3 sm:px-4 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none sticky top-[56px] z-30 backdrop-blur-xs">
            <button
              onClick={() => handleTabChange("overview")}
              className="text-xs font-bold text-purple-200 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>← Overview</span>
            </button>
            {navigationTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={cn(
                  "text-xs font-bold px-2.5 py-1 rounded-md transition-all shrink-0 cursor-pointer",
                  activeTab === t.id ? "bg-white text-purple-950 shadow-xs font-black" : "text-purple-200 hover:bg-white/10"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="page-container flex-1 w-full max-w-4xl mx-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-7 h-7 text-purple-600 animate-spin" />
              <p className="text-xs font-bold text-slate-500">Loading MPR Partner Data...</p>
            </div>
          ) : (
            <>
              {/* ================= TAB 1: OVERVIEW ================= */}
              {activeTab === "overview" && (
                <div className="p-4 space-y-4">
                  {/* Stats: 2 per row */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* StatCard: Recruits */}
                    <div className="bg-white dark:bg-[#0d0d15] rounded-xl p-4 shadow-sm border border-slate-200 dark:border-white/10">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <p className="text-xs font-bold uppercase tracking-wider">Recruits</p>
                        <span className="text-base">👥</span>
                      </div>
                      <div className="mt-2">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                          {mprData?.stats?.totalRecruits || 0}
                        </h3>
                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                          {mprData?.stats?.totalAuthors || 0} active authors
                        </p>
                      </div>
                    </div>

                    {/* StatCard: Pending */}
                    <div className="bg-white dark:bg-[#0d0d15] rounded-xl p-4 shadow-sm border border-slate-200 dark:border-white/10">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <p className="text-xs font-bold uppercase tracking-wider">Pending</p>
                        <span className="text-base">💰</span>
                      </div>
                      <div className="mt-2">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                          ₦{(mprData?.stats?.pendingCommissions || 0).toLocaleString()}
                        </h3>
                        <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5 truncate">
                          Available for payout
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Link Section */}
                  <div className="bg-white dark:bg-[#0d0d15] rounded-lg p-3 sm:p-4 shadow-sm border border-purple-200 dark:border-purple-900/40">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium flex items-center gap-1">
                      <span>🔗</span> Your MPR Link
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        className="flex-1 text-sm font-mono truncate bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-purple-700 dark:text-purple-300 outline-none select-all"
                        value={referralUrl}
                        readOnly
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-3.5 py-2 text-sm font-bold bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-lg shrink-0 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-100" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Actions: 2 per row */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">QUICK ACTIONS</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <button
                        onClick={() => {
                          fetchPublishedBooks();
                          setShowCreateTriviaModal(true);
                        }}
                        className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 text-left hover:border-amber-500 hover:shadow-sm transition-all cursor-pointer flex flex-col gap-1.5 active:scale-98"
                      >
                        <span className="text-2xl">🧠</span>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug flex items-center gap-1.5">
                            Create Trivia
                            <span className="text-[10px] bg-amber-500 text-white font-black px-1.5 py-0.5 rounded-full uppercase">New</span>
                          </h4>
                          <p className="text-[11px] text-slate-500">Submit for approval</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleTabChange("recruitment")}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] text-left hover:border-purple-500 hover:shadow-sm transition-all cursor-pointer flex flex-col gap-1.5 active:scale-98"
                      >
                        <span className="text-2xl">👥</span>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                            Recruit Authors
                          </h4>
                          <p className="text-[11px] text-slate-500">Pipeline & status</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleTabChange("marketing")}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] text-left hover:border-purple-500 hover:shadow-sm transition-all cursor-pointer flex flex-col gap-1.5 active:scale-98"
                      >
                        <span className="text-2xl">🧰</span>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                            Marketing Tools
                          </h4>
                          <p className="text-[11px] text-slate-500">Templates & posts</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleTabChange("commissions")}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] text-left hover:border-purple-500 hover:shadow-sm transition-all cursor-pointer flex flex-col gap-1.5 active:scale-98"
                      >
                        <span className="text-2xl">💰</span>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                            Earnings
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            ₦{(mprData?.stats?.totalEarnings || 0).toLocaleString()} lifetime
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleTabChange("settings")}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] text-left hover:border-purple-500 hover:shadow-sm transition-all cursor-pointer flex flex-col gap-1.5 active:scale-98"
                      >
                        <span className="text-2xl">⚙️</span>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                            Settings
                          </h4>
                          <p className="text-[11px] text-slate-500">Bank & code details</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* My Authors */}
                  <div className="bg-white dark:bg-[#0d0d15] rounded-lg p-3 sm:p-4 shadow-sm border border-slate-200 dark:border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>👥</span> My Authors
                      </p>
                      {filteredRecruits.length > 0 && (
                        <button
                          onClick={() => handleTabChange("recruitment")}
                          className="text-xs font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
                        >
                          View All ({filteredRecruits.length})
                        </button>
                      )}
                    </div>

                    {filteredRecruits.length > 0 ? (
                      <div className="space-y-2">
                        {filteredRecruits.slice(0, 4).map((r: any, idx: number) => (
                          <div
                            key={r.id || idx}
                            className="bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 rounded-lg p-3 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm shrink-0">👤</span>
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {r.name || r.full_name || "New Author"}
                                </h4>
                              </div>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold shrink-0",
                                  r.isAuthor || r.status === "approved"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                )}
                              >
                                {r.isAuthor || r.status === "approved" ? "Active Author" : "Registered"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="truncate font-mono">{r.email}</span>
                              <span className="shrink-0 ml-2">
                                {r.created_at ? new Date(r.created_at).toLocaleDateString() : "Recent"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 py-3">No recruits yet. Share your link.</p>
                    )}
                  </div>

                  {/* Share Buttons */}
                  <div className="pt-2 pb-6">
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={shareWhatsApp}
                        className="flex-1 max-w-[130px] py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                      <button
                        onClick={shareTwitter}
                        className="flex-1 max-w-[130px] py-2 px-3 rounded-lg bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Twitter</span>
                      </button>
                      <button
                        onClick={shareFacebook}
                        className="flex-1 max-w-[130px] py-2 px-3 rounded-lg bg-blue-700 hover:bg-blue-800 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Facebook</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            {/* ================= TAB 2: REFERRAL LINK & QR ================= */}
            {activeTab === "referrals" && (
              <div className="p-4 space-y-4">
                <Card className="rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] p-6">
                  <CardHeader className="p-0 mb-4">
                    <CardTitle className="text-lg font-bold">Custom MPR Referral Code</CardTitle>
                    <CardDescription className="text-xs">Customize your unique referral handle</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleSaveCode} className="flex flex-col sm:flex-row gap-3 max-w-md">
                    <Input
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                      placeholder="e.g. PARTNER-JANE"
                      className="rounded-xl font-mono uppercase h-11"
                    />
                    <Button
                      type="submit"
                      disabled={savingCode}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-11 px-5 rounded-xl shrink-0 text-xs"
                    >
                      {savingCode ? "Saving..." : "Update Code"}
                    </Button>
                  </form>
                  {codeSuccess && <p className="text-xs text-emerald-600 font-bold mt-2">{codeSuccess}</p>}
                  {codeError && <p className="text-xs text-red-600 font-bold mt-2">{codeError}</p>}
                </Card>

                {/* Social Share Buttons */}
                <Card className="rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] p-6">
                  <CardHeader className="p-0 mb-4">
                    <CardTitle className="text-lg font-bold">1-Click Social Sharing</CardTitle>
                    <CardDescription className="text-xs">Share directly across popular channels</CardDescription>
                  </CardHeader>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={shareWhatsApp} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-2">
                      <MessageSquare className="w-4 h-4" /> WhatsApp
                    </Button>
                    <Button onClick={shareTwitter} className="bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs gap-2">
                      <Send className="w-4 h-4" /> Twitter / X
                    </Button>
                    <Button onClick={shareFacebook} className="bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs gap-2">
                      <Share2 className="w-4 h-4" /> Facebook
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* ================= TAB 2: RECRUITMENT TRACKING ================= */}
            {activeTab === "recruitment" && (
              <div className="p-4 space-y-4">
                <Card className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] overflow-hidden">
                  <CardHeader className="p-3.5 sm:p-5 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-1.5">
                        <span>👥</span>
                        <span>Author Recruitment Pipeline</span>
                      </CardTitle>
                      <CardDescription className="text-xs">Authors registered through your MPR referral link</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 sm:flex-initial">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <Input
                          placeholder="Search recruits..."
                          value={recruitSearch}
                          onChange={(e) => setRecruitSearch(e.target.value)}
                          className="pl-8 h-8 text-xs rounded-lg w-full sm:w-52"
                        />
                      </div>
                      <select
                        value={recruitFilter}
                        onChange={(e: any) => setRecruitFilter(e.target.value)}
                        className="h-8 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-transparent px-2 text-slate-700 dark:text-slate-300 font-bold"
                      >
                        <option value="all">All Statuses</option>
                        <option value="approved">Approved Authors</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto w-full min-w-0">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-slate-400 font-semibold">
                            <th className="p-3 pl-4">Author / Name</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Tier</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 pr-4">Joined</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {filteredRecruits.length > 0 ? (
                            filteredRecruits.map((r: any, idx: number) => (
                              <tr key={r.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                <td className="p-3 pl-4 font-bold text-slate-900 dark:text-white">
                                  <div className="flex items-center gap-2">
                                    <span>👤</span>
                                    <span className="truncate">{r.name || r.full_name || "New Author"}</span>
                                  </div>
                                </td>
                                <td className="p-3 text-slate-500 font-mono truncate">{r.email}</td>
                                <td className="p-3 capitalize font-semibold">{r.account_tier || "Author"}</td>
                                <td className="p-3">
                                  <Badge className={r.isAuthor || r.status === "approved" ? "bg-emerald-100 text-emerald-800 text-[10px]" : "bg-amber-100 text-amber-800 text-[10px]"}>
                                    {r.isAuthor || r.status === "approved" ? "Author Active" : "Registered"}
                                  </Badge>
                                </td>
                                <td className="p-3 pr-4 text-slate-400 whitespace-nowrap">
                                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : "Recent"}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400">
                                No recruits match the selected filter.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards View (Stacked vertically, one per row) */}
                    <div className="block md:hidden p-3 space-y-2.5 w-full">
                      {filteredRecruits.length > 0 ? (
                        filteredRecruits.map((r: any, idx: number) => (
                          <div
                            key={r.id || idx}
                            className="w-full bg-slate-50/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl p-3 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-base shrink-0">👤</span>
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {r.name || r.full_name || "New Author"}
                                </h4>
                              </div>
                              <Badge className={r.isAuthor || r.status === "approved" ? "bg-emerald-100 text-emerald-800 text-[10px] shrink-0" : "bg-amber-100 text-amber-800 text-[10px] shrink-0"}>
                                {r.isAuthor || r.status === "approved" ? "Active" : "Registered"}
                              </Badge>
                            </div>

                            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="shrink-0 text-slate-400 font-medium">✉️ Email:</span>
                                <span className="font-mono text-slate-500 truncate">{r.email}</span>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-white/5 text-[11px]">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  🏷️ Tier: <span className="capitalize">{r.account_tier || "Author"}</span>
                                </span>
                                <span className="text-slate-400">
                                  📅 {r.created_at ? new Date(r.created_at).toLocaleDateString() : "Recent"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-400">
                          No recruits match the selected filter.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ================= TAB 3: COMMISSIONS & PAYOUTS ================= */}
            {activeTab === "commissions" && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Card className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] p-4 sm:p-5">
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Available For Withdrawal</span>
                    <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1.5 tracking-tight">
                      ₦{(mprData?.stats?.pendingCommissions || 0).toLocaleString()}
                    </h3>
                    <Button
                      onClick={() => setShowWithdrawModal(true)}
                      className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs h-9 px-4 gap-1.5 cursor-pointer"
                    >
                      <Wallet className="w-4 h-4" /> Request Payout Now
                    </Button>
                  </Card>

                  <Card className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] p-4 sm:p-5">
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Total Paid to Date</span>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
                      ₦{(mprData?.stats?.totalEarnings || 0).toLocaleString()}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5">Disbursed directly into your designated bank account.</p>
                  </Card>
                </div>
              </div>
            )}

            {/* ================= TAB 4: MARKETING TOOLS ================= */}
            {activeTab === "marketing" && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Social Posts */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" /> Social Media Copy
                    </h3>
                    {socialPosts.map((post, idx) => (
                      <Card key={idx} className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] p-3.5">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 text-[10px]">
                            {post.platform}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(post.content);
                              setCopiedPostIndex(idx);
                              setTimeout(() => setCopiedPostIndex(null), 2500);
                            }}
                            className="h-7 text-[11px] gap-1 rounded-md cursor-pointer"
                          >
                            {copiedPostIndex === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            {copiedPostIndex === idx ? "Copied" : "Copy"}
                          </Button>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line bg-slate-50 dark:bg-white/5 p-2.5 rounded-lg font-mono">
                          {post.content}
                        </p>
                      </Card>
                    ))}
                  </div>

                  {/* Email Templates */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-indigo-600" /> Email Outreach Templates
                    </h3>
                    {emailTemplates.map((email, idx) => (
                      <Card key={idx} className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] p-3.5">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">{email.title}</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
                              setCopiedEmailIndex(idx);
                              setTimeout(() => setCopiedEmailIndex(null), 2500);
                            }}
                            className="h-7 text-[11px] gap-1 rounded-md cursor-pointer"
                          >
                            {copiedEmailIndex === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            {copiedEmailIndex === idx ? "Copied" : "Copy"}
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold mb-1">Subject: {email.subject}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line bg-slate-50 dark:bg-white/5 p-2.5 rounded-lg font-mono">
                          {email.body}
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 5: PERFORMANCE ANALYTICS ================= */}
            {activeTab === "analytics" && (
              <div className="p-4 space-y-4">
                <Card className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] p-4 sm:p-5">
                  <CardHeader className="p-0 mb-3.5">
                    <CardTitle className="text-sm sm:text-base font-bold">Partner Recruitment Analytics</CardTitle>
                    <CardDescription className="text-xs">Real-time performance metrics for your MPR campaigns</CardDescription>
                  </CardHeader>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                      <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase">Recruitment Velocity</span>
                      <p className="text-xl sm:text-2xl font-black text-purple-900 dark:text-white mt-1">
                        {mprData?.stats?.totalRecruits || 0} Authors
                      </p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Total Revenue Generated</span>
                      <p className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-white mt-1">
                        ₦{(mprData?.stats?.totalEarnings || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                      <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">Conversion Efficiency</span>
                      <p className="text-xl sm:text-2xl font-black text-indigo-900 dark:text-white mt-1">
                        {mprData?.stats?.conversionRate || "0%"}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* ================= TAB 6: SETTINGS ================= */}
            {activeTab === "settings" && (
              <div className="p-4 space-y-4 max-w-xl">
                <Card className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] p-4 sm:p-5">
                  <CardHeader className="p-0 mb-4">
                    <CardTitle className="text-sm sm:text-base font-bold">Payout Bank Details</CardTitle>
                    <CardDescription className="text-xs">Your verified Nigerian bank account for automated commission withdrawals</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleSaveSettings} className="space-y-3">
                    {settingsMsg && (
                      <div className={`p-2.5 rounded-lg text-xs font-semibold ${settingsMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                        {settingsMsg.text}
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase">Bank Name</Label>
                      <Input
                        placeholder="e.g. GTBank, Zenith, Access"
                        value={settingsBank}
                        onChange={(e) => setSettingsBank(e.target.value)}
                        className="rounded-lg h-9 text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase">Account Number (NUBAN)</Label>
                      <Input
                        placeholder="10 digit account number"
                        value={settingsAccountNum}
                        onChange={(e) => setSettingsAccountNum(e.target.value)}
                        className="rounded-lg font-mono h-9 text-xs"
                        maxLength={10}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase">Account Holder Name</Label>
                      <Input
                        placeholder="Full name on bank account"
                        value={settingsAccountName}
                        onChange={(e) => setSettingsAccountName(e.target.value)}
                        className="rounded-lg h-9 text-xs"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={savingSettings}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-9 rounded-lg text-xs cursor-pointer"
                    >
                      {savingSettings ? "Saving Settings..." : "Save Bank Information"}
                    </Button>
                  </form>
                </Card>
              </div>
            )}
          </>
        )}
        </div>

        {/* Withdrawal Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <Card className="w-full max-w-sm sm:max-w-md rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d15] shadow-2xl p-4 sm:p-5">
              <CardHeader className="p-0 mb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold">Request Commission Payout</CardTitle>
                  <CardDescription className="text-xs">Funds will be sent directly to your bank account</CardDescription>
                </div>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-base font-bold cursor-pointer p-1"
                >
                  ✕
                </button>
              </CardHeader>
              <form onSubmit={handleWithdrawRequest} className="space-y-3">
                {withdrawMsg && (
                  <div className={`p-2.5 rounded-lg text-xs font-semibold ${withdrawMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {withdrawMsg.text}
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase">Amount (₦)</Label>
                  <Input
                    type="number"
                    placeholder="Min ₦1,000"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="rounded-lg font-mono h-9 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase">Bank Name</Label>
                  <Input
                    value={withdrawBank}
                    onChange={(e) => setWithdrawBank(e.target.value)}
                    placeholder="Bank Name"
                    className="rounded-lg h-9 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase">Account Number</Label>
                  <Input
                    value={withdrawAccountNum}
                    onChange={(e) => setWithdrawAccountNum(e.target.value)}
                    placeholder="10 digit account number"
                    className="rounded-lg font-mono h-9 text-xs"
                    maxLength={10}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase">Account Name</Label>
                  <Input
                    value={withdrawAccountName}
                    onChange={(e) => setWithdrawAccountName(e.target.value)}
                    placeholder="Account Name"
                    className="rounded-lg h-9 text-xs"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowWithdrawModal(false)}
                    className="w-1/2 rounded-lg h-9 text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={withdrawLoading}
                    className="w-1/2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg h-9 text-xs cursor-pointer"
                  >
                    {withdrawLoading ? "Submitting..." : "Submit Payout"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
        {/* CREATE TRIVIA MODAL */}
        {showCreateTriviaModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-lg font-bold">
                    🧠
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">Create Trivia Challenge</h3>
                    <p className="text-xs text-slate-500">Submit a trivia quiz for Admin editorial review & launch</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateTriviaModal(false)}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <form onSubmit={handleSubmitTrivia} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {triviaMsg && (
                  <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 ${
                    triviaMsg.type === "success" 
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40" 
                      : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/40"
                  }`}>
                    {triviaMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />}
                    <span>{triviaMsg.text}</span>
                  </div>
                )}

                {/* Book Link (Optional) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Attach to Published eBook (Optional)
                    </Label>
                    {loadingBooks && <span className="text-[10px] text-amber-600 animate-pulse">Loading library...</span>}
                  </div>
                  <select
                    value={selectedBookId}
                    onChange={(e) => {
                      const bId = e.target.value;
                      setSelectedBookId(bId);
                      if (bId) {
                        const book = triviaBooks.find(b => b.id === bId);
                        if (book && !triviaTitle) {
                          setTriviaTitle(`Trivia: ${book.title}`);
                        }
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">General Knowledge / No specific book</option>
                    {triviaBooks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} {b.author_name ? `(by ${b.author_name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title & Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Trivia Challenge Title *
                  </Label>
                  <Input
                    value={triviaTitle}
                    onChange={(e) => setTriviaTitle(e.target.value)}
                    placeholder="e.g. Mastermind Quiz: African History & Literature"
                    className="rounded-xl h-10 text-xs font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Description
                  </Label>
                  <textarea
                    value={triviaDesc}
                    onChange={(e) => setTriviaDesc(e.target.value)}
                    placeholder="Brief description of what participants will be tested on..."
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>

                {/* Rewards, Price, Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                      Reward (T-Points)
                    </Label>
                    <Input
                      type="number"
                      min="10"
                      max="1000"
                      value={triviaReward}
                      onChange={(e) => setTriviaReward(e.target.value)}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                      Entry Fee (₦)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="50"
                      value={triviaPrice}
                      onChange={(e) => setTriviaPrice(e.target.value)}
                      placeholder="0 for free"
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                      Time / Question (Sec)
                    </Label>
                    <Input
                      type="number"
                      min="5"
                      max="120"
                      value={triviaDuration}
                      onChange={(e) => setTriviaDuration(e.target.value)}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Questions Header & Mode Switch */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/10">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                        Trivia Questions ({builderQuestions.length})
                      </h4>
                      <p className="text-[11px] text-slate-500">Add multiple-choice questions or generate with AI</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleAiGenerateQuestions}
                        disabled={generatingAiTrivia}
                        className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className={`w-3 h-3 ${generatingAiTrivia ? 'animate-spin' : ''}`} />
                        <span>{generatingAiTrivia ? "Generating..." : "Auto-Generate AI"}</span>
                      </button>

                      <div className="bg-slate-100 dark:bg-white/10 p-0.5 rounded-lg flex items-center text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setTriviaInputMode("builder")}
                          className={`px-2 py-1 rounded-md transition-all cursor-pointer ${triviaInputMode === "builder" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs" : "text-slate-500"}`}
                        >
                          Builder
                        </button>
                        <button
                          type="button"
                          onClick={() => setTriviaInputMode("import")}
                          className={`px-2 py-1 rounded-md transition-all cursor-pointer ${triviaInputMode === "import" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs" : "text-slate-500"}`}
                        >
                          Bulk Import
                        </button>
                      </div>
                    </div>
                  </div>

                  {triviaInputMode === "builder" ? (
                    <div className="space-y-4">
                      {builderQuestions.map((q, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                              Question #{idx + 1}
                            </span>
                            {builderQuestions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setBuilderQuestions(builderQuestions.filter((_, i) => i !== idx));
                                }}
                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                title="Remove question"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <Input
                            placeholder="Enter question prompt..."
                            value={q.question}
                            onChange={(e) => {
                              const updated = [...builderQuestions];
                              updated[idx].question = e.target.value;
                              setBuilderQuestions(updated);
                            }}
                            className="bg-white dark:bg-slate-800 rounded-lg text-xs"
                            required
                          />

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {["A", "B", "C", "D"].map((optKey, optIdx) => (
                              <div key={optKey} className="flex items-center gap-1.5">
                                <span className="w-5 text-center font-bold text-[11px] text-slate-500 shrink-0">
                                  {optKey}.
                                </span>
                                <Input
                                  placeholder={`Option ${optKey}`}
                                  value={q.options[optIdx] || ""}
                                  onChange={(e) => {
                                    const updated = [...builderQuestions];
                                    const newOpts = [...(updated[idx].options || ["", "", "", ""])];
                                    newOpts[optIdx] = e.target.value;
                                    updated[idx].options = newOpts;
                                    setBuilderQuestions(updated);
                                  }}
                                  className="bg-white dark:bg-slate-800 rounded-lg text-xs h-8"
                                  required
                                />
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 shrink-0">
                                Correct Answer:
                              </span>
                              <select
                                value={q.correct_answer || "A"}
                                onChange={(e) => {
                                  const updated = [...builderQuestions];
                                  updated[idx].correct_answer = e.target.value;
                                  setBuilderQuestions(updated);
                                }}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white"
                              >
                                <option value="A">Option A</option>
                                <option value="B">Option B</option>
                                <option value="C">Option C</option>
                                <option value="D">Option D</option>
                              </select>
                            </div>

                            <Input
                              placeholder="Explanation (optional)"
                              value={q.explanation || ""}
                              onChange={(e) => {
                                const updated = [...builderQuestions];
                                updated[idx].explanation = e.target.value;
                                setBuilderQuestions(updated);
                              }}
                              className="bg-white dark:bg-slate-800 rounded-lg text-xs h-8"
                            />
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setBuilderQuestions([
                            ...builderQuestions,
                            { question: "", options: ["", "", "", ""], correct_answer: "A", explanation: "", difficulty: "Medium" }
                          ]);
                        }}
                        className="w-full border-dashed border-slate-300 dark:border-white/20 text-xs font-bold rounded-xl h-9 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Another Question</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={bulkQuestionsText}
                        onChange={(e) => setBulkQuestionsText(e.target.value)}
                        placeholder={`Paste JSON or text format:\nQ1: What is the capital of Nigeria?\nA) Lagos\nB) Abuja\nC) Kano\nD) Ibadan\nAnswer: B\nExplanation: Abuja became capital in 1991.`}
                        rows={8}
                        className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl p-3 font-mono text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 resize-none"
                      />
                      <p className="text-[10px] text-slate-500">
                        Tip: You can paste JSON array or standard "Q1:... A)... B)... Answer: A" formatted text blocks.
                      </p>
                    </div>
                  )}
                </div>

                {/* Modal Footer Buttons */}
                <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateTriviaModal(false)}
                    className="w-1/3 rounded-xl h-10 text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingTrivia}
                    className="w-2/3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl h-10 text-xs cursor-pointer shadow-xs gap-1.5"
                  >
                    {submittingTrivia ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting to Admin...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Submit Trivia for Approval</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MprDashboard;
