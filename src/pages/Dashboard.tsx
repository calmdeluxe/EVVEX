import React, { useState, useEffect, Suspense, lazy } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../AuthContext";
import { DashboardLayout } from "../components/DashboardLayout";

const AuthorAnalyticsWidget = lazy(() => import("../components/analytics/AuthorAnalyticsWidget"));
const RecentBooksList = lazy(() => import("../components/dashboard/RecentBooksList"));
import { LazyCoverImage } from "../components/LazyCoverImage";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Plus,
  Store,
  Ticket,
  Wallet,
  ArrowUpRight,
  Users,
  TrendingUp,
  LayoutGrid,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileText,
  Video,
  Eye,
  Trash2,
  Sparkles,
  Wand2,
  BrainCircuit,
  Trophy,
  Settings,
  Shield,
  ShieldCheck,
  X,
  BookMarked,
  List,
  Loader2,
  LogOut,
  Heart,
  Ghost,
  MessageSquare,
  Share2,
  Crown,
  LifeBuoy,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { DeleteConfirmationModal } from "../components/DeleteConfirmationModal";
import { AuthorOnboardingChecklist } from "../components/AuthorOnboardingChecklist";
import { cn, getAppUrl, getReferralCode } from "../lib/utils";

export const Dashboard: React.FC = () => {
  const {
    user,
    profile,
    isAdmin,
    isMpr,
    isVendor,
    canCreateEvents,
    canCreateProducts,
    accountTier,
    isAuthReady,
    refreshProfile,
    signOut,
  } = useAuth();
  const navigate = useNavigate();

  // Security Redirect: Ensure only authenticated users can access the dashboard
  useEffect(() => {
    if (isAuthReady && !user) {
      console.log(
        "[Dashboard] Unauthenticated access attempt. Redirecting to login.",
      );
      navigate("/login");
    }
  }, [user, isAuthReady, navigate]);

  const [books, setBooks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState({
    balance: 0,
    totalEarned: 0,
    totalWithdrawn: 0,
    t_points: 0,
  });
  const [authorStats, setAuthorStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { tab } = useParams<{ tab: string }>();
  const activeTab =
    tab &&
    ["discovery", "analytics", "all", "published", "drafts", "blogs", "videos"].includes(tab)
      ? (tab as
          | "all"
          | "published"
          | "drafts"
          | "blogs"
          | "videos"
          | "discovery"
          | "analytics")
      : "discovery";
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    if (activeTab === "analytics" && !analyticsData && !loadingAnalytics) {
      setLoadingAnalytics(true);
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
          const res = await axios.get("/api/author/analytics", config);
          if (res.data?.success) {
            setAnalyticsData(res.data);
          }
        } catch (err) {
          console.error("Error fetching analytics in dashboard:", err);
        } finally {
          setLoadingAnalytics(false);
        }
      })();
    }
  }, [activeTab, analyticsData, loadingAnalytics]);
  const [publicData, setPublicData] = useState<{
    books: any[];
    blogs: any[];
    videos: any[];
  }>({ books: [], blogs: [], videos: [] });
  const [purchasedBookIds, setPurchasedBookIds] = useState<Set<string>>(
    new Set(),
  );
  const [catalogFilter, setCatalogFilter] = useState<"all" | "free" | "premium">("all");
  const [feedFilter, setFeedFilter] = useState<"all" | "books" | "blogs" | "videos">("all");
  const [feedVisibleCount, setFeedVisibleCount] = useState<number>(12);
  const feedObserverRef = React.useRef<HTMLDivElement | null>(null);
  const [purchasedBooks, setPurchasedBooks] = useState<any[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState<
    "premium" | "author" | null
  >(null);
  const [upgrading, setUpgrading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bookToDelete, setBookToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [activeTrivias, setActiveTrivias] = useState<any[]>([]);
  const [triviaNotification, setTriviaNotification] = useState<any | null>(
    null,
  );
  const [userSupportRequests, setUserSupportRequests] = useState<any[]>([]);
  const [userPaymentVerifications, setUserPaymentVerifications] = useState<
    any[]
  >([]);
  const [activePromo, setActivePromo] = useState<any>(null);
  const [promoTimeLeft, setPromoTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [booksLimit, setBooksLimit] = useState(20);
  const [trendingBooksPage, setTrendingBooksPage] = useState(1);
  const [ebooksTabBooksPage, setEbooksTabBooksPage] = useState(1);

  useEffect(() => {
    setTrendingBooksPage(1);
    setEbooksTabBooksPage(1);
  }, [catalogFilter]);

  const handleShare = (book: any) => {
    const slugOrId = book.public_slug || book.id;
    const affiliateCode = getReferralCode(user?.id);
    const link = `${getAppUrl()}/ebook/${slugOrId}${affiliateCode ? `?ref=${affiliateCode}` : ''}`;
    navigator.clipboard.writeText(link);
    alert('Shareable eBook link copied to clipboard!\n' + link);
  };

  const handleUpgrade = async (tier: "premium" | "author") => {
    setUpgrading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // MOCK Paystack Logic - in production, this would trigger Paystack Popover
      // reference would come from Paystack onClose or callback
      const reference = `UPG_${tier.toUpperCase()}_${Date.now()}`;

      const endpoint =
        tier === "premium"
          ? "/api/upgrade/premium"
          : "/api/upgrade/author-apply";
      const payload =
        tier === "premium" ? { reference } : { reference, fee_paid: 5000 };

      await axios.post(endpoint, payload, config);

      alert(
        tier === "premium"
          ? "Successfully upgraded to Premium!"
          : "Author application submitted for review!",
      );
      setShowUpgradeModal(null);
      await refreshProfile();
    } catch (err: any) {
      alert("Upgrade failed: " + (err.response?.data?.error || err.message));
    } finally {
      setUpgrading(false);
    }
  };

  const isAuthor = accountTier === "author" || accountTier === "admin";
  const isPremium = accountTier === "premium" || isAuthor;

  const hasBookAccess = (book: any) => {
    if (isAdmin) return true;
    if (book.user_id === (profile?.id || user?.id)) return true;
    if (!book.price || book.price <= 0) return true;
    if (purchasedBookIds.has(book.id)) return true;
    return false;
  };

  const filteredBooks = React.useMemo(() => {
    if (catalogFilter === "free") {
      return publicData.books.filter((b) => !b.price || Number(b.price) <= 0);
    }
    if (catalogFilter === "premium") {
      return publicData.books.filter((b) => b.price && Number(b.price) > 0);
    }
    return publicData.books;
  }, [publicData.books, catalogFilter]);

  const filteredBlogs = React.useMemo(() => {
    if (catalogFilter === "free") {
      return publicData.blogs.filter((b) => !b.price || Number(b.price) <= 0);
    }
    if (catalogFilter === "premium") {
      return publicData.blogs.filter((b) => b.price && Number(b.price) > 0);
    }
    return publicData.blogs;
  }, [publicData.blogs, catalogFilter]);

  const filteredVideos = React.useMemo(() => {
    if (catalogFilter === "free") {
      return publicData.videos.filter((b) => !b.price || Number(b.price) <= 0);
    }
    if (catalogFilter === "premium") {
      return publicData.videos.filter((b) => b.price && Number(b.price) > 0);
    }
    return publicData.videos;
  }, [publicData.videos, catalogFilter]);

  // Unified Discovery Feed: Books, Blogs, Videos
  const unifiedFeed = React.useMemo(() => {
    let items: Array<{
      item: any;
      contentType: "book" | "blog" | "video";
      typeLabel: string;
      actionLabel: string;
      route: string;
      formattedPrice: string;
      isFree: boolean;
      authorName: string;
    }> = [];

    if (feedFilter === "all" || feedFilter === "books") {
      const bookItems = filteredBooks.map((b) => ({
        item: b,
        contentType: "book" as const,
        typeLabel: "EBOOK",
        actionLabel: hasBookAccess(b) ? "READ NOW" : "BUY BOOK",
        route: hasBookAccess(b) ? `/read/${b.id}` : `/book/${b.public_slug || b.id}/buy`,
        formattedPrice: b.price && Number(b.price) > 0 ? `₦${Number(b.price).toLocaleString()}` : "FREE",
        isFree: !b.price || Number(b.price) <= 0,
        authorName: b.admin_note?.match(/author:([^,]+)/)?.[1] || "Verified Author",
      }));
      items.push(...bookItems);
    }

    if (feedFilter === "all" || feedFilter === "blogs") {
      const blogItems = filteredBlogs.map((b) => ({
        item: b,
        contentType: "blog" as const,
        typeLabel: "BLOG",
        actionLabel: "READ BLOG",
        route: `/read/${b.id}`,
        formattedPrice: b.price && Number(b.price) > 0 ? `₦${Number(b.price).toLocaleString()}` : "FREE",
        isFree: !b.price || Number(b.price) <= 0,
        authorName: b.admin_note?.match(/author:([^,]+)/)?.[1] || "Verified Writer",
      }));
      items.push(...blogItems);
    }

    if (feedFilter === "all" || feedFilter === "videos") {
      const videoItems = filteredVideos.map((b) => ({
        item: b,
        contentType: "video" as const,
        typeLabel: "VIDEO",
        actionLabel: "WATCH VIDEO",
        route: `/read/${b.id}`,
        formattedPrice: b.price && Number(b.price) > 0 ? `₦${Number(b.price).toLocaleString()}` : "FREE",
        isFree: !b.price || Number(b.price) <= 0,
        authorName: b.admin_note?.match(/author:([^,]+)/)?.[1] || "Verified Creator",
      }));
      items.push(...videoItems);
    }

    // Sort by created_at descending
    return items.sort((a, b) => {
      const dateA = new Date(a.item.created_at || 0).getTime();
      const dateB = new Date(b.item.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [filteredBooks, filteredBlogs, filteredVideos, feedFilter, hasBookAccess]);

  // Reset feed pagination count when filters change
  useEffect(() => {
    setFeedVisibleCount(12);
  }, [feedFilter, catalogFilter]);

  // Infinite Scroll IntersectionObserver for Unified Discovery Feed
  useEffect(() => {
    if (!feedObserverRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setFeedVisibleCount((prev) => Math.min(prev + 12, unifiedFeed.length));
        }
      },
      { threshold: 0.1, rootMargin: "150px" }
    );

    const currentRef = feedObserverRef.current;
    observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [unifiedFeed.length]);

  const fetchPublicData = React.useCallback(async () => {
    try {
      let books: any[] = [];
      let dbBooks: any[] | null = null;
      let dbError: any = null;

      // Multi-step self-healing sequence to fetch published books.
      // 1. Direct fast query to fetch published books
      let resQuery = await supabase
        .from("books")
        .select("*")
        .or("is_published.eq.1,status.eq.1")
        .order("created_at", { ascending: false });

      // 2. Broad fallback: Fetch books without a DB filter if the specific query fails
      if (resQuery.error || !resQuery.data || resQuery.data.length === 0) {
        console.warn(
          "[Dashboard] Direct query for published books failed or empty, using broad fallback:",
          resQuery.error,
        );
        resQuery = await supabase
          .from("books")
          .select("*")
          .order("created_at", { ascending: false });
      }

      if (resQuery.error) {
        console.error(
          "[Dashboard] Direct fetch failed critically:",
          resQuery.error,
        );
        dbError = resQuery.error;
      } else {
        dbBooks = resQuery.data;
      }

      if (dbError || !dbBooks || dbBooks.length === 0) {
        console.warn(
          "[Dashboard] Direct fetch error or empty, falling back to API:",
          dbError,
        );
        const { data } = await axios.get(
          `/api/marketplace/books?t=${Date.now()}`,
        );
        books = data?.books || [];
      } else {
        console.log(
          "[Dashboard] Direct fetch succeeded, loaded books:",
          dbBooks.length,
        );
        books = dbBooks;
      }

      // Fetch dynamic purchases for regular user filtering to keep marketplace fresh and clean
      let purchasedIdsArr: string[] = [];
      if (user?.id) {
        try {
          const { data: directPurchases, error: dpErr } = await supabase
            .from("ebook_purchases")
            .select("ebook_id")
            .eq("user_id", user.id);
          if (directPurchases && !dpErr) {
            purchasedIdsArr = directPurchases.map((p: any) => p.ebook_id);
          }
        } catch (e) {
          console.warn(
            "[Dashboard] Direct purchases fetch error inside public data block:",
            e,
          );
        }
      }

      if (books) {
        // Sort books client-side to ensure publication order is strictly newest published first
        const sortedBooksData = [...books].sort((a: any, b: any) => {
          return (
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
          );
        });

        const ghostTitles = [
          "SAMPLE",
          "TEST",
          "DUMMY",
          "DELETED",
          "[DELETED]",
          "VOLUME 4",
          "VOLUME-4",
          "VOLUME 4-CHAPTER 1",
          "VOLUME 4 - CHAPTER 1",
        ];

        const safeBooks = sortedBooksData.filter((b: any) => {
          const bookTitle = (b.title || "").toUpperCase();
          if (ghostTitles.some((gt) => bookTitle.includes(gt))) return false;
          const isDeleted =
            (b.admin_note || "").includes("[DELETED]") ||
            (b.title || "").includes("[DELETED]") ||
            b.status === -1 ||
            b.status === "-1";
          const isPublished =
            b.is_published === true ||
            b.is_published === 1 ||
            b.is_published === "true" ||
            b.is_published === "1" ||
            b.status === "published" ||
            b.status === 1 ||
            b.status === "1" ||
            b.status === "approved";
          if (isDeleted || !isPublished) return false;

          return true;
        });

        let ebooks = safeBooks.filter(
          (b: any) =>
            !(b.admin_note || "").includes("type:blog") &&
            !(b.admin_note || "").includes("type:video"),
        );
        const blogList = safeBooks.filter((b: any) =>
          (b.admin_note || "").includes("type:blog"),
        );
        const videoList = safeBooks.filter((b: any) =>
          (b.admin_note || "").includes("type:video"),
        );

        // All ebooks / published contents are loaded for both purchased and unpurchased states

        setPublicData({
          books: ebooks.slice(0, booksLimit),
          blogs: blogList.slice(0, 30),
          videos: videoList.slice(0, 30),
        });
      }

      // Fetch Active Trivias inside a safe isolated block
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const { data: apiRes } = await axios.get('/api/trivias', config);
        
        if (apiRes && apiRes.trivias) {
          const rawTrivias = apiRes.trivias;

          // 1. Filter: active is already handled by backend, no dummy/test data
          // 2. Filter: tier-appropriate (free users see free, premium see all)
          const filtered = rawTrivias.filter((t: any) => {
            // No dummy or placeholder
            const titleLower = (t.title || "").toLowerCase();
            const isTest = !titleLower || ["test", "mock", "dummy", "sample", "untitled"].some(kw => titleLower.includes(kw));
            if (isTest) return false;

            // Available for user's tier
            if (accountTier === "free") {
              const isLocked = t.isLockedForTier || (t.price && Number(t.price) > 0) || t.target_tier === "premium";
              if (isLocked) return false;
            }

            return true;
          });

          setActiveTrivias(filtered);
        }
      } catch (triviaErr) {
        console.warn(
          "[Dashboard] Optional trivias fetch from API ignored or failed:",
          triviaErr,
        );
      }
    } catch (err) {
      console.error("[Dashboard] Discovery fetch error:", err);
    }
  }, [booksLimit, accountTier]);

  const fetchData = React.useCallback(async () => {
    if (!user) return;

    const currentProfileId = profile?.id || user?.id;
    if (!currentProfileId) return;

    // Only show full loading spinner if we have NO data at all
    // Disable aggressive background loading flicker
    if (
      books.length === 0 &&
      activeTrivias.length === 0 &&
      publicData.books.length === 0
    ) {
      setLoading(true);
    }

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        setLoading(false);
        return;
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [
        booksRes,
        balanceRes,
        transRes,
        statsRes,
        purchasesRes,
        supportRes,
        payVerRes,
      ] = await Promise.all([
        supabase
          .from("books")
          .select(
            "id, user_id, title, status, is_published, price, pdf_price, created_at, admin_note, public_slug, cover_image",
          )
          .eq("user_id", currentProfileId)
          .neq("status", -1)
          .order("created_at", { ascending: false }),
        axios
          .get("/api/user/balance", config)
          .catch((e) => ({ data: { error: e.message } })),
        axios
          .get("/api/user/transactions", config)
          .catch((e) => ({ data: { transactions: [] } })),
        axios
          .get("/api/author/stats", config)
          .catch((e) => ({ data: { stats: [] } })),
        axios
          .get("/api/user/purchases", config)
          .catch(() => ({ data: { purchased_ids: [] } })),
        supabase
          .from("support_requests")
          .select("*")
          .eq("user_id", currentProfileId)
          .order("created_at", { ascending: false }),
        supabase
          .from("payment_verifications")
          .select("*")
          .eq("user_id", currentProfileId)
          .order("created_at", { ascending: false }),
      ]);

      if (!booksRes.error) {
        const normalized = (booksRes.data || []).map((b: any) => ({
          ...b,
          is_suspended:
            b.is_suspended === true ||
            b.is_suspended === 1 ||
            b.status === -2 ||
            b.status === "-2",
        }));
        setBooks(normalized);
      }

      let pIds = purchasesRes.data?.purchased_ids || [];
      if (pIds.length === 0) {
        try {
          const { data: directPurchases } = await supabase
            .from("ebook_purchases")
            .select("ebook_id")
            .eq("user_id", currentProfileId);
          if (directPurchases) {
            pIds = directPurchases.map((p: any) => p.ebook_id);
          }
        } catch (e) {
          console.warn("[Dashboard] Direct purchases check error", e);
        }
      }

      if (pIds.length > 0) {
        setPurchasedBookIds(new Set(pIds));
        try {
          const { data: details, error: dErr } = await supabase
            .from("books")
            .select(
              "id, title, public_slug, users(id, email, full_name)",
            )
            .in("id", pIds)
            .neq("status", -1);
          if (!dErr && details) {
            const mappedDetails = details.map((b: any) => ({
              ...b,
              author_name:
                b.users?.full_name || b.author_name || "Verified Author",
            }));
            setPurchasedBooks(mappedDetails);
          }
        } catch (e) {
          console.warn("[Dashboard] Direct book fetch error", e);
        }
      } else {
        setPurchasedBooks([]);
      }

      // REWARD UI: display wallet balance and points
      // BAN DUMMY: filter out test/mock data
      if (balanceRes.data && !balanceRes.data.error) {
        setBalance(balanceRes.data);
      }
      
      const rawTrans = transRes.data.transactions || [];
      const cleanTrans = rawTrans.filter((t: any) => {
        if (!t.user_id) return false;
        if (t.buyer_email === "No Email") return false;
        if (t.type === "mock" || t.type === "test") return false;
        
        const ref = (t.paystack_reference || "").toLowerCase();
        if (ref.includes("mock") || ref.includes("test")) return false;
        if (t.amount === 100 && (ref.includes("free") || ref.startsWith("manual-"))) return false;
        return true;
      });
      setTransactions(cleanTrans);
      setAuthorStats(statsRes.data);

      let supportData = [];
      let payVerData = [];

      if (isAdmin) {
        try {
          const [supAdminRes, payAdminRes] = await Promise.all([
            axios
              .get("/api/admin/support", config)
              .catch(() => ({ data: { requests: [] } })),
            axios
              .get("/api/admin/payment-verifications", config)
              .catch(() => ({ data: { verifications: [] } })),
          ]);
          supportData = supAdminRes.data?.requests || [];
          payVerData = payAdminRes.data?.verifications || [];
        } catch (e) {
          console.warn(
            "[Dashboard] Admin specific queues fetch failed, using direct queries context",
            e,
          );
        }
      }

      if (supportData.length === 0 && !supportRes.error) {
        supportData = supportRes.data || [];
      }
      if (payVerData.length === 0 && !payVerRes.error) {
        payVerData = payVerRes.data || [];
      }

      setUserSupportRequests(supportData);
      setUserPaymentVerifications(payVerData);
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.id, isAdmin]); // Added isAdmin dependency to refresh for admins properly

  useEffect(() => {
    if (!user) return;
    fetchPublicData();
    fetchData();
  }, [user, profile?.id, fetchData, fetchPublicData]);

  // Fetch active promo countdown campaign
  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const { data: promos } = await supabase
          .from('trivias')
          .select('*')
          .eq('deleted', false)
          .eq('status', 'active');
        if (promos && promos.length > 0) {
          const generalPromos = promos.filter((p: any) => !p.book_id && p.is_active !== false);
          if (generalPromos.length > 0) {
            setActivePromo(generalPromos[0]);
          } else {
            setActivePromo(promos[0]);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch promos", err);
      }
    };
    if (user) {
      fetchPromos();
    }
  }, [user]);

  // Manage promotion timer countdown intervals
  useEffect(() => {
    if (!activePromo) return;

    const updateTimer = () => {
      const now = Date.now();
      const startTime = new Date(activePromo.start_time).getTime();
      const difference = startTime - now;

      if (difference <= 0) {
        setPromoTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0,
        });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setPromoTimeLeft({ days, hours, minutes, seconds, total: difference });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activePromo]);
  const confirmDelete = async () => {
    if (!bookToDelete) return;
    setDeletingId(bookToDelete.id);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const config = { headers: { Authorization: `Bearer ${token}` } };

      let deleted = false;
      if (token) {
        try {
          const res = await axios.delete(`/api/books/${bookToDelete.id}`, config);
          if (res.data?.success) deleted = true;
        } catch (err) {
          console.warn(
            "[Dashboard] Axios delete failed, trying direct Supabase fallback...",
            err,
          );
        }
      }

      if (!deleted) {
        const { error } = await supabase
          .from("books")
          .delete()
          .eq("id", bookToDelete.id);
        if (!error) {
          deleted = true;
        } else {
          console.warn("[Dashboard] Direct delete failed, trying soft delete fallback...", error);
          const { error: softErr } = await supabase
            .from("books")
            .update({ status: -1, is_published: 0 })
            .eq("id", bookToDelete.id);
          if (!softErr) {
            deleted = true;
          } else {
            console.error("[Dashboard] Delete error:", error);
            throw error;
          }
        }
      }

      if (deleted) {
        alert("eBook deleted successfully!");
        setBookToDelete(null);
        // Optimistic update
        setPublicData((prev) => ({
          ...prev,
          books: prev.books.filter(
            (b) => String(b.id) !== String(bookToDelete.id),
          ),
          blogs: prev.blogs.filter(
            (b) => String(b.id) !== String(bookToDelete.id),
          ),
          videos: prev.videos.filter(
            (b) => String(b.id) !== String(bookToDelete.id),
          ),
        }));
        setBooks((prev) =>
          prev.filter((b) => String(b.id) !== String(bookToDelete.id)),
        );
        fetchData();
        fetchPublicData();
      }
    } catch (err: any) {
      alert("Error deleting content: " + (err.response?.data?.error || err.message || "Failed to delete"));
      fetchData();
      fetchPublicData();
    } finally {
      setDeletingId(null);
    }
  };

  const handleUserAction = async (
    bookId: string,
    action: string,
    value: any,
  ) => {
    try {
      const session = await supabase.auth.getSession();
      await axios.post(
        "/api/admin/users",
        { userId: bookId, action, value },
        {
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
        },
      );
      fetchData();
    } catch (err) {
      alert("Failed to update book");
    }
  };

  const [longPressTimeout, setLongPressTimeout] = useState<any>(null);
  const [selectedBookForOptions, setSelectedBookForOptions] = useState<
    string | null
  >(null);

  const startLongPress = (id: string) => {
    const timeout = setTimeout(() => {
      setSelectedBookForOptions(id);
    }, 700);
    setLongPressTimeout(timeout);
  };

  const stopLongPress = () => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }
  };

  const handleUpgradeLink = (tier: string) => {
    if (tier === "author") navigate("/apply/author");
    else if (tier === "premium") navigate("/upgrade/premium");
  };

  const isOwner = isAdmin;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Role-Specific Onboarding Guide */}
        {(() => {
          const isAuthorRole = !isAdmin && (accountTier === 'author' || profile?.account_tier === 'author' || profile?.role === 'author');
          const isPremiumRole = !isAdmin && !isAuthorRole && (accountTier === 'premium' || profile?.account_tier === 'premium' || profile?.is_premium === true);
          const hasRoleGuide = isAuthorRole || isPremiumRole;

          if (!hasRoleGuide) return null;

          return showOnboarding ? (
            <AuthorOnboardingChecklist
              books={publicData?.books || books || []}
              user={user}
              profile={profile}
              accountTier={accountTier}
              isAdmin={isAdmin}
              onClose={() => setShowOnboarding(false)}
              onRefreshProfile={refreshProfile}
            />
          ) : (
            <div className="flex items-center justify-between bg-white dark:bg-[#0d0d15] border border-emerald-200/80 dark:border-emerald-800/50 p-3.5 px-5 rounded-2xl shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                    {isAuthorRole ? 'Author Quickstart Guide & Video Tutorial' : 'Affiliate Referral Rewards Guide'}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block">
                    {isAuthorRole ? 'Click shortcut to view tutorial video and publishing checklist' : 'Click shortcut to access your referral link and reward details'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (user?.id) localStorage.removeItem(`onboarding_dismissed_${user.id}`);
                  setShowOnboarding(true);
                }}
                className="text-xs text-white font-bold bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                Open {isAuthorRole ? 'Author Guide' : 'Affiliate Guide'}
              </button>
            </div>
          );
        })()}

        {/* Wallet Segment */}
        <div className="w-full bg-white dark:bg-[#0d0d15] border border-gray-200/80 dark:border-white/10 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {/* Wallet Balance Pill */}
            <div
              onClick={() => navigate("/earnings")}
              className="flex items-center gap-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 px-4 py-2.5 rounded-xl cursor-pointer transition-all shadow-xs active:scale-95 select-none"
              title="Click to view earnings and transactions"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-left leading-tight">
                <span className="block text-[9px] font-black uppercase tracking-wider text-emerald-600/90 dark:text-emerald-400">Wallet Balance</span>
                <span className="block text-base font-black tracking-tight text-emerald-950 dark:text-emerald-200 font-sans">
                  ₦{Number(profile?.wallet_balance || balance.balance || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* T-Points Rewards */}
            <div className="text-left leading-tight">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">T-Points Rewards</span>
              <span className="block text-sm font-black text-gray-800 dark:text-gray-200 font-sans">
                {(balance.t_points || 0).toLocaleString()} TP
              </span>
            </div>

            {/* Lifetime Earned */}
            <div className="text-left leading-tight hidden sm:block">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Lifetime Earned</span>
              <span className="block text-sm font-black text-gray-800 dark:text-gray-200 font-sans">
                ₦{(balance.totalEarned || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/earnings")}
              className="h-10 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold rounded-xl gap-1.5 hover:bg-slate-50 dark:hover:bg-white/5 text-xs"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              {isAdmin ? "Settlement" : "Withdraw"}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/earnings")}
              className="h-10 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold rounded-xl gap-1.5 hover:bg-slate-50 dark:hover:bg-white/5 text-xs"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              Performance Stats
            </Button>
            {accountTier === "free" && (
              <Button
                onClick={() => navigate("/upgrade/premium")}
                className="bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl h-10 gap-1.5 shadow-md shadow-amber-500/20 text-xs"
              >
                <ArrowUpRight className="w-3.5 h-3.5" /> Unlock Premium (₦1,500)
              </Button>
            )}
            {accountTier === "premium" && (
              <Button
                onClick={() => navigate("/apply/author")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl h-10 gap-1.5 shadow-md shadow-indigo-500/20 text-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Become Verified Author
              </Button>
            )}
            {isVendor && !isAdmin && !isMpr && (
              <div className="flex flex-wrap gap-1.5">
                <Button
                  onClick={() => navigate("/create-product")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl h-10 gap-1 shadow-xs text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Product
                </Button>
                <Button
                  onClick={() => navigate("/create-book?type=blog")}
                  className="bg-slate-900 hover:bg-black text-white font-black rounded-xl h-10 gap-1 shadow-xs text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Vendor Post
                </Button>
              </div>
            )}
            {(isAdmin || isMpr) && (
              <div className="flex flex-wrap gap-1.5">
                <Button
                  onClick={() => navigate("/create-event")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl h-10 gap-1 shadow-xs text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Event
                </Button>
                <Button
                  onClick={() => navigate("/create-ticket")}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl h-10 gap-1 shadow-xs text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Ticket
                </Button>
                <Button
                  onClick={() => navigate("/create-book?type=blog")}
                  className="bg-slate-900 hover:bg-black text-white font-black rounded-xl h-10 gap-1 shadow-xs text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Blog
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Your Studio & Sidebar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Your Studio */}
            <Card
              className="bg-white border border-gray-100 shadow-sm rounded-3xl overflow-hidden"
              id="my-books"
            >
              <CardHeader className="pb-3 flex flex-col gap-4 border-b border-gray-50 bg-slate-50/50 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-sm font-black flex items-center gap-2 text-slate-800">
                      {isVendor && !isAdmin && !isMpr ? (
                        <>
                          <Store className="w-4 h-4 text-emerald-600" />
                          Vendor Storefront Studio
                        </>
                      ) : (isAdmin || isMpr) ? (
                        <>
                          <Ticket className="w-4 h-4 text-indigo-700" />
                          Events & Ticket Studio
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-4 h-4 text-indigo-700" />
                          Content & Media Studio
                        </>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 font-medium font-sans">
                      {isVendor && !isAdmin && !isMpr
                        ? "Manage and monitor your vendor products, storefront listings, and catalog."
                        : (isAdmin || isMpr)
                          ? "Manage and monitor your live events, venue schedules, and ticket tiers."
                          : "Manage and monitor your portfolio and interactive content."}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewMode("grid")}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-indigo-600" : "text-gray-400 hover:text-gray-600"}`}
                        title="Grid Layout"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("list")}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white shadow-sm text-indigo-600" : "text-gray-400 hover:text-gray-600"}`}
                        title="List Layout"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto shrink-0 select-none">
                      {(
                        [
                          "discovery",
                          "analytics",
                          "all",
                          "published",
                          "drafts",
                          "blogs",
                          "videos",
                        ] as const
                      ).map((t) => {
                        if (!isAuthor && t !== "discovery") return null;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => navigate(`/dashboard/${t}`)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black capitalize transition-all whitespace-nowrap ${
                              activeTab === t
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {loading && !books.length && !publicData.books.length ? (
                  <div className="grid grid-cols-1 gap-6">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="aspect-[21/9] bg-gray-50 animate-pulse rounded-[32px] border border-gray-100"
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    className={
                      activeTab === "analytics"
                        ? "col-span-full"
                        : viewMode === "grid"
                          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                          : "space-y-6 col-span-full"
                    }
                  >
                    {activeTab === "analytics" ? (
                      <div className="col-span-full">
                        <Suspense
                          fallback={
                            <div className="p-12 text-center text-xs font-bold text-gray-500 animate-pulse bg-slate-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                              Loading Author Analytics & Charts...
                            </div>
                          }
                        >
                          <AuthorAnalyticsWidget analytics={analyticsData} />
                        </Suspense>
                      </div>
                    ) : activeTab === "discovery" ? (
                      <div className="space-y-12 col-span-full">
                        {activePromo &&
                          Date.now() <
                            new Date(activePromo.end_time).getTime() && (
                            <motion.div
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="relative overflow-hidden rounded-[2rem] bg-slate-900 border border-slate-800 p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6"
                            >
                              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />
                              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

                              <div className="space-y-4 text-center md:text-left">
                                <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
                                  <Clock className="w-3 h-3 animate-pulse" />{" "}
                                  Active Promotion
                                </div>
                                <div className="space-y-1">
                                  <h3 className="text-lg font-black tracking-tight uppercase leading-tight">
                                    {activePromo.title}
                                  </h3>
                                  <p className="text-amber-500 text-sm font-black tracking-tight flex items-center justify-center md:justify-start gap-1">
                                    <Sparkles className="w-4 h-4" /> Prize Pool:{" "}
                                    {activePromo.prize}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col items-center gap-4 shrink-0 w-full md:w-auto">
                                <Button
                                  onClick={() => navigate("/explore/trivia")}
                                  className="w-full md:w-48 h-10 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-none rounded-xl font-black text-[10px] uppercase tracking-widest text-white shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
                                >
                                  <Sparkles className="w-3.5 h-3.5" /> Join
                                  Trivia Hub
                                </Button>
                              </div>
                            </motion.div>
                          )}

                        <div className="space-y-6">
                          {/* Feed Header: Title, Catalog Free/Premium, View Mode */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                              <h2 className="text-base font-black text-gray-900 tracking-tight">
                                Discovery Feed
                              </h2>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2.5 shrink-0 select-none">
                              {/* Price filter (All / Free / Premium) */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Price:</span>
                                <div className="flex bg-slate-100 p-1 rounded-xl border border-gray-200/30">
                                  {([
                                    "all",
                                    "free",
                                    "premium",
                                  ] as const).map((filterVal) => (
                                    <button
                                      key={filterVal}
                                      type="button"
                                      onClick={() => setCatalogFilter(filterVal)}
                                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black capitalize transition-all whitespace-nowrap ${
                                        catalogFilter === filterVal
                                          ? "bg-white text-slate-950 shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
                                          : "text-slate-500 hover:text-slate-700"
                                      }`}
                                    >
                                      {filterVal === "all" ? "All" : filterVal === "free" ? "Free" : "Premium"}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* View Mode Switcher */}
                              <div className="flex bg-slate-100 p-1 rounded-xl border border-gray-200/30">
                                <button
                                  type="button"
                                  onClick={() => setViewMode("grid")}
                                  className={`p-1.5 rounded-lg text-slate-600 transition-all ${
                                    viewMode === "grid" ? "bg-white text-indigo-600 shadow-xs" : "hover:text-slate-900"
                                  }`}
                                  title="Grid View"
                                >
                                  <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setViewMode("list")}
                                  className={`p-1.5 rounded-lg text-slate-600 transition-all ${
                                    viewMode === "list" ? "bg-white text-indigo-600 shadow-xs" : "hover:text-slate-900"
                                  }`}
                                  title="List View"
                                >
                                  <List className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* YouTube-style Horizontal Filter Chips */}
                          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
                            {([
                              { id: "all", label: "All Content" },
                              { id: "books", label: "Books & eBooks" },
                              { id: "blogs", label: "Articles & Blogs" },
                              { id: "videos", label: "Video Lessons" },
                            ] as const).map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setFeedFilter(tab.id)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                                  feedFilter === tab.id
                                    ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* Unified Feed Grid / List */}
                          {unifiedFeed.length > 0 ? (
                            <div
                              className={
                                viewMode === "grid"
                                  ? "flex flex-col gap-4 md:grid md:grid-cols-2 lg:grid-cols-3"
                                  : "space-y-4"
                              }
                            >
                              {unifiedFeed.slice(0, feedVisibleCount).map((feedItem) => {
                                const { item, contentType, typeLabel, actionLabel, route, formattedPrice, isFree, authorName } = feedItem;
                                const isAccessible = hasBookAccess(item);

                                return (
                                  <div
                                    key={`${contentType}-${item.id}`}
                                    className="relative group text-left w-full"
                                  >
                                    {viewMode === "grid" ? (
                                      <Card className="border border-slate-100 shadow-md rounded-2xl overflow-hidden bg-white h-full flex flex-col hover:shadow-xl transition-all">
                                        <div className="w-full aspect-[3/4] relative overflow-hidden shrink-0 rounded-t-2xl bg-slate-100">
                                          <LazyCoverImage
                                            bookId={item.id}
                                            initialSrc={item.cover_image}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                                            alt={item.title}
                                          />
                                          <div className="absolute top-2 left-2">
                                            <Badge
                                              className={`border-none text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 backdrop-blur-sm shadow-sm text-white ${
                                                contentType === "video"
                                                  ? "bg-red-600/90"
                                                  : contentType === "blog"
                                                    ? "bg-emerald-600/90"
                                                    : "bg-indigo-600/90"
                                              }`}
                                            >
                                              {typeLabel}
                                            </Badge>
                                          </div>
                                          {!isAccessible && (
                                            <div className="absolute top-2 right-2 z-20">
                                              <div
                                                className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 p-1 rounded-full shadow-md border border-amber-300 ring-2 ring-amber-500/20 flex items-center justify-center animate-pulse"
                                                title="Premium Locked"
                                              >
                                                <Crown className="w-3 h-3 fill-amber-950 stroke-amber-950" />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                        <CardContent className="p-3 flex-1 flex flex-col justify-between gap-1 overflow-hidden">
                                          <h3 className="font-extrabold text-[11px] sm:text-xs text-slate-900 line-clamp-2 leading-tight tracking-tight uppercase font-sans">
                                            {item.title}
                                          </h3>
                                          <div className="flex items-center justify-between gap-1 mt-auto pt-1">
                                            <div className="flex flex-col min-w-0 flex-1">
                                              <span className="text-[10px] font-bold text-slate-500 truncate leading-none">
                                                {authorName}
                                              </span>
                                            </div>
                                            <p
                                              className={`text-[9px] font-black px-1.5 py-0.5 rounded border flex items-center shrink-0 ${
                                                isFree
                                                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                                  : "text-amber-700 bg-amber-50 border-amber-200"
                                              }`}
                                            >
                                              {formattedPrice}
                                            </p>
                                          </div>
                                        </CardContent>
                                        <CardFooter className="px-3 pb-3 pt-0">
                                          <Button
                                            onClick={() => navigate(route)}
                                            className={`w-full font-black rounded-lg h-7 text-[9px] uppercase tracking-wider transition-all shadow-sm text-white ${
                                              contentType === "video"
                                                ? "bg-slate-900 hover:bg-red-600"
                                                : contentType === "blog"
                                                  ? "bg-slate-900 hover:bg-emerald-600"
                                                  : "bg-slate-900 hover:bg-indigo-600"
                                            }`}
                                          >
                                            {actionLabel}
                                          </Button>
                                        </CardFooter>
                                      </Card>
                                    ) : (
                                      <div
                                        onClick={() => navigate(route)}
                                        className="cursor-pointer"
                                      >
                                        <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 bg-white border border-slate-100 rounded-2xl hover:shadow-lg hover:border-slate-300 transition-all text-left relative">
                                          {!isAccessible && (
                                            <div className="absolute top-3 right-3 z-20">
                                              <div
                                                className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 p-1 rounded-full shadow-md border border-amber-300 ring-2 ring-amber-500/20 flex items-center justify-center animate-pulse"
                                                title="Premium Locked"
                                              >
                                                <Crown className="w-3 h-3 fill-amber-950 stroke-amber-950" />
                                              </div>
                                            </div>
                                          )}
                                          <div className="w-20 sm:w-24 aspect-[3/4] relative overflow-hidden shrink-0 rounded-xl shadow-sm bg-slate-50 flex items-center justify-center p-2">
                                            <LazyCoverImage
                                              bookId={item.id}
                                              initialSrc={item.cover_image}
                                              className="max-h-full max-w-full object-contain rounded-lg group-hover:scale-105 transition-all duration-700"
                                              alt={item.title}
                                            />
                                          </div>
                                          <div className="flex-1 space-y-2 min-w-0 w-full">
                                            <Badge
                                              className={`border-none text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 backdrop-blur-sm text-white ${
                                                contentType === "video"
                                                  ? "bg-red-600"
                                                  : contentType === "blog"
                                                    ? "bg-emerald-600"
                                                    : "bg-indigo-600"
                                              }`}
                                            >
                                              {typeLabel}
                                            </Badge>
                                            <h3 className="text-base font-black text-slate-900 italic font-serif leading-tight">
                                              {item.title}
                                            </h3>
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                BY:
                                              </span>
                                              <span className="text-[10px] font-bold text-slate-600">
                                                {authorName}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex flex-col sm:items-end gap-2.5 shrink-0 w-full sm:w-auto">
                                            <span
                                              className={`text-base font-black shrink-0 ${
                                                isFree ? "text-emerald-600" : "text-amber-600"
                                              }`}
                                            >
                                              {formattedPrice}
                                            </span>
                                            <Button
                                              className={`font-black rounded-lg h-9 px-4 text-[10px] uppercase tracking-wider text-white ${
                                                contentType === "video"
                                                  ? "bg-slate-950 hover:bg-red-600"
                                                  : contentType === "blog"
                                                    ? "bg-slate-950 hover:bg-emerald-600"
                                                    : "bg-slate-950 hover:bg-indigo-600"
                                              }`}
                                            >
                                              {actionLabel}
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="py-12 bg-slate-50/70 border border-dashed border-slate-200 text-center rounded-[2rem] col-span-full w-full">
                              <p className="text-slate-400 font-bold">
                                No items found matching the selected filter.
                              </p>
                            </div>
                          )}

                          {/* Infinite scroll sentinel trigger element */}
                          <div ref={feedObserverRef} className="w-full py-4 flex items-center justify-center">
                            {feedVisibleCount < unifiedFeed.length && (
                              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold animate-pulse">
                                <Clock className="w-3.5 h-3.5 animate-spin" /> Loading more content...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      books
                        .filter((b) => {
                          if (b.status === -1) return false;
                          const isPublished =
                            b.is_published === 1 ||
                            b.is_published === true ||
                            b.is_published === "true" ||
                            b.is_published === "1";
                          const type = b.admin_note?.includes("type:")
                            ? b.admin_note.split("type:")[1].split(",")[0]
                            : "ebook";

                          if (activeTab === "all") return true;
                          if (activeTab === "published") return isPublished;
                          if (activeTab === "drafts") return !isPublished;
                          if (activeTab === "blogs") return type === "blog";
                          if (activeTab === "videos") return type === "video";
                          return true;
                        })
                        .map((book) => {
                          const isPublished =
                            book.is_published === 1 ||
                            book.is_published === true ||
                            book.is_published === "true" ||
                            book.is_published === "1";
                          const type = book.admin_note?.includes("type:")
                            ? book.admin_note.split("type:")[1].split(",")[0]
                            : "ebook";

                          return (
                            <div
                              key={book.id}
                              className="block group relative text-left"
                              onMouseDown={() => startLongPress(book.id)}
                              onMouseUp={stopLongPress}
                              onMouseLeave={stopLongPress}
                              onTouchStart={() => startLongPress(book.id)}
                              onTouchEnd={stopLongPress}
                            >
                              {viewMode === "grid" ? (
                                <Card className="border-none shadow-lg rounded-[2.5rem] overflow-hidden bg-white h-full flex flex-col border border-slate-100 hover:shadow-2xl transition-all">
                                  <div className="aspect-[3/4] max-h-[300px] relative overflow-hidden shrink-0 bg-slate-50 flex items-center justify-center p-3">
                                    <img
                                      src={
                                        book.cover_image ||
                                        `https://images.unsplash.com/photo-1543003919-a9957004bfa0?q=80&w=2000`
                                      }
                                      className="max-h-full max-w-full object-contain rounded-lg shadow-lg group-hover:scale-105 transition-all duration-700"
                                      referrerPolicy="no-referrer"
                                      alt={book.title}
                                    />
                                    <div className="absolute top-4 left-4 flex flex-wrap gap-1">
                                      <Badge className="bg-indigo-600/90 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 backdrop-blur-sm shadow-sm">
                                        {type.toUpperCase()}
                                      </Badge>
                                      {book.status === 0 && (
                                        <Badge className="bg-amber-500/90 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 backdrop-blur-sm">
                                          PENDING
                                        </Badge>
                                      )}
                                      {!isPublished && (
                                        <Badge className="bg-slate-500/90 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 backdrop-blur-sm">
                                          DRAFT
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <CardContent className="p-6 flex-1 flex flex-col gap-3">
                                    <h3 className="font-black text-sm text-slate-900 line-clamp-2 leading-tight tracking-tight italic font-serif h-12">
                                      {book.title}
                                    </h3>
                                    <div className="flex items-center justify-between mt-auto">
                                      <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                          Author
                                        </span>
                                        <span className="text-xs font-bold text-slate-700 line-clamp-1">
                                          {book.admin_note?.match(
                                            /author:([^,]+)/,
                                          )?.[1] || "Verified Author"}
                                        </span>
                                      </div>
                                      <p className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center shrink-0">
                                        {book.price && Number(book.price) > 0
                                          ? `₦${Number(book.price).toLocaleString()}`
                                          : "FREE"}
                                      </p>
                                    </div>
                                  </CardContent>
                                  <CardFooter className="px-6 pb-6 pt-0 flex gap-2">
                                    <Button
                                      onClick={() =>
                                        navigate(
                                          hasBookAccess(book)
                                            ? `/read/${book.id}`
                                            : `/book/${book.public_slug}/buy`,
                                        )
                                      }
                                      className="flex-1 bg-slate-900 hover:bg-indigo-600 text-white font-black rounded-xl h-10 text-[10px] uppercase transition-all shadow-md"
                                    >
                                      {hasBookAccess(book)
                                        ? "READ NOW"
                                        : "BUY BOOK"}
                                    </Button>
                                    {(accountTier === "premium" ||
                                      accountTier === "author" ||
                                      profile?.tier === "premium" ||
                                      profile?.tier === "author" ||
                                      isAdmin) && (
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          handleShare(book);
                                        }}
                                        variant="outline"
                                        className="border-indigo-100 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-black rounded-xl h-10 px-3 text-[10px] flex items-center gap-1.5 shrink-0"
                                      >
                                        <Share2 className="w-3.5 h-3.5" />
                                        SHARE
                                      </Button>
                                    )}
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setSelectedBookForOptions(book.id);
                                      }}
                                      variant="outline"
                                      className="bg-white text-slate-950 border-slate-200 hover:bg-slate-50 font-black rounded-xl h-10 px-3 text-[10px]"
                                    >
                                      MANAGE
                                    </Button>
                                  </CardFooter>
                                </Card>
                              ) : (
                                <div
                                  onClick={() =>
                                    navigate(
                                      hasBookAccess(book)
                                        ? `/read/${book.id}`
                                        : `/book/${book.public_slug}/buy`,
                                    )
                                  }
                                  className="cursor-pointer animate-in fade-in duration-300 w-full"
                                >
                                  <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-white border border-slate-150 rounded-[2rem] hover:shadow-xl hover:border-slate-350 transition-all text-left">
                                    <div className="w-24 sm:w-28 aspect-[3/4] relative overflow-hidden shrink-0 rounded-2xl shadow-md bg-slate-50 flex items-center justify-center p-2">
                                      <img
                                        src={
                                          book.cover_image ||
                                          `https://images.unsplash.com/photo-1543003919-a9957004bfa0?q=80&w=2000`
                                        }
                                        className="max-h-full max-w-full object-contain rounded-lg group-hover:scale-105 transition-all duration-700"
                                        referrerPolicy="no-referrer"
                                        alt={book.title}
                                      />
                                    </div>
                                    <div className="flex-1 space-y-3 min-w-0 w-full">
                                      <div className="flex flex-wrap gap-1.5">
                                        <Badge className="bg-indigo-600 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 backdrop-blur-sm">
                                          {type.toUpperCase()}
                                        </Badge>
                                        {book.status === 0 && (
                                          <Badge className="bg-amber-500 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 backdrop-blur-sm">
                                            PENDING REVIEW
                                          </Badge>
                                        )}
                                        {!isPublished && (
                                          <Badge className="bg-slate-500 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 backdrop-blur-sm">
                                            DRAFT
                                          </Badge>
                                        )}
                                      </div>
                                      <h3 className="text-xl font-black text-slate-900 italic font-serif leading-tight">
                                        {book.title}
                                      </h3>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                          BY:
                                        </span>
                                        <span className="text-xs font-bold text-slate-600">
                                          {book.admin_note?.match(
                                            /author:([^,]+)/,
                                          )?.[1] || "Verified Author"}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex flex-col sm:items-end gap-3 shrink-0 w-full sm:w-auto">
                                      <span className="text-lg font-black text-emerald-600 shrink-0">
                                        {book.price && Number(book.price) > 0
                                          ? `₦${Number(book.price).toLocaleString()}`
                                          : "FREE"}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <Button className="bg-slate-950 hover:bg-indigo-600 text-white font-black rounded-xl h-10 px-4 text-xs">
                                          {hasBookAccess(book)
                                            ? "READ NOW"
                                            : "BUY BOOK"}
                                        </Button>
                                        {(accountTier === "premium" ||
                                          accountTier === "author" ||
                                          profile?.tier === "premium" ||
                                          profile?.tier === "author" ||
                                          isAdmin) && (
                                          <Button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              handleShare(book);
                                            }}
                                            variant="outline"
                                            className="border-indigo-100 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-black rounded-xl h-10 px-3 text-xs flex items-center gap-1.5 shrink-0"
                                          >
                                            <Share2 className="w-3.5 h-3.5" />
                                            SHARE
                                          </Button>
                                        )}
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setSelectedBookForOptions(book.id);
                                          }}
                                          variant="outline"
                                          className="bg-white text-slate-950 border-slate-200 hover:bg-slate-50 font-black rounded-xl h-10 px-3 text-xs"
                                        >
                                          MANAGE
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {selectedBookForOptions === book.id && (
                                <div className="absolute inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl rounded-[40px] flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-200">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedBookForOptions(null);
                                    }}
                                    className="absolute top-6 right-6 text-white hover:bg-white/10 rounded-full"
                                  >
                                    <X className="w-6 h-6" />
                                  </Button>
                                  <h4 className="text-lg font-black text-white mb-6 tracking-tight">
                                    Account Content Management
                                  </h4>
                                  <div className="flex flex-col sm:flex-row items-center gap-4">
                                    {isAdmin ? (
                                      <Button
                                        className="h-12 px-6 rounded-2xl font-black gap-2 bg-red-600 hover:bg-red-700 text-white min-w-[180px] border-none shadow-xl shadow-red-900/20"
                                        disabled={deletingId === book.id}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setBookToDelete({
                                            id: book.id,
                                            title: book.title || "this content",
                                          });
                                          setSelectedBookForOptions(null);
                                        }}
                                      >
                                        {deletingId === book.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-4 h-4" />
                                        )}
                                        {deletingId === book.id
                                          ? "Purging..."
                                          : "Delete Permanently"}
                                      </Button>
                                    ) : (
                                      <Button
                                        className="h-12 px-6 rounded-2xl font-black gap-2 bg-amber-600 hover:bg-amber-700 text-white min-w-[180px] border-none shadow-xl"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          navigate(`/request?type=Take_Down_Request&bookId=${book.id}&bookTitle=${encodeURIComponent(book.title)}`);
                                        }}
                                      >
                                        Request Take Down
                                      </Button>
                                    )}
                                    {isAdmin && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-12 px-6 rounded-2xl font-black gap-2 border-white/20 text-white hover:bg-white/10 min-w-[180px]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUserAction(
                                            book.id,
                                            "toggle_book_suspend",
                                            !book.is_suspended,
                                          );
                                          setSelectedBookForOptions(null);
                                        }}
                                      >
                                        <Shield className="w-4 h-4" />{" "}
                                        {book.is_suspended
                                          ? "Unsuspend"
                                          : "Suspend Content"}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {isAuthor && authorStats && Array.isArray(authorStats.stats) && (
              <Card className="bg-white border-none shadow-sm overflow-hidden border-t-4 border-indigo-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    Recent Activity Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-y-auto max-h-[200px]">
                  {authorStats.stats.flatMap((s: any) => s.recentSales || [])
                    .length > 0 ? (
                    <div className="divide-y">
                      {authorStats.stats
                        .flatMap((s: any) => s.recentSales || [])
                        .sort(
                          (a: any, b: any) =>
                            new Date(b.date).getTime() -
                            new Date(a.date).getTime(),
                        )
                        .slice(0, 5)
                        .map((sale: any, i: number) => (
                          <div
                            key={i}
                            className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3"
                          >
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-800 truncate max-w-[120px]">
                                {sale.buyer?.full_name ||
                                  sale.buyer?.email ||
                                  "Anonymous"}
                              </span>
                              <span className="text-[8px] text-slate-400 font-medium">
                                {new Date(sale.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex flex-col items-end shrink-0">
                              <span className="text-[10px] font-black text-emerald-600">
                                +₦{sale.amount.toLocaleString()}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[7px] py-0 px-1 border-slate-100 uppercase tracking-tighter"
                              >
                                Sale
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 italic text-xs">
                      No recent sales yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Ebook Management Studio - Rendered above as a card component inside columns */}
        <section className="hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                Your Ebook Studio
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Manage and monitor your literary portfolio.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {activeTab === "discovery" && (
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white shadow-sm text-indigo-600" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-indigo-600" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    <TrendingUp className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
                {(
                  [
                    "discovery",
                    "all",
                    "published",
                    "drafts",
                    "blogs",
                    "videos",
                  ] as const
                ).map((t) => {
                  if (!isAuthor && t !== "discovery") return null;
                  return (
                    <button
                      key={t}
                      onClick={() => navigate(`/dashboard/${t}`)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black capitalize transition-all whitespace-nowrap ${
                        activeTab === t
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {loading && !books.length && !publicData.books.length ? (
            <div className="grid grid-cols-1 gap-6">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="aspect-[21/9] bg-gray-50 animate-pulse rounded-[32px] border border-gray-100"
                />
              ))}
            </div>
          ) : (
            <div
              className={
                activeTab === "discovery" && viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "grid grid-cols-1 gap-8 text-center sm:text-left"
              }
            >
              {/* {loading && (books.length > 0 || publicBooks.length > 0) && (
                <div className="col-span-full py-2 text-center text-xs text-slate-400">Refreshing data...</div>
              )} */}
              {activeTab === "discovery" ? (
                <div className="space-y-12 col-span-full">
                  {/* Catalog Arrangement Filters */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-indigo-50/50 to-slate-50 border border-indigo-100/50 rounded-[2rem] shadow-sm text-left">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> Catalog Arrangement
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">Browse and discover free space or premium quality contents</p>
                    </div>
                    <div className="flex bg-slate-200/50 p-1 rounded-xl self-start sm:self-auto select-none">
                      {(["all", "free", "premium"] as const).map((filterVal) => (
                        <button
                          key={filterVal}
                          type="button"
                          onClick={() => setCatalogFilter(filterVal)}
                          className={`px-4 py-1.5 rounded-lg text-[10px] font-black capitalize transition-all whitespace-nowrap ${
                            catalogFilter === filterVal
                              ? "bg-white text-slate-950 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          {filterVal === "all" ? "🌐 All space" : filterVal === "free" ? "🎁 Free space" : "👑 Premium space"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Discovery Navigation Tips */}
                  <div className="flex flex-wrap items-center gap-2 bg-indigo-50/30 p-3.5 rounded-2xl border border-indigo-100/30 text-left">
                    <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5 mr-2">
                      <Sparkles className="w-3.5 h-3.5 animate-bounce text-indigo-600" /> QUICK JUMP:
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const el = document.getElementById("trending-ebooks-section");
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="h-8 text-[10px] font-black rounded-lg border-indigo-100 bg-white text-indigo-700 hover:bg-indigo-50 shadow-sm"
                    >
                      📖 eBooks Directory
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const el = document.getElementById("insight-articles-section");
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="h-8 text-[10px] font-black rounded-lg border-indigo-100 bg-white text-indigo-700 hover:bg-indigo-50 shadow-sm"
                    >
                      ✍️ Insights & Blogs
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const el = document.getElementById("video-masterclasses-section");
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="h-8 text-[10px] font-black rounded-lg border-indigo-100 bg-white text-indigo-700 hover:bg-indigo-50 shadow-sm"
                    >
                      🎥 Video Masterclasses
                    </Button>
                  </div>
                  {activePromo &&
                    Date.now() < new Date(activePromo.end_time).getTime() && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative overflow-hidden rounded-[2rem] bg-slate-900 border border-slate-800 p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6"
                      >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

                        <div className="space-y-4 text-center md:text-left">
                          <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
                            <Clock className="w-3 h-3 animate-pulse" /> Active
                            Promotion
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-xl md:text-2xl font-black tracking-tight uppercase leading-tight">
                              {activePromo.title}
                            </h3>
                            <p className="text-amber-500 text-sm font-black tracking-tight flex items-center justify-center md:justify-start gap-1">
                              <Sparkles className="w-4 h-4" /> Prize Pool:{" "}
                              {activePromo.prize}
                            </p>
                          </div>
                          <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-md hidden sm:block">
                            Read, comprehend, and test your understanding of
                            featured works on CalmReader to unlock cash prizes,
                            free internet data, and community credentials.
                          </p>
                        </div>

                        <div className="flex flex-col items-center gap-4 shrink-0 w-full md:w-auto">
                          <div className="text-center">
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-2">
                              {promoTimeLeft.total > 0
                                ? "PRIME DRAW COUNTDOWN"
                                : "DRAW IS CURRENTLY"}
                            </span>

                            {promoTimeLeft.total > 0 ? (
                              <div className="flex gap-2 sm:gap-3 justify-center">
                                <div className="bg-white/5 border border-white/5 backdrop-blur-sm rounded-xl p-2.5 w-14 text-center">
                                  <span className="text-lg font-black block tracking-tight">
                                    {promoTimeLeft.days}
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                                    Days
                                  </span>
                                </div>
                                <div className="bg-white/5 border border-white/5 backdrop-blur-sm rounded-xl p-2.5 w-14 text-center">
                                  <span className="text-lg font-black block tracking-tight">
                                    {promoTimeLeft.hours}
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                                    Hrs
                                  </span>
                                </div>
                                <div className="bg-white/5 border border-white/5 backdrop-blur-sm rounded-xl p-2.5 w-14 text-center">
                                  <span className="text-lg font-black block tracking-tight">
                                    {promoTimeLeft.minutes}
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                                    Mins
                                  </span>
                                </div>
                                <div className="bg-white/5 border border-white/5 backdrop-blur-sm rounded-xl p-2.5 w-14 text-center">
                                  <span className="text-lg font-black block tracking-tight">
                                    {promoTimeLeft.seconds}
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                                    Secs
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <Badge className="bg-green-500 text-white font-black text-[10px] uppercase tracking-widest px-4 py-1.5 border-none rounded-full shadow-[0_0_15px_rgba(34,197,94,0.3)] animate-pulse">
                                Live Now • Active Payouts
                              </Badge>
                            )}
                          </div>

                          <Button
                            onClick={() => navigate("/explore/trivia")}
                            className="w-full md:w-48 h-10 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-none rounded-xl font-black text-[10px] uppercase tracking-widest text-white shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
                          >
                            <Sparkles className="w-3.5 h-3.5" />{" "}
                            {promoTimeLeft.total > 0
                              ? "Join Trivia Hub"
                              : "Play & Win Live"}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  <div id="trending-ebooks-section" className="space-y-6 scroll-mt-24">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                      <h2 className="text-xl font-black text-gray-900 tracking-tight">
                        Trending eBooks
                      </h2>
                    </div>
                    {filteredBooks.length > 0 ? (
                      <div
                        className={
                          viewMode === "grid"
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                            : "space-y-8"
                        }
                      >
                        {filteredBooks.slice((ebooksTabBooksPage - 1) * 6, ebooksTabBooksPage * 6).map((book) => (
                          <div key={book.id} className="relative group">
                            {/* Existing eBook Rendering Logic */}
                            {viewMode === "grid" ? (
                              <Card className="border-none shadow-lg rounded-[2.5rem] overflow-hidden bg-white h-full flex flex-col border border-slate-100 hover:shadow-2xl transition-all">
                                <div className="aspect-[3/4] max-h-[300px] relative overflow-hidden shrink-0 rounded-t-[2.5rem]">
                                  <img
                                    src={
                                      book.cover_image ||
                                      `https://images.unsplash.com/photo-1543003919-a9957004bfa0?q=80&w=2000`
                                    }
                                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                                    referrerPolicy="no-referrer"
                                    alt={book.title}
                                  />
                                  <div className="absolute top-4 left-4">
                                    <Badge className="bg-indigo-600/90 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 backdrop-blur-sm shadow-sm">
                                      EBOOK
                                    </Badge>
                                  </div>
                                  {!hasBookAccess(book) && (
                                    <div className="absolute top-4 right-4 z-20">
                                      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 p-1.5 rounded-full shadow-md border border-amber-300 ring-2 ring-amber-500/20 flex items-center justify-center animate-pulse" title="Premium Locked">
                                        <Crown className="w-3.5 h-3.5 fill-amber-950 stroke-amber-950" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <CardContent className="p-6 flex-1 flex flex-col gap-3">
                                  <h3 className="font-black text-xl text-slate-900 line-clamp-2 leading-tight tracking-tight italic font-serif h-12">
                                    {book.title}
                                  </h3>
                                  <div className="flex items-center justify-between mt-auto">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                        Author
                                      </span>
                                      <span className="text-xs font-bold text-slate-700 line-clamp-1">
                                        {book.admin_note?.match(
                                          /author:([^,]+)/,
                                        )?.[1] || "Verified Author"}
                                      </span>
                                    </div>
                                    <p className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center shrink-0">
                                      {book.price && Number(book.price) > 0
                                        ? `₦${Number(book.price).toLocaleString()}`
                                        : "FREE"}
                                    </p>
                                  </div>
                                </CardContent>
                                <CardFooter className="px-6 pb-6 pt-0">
                                  <Button
                                    onClick={() =>
                                      navigate(
                                        hasBookAccess(book)
                                          ? `/read/${book.id}`
                                          : `/book/${book.public_slug}/buy`,
                                      )
                                    }
                                    className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black rounded-2xl h-12 transition-all shadow-lg"
                                  >
                                    {hasBookAccess(book)
                                      ? "READ NOW"
                                      : "BUY TO ACCESS"}
                                  </Button>
                                </CardFooter>
                              </Card>
                            ) : (
                              <div
                                onClick={() =>
                                  navigate(
                                    hasBookAccess(book)
                                      ? `/read/${book.id}`
                                      : `/book/${book.public_slug}/buy`,
                                  )
                                }
                                className="cursor-pointer"
                              >
                                <Card className="border-none shadow-xl rounded-[40px] overflow-hidden bg-[#0f172a] group-hover:scale-[1.01] transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/20 border border-white/5">
                                  <div className="aspect-[16/7] relative overflow-hidden">
                                    <img
                                      src={
                                        book.cover_image ||
                                        `https://images.unsplash.com/photo-1543003919-a9957004bfa0?q=80&w=2000`
                                      }
                                      className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-all duration-1000"
                                      referrerPolicy="no-referrer"
                                      alt={book.title}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/20 to-transparent" />
                                    {!hasBookAccess(book) && (
                                      <div className="absolute top-6 right-6 md:top-12 md:right-12 z-20">
                                        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 p-2.5 rounded-full shadow-lg border border-amber-300 ring-4 ring-amber-500/25 flex items-center justify-center animate-pulse" title="Premium Locked">
                                          <Crown className="w-5 h-5 fill-amber-950 stroke-amber-950" />
                                        </div>
                                      </div>
                                    )}
                                    <div className="absolute inset-0 p-12 flex flex-col justify-end gap-2 text-left">
                                      <Badge className="bg-indigo-600 w-fit text-white border-none font-black px-4 rounded-xl text-[10px] tracking-widest uppercase mb-2">
                                        EBOOK
                                      </Badge>
                                      <h3 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-[0.9] max-w-3xl">
                                        {book.title}
                                      </h3>
                                      <div className="flex items-center gap-6 mt-4">
                                        <span className="text-white font-bold">
                                          {book.price && Number(book.price) > 0
                                            ? `₦${Number(book.price).toLocaleString()}`
                                            : "FREE"}
                                        </span>
                                        <Button className="bg-amber-500 text-slate-950 font-black rounded-2xl h-12 px-8 ml-auto">
                                          {hasBookAccess(book)
                                            ? "START READING"
                                            : "UNLOCK BOOK"}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 bg-slate-50/70 border border-dashed border-slate-200 text-center rounded-[2rem] col-span-full w-full">
                        <p className="text-slate-400 font-bold">
                          No eBooks available yet. Check back soon!
                        </p>
                      </div>
                    )}

                    {filteredBooks.length > 6 && (
                      <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEbooksTabBooksPage((prev) => Math.max(prev - 1, 1))}
                          disabled={ebooksTabBooksPage === 1}
                          className="h-10 rounded-xl px-4 border-slate-200 hover:bg-slate-50 font-black text-xs uppercase tracking-wider flex items-center gap-2"
                        >
                          <ChevronLeft className="w-4 h-4" /> Previous
                        </Button>
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                          Page {ebooksTabBooksPage} of {Math.ceil(filteredBooks.length / 6)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEbooksTabBooksPage((prev) => Math.min(prev + 1, Math.ceil(filteredBooks.length / 6)))}
                          disabled={ebooksTabBooksPage >= Math.ceil(filteredBooks.length / 6)}
                          className="h-10 rounded-xl px-4 border-slate-200 hover:bg-slate-50 font-black text-xs uppercase tracking-wider flex items-center gap-2"
                        >
                          Next <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Flash Trivia Hub */}
                  {activeTrivias.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                          <h2 className="text-xl font-black text-gray-900 tracking-tight">
                            Flash Trivia Hub
                          </h2>
                        </div>
                        <Link
                          to="/trivia"
                          className="text-xs font-black text-amber-600 uppercase tracking-widest hover:underline"
                        >
                          View All
                        </Link>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                        {activeTrivias.map((trivia) => (
                          <div
                            key={trivia.id}
                            className="min-w-[280px] sm:min-w-[320px]"
                          >
                            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white ring-1 ring-slate-100 hover:shadow-md transition-all h-full">
                              <div className="aspect-[16/9] relative overflow-hidden bg-slate-100">
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Trophy className="w-8 h-8 text-slate-300" />
                                </div>
                                {trivia.thumbnail_url && (
                                  <img
                                    src={trivia.thumbnail_url}
                                    className="w-full h-full object-cover relative z-10"
                                    alt={trivia.title}
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent z-20" />
                                <div className="absolute bottom-3 left-3 flex items-center gap-2 z-30">
                                  <Badge className="bg-amber-500 text-white border-none text-[8px] font-black tracking-widest px-1.5">
                                    LIVE
                                  </Badge>
                                  <span className="text-[10px] font-black text-white">
                                    {trivia.reward_points} TP Rewards
                                  </span>
                                </div>
                              </div>
                              <CardContent className="p-4">
                                <h3 className="font-bold text-sm text-slate-900 line-clamp-1 mb-3">
                                  {trivia.title}
                                </h3>
                                <Button
                                  onClick={() =>
                                    navigate(`/trivia/ebook/${trivia.id}`)
                                  }
                                  className="w-full bg-slate-900 hover:bg-amber-600 text-white font-black rounded-xl h-10 text-xs"
                                >
                                  PLAY CHALLENGE
                                </Button>
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Insight Articles (Blogs) */}
                  {filteredBlogs.length > 0 && (
                    <div id="insight-articles-section" className="space-y-6 scroll-mt-24">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">
                          Insight Articles
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredBlogs.map((blog) => (
                          <Card
                            key={blog.id}
                            className="border-none shadow-sm rounded-2xl overflow-hidden bg-white ring-1 ring-slate-100 hover:shadow-lg transition-all group"
                          >
                            <div className="aspect-video relative overflow-hidden">
                              <img
                                src={
                                  blog.cover_image ||
                                  `https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=2000`
                                }
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                alt={blog.title}
                              />
                              <div className="absolute top-3 left-3">
                                <Badge className="bg-white/90 backdrop-blur-sm text-slate-900 border-none text-[8px] font-black uppercase tracking-widest px-2">
                                  ARTICLE
                                </Badge>
                              </div>
                              {!hasBookAccess(blog) && (
                                <div className="absolute top-3 right-3 z-30">
                                  <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 p-1 rounded-full shadow-md border border-amber-300 ring-2 ring-amber-500/20 flex items-center justify-center animate-pulse" title="Premium Locked">
                                    <Crown className="w-2.5 h-2.5 fill-amber-950 stroke-amber-950" />
                                  </div>
                                </div>
                              )}
                            </div>
                            <CardContent className="p-5">
                              <h3 className="font-black text-lg text-slate-900 line-clamp-2 leading-tight mb-2 h-14 group-hover:text-indigo-600 transition-colors">
                                {blog.title}
                              </h3>
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                                <span>
                                  {new Date(
                                    blog.created_at,
                                  ).toLocaleDateString()}
                                </span>
                                <span>
                                  {hasBookAccess(blog)
                                    ? "Accessed"
                                    : "Free Access"}
                                </span>
                              </div>
                              <Button
                                onClick={() =>
                                  navigate(
                                    hasBookAccess(blog)
                                      ? `/read/${blog.id}`
                                      : `/book/${blog.public_slug}/buy`,
                                  )
                                }
                                variant="outline"
                                className="w-full mt-4 border-slate-200 rounded-xl font-black text-xs text-slate-800 hover:bg-slate-50"
                              >
                                {hasBookAccess(blog)
                                  ? "READ ARTICLE"
                                  : "UNLOCK ARTICLE"}
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Video Masterclasses */}
                  {filteredVideos.length > 0 && (
                    <div id="video-masterclasses-section" className="space-y-6 pb-8 scroll-mt-24">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-red-600 rounded-full" />
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">
                          Video Masterclasses
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredVideos.map((video) => (
                          <Card
                            key={video.id}
                            className="border-none shadow-sm rounded-3xl overflow-hidden bg-slate-950 ring-1 ring-white/10 hover:shadow-xl hover:shadow-red-500/10 transition-all group"
                          >
                            <div className="aspect-[21/9] relative overflow-hidden bg-slate-900 flex items-center justify-center">
                              {video.cover_image && (
                                <img
                                  src={video.cover_image}
                                  className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-all duration-700"
                                  alt={video.title}
                                  onError={(e) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              )}
                              <div className="absolute inset-0 flex items-center justify-center z-10">
                                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                                  <Video className="w-8 h-8 text-white" />
                                </div>
                              </div>
                              <div className="absolute bottom-4 left-4">
                                <Badge className="bg-red-600/90 text-white border-none text-[8px] font-black uppercase tracking-widest px-2">
                                  MASTERCLASS
                                </Badge>
                              </div>
                              {!hasBookAccess(video) && (
                                <div className="absolute top-4 right-4 z-30">
                                  <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 p-1 rounded-full shadow-md border border-amber-300 ring-2 ring-amber-500/20 flex items-center justify-center animate-pulse" title="Premium Locked">
                                    <Crown className="w-2.5 h-2.5 fill-amber-950 stroke-amber-950" />
                                  </div>
                                </div>
                              )}
                            </div>
                            <CardContent className="p-6">
                              <h3 className="text-white font-black text-xl tracking-tight mb-2 line-clamp-1">
                                {video.title}
                              </h3>
                              <p className="text-white/40 text-xs font-medium line-clamp-2 mb-4">
                                Master new skills with our visual step-by-step
                                guides.
                              </p>
                              <Button
                                onClick={() =>
                                  navigate(
                                    hasBookAccess(video)
                                      ? `/read/${video.id}`
                                      : `/book/${video.public_slug}/buy`,
                                  )
                                }
                                className="bg-white text-slate-950 hover:bg-slate-200 font-black rounded-2xl w-full"
                              >
                                {hasBookAccess(video)
                                  ? "WATCH NOW"
                                  : "UNLOCK ACCESS"}
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                books
                  .filter((b) => {
                    if (b.status === -1) return false;
                    const isPublished =
                      b.is_published === 1 ||
                      b.is_published === true ||
                      b.is_published === "true" ||
                      b.is_published === "1";
                    const type = b.admin_note?.includes("type:")
                      ? b.admin_note.split("type:")[1].split(",")[0]
                      : "ebook";

                    if (activeTab === "all") return true;
                    if (activeTab === "published") return isPublished;
                    if (activeTab === "drafts") return !isPublished;
                    if (activeTab === "blogs") return type === "blog";
                    if (activeTab === "videos") return type === "video";
                    return true;
                  })
                  .map((book) => (
                    <div
                      key={book.id}
                      className="block group relative"
                      onMouseDown={() => startLongPress(book.id)}
                      onMouseUp={stopLongPress}
                      onMouseLeave={stopLongPress}
                      onTouchStart={() => startLongPress(book.id)}
                      onTouchEnd={stopLongPress}
                    >
                      <div
                        onClick={() =>
                          navigate(
                            hasBookAccess(book)
                              ? `/read/${book.id}`
                              : `/book/${book.public_slug}/buy`,
                          )
                        }
                        className="cursor-pointer"
                      >
                        <Card className="border-none shadow-xl rounded-[40px] overflow-hidden bg-slate-900 group-hover:scale-[1.01] transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/20">
                          <div className="aspect-[16/7] relative overflow-hidden">
                            <img
                              src={
                                book.cover_image ||
                                `https://images.unsplash.com/photo-1543003919-a9957004bfa0?q=80&w=2000`
                              }
                              className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000"
                              alt={book.title}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                            <div className="absolute inset-0 p-12 flex flex-col justify-end gap-4 text-left">
                              <div className="flex flex-wrap gap-2">
                                <Badge className="bg-indigo-600/80 backdrop-blur-md text-white border-none font-black px-4 rounded-xl text-[10px] tracking-widest uppercase">
                                  {book.admin_note?.includes("type:")
                                    ? book.admin_note
                                        .split("type:")[1]
                                        .split(",")[0]
                                    : "card book"}
                                </Badge>
                                {book.status === 0 && (
                                  <Badge className="bg-amber-500/80 backdrop-blur-md text-white border-none font-black px-4 rounded-xl text-[10px] tracking-widest uppercase">
                                    PENDING REVIEW
                                  </Badge>
                                )}
                                {book.is_suspended && (
                                  <Badge className="bg-red-500/80 backdrop-blur-md text-white border-none font-black px-4 rounded-xl text-[10px] tracking-widest uppercase">
                                    SUSPENDED BY ADMIN
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-[0.9] max-w-3xl drop-shadow-2xl">
                                {book.title}
                              </h3>
                              <div className="flex items-center gap-6 mt-4">
                                <div className="flex flex-col">
                                  <span className="text-white font-bold tracking-tight">
                                    {book.price && Number(book.price) > 0
                                      ? `₦${Number(book.price).toLocaleString()}`
                                      : "FREE"}
                                  </span>
                                </div>

                                <div className="ml-auto flex items-center gap-3 relative z-20">
                                  {isAdmin && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setBookToDelete({
                                          id: book.id,
                                          title: book.title,
                                        });
                                      }}
                                      className="h-14 w-14 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 transition-all pointer-events-auto"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </Button>
                                  )}
                                  {!isAdmin && book.user_id === (profile?.id || user?.id) && (
                                    <Button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        navigate(`/request?type=Take_Down_Request&bookId=${book.id}&bookTitle=${encodeURIComponent(book.title)}`);
                                      }}
                                      className="h-14 px-6 rounded-2xl bg-amber-500/10 hover:bg-amber-600 text-amber-500 hover:text-white border border-amber-500/20 font-black text-xs transition-all pointer-events-auto shrink-0"
                                    >
                                      Request Take Down
                                    </Button>
                                  )}
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(
                                        hasBookAccess(book)
                                          ? `/read/${book.id}`
                                          : `/book/${book.public_slug}/buy`,
                                      );
                                    }}
                                    className="bg-white text-slate-950 hover:bg-slate-200 font-black rounded-2xl h-14 px-10 group-hover:px-12 transition-all pointer-events-auto"
                                  >
                                    {hasBookAccess(book)
                                      ? "ENTER STUDIO"
                                      : "UNLOCK STUDIO"}{" "}
                                    <Sparkles className="w-4 h-4 ml-2 text-indigo-600" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>

                      {selectedBookForOptions === book.id && (
                        <div className="absolute inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl rounded-[40px] flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-200">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBookForOptions(null);
                            }}
                            className="absolute top-6 right-6 text-white hover:bg-white/10 rounded-full"
                          >
                            <X className="w-6 h-6" />
                          </Button>
                          <h4 className="text-xl font-black text-white mb-8 tracking-tight">
                            Account Content Management
                          </h4>
                          <div className="flex flex-col sm:flex-row items-center gap-4">
                            {isAdmin ? (
                              <Button
                                className="h-16 px-8 rounded-2xl font-black gap-2 bg-red-600 hover:bg-red-700 text-white min-w-[200px] border-none shadow-xl shadow-red-900/20"
                                disabled={deletingId === book.id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setBookToDelete({
                                    id: book.id,
                                    title: book.title || "this content",
                                  });
                                  setSelectedBookForOptions(null);
                                }}
                              >
                                {deletingId === book.id ? (
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-5 h-5" />
                                )}
                                {deletingId === book.id
                                  ? "Purging..."
                                  : "Delete Permanently"}
                              </Button>
                            ) : (
                              <Button
                                className="h-16 px-8 rounded-2xl font-black gap-2 bg-amber-600 hover:bg-amber-700 text-white min-w-[200px] border-none shadow-xl"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigate(`/request?type=Take_Down_Request&bookId=${book.id}&bookTitle=${encodeURIComponent(book.title)}`);
                                }}
                              >
                                Request Take Down
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                variant="outline"
                                className="h-16 px-8 rounded-2xl font-black gap-2 border-white/20 text-white hover:bg-white/10 min-w-[200px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUserAction(
                                    book.id,
                                    "toggle_book_suspend",
                                    !book.is_suspended,
                                  );
                                  setSelectedBookForOptions(null);
                                }}
                              >
                                <Shield className="w-5 h-5" />{" "}
                                {book.is_suspended
                                  ? "Unsuspend"
                                  : "Suspend Content"}
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          )}
        </section>



        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Recent Transactions
            </h2>
            <Link
              to="/earnings"
              className="text-sm text-green-700 font-medium hover:underline flex items-center"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <Card className="overflow-hidden border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-8 text-center text-gray-500 italic"
                      >
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    transactions.slice(0, 5).map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="capitalize text-gray-900 font-medium">
                            {tx.type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={
                              tx.amount > 0
                                ? "text-green-600 font-bold"
                                : "text-red-600 font-bold"
                            }
                          >
                            {tx.amount > 0 ? "+" : ""}₦
                            {(tx.amount !== undefined
                              ? Math.abs(tx.amount)
                              : 0
                            ).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              tx.status === "completed"
                                ? "default"
                                : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {tx.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
        <DeleteConfirmationModal
          isOpen={!!bookToDelete}
          title={bookToDelete?.title || ""}
          isDeleting={!!deletingId}
          onClose={() => setBookToDelete(null)}
          onConfirm={confirmDelete}
        />


      </div>
    </DashboardLayout>
  );
};
