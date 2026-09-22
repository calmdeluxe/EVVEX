import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabase";
import { useAuth } from "../AuthContext";
import { clearLandingPageCache } from "./LandingPage";
import { DashboardLayout } from "../components/DashboardLayout";
import { AdminConfirmModal } from "../components/AdminConfirmModal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  BrainCircuit,
  Sparkles,
  ChevronLeft,
  Settings,
  Trophy,
  Clock,
  AlertCircle,
  CheckCircle2,
  ListRestart,
  BarChart,
  Users,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  MoreVertical,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { generateAiContent } from "../lib/ai";

export const TriviaAdmin: React.FC = () => {
  const { user, profile, isAdmin, accountTier } = useAuth();
  const navigate = useNavigate();

  const [trivias, setTrivias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState("10");
  const [isSaving, setIsSaving] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    book_id: "",
    reward_points: 100,
    price: 200,
    expiry_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16),
    duration_seconds: 15,
    target_category: "all",
    thumbnail_url: "",
    target_tier: "all",
    promotional_writeup: "",
    type: "marketing",
    requires_premium: false,
    starts_at: new Date().toISOString().slice(0, 16),
  });
  const [questions, setQuestions] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionName: string;
    requiredWord: string;
    targetId?: string;
    targetType?: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionName: '',
    requiredWord: 'delete',
    onConfirm: () => {},
  });
  const [activeTab, setActiveTab] = useState<"settings" | "questions">(
    "settings",
  );

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isCleaningGhosts, setIsCleaningGhosts] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  const compressImage = (file: File, maxDim = 1000, quality = 0.85): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            }, 'image/jpeg', quality);
          } else {
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0];
    if (!originalFile) return;

    setIsUploadingThumbnail(true);
    setError("");

    try {
      console.log(`Original file size: ${Math.round(originalFile.size / 1024)} KB`);
      const compressedBlob = await compressImage(originalFile, 400);
      const file = new File([compressedBlob], originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) + '.jpg', { type: 'image/jpeg' });
      console.log(`Compressed file size: ${Math.round(file.size / 1024)} KB`);

      const fileExt = 'jpg';
      const fileName = `trivia_${Math.random()}.${fileExt}`;
      const filePath = `trivia/${fileName}`;

      let finalUrl = '';
      try {
        let { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
        
        // If bucket is not found or config is missing, try auto-creating the bucket
        if (uploadError && (uploadError.message?.toLowerCase().includes('bucket') || (uploadError as any).status === 404)) {
          console.warn("[Storage] Bucket 'media' not found. Attempting auto-creation...");
          try {
            await supabase.storage.createBucket('media', { public: true });
            // Retry upload
            const retryRes = await supabase.storage.from('media').upload(filePath, file);
            uploadError = retryRes.error;
          } catch (createErr) {
            console.error("[Storage] Failed to auto-create bucket 'media':", createErr);
          }
        }

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
        finalUrl = publicUrl;
      } catch (uploadErr) {
        console.warn("[Storage] Bucket upload failed. Falling back to Base64 data URI encoding:", uploadErr);
        // Resilient Base64 fallback if bucket is not found or offline
        const base64Url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
        finalUrl = base64Url;
      }

      setFormData((prev) => ({
        ...prev,
        thumbnail_url: finalUrl,
      }));
      setSuccess('Thumbnail image uploaded successfully!');
    } catch (err: any) {
      console.error('Error uploading thumbnail:', err);
      setError('Failed to upload thumbnail. Please try again.');
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const handleCleanGhosts = async () => {
    if (!window.confirm("Are you sure you want to purge all incomplete/orphaned trivia challenges (e.g., missing questions, missing title) from the database? This action cannot be undone.")) {
      return;
    }
    setIsCleaningGhosts(true);
    setError("");
    setSuccess("");
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      const res = await axios.post("/api/admin/trivia/clean-ghosts", {}, config);
      if (res.data.error) {
        throw new Error(res.data.error);
      }

      setSuccess(`Purged ghost and orphaned trivia elements successfully!`);
      fetchTrivias();
      fetchBooks();
    } catch (err: any) {
      console.error("Purge error:", err);
      setError(err.response?.data?.error || err.message || "Failed to purge incomplete trivias.");
    } finally {
      setIsCleaningGhosts(false);
    }
  };

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (!isAdmin && accountTier !== "author") {
      navigate("/dashboard");
      return;
    }
    fetchTrivias();
    fetchBooks();
  }, [isAdmin, accountTier]);

  const fetchTrivias = async () => {
    setLoading(true);
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      // Hard delete all trivias with title = 'General Trivia Challenge' (Cleanup ghost trivias)
      try {
        await supabase
          .from("trivias")
          .delete()
          .eq("title", "General Trivia Challenge");
      } catch (cleanupErr) {
        console.warn("[TriviaAdmin] Failed to clean up ghost trivias:", cleanupErr);
      }

      // Query books
      let query = supabase
        .from("books")
        .select("id, title, status, admin_note, user_id")
        .neq("status", -1)
        .not("status", "eq", "-1");

      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data: books, error: bErr } = await query;
      if (bErr) throw bErr;

      // Query trivia questions and sessions
      const { data: questions, error: qErr } = await supabase
        .from("trivia_questions")
        .select("*");
      if (qErr) throw qErr;

      const { data: triviaSessions, error: sErr } = await supabase
        .from("trivias")
        .select("*")
        .eq("deleted", false)
        .eq("status", "active");
      if (sErr) throw sErr;

      const stats: any[] = (books || [])
        .map((book) => {
          const bookQuestions = (questions || []).filter(
            (q) => q.ebook_id === book.id,
          );
          const session = (triviaSessions || []).find(
            (s) => s.book_id === book.id,
          );
          return {
            id: book.id,
            session_id: session?.id,
            title: book.title,
            questionCount: bookQuestions.length,
            lastUpdated:
              bookQuestions.length > 0
                ? new Date(
                    Math.max(
                      ...bookQuestions.map((q) =>
                        new Date(q.created_at).getTime(),
                      ),
                    ),
                  ).toISOString()
                : null,
            status: session?.status || "inactive",
            expiry_at: session?.expiry_at,
            reward_points: session?.reward_points,
            thumbnail_url: session?.thumbnail_url,
            is_owner: book.user_id === user.id,
            has_trivia: !!session || bookQuestions.length > 0,
          };
        })
        .filter((item) => item.has_trivia);

      // Add General Knowledge entry ONLY for admins
      if (isAdmin) {
        const generalQuestions = (questions || []).filter(
          (q) => q.ebook_id === null,
        );
        const generalSession = (triviaSessions || []).find(
          (s) => s.book_id === null,
        );
        if (generalQuestions.length > 0 || generalSession) {
          stats.push({
            id: "general",
            session_id: generalSession?.id,
            title: "General Knowledge Trivia",
            questionCount: generalQuestions.length,
            lastUpdated:
              generalQuestions.length > 0
                ? new Date(
                    Math.max(
                      ...generalQuestions.map((q) =>
                        new Date(q.created_at).getTime(),
                      ),
                    ),
                  ).toISOString()
                : null,
            status: generalSession?.status || "inactive",
            expiry_at: generalSession?.expiry_at,
            reward_points: generalSession?.reward_points,
            thumbnail_url: generalSession?.thumbnail_url,
            is_owner: true,
          });
        }

        // Add orphaned trivia sessions
        const existingBookIds = new Set((books || []).map(b => b.id));
        (triviaSessions || []).forEach(s => {
          if (s.book_id !== null && !existingBookIds.has(s.book_id)) {
            const bookQuestions = (questions || []).filter(
              (q) => String(q.ebook_id) === String(s.book_id) || String(q.ebook_id) === String(s.id)
            );
            stats.push({
              id: s.book_id || s.id,
              session_id: s.id,
              title: s.title || `[Missing/Ghost eBook Trivia] (ID: ${s.book_id})`,
              questionCount: bookQuestions.length,
              lastUpdated: bookQuestions.length > 0 ? new Date().toISOString() : null,
              status: s.status || "expired",
              expiry_at: s.expiry_at || new Date().toISOString(),
              reward_points: s.reward_points || 100,
              thumbnail_url: s.thumbnail_url,
              is_owner: true,
              is_orphaned: true
            });
          }
        });
      }

      setTrivias(stats);
    } catch (err: any) {
      console.error("Error fetching trivias directly via Supabase:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBooks = async () => {
    try {
      let query = supabase
        .from("books")
        .select("id, title, status, admin_note, user_id")
        .neq("status", -1)
        .not("status", "eq", "-1")
        .or("admin_note.is.null,admin_note.not.ilike.%[DELETED]%");

      // Filter by author if not CEO
      if (!isAdmin) {
        query = query.eq("user_id", user?.id);
      }

      const { data } = await query.order("title");
      setBooks(data || []);
    } catch (err) {
      console.error("Error fetching books:", err);
    }
  };

  const handleDelete = async (id: string, sessionId?: string, titleName?: string) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Trivia: ${titleName || 'Trivia Challenge'}`,
      description: `Deleting this trivia challenge permanently removes it and all questions. This action cannot be undone.`,
      actionName: "Delete Trivia",
      requiredWord: "delete",
      targetId: id,
      targetType: "trivia",
      onConfirm: async () => {
        try {
          const isGeneral = id === "general";
          const dbId = isGeneral ? null : id;

          let triviaQuery;
          if (sessionId) {
            triviaQuery = supabase.from("trivias").delete().eq("id", sessionId);
          } else {
            triviaQuery = isGeneral
              ? supabase.from("trivias").delete().is("book_id", null)
              : supabase.from("trivias").delete().eq("book_id", dbId);
          }
          
          const { error: triviaErr } = await triviaQuery;
          if (triviaErr) throw triviaErr;

          const questionsQuery = isGeneral
            ? supabase.from("trivia_questions").delete().is("ebook_id", null)
            : supabase.from("trivia_questions").delete().eq("ebook_id", dbId);

          const { error: questionsErr } = await questionsQuery;
          if (questionsErr) throw questionsErr;

          try {
            localStorage.removeItem("calmreader_landing_data_cache_local");
            localStorage.removeItem("calmreader_landing_data_cache_time_local");
            sessionStorage.removeItem("calmreader_landing_data_cache_local");
            sessionStorage.removeItem("calmreader_landing_data_cache_time_local");
          } catch (e) {
            console.warn("Storage item removal failed:", e);
          }

          try {
            clearLandingPageCache();
          } catch (e) {
            console.warn("In-memory cache clear failed:", e);
          }

          // Clear any cached trivia progress/data keys from localStorage and sessionStorage
          try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const key = localStorage.key(i);
              if (key && (key.startsWith("trivia_") || key.includes("trivia"))) {
                localStorage.removeItem(key);
              }
            }
            for (let i = sessionStorage.length - 1; i >= 0; i--) {
              const key = sessionStorage.key(i);
              if (key && (key.startsWith("trivia_") || key.includes("trivia"))) {
                sessionStorage.removeItem(key);
              }
            }
          } catch (lErr) {
            console.warn("Could not clear storage trivia keys:", lErr);
          }

          setTrivias(prev => prev.filter(t => t.id !== (sessionId || id)));
          await fetchTrivias();
          setSuccess("Trivia deleted successfully.");
        } catch (err: any) {
          console.error("[TriviaAdmin] delete failed:", err);
          setError("Failed to delete trivia. " + (err.message || ""));
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleToggleStatus = async (bookId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      const isGeneral = bookId === "general";
      const dbId = isGeneral ? null : bookId;
      
      const query = isGeneral
        ? supabase.from("trivias").update({ status: newStatus }).is("book_id", null)
        : supabase.from("trivias").update({ status: newStatus }).eq("book_id", dbId);

      const { error } = await query;
      if (error) throw error;

      fetchTrivias();
      setSuccess(
        `Trivia ${newStatus === "active" ? "launched" : "suspended"} successfully.`,
      );
    } catch (err: any) {
      console.error("Status update error:", err);
      setError("Failed to update status. " + (err.message || ""));
    }
  };

  const handleGenerateAI = async () => {
    if (!formData.book_id && !topic) {
      setError("Please select an eBook or enter a topic for AI generation.");
      return;
    }

    setGeneratingAI(true);
    setError("");
    console.log("[Trivia Gen] Starting client-side generation...");

    try {
      let sourceContent = topic;
      if (formData.book_id) {
        console.log("[Trivia Gen] Fetching eBook content from cards and description...");
        const { data: bookData, error: bookErr } = await supabase
          .from("books")
          .select("cards_json, title")
          .eq("id", formData.book_id)
          .single();

        if (bookErr) throw bookErr;

        let extractedContent = "";
        if (bookData?.cards_json) {
          try {
            const cards = typeof bookData.cards_json === "string"
              ? JSON.parse(bookData.cards_json)
              : bookData.cards_json;
            if (Array.isArray(cards)) {
              extractedContent = cards.map((c: any) => c?.text || "").filter(Boolean).join("\n\n");
            } else if (cards && cards.text) {
              extractedContent = cards.text;
            }
          } catch (e) {
            console.error("[Trivia Gen] Error parsing book cards:", e);
          }
        }

        sourceContent = extractedContent || "";
        if (!topic) setTopic(bookData?.title || "");
      }

      if (!sourceContent) {
        throw new Error("No content found to generate trivia from.");
      }

      const numberOfQuestions = parseInt(numQuestions);

      console.log(
        `[Trivia Gen] Calling OpenRouter with ${sourceContent.length} chars of content...`,
      );

      const { data } = await generateAiContent(
        `Generate exactly ${numberOfQuestions} multiple-choice trivia questions based strictly and exclusively on the provided eBook content below. Do not use external or generic knowledge. The questions must refer to specific facts, statements, characters, chapters, or concepts explicitly described in the provided text.
        
        CONTENT:
        ${sourceContent}`,
        {
          userId: user?.id,
          model: "meta-llama/llama-3.3-70b-instruct:free",
          responseMimeType: "application/json",
          systemInstruction: `You are a professional trivia architect. Your task is to generate highly specific, accurate multiple-choice trivia questions extracted strictly and directly from the provided eBook content. 
          CRITICAL RULES:
          1. Every question must be directly traceable to a specific fact, event, quote, or detail in the provided text.
          2. Absolutely DO NOT generate generic questions, general knowledge trivia, or questions that can be answered without reading this specific text.
          3. Ensure the "correct_answer" perfectly matches one of the options.
          4. Provide a helpful, informative explanation explaining why that answer is correct based on the text.
          
          Return a JSON object conforming exactly to this structure:
          {
            "questions": [
              {
                "question": "string",
                "options": ["string", "string", "string", "string"],
                "correct_answer": "exactly matching one of the options",
                "explanation": "string",
                "difficulty": "Easy", "Medium", or "Hard"
              }
            ]
          }`,
        },
      );

      console.log("[Trivia Gen] API Response received successfully.");
      const generatedQuestions = data?.questions || [];

      if (generatedQuestions.length === 0) {
        throw new Error(
          "No questions were generated. The AI returned an empty list.",
        );
      }

      setQuestions(generatedQuestions);
      setActiveTab("questions");
      setExpandedQuestion(0);

      const selectedBook = books.find((b) => b.id === formData.book_id);
      const bookTitle = selectedBook?.title || (formData.book_id ? 'this eBook' : '');
      setFormData((prev) => ({
        ...prev,
        title: formData.book_id
          ? `Trivia Master: ${bookTitle || 'eBook'}`
          : `Trivia: ${topic || 'General'}`,
        description: formData.book_id
          ? `Think you know ${bookTitle}? Prove it and earn rewards!`
          : `Test your knowledge on ${topic || 'CalmReader'}!`,
      }));
      setHasUnsavedChanges(true);
      setSuccess(
        `Success! Generated ${generatedQuestions.length} challenging questions. Review and refine them below.`,
      );
    } catch (err: any) {
      console.error("[Trivia Gen] Client-side error:", err);
      setError(
        err.message ||
          "Trivia generation failed. Check your API key and network.",
      );
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSaveDraft = async () => {
    if (questions.length === 0) {
      setError("No questions to save.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      // Ensure all questions are valid and have required fields
      const validatedQuestions = questions
        .filter((q) => {
          if (!q || !q.question || typeof q.question !== 'string' || !q.question.trim()) {
            return false;
          }
          if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
            return false;
          }
          return true;
        })
        .map((q) => {
          const trimmedOptions = q.options.map((opt: any) => 
            opt !== undefined && opt !== null ? String(opt).trim() : ''
          ).filter(Boolean);

          const correctAnswerStr = typeof q.correct_answer === 'string'
            ? q.correct_answer
            : q.correct_answer !== undefined && q.correct_answer !== null
              ? String(q.correct_answer)
              : '';

          const trimmedCorrectAnswer = correctAnswerStr.trim();

          const finalCorrectVal = (trimmedOptions.includes(trimmedCorrectAnswer) && trimmedCorrectAnswer !== '')
            ? trimmedCorrectAnswer
            : (trimmedOptions[0] || 'Option A'); // Fallback to first if mismatch

          return {
            ...q,
            options: trimmedOptions.length > 0 ? trimmedOptions : ['Option A'],
            correct_answer: finalCorrectVal,
          };
        });

      // Save questions to the trivia_questions table as DRAFT (isActive: false)
      const targetId = formData.book_id || "general";
      const isGeneral = targetId === "general";
      const dbId = isGeneral ? null : targetId;

      // 1. Delete existing questions for this ebook first
      if (isGeneral) {
        const { error: delErr } = await supabase
          .from("trivia_questions")
          .delete()
          .is("ebook_id", null);
        if (delErr) throw delErr;
      } else {
        const { error: delErr } = await supabase
          .from("trivia_questions")
          .delete()
          .eq("ebook_id", dbId);
        if (delErr) throw delErr;
      }

      // 2. Prepare the questions list
      const preparedQuestions = validatedQuestions.map((q: any, index: number) => ({
        ebook_id: dbId,
        question: q.question,
        options: Array.isArray(q.options)
          ? q.options
          : typeof q.options === "string"
            ? JSON.parse(q.options)
            : q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation || "",
        difficulty: q.difficulty || "Medium",
        points: q.points || 10,
        order_number: index + 1,
        is_active: false,
      }));

      // 3. Insert into trivia_questions
      const { error: insErr } = await supabase
        .from("trivia_questions")
        .insert(preparedQuestions);
      if (insErr) throw insErr;

      // 4. Fetch book details for title/description if not general
      let bookTitle = formData.title || "General Knowledge Trivia";
      let bookDesc = formData.description || "A challenge across various topics.";
      let bookCover = "";

      if (!isGeneral) {
        const { data: book } = await supabase
          .from("books")
          .select("title, description, cover_image")
          .eq("id", dbId)
          .single();
        if (book) {
          bookTitle = formData.title || book.title;
          bookDesc = formData.description || book.description || `Trivia challenge for ${book.title}.`;
          bookCover = book.cover_image || "";
        }
      }

      // 5. Upsert session as draft in the trivias table
      let savedTriviaId: string | null = null;
      if (isGeneral) {
        const { data: existingTrivia } = await supabase
          .from("trivias")
          .select("id")
          .is("book_id", null)
          .maybeSingle();
        
        const startIso = (formData as any).starts_at || new Date().toISOString();
        const isPrem = formData.target_tier === "premium";
        const { data: upsertedData, error: upsertErr } = await supabase.from("trivias").upsert({
          id: existingTrivia?.id || undefined,
          book_id: null,
          title: bookTitle,
          description: bookDesc,
          status: "draft",
          is_active: false,
          type: (formData as any).type || "marketing",
          requires_premium: (formData as any).requires_premium ?? isPrem,
          starts_at: startIso,
          reward_points: formData.reward_points !== undefined && formData.reward_points !== null ? formData.reward_points : 100,
          price: formData.price !== undefined && formData.price !== null ? formData.price : 0,
          target_tier: formData.target_tier || "all",
          promotional_writeup: formData.promotional_writeup || null,
          duration_seconds: formData.duration_seconds || 15,
          thumbnail_url: formData.thumbnail_url || bookCover,
          created_at: new Date().toISOString(),
        }).select("id").maybeSingle();
        if (upsertErr) throw upsertErr;
        if (upsertedData) savedTriviaId = upsertedData.id;
      } else {
        const startIso = (formData as any).starts_at || new Date().toISOString();
        const isPrem = formData.target_tier === "premium";
        const { data: upsertedData, error: upsertErr } = await supabase.from("trivias").upsert(
          {
            book_id: dbId,
            title: bookTitle,
            description: bookDesc,
            status: "draft",
            is_active: false,
            type: (formData as any).type || "marketing",
            requires_premium: (formData as any).requires_premium ?? isPrem,
            starts_at: startIso,
            reward_points: formData.reward_points !== undefined && formData.reward_points !== null ? formData.reward_points : 100,
            price: formData.price !== undefined && formData.price !== null ? formData.price : 0,
            target_tier: formData.target_tier || "all",
            promotional_writeup: formData.promotional_writeup || null,
            duration_seconds: formData.duration_seconds || 15,
            thumbnail_url: formData.thumbnail_url || bookCover,
            created_at: new Date().toISOString(),
          },
          { onConflict: "book_id" }
        ).select("id").maybeSingle();
        if (upsertErr) throw upsertErr;
        if (upsertedData) savedTriviaId = upsertedData.id;
      }

      // Link newly saved questions to the trivia_id
      if (savedTriviaId) {
        const qUpdateQuery = isGeneral
          ? supabase.from("trivia_questions").update({ trivia_id: savedTriviaId }).is("ebook_id", null)
          : supabase.from("trivia_questions").update({ trivia_id: savedTriviaId }).eq("ebook_id", dbId);
        await qUpdateQuery;
      }

      setQuestions(validatedQuestions);
      setSuccess(
        "Trivia set saved successfully as draft! You can review and launch it whenever you're ready.",
      );
      fetchTrivias();
    } catch (err: any) {
      setError(err.message || "Failed to save trivia set.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLaunchTrivia = async (triviaId: string) => {
    const trivia = trivias.find((t) => t.id === triviaId);
    if (!trivia) return;

    if (trivia.questionCount < 5) {
      setError(
        "Launch failed: At least 5 questions are required to launch a trivia session.",
      );
      return;
    }

    setLaunchingId(triviaId);
    try {
      const isGeneral = triviaId === "general";
      const dbId = isGeneral ? null : triviaId;
      const startDate = new Date().toISOString();
      const endDate =
        formData.expiry_at ||
        trivia.expiry_at ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const rewardPoints = formData.reward_points !== undefined && formData.reward_points !== null ? formData.reward_points : (trivia.reward_points || 100);
      const price = formData.price !== undefined && formData.price !== null ? formData.price : (trivia.price || 0);
      const target_tier = formData.target_tier || trivia.target_tier || "all";
      const promotional_writeup = formData.promotional_writeup !== undefined ? formData.promotional_writeup : trivia.promotional_writeup;
      const thumbnail_url = formData.thumbnail_url || trivia.thumbnail_url;
      const title = formData.title || trivia.title;
      const description = formData.description || trivia.description;
      const duration_seconds = formData.duration_seconds !== undefined && formData.duration_seconds > 0 ? formData.duration_seconds : (trivia.duration_seconds || 15);

      // 1. Activate all questions
      const uQuery = isGeneral
        ? supabase
            .from("trivia_questions")
            .update({ is_active: true })
            .is("ebook_id", null)
        : supabase
            .from("trivia_questions")
            .update({ is_active: true })
            .eq("ebook_id", dbId);

      const { error: uErr } = await uQuery;
      if (uErr) throw uErr;

      // 2. Fetch book details for title/description if not general
      let bookTitle = title || "General Knowledge Trivia";
      let bookDesc = description || "Mixed topic challenge for everyone.";
      let bookCover = "";

      if (!isGeneral) {
        const { data: book } = await supabase
          .from("books")
          .select("title, description, cover_image")
          .eq("id", dbId)
          .single();
        if (book) {
          bookTitle = title || book.title;
          bookDesc = description || book.description || `Trivia challenge for ${book.title}.`;
          bookCover = book.cover_image || "";
        }
      }

      // 3. Upsert session as active in trivias table
      const startIso = startDate || new Date().toISOString();
      const isPrem = target_tier === "premium";
      if (isGeneral) {
        const { data: existingTrivia } = await supabase
          .from("trivias")
          .select("id")
          .is("book_id", null)
          .maybeSingle();
        const { error: tErr } = await supabase.from("trivias").upsert({
          id: existingTrivia?.id || undefined,
          book_id: null,
          title: bookTitle,
          description: bookDesc,
          status: "active",
          is_active: true,
          type: "marketing",
          requires_premium: isPrem,
          starts_at: startIso,
          expiry_at: endDate,
          reward_points: rewardPoints !== undefined ? rewardPoints : 100,
          price: price,
          target_tier: target_tier || "all",
          promotional_writeup: promotional_writeup || null,
          duration_seconds: duration_seconds,
          thumbnail_url: thumbnail_url || bookCover,
          created_at: startIso,
        });
        if (tErr) throw tErr;
      } else {
        const { error: tErr } = await supabase.from("trivias").upsert(
          {
            book_id: dbId,
            title: bookTitle,
            description: bookDesc,
            status: "active",
            is_active: true,
            type: "marketing",
            requires_premium: isPrem,
            starts_at: startIso,
            expiry_at: endDate,
            reward_points: rewardPoints !== undefined ? rewardPoints : 100,
            price: price,
            target_tier: target_tier || "all",
            promotional_writeup: promotional_writeup || null,
            duration_seconds: duration_seconds,
            thumbnail_url: thumbnail_url || bookCover,
            created_at: startIso,
          },
          { onConflict: "book_id" }
        );
        if (tErr) throw tErr;
      }

      setSuccess("Launched successfully");
      fetchTrivias();
    } catch (err: any) {
      setError(err.message || "Launch failed. Check console.");
    } finally {
      setLaunchingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (questions.length < 5) {
      setError("At least 5 questions are required to launch a trivia session.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // Ensure all questions are valid and have required fields
      const validatedQuestions = questions
        .filter((q) => {
          if (!q || !q.question || typeof q.question !== 'string' || !q.question.trim()) {
            return false;
          }
          if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
            return false;
          }
          return true;
        })
        .map((q) => {
          const trimmedOptions = q.options.map((opt: any) => 
            opt !== undefined && opt !== null ? String(opt).trim() : ''
          ).filter(Boolean);

          const correctAnswerStr = typeof q.correct_answer === 'string'
            ? q.correct_answer
            : q.correct_answer !== undefined && q.correct_answer !== null
              ? String(q.correct_answer)
              : '';

          const trimmedCorrectAnswer = correctAnswerStr.trim();

          const finalCorrectVal = (trimmedOptions.includes(trimmedCorrectAnswer) && trimmedCorrectAnswer !== '')
            ? trimmedCorrectAnswer
            : (trimmedOptions[0] || 'Option A'); // Fallback to first if mismatch

          return {
            ...q,
            options: trimmedOptions.length > 0 ? trimmedOptions : ['Option A'],
            correct_answer: finalCorrectVal,
          };
        });

      // 1. Save questions to the trivia_questions table as ACTIVE (is_active: true)
      const targetId = formData.book_id || "general";
      const isGeneral = targetId === "general";
      const dbId = isGeneral ? null : targetId;
      console.log("[Deploy] Saving questions for:", targetId);

      if (isGeneral) {
        const { error: delErr } = await supabase
          .from("trivia_questions")
          .delete()
          .is("ebook_id", null);
        if (delErr) throw delErr;
      } else {
        const { error: delErr } = await supabase
          .from("trivia_questions")
          .delete()
          .eq("ebook_id", dbId);
        if (delErr) throw delErr;
      }

      // Prepare questions
      const preparedQuestions = validatedQuestions.map((q: any, index: number) => ({
        ebook_id: dbId,
        question: q.question,
        options: Array.isArray(q.options)
          ? q.options
          : typeof q.options === "string"
            ? JSON.parse(q.options)
            : q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation || "",
        difficulty: q.difficulty || "Medium",
        points: q.points || 10,
        order_number: index + 1,
        is_active: true,
      }));

      // Insert questions
      const { error: insErr } = await supabase
        .from("trivia_questions")
        .insert(preparedQuestions);
      if (insErr) throw insErr;

      // 2. Fetch book details for title/description if not general
      let bookTitle = formData.title || "General Knowledge Trivia";
      let bookDesc = formData.description || "A challenge across various topics.";
      let bookCover = "";

      if (!isGeneral) {
        const { data: book } = await supabase
          .from("books")
          .select("title, description, cover_image")
          .eq("id", dbId)
          .single();
        if (book) {
          bookTitle = formData.title || book.title;
          bookDesc = formData.description || book.description || `Trivia challenge for ${book.title}.`;
          bookCover = book.cover_image || "";
        }
      }

      // 3. Launch active session in the 'trivias' table
      console.log("[Deploy] Launching session...");
      const startDate = new Date().toISOString();
      const endDate =
        formData.expiry_at ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      let savedTriviaId: string | null = null;
      const startIso = startDate || (formData as any).starts_at || new Date().toISOString();
      const isPrem = formData.target_tier === "premium";
      if (isGeneral) {
        const { data: existingTrivia } = await supabase
          .from("trivias")
          .select("id")
          .is("book_id", null)
          .maybeSingle();
        const { data: upsertedData, error: tErr } = await supabase.from("trivias").upsert({
          id: existingTrivia?.id || undefined,
          book_id: null,
          title: bookTitle,
          description: bookDesc,
          status: "active",
          is_active: true,
          type: (formData as any).type || "marketing",
          requires_premium: (formData as any).requires_premium ?? isPrem,
          starts_at: startIso,
          expiry_at: endDate,
          reward_points: formData.reward_points !== undefined && formData.reward_points !== null ? formData.reward_points : 100,
          price: formData.price,
          target_tier: formData.target_tier || "all",
          promotional_writeup: formData.promotional_writeup || null,
          duration_seconds: formData.duration_seconds || 15,
          thumbnail_url: formData.thumbnail_url || bookCover,
          created_at: startIso,
        }).select("id").maybeSingle();
        if (tErr) throw tErr;
        if (upsertedData) savedTriviaId = upsertedData.id;
      } else {
        const { data: upsertedData, error: tErr } = await supabase.from("trivias").upsert(
          {
            book_id: dbId,
            title: bookTitle,
            description: bookDesc,
            status: "active",
            is_active: true,
            type: (formData as any).type || "marketing",
            requires_premium: (formData as any).requires_premium ?? isPrem,
            starts_at: startIso,
            expiry_at: endDate,
            reward_points: formData.reward_points !== undefined && formData.reward_points !== null ? formData.reward_points : 100,
            price: formData.price,
            target_tier: formData.target_tier || "all",
            promotional_writeup: formData.promotional_writeup || null,
            duration_seconds: formData.duration_seconds || 15,
            thumbnail_url: formData.thumbnail_url || bookCover,
            created_at: startIso,
          },
          { onConflict: "book_id" }
        ).select("id").maybeSingle();
        if (tErr) throw tErr;
        if (upsertedData) savedTriviaId = upsertedData.id;
      }

      // Link newly saved questions to the trivia_id
      if (savedTriviaId) {
        const qUpdateQuery = isGeneral
          ? supabase.from("trivia_questions").update({ trivia_id: savedTriviaId }).is("ebook_id", null)
          : supabase.from("trivia_questions").update({ trivia_id: savedTriviaId }).eq("ebook_id", dbId);
        await qUpdateQuery;
      }

      setSuccess(
        "MISSION ACCOMPLISHED! Trivia has been deployed to the core hub.",
      );
      setIsCreating(false);
      fetchTrivias();
      // Reset form
      setFormData({
        title: "",
        description: "",
        book_id: "",
        reward_points: 100,
        price: 200,
        expiry_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 16),
        duration_seconds: 15,
        target_category: "all",
        thumbnail_url: "",
        target_tier: "all",
        promotional_writeup: "",
        type: "marketing",
        requires_premium: false,
        starts_at: new Date().toISOString().slice(0, 16),
      });
      setQuestions([]);
      setTopic("");
    } catch (err: any) {
      console.error("[Deploy] Error:", err);
      setError(err.message || "Deployment failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-container max-w-6xl mx-auto space-y-6 sm:space-y-8 w-full min-w-0 overflow-x-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                isCreating ? setIsCreating(false) : navigate("/dashboard")
              }
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <BrainCircuit className="w-6 h-6 text-amber-600" />
                Trivia Management Hub
              </h1>
              <p className="text-sm text-gray-500 font-medium">
                Create and manage Reward-Based learning challenges.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && !isCreating && (
              <Button
                onClick={handleCleanGhosts}
                variant="outline"
                disabled={isCleaningGhosts}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold rounded-xl"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isCleaningGhosts ? "Purging..." : "Purge Orphaned"}
              </Button>
            )}
            {!isCreating && (
              <>
                <Button
                  onClick={() => {
                    setIsCreating(true);
                    setQuestions([
                      {
                        question: "",
                        options: ["", "", "", ""],
                        correct_answer: "",
                        explanation: "",
                        difficulty: "Medium",
                      }
                    ]);
                    setActiveTab("questions");
                    setExpandedQuestion(0);
                    setFormData({
                      title: "Manual Trivia Challenge",
                      description: "Enter your custom questions below to deploy this challenge.",
                      book_id: "",
                      reward_points: 100,
                      price: 0,
                      expiry_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .slice(0, 16),
                      duration_seconds: 15,
                      target_category: "all",
                      thumbnail_url: "",
                      target_tier: "all",
                      promotional_writeup: "",
                      type: "marketing",
                      requires_premium: false,
                      starts_at: new Date().toISOString().slice(0, 16),
                    });
                  }}
                  variant="outline"
                  className="border-amber-600 text-amber-700 hover:bg-amber-50 font-black rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" /> Manual Create
                </Button>
                <Button
                  onClick={() => {
                    setIsCreating(true);
                    setQuestions([]);
                    setActiveTab("settings");
                    setFormData({
                      title: "",
                      description: "",
                      book_id: "",
                      reward_points: 100,
                      price: 200,
                      expiry_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .slice(0, 16),
                      duration_seconds: 5,
                      target_category: "all",
                      thumbnail_url: "",
                      target_tier: "all",
                      promotional_writeup: "",
                      type: "marketing",
                      requires_premium: false,
                      starts_at: new Date().toISOString().slice(0, 16),
                    });
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl"
                >
                  <Sparkles className="w-4 h-4 mr-2" /> Create with AI
                </Button>
              </>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isCreating ? (
            <motion.div
              key="create"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              {/* Form Alert Center */}
              <AnimatePresence>
                {(error || success) && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`p-4 rounded-xl flex items-center justify-between gap-3 shadow-lg ${
                      error
                        ? "bg-red-50 border border-red-100 text-red-700"
                        : "bg-green-50 border border-green-100 text-green-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {error ? (
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      )}
                      <span className="text-sm font-bold">
                        {error || success}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setError("");
                        setSuccess("");
                      }}
                      className="opacity-50 hover:opacity-100 italic text-[10px] font-black underline uppercase tracking-tighter"
                    >
                      Dismiss
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2 mb-2 p-1 bg-gray-100/50 rounded-xl w-fit">
                <Button
                  variant={activeTab === "settings" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("settings")}
                  className={
                    activeTab === "settings"
                      ? "bg-white text-slate-950 shadow-sm border-none hover:bg-white"
                      : "text-gray-500"
                  }
                >
                  <Settings className="w-4 h-4 mr-2" /> 1. Challenge Config
                </Button>
                <div className="w-4 h-0.5 bg-gray-200 rounded-full" />
                <Button
                  variant={activeTab === "questions" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("questions")}
                  className={
                    activeTab === "questions"
                      ? "bg-white text-slate-950 shadow-sm border-none hover:bg-white"
                      : "text-gray-500"
                  }
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  2. Question Review
                  {questions.length > 0 && (
                    <Badge className="ml-2 bg-amber-100 text-amber-700 border-none px-1.5 h-4 text-[10px]">
                      {questions.length}
                    </Badge>
                  )}
                </Button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                <div className="lg:col-span-2 space-y-6">
                  {activeTab === "settings" ? (
                    <Card className="border-none shadow-xl ring-1 ring-gray-100 overflow-hidden">
                      <div className="bg-slate-950 p-8">
                        <CardTitle className="text-white text-2xl font-black italic tracking-tight">
                          Challenge Architect
                        </CardTitle>
                        <CardDescription className="text-slate-400 font-medium">
                          Define the technical scope and AI context for this
                          trivia session.
                        </CardDescription>
                      </div>
                      <CardContent className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <Label className="text-xs uppercase font-black text-gray-500 tracking-widest">
                              Target Content Source
                            </Label>
                            <select
                              className="w-full h-12 px-4 rounded-xl border-2 border-gray-100 text-sm font-bold focus:ring-2 focus:ring-amber-500 bg-gray-50/50 transition-all"
                              value={formData.book_id}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  book_id: e.target.value,
                                }))
                              }
                            >
                              <option value="">
                                General Knowledge / Manual Topic
                              </option>
                              {books.length === 0 && (
                                <option disabled>
                                  No Books Available - Upload a book first
                                </option>
                              )}
                              {books.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.title}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-xs uppercase font-black text-gray-500 tracking-widest">
                              Reward Pot (TP)
                            </Label>
                            <Input
                              type="number"
                              value={formData.reward_points}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  reward_points: parseInt(e.target.value),
                                }))
                              }
                              className="h-12 rounded-xl border-2 border-gray-100 font-bold"
                            />
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                              Total T-Points awarded on success (1 TP = ₦5).
                            </p>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-xs uppercase font-black text-gray-500 tracking-widest">
                              Time / Question (Seconds)
                            </Label>
                            <Input
                              type="number"
                              value={formData.duration_seconds === 0 ? "" : formData.duration_seconds}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormData((prev) => ({
                                  ...prev,
                                  duration_seconds: val === "" ? 0 : parseInt(val) || 0,
                                }));
                              }}
                              className="h-12 rounded-xl border-2 border-gray-100 font-bold"
                            />
                            <div className="flex flex-wrap gap-2 pt-1">
                              {[5, 10, 15, 20, 30].map((sec) => (
                                <button
                                  key={sec}
                                  type="button"
                                  onClick={() => setFormData((prev) => ({ ...prev, duration_seconds: sec }))}
                                  className={`px-3 py-1 text-xs font-black rounded-lg border transition-all ${
                                    formData.duration_seconds === sec
                                      ? "bg-amber-600 border-amber-600 text-white"
                                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                  }`}
                                >
                                  {sec}s
                                </button>
                              ))}
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                              Countdown seconds for each question (e.g., 20s).
                            </p>
                          </div>
                        </div>

                        {!formData.book_id && (
                          <div className="space-y-3">
                            <Label className="text-xs uppercase font-black text-gray-500 tracking-widest">
                              AI Context / Custom Topic
                            </Label>
                            <Textarea
                              placeholder="e.g. World History, or paste/drop full content here for AI to analyze..."
                              value={topic}
                              onChange={(e) => setTopic(e.target.value)}
                              className="min-h-[160px] bg-amber-50/20 border-amber-100 focus:ring-amber-500 font-medium p-4 rounded-xl"
                            />
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                              AI will analyze this text to craft precise
                              questions.
                            </p>
                          </div>
                        )}

                        <div className="space-y-3">
                          <Label className="text-xs uppercase font-black text-gray-500 tracking-widest">
                            Number of AI Questions
                          </Label>
                          <select
                            value={numQuestions}
                            onChange={(e) => setNumQuestions(e.target.value)}
                            className="flex h-12 w-full rounded-xl border-2 border-gray-100 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="5">5 Questions</option>
                            <option value="10">10 Questions</option>
                            <option value="15">15 Questions</option>
                            <option value="20">20 Questions</option>
                          </select>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                            Select how many questions the AI should extract from the eBook content.
                          </p>
                        </div>

                        <div className="pt-4 flex gap-4">
                          <Button
                            type="button"
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white h-14 font-black rounded-2xl shadow-lg shadow-amber-900/20"
                            onClick={handleGenerateAI}
                            disabled={
                              generatingAI || (!formData.book_id && !topic)
                            }
                          >
                            {generatingAI ? (
                              <>
                                <Loader2 className="w-5 h-5 mr-3 animate-spin" />{" "}
                                ARCHITECTING QUESTIONS...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-5 h-5 mr-3" />{" "}
                                AUTO-GENERATE WITH AI
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-none shadow-xl ring-1 ring-gray-100 overflow-hidden">
                      <CardHeader className="border-b border-gray-50 pb-6 flex flex-row items-center justify-between bg-white">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-slate-900">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            Question Workspace
                            <Badge
                              variant="secondary"
                              className="ml-2 font-black"
                            >
                              {questions.length} Questions
                            </Badge>
                          </CardTitle>
                          <CardDescription className="font-medium">
                            Refine AI output for clarity and difficulty
                            accuracy.
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="bg-amber-50/50 border-amber-100 text-amber-700 hover:bg-amber-100 font-bold"
                            onClick={handleGenerateAI}
                            disabled={generatingAI}
                          >
                            <RefreshCw
                              className={`w-4 h-4 mr-2 ${generatingAI ? "animate-spin" : ""}`}
                            />
                            Regenerate
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="font-bold"
                            onClick={() => {
                              const newQs = [
                                ...questions,
                                {
                                  question: "",
                                  options: ["", "", "", ""],
                                  correct_answer: "",
                                  explanation: "",
                                  difficulty: "Medium",
                                },
                              ];
                              setQuestions(newQs);
                              setExpandedQuestion(newQs.length - 1);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" /> Add
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0 bg-gray-50/30">
                        <div
                          id="questions-container"
                          className="max-h-[500px] overflow-y-auto divide-y divide-gray-100 scrollbar-thin scrollbar-thumb-gray-200 scroll-smooth relative"
                        >
                          {questions.length > 5 && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                const el = document.getElementById(
                                  "questions-container",
                                );
                                if (el)
                                  el.scrollTo({
                                    top: el.scrollHeight,
                                    behavior: "smooth",
                                  });
                              }}
                              className="absolute bottom-4 right-4 z-10 rounded-full shadow-lg bg-white/80 backdrop-blur-sm border border-gray-100 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ChevronDown className="w-4 h-4 mr-1" /> Scroll to
                              Bottom
                            </Button>
                          )}
                          {questions.length === 0 ? (
                            <div className="py-24 text-center">
                              <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-12">
                                <BrainCircuit className="w-10 h-10 text-amber-600" />
                              </div>
                              <h3 className="text-xl font-black text-slate-800 tracking-tight">
                                Workspace is Empty
                              </h3>
                              <p className="text-gray-500 font-medium mt-2 max-w-xs mx-auto">
                                Use the Challenge Config tab to launch the AI
                                architect or add questions manually.
                              </p>
                              <Button
                                variant="outline"
                                className="mt-6 border-amber-200 text-amber-700 hover:bg-amber-50 font-bold rounded-xl"
                                onClick={() => setActiveTab("settings")}
                              >
                                Go to Config
                              </Button>
                            </div>
                          ) : (
                            questions.map((q, qIndex) => (
                              <div
                                key={qIndex}
                                className={`transition-all ${expandedQuestion === qIndex ? "bg-white" : "bg-transparent"}`}
                              >
                                <div
                                  onClick={() =>
                                    setExpandedQuestion(
                                      expandedQuestion === qIndex
                                        ? null
                                        : qIndex,
                                    )
                                  }
                                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/50 transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-4 text-left">
                                    <div
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-sm ${
                                        q.correct_answer
                                          ? "bg-slate-900 text-white"
                                          : "bg-red-100 text-red-600 animate-pulse"
                                      }`}
                                    >
                                      {qIndex + 1}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-slate-800 line-clamp-1 pr-4">
                                        {q.question || "Untitled Question"}
                                      </h4>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] h-4 uppercase font-black tracking-widest"
                                        >
                                          {q.difficulty}
                                        </Badge>
                                        {!q.correct_answer && (
                                          <span className="text-[10px] text-red-500 font-black uppercase tracking-tighter flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />{" "}
                                            No Answer Set
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-gray-400 hover:text-red-500"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setQuestions(
                                          questions.filter(
                                            (_, i) => i !== qIndex,
                                          ),
                                        );
                                        if (expandedQuestion === qIndex)
                                          setExpandedQuestion(null);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                    {expandedQuestion === qIndex ? (
                                      <ChevronUp className="w-4 h-4 text-gray-400" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                  </div>
                                </div>

                                <AnimatePresence>
                                  {expandedQuestion === qIndex && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-6 pb-8 pt-2 space-y-6">
                                        <div className="space-y-2">
                                          <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block">
                                            Question Prompt
                                          </Label>
                                          <Textarea
                                            value={q.question}
                                            onChange={(e) => {
                                              const newQs = [...questions];
                                              newQs[qIndex].question =
                                                e.target.value;
                                              setQuestions(newQs);
                                            }}
                                            className="text-md font-bold bg-slate-50 border-none shadow-inner min-h-[80px] rounded-2xl focus:ring-amber-500"
                                            placeholder="Write the question here..."
                                          />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block">
                                              Set Difficulty
                                            </Label>
                                            <select
                                              value={q.difficulty}
                                              onChange={(e) => {
                                                const newQs = [...questions];
                                                newQs[qIndex].difficulty =
                                                  e.target.value;
                                                setQuestions(newQs);
                                              }}
                                              className="w-full h-11 px-4 rounded-xl bg-slate-50 border-none text-sm font-bold focus:ring-2 focus:ring-amber-500"
                                            >
                                              <option value="Easy">
                                                Beginner (Easy)
                                              </option>
                                              <option value="Medium">
                                                Standard (Medium)
                                              </option>
                                              <option value="Hard">
                                                Expert (Hard)
                                              </option>
                                            </select>
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block">
                                              Deployment Status
                                            </Label>
                                            <div
                                              className={`h-11 px-4 rounded-xl flex items-center justify-between text-[11px] font-black tracking-tight ${q.correct_answer ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-600"}`}
                                            >
                                              {q.correct_answer
                                                ? "READY FOR HUB"
                                                : "NEEDS CORRECT ANSWER"}
                                              {q.correct_answer ? (
                                                <CheckCircle2 className="w-4 h-4" />
                                              ) : (
                                                <AlertCircle className="w-4 h-4 animate-pulse" />
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="space-y-3">
                                          <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block px-1">
                                            Multiple Choice Options (Select One
                                            Correct)
                                          </Label>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {q.options.map(
                                              (opt: string, oIndex: number) => (
                                                <div
                                                  key={oIndex}
                                                  className={`flex items-center gap-3 p-1 rounded-2xl border-2 transition-all ${
                                                    q.correct_answer === opt &&
                                                    opt !== ""
                                                      ? "border-slate-900 bg-slate-50"
                                                      : "border-transparent bg-slate-50/50 hover:bg-slate-50"
                                                  }`}
                                                >
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const newQs = [
                                                        ...questions,
                                                      ];
                                                      newQs[
                                                        qIndex
                                                      ].correct_answer = opt;
                                                      setQuestions(newQs);
                                                    }}
                                                    disabled={!opt.trim()}
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black flex-shrink-0 transition-all ${
                                                      q.correct_answer ===
                                                        opt && opt !== ""
                                                        ? "bg-slate-900 text-white shadow-lg"
                                                        : "bg-white text-slate-300 hover:text-slate-900 disabled:opacity-30"
                                                    }`}
                                                  >
                                                    {
                                                      ["A", "B", "C", "D"][
                                                        oIndex
                                                      ]
                                                    }
                                                  </button>
                                                  <input
                                                    value={opt}
                                                    onChange={(e) => {
                                                      const newQs = [
                                                        ...questions,
                                                      ];
                                                      const oldVal =
                                                        newQs[qIndex].options[
                                                          oIndex
                                                        ];
                                                      newQs[qIndex].options[
                                                        oIndex
                                                      ] = e.target.value;
                                                      if (
                                                        newQs[qIndex]
                                                          .correct_answer ===
                                                          oldVal &&
                                                        oldVal !== ""
                                                      ) {
                                                        newQs[
                                                          qIndex
                                                        ].correct_answer =
                                                          e.target.value;
                                                      }
                                                      setQuestions(newQs);
                                                    }}
                                                    placeholder={`Possible Answer ${oIndex + 1}`}
                                                    className="bg-transparent border-none text-sm font-bold w-full focus:ring-0"
                                                  />
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        </div>

                                        <div className="space-y-2 p-5 bg-amber-50/50 rounded-2xl border border-amber-100">
                                          <Label className="text-[10px] uppercase font-black text-amber-700 tracking-widest flex items-center gap-2 mb-1">
                                            <Sparkles className="w-3 h-3" />{" "}
                                            Adaptive Explanation
                                          </Label>
                                          <Textarea
                                            value={q.explanation}
                                            onChange={(e) => {
                                              const newQs = [...questions];
                                              newQs[qIndex].explanation =
                                                e.target.value;
                                              setQuestions(newQs);
                                            }}
                                            className="bg-white border-none shadow-sm text-sm font-medium py-3 rounded-xl min-h-[60px] focus:ring-amber-500"
                                            placeholder="Provide context for the correct answer..."
                                          />
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Persistent Control Bar */}
                  <Card className="border-none shadow-xl ring-1 ring-amber-100 bg-white overflow-hidden sticky top-8">
                    <div className="bg-slate-900 px-6 py-4">
                      <h3 className="text-white font-black flex items-center gap-2 tracking-tight">
                        <Trophy className="w-5 h-5 text-amber-500" /> MISSION
                        CONTROL
                      </h3>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-0.5">
                        Deployment Readiness State
                      </p>
                    </div>
                    <CardContent className="p-6 space-y-6">
                      <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">
                            Readiness Check
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase tracking-tighter ${questions.length >= 5 ? "text-green-600" : "text-amber-600 animate-pulse"}`}
                          >
                            {questions.length}/5 Questions
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min((questions.length / 5) * 100, 100)}%`,
                            }}
                            className={`h-full ${questions.length >= 5 ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-amber-500"}`}
                          />
                        </div>
                        <ul className="space-y-2 mt-4 border-t border-slate-200 pt-4">
                          <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            {questions.length >= 5 ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-slate-300" />
                            )}
                            Min. 5 Questions
                          </li>
                          <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            {formData.book_id
                              ? "Linked to eBook"
                              : "General Knowledge Mode"}
                          </li>
                          <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            {formData.title ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Loader2 className="w-3.5 h-3.5 text-slate-300 animate-spin" />
                            )}
                            Challenge Title Set
                          </li>
                          <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            {formData.expiry_at ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-slate-300" />
                            )}
                            Expiry Window Configured
                          </li>
                        </ul>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-slate-900 font-black tracking-tight flex items-center justify-between">
                          Reward Points
                          <Badge className="bg-amber-100 text-amber-700 border-none px-1.5 h-4">
                            Value: ₦
                            {(
                              (formData.reward_points || 0) * 5
                            ).toLocaleString()}
                          </Badge>
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={
                              isNaN(formData.reward_points)
                                ? ""
                                : formData.reward_points
                            }
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                reward_points: parseInt(e.target.value),
                              }))
                            }
                            className="h-12 bg-gray-50 border-2 border-slate-100 text-lg font-black focus:ring-amber-500"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">
                            T-POINTS
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-slate-900 font-black tracking-tight flex items-center justify-between">
                          Time Limit / Question
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={formData.duration_seconds === 0 ? "" : formData.duration_seconds}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData((p) => ({
                                ...p,
                                  duration_seconds: val === "" ? 0 : parseInt(val) || 0,
                              }));
                            }}
                            className="h-12 bg-gray-50 border-2 border-slate-100 text-lg font-black focus:ring-amber-500"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">
                            SECONDS
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {[5, 10, 15, 20, 30].map((sec) => (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => setFormData((p) => ({ ...p, duration_seconds: sec }))}
                              className={`px-3 py-1 text-xs font-black rounded-lg border transition-all ${
                                formData.duration_seconds === sec
                                  ? "bg-amber-600 border-amber-600 text-white"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {sec}s
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-slate-900 font-black tracking-tight flex items-center justify-between">
                          Challenge Title <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">(Optional)</span>
                        </Label>
                        <Input
                          value={formData.title}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              title: e.target.value,
                            }))
                          }
                          placeholder="e.g. Master the Art of Card Content"
                          className="bg-gray-50 border-slate-100 font-bold"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-slate-900 font-black tracking-tight flex items-center justify-between">
                          Challenge Description <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">(Optional)</span>
                        </Label>
                        <Input
                          value={formData.description}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              description: e.target.value,
                            }))
                          }
                          placeholder="e.g. High-stakes speed run for trivia master title..."
                          className="bg-gray-50 border-slate-100 font-bold"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-slate-900 font-black tracking-tight flex items-center justify-between">
                          Promotional Thumbnail Image <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">(Optional)</span>
                        </Label>
                        
                        <div className="flex flex-col gap-3">
                          {!formData.thumbnail_url ? (
                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50 transition-all relative flex flex-col items-center justify-center gap-2">
                              {isUploadingThumbnail ? (
                                <div className="flex flex-col items-center gap-2 py-2">
                                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                  <span className="text-xs font-bold text-slate-500">Uploading and compressing image...</span>
                                </div>
                              ) : (
                                <>
                                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                  <div className="text-xs">
                                    <label htmlFor="trivia-thumbnail" className="relative cursor-pointer bg-white rounded-md font-black text-indigo-600 hover:text-indigo-500">
                                      <span>Upload an image file</span>
                                      <input 
                                        id="trivia-thumbnail" 
                                        name="trivia-thumbnail" 
                                        type="file" 
                                        accept="image/png, image/jpeg, image/jpg, image/webp" 
                                        className="sr-only" 
                                        onChange={handleThumbnailUpload}
                                        disabled={isUploadingThumbnail}
                                      />
                                    </label>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">PNG, JPEG, WebP up to 10MB</p>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                              <div className="relative h-20 w-32 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0">
                                <img src={formData.thumbnail_url} alt="Promo Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">thumbnail_uploaded.jpg</p>
                                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-wider mt-0.5">Ready for Save</p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setFormData((p) => ({ ...p, thumbnail_url: "" }))}
                                className="border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl px-3 h-9 text-xs font-bold"
                              >
                                Replace
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Price Tier Selection */}
                      <div className="space-y-3">
                        <Label className="text-slate-900 font-black tracking-tight flex items-center justify-between">
                          Trivia Access Type <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">(Choose Free or Premium entry price)</span>
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, price: 0 }))}
                            className={`p-3 rounded-xl border-2 text-xs font-black uppercase tracking-tight transition-all text-center flex flex-col items-center justify-center gap-1 ${
                              formData.price === 0
                                ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                                : "border-slate-100 bg-gray-50 text-slate-500 hover:border-slate-200"
                            }`}
                          >
                            <span>🟢 Free Entry</span>
                            <span className="text-[9px] font-bold text-slate-400 normal-case">Everyone can join for free</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, price: p.price > 0 ? p.price : 200 }))}
                            className={`p-3 rounded-xl border-2 text-xs font-black uppercase tracking-tight transition-all text-center flex flex-col items-center justify-center gap-1 ${
                              formData.price > 0
                                ? "border-amber-500 bg-amber-50 text-amber-900"
                                : "border-slate-100 bg-gray-50 text-slate-500 hover:border-slate-200"
                            }`}
                          >
                            <span>🟡 Premium Entry</span>
                            <span className="text-[9px] font-bold text-slate-400 normal-case">Entry fee required to play</span>
                          </button>
                        </div>

                        {formData.price > 0 && (
                          <div className="relative mt-2 animate-fade-in">
                            <Input
                              type="number"
                              value={formData.price}
                              onChange={(e) =>
                                setFormData((p) => ({
                                  ...p,
                                  price: parseInt(e.target.value) || 0,
                                }))
                              }
                              placeholder="e.g. 200"
                              className="h-12 bg-gray-50 border-2 border-slate-100 text-lg font-black focus:ring-amber-500"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">
                              NAIRA (₦)
                            </div>
                          </div>
                        )}
                        <p className="text-[10px] font-bold text-slate-400">
                          {formData.price === 0 ? "✅ This trivia is set to FREE ENTRY. Users do not need to pay a ticket fee." : `🎟️ Ticket fee: ₦${Number(formData.price).toLocaleString()} per entry.`}
                        </p>
                      </div>

                      {/* Participant Account Tier Rules */}
                      <div className="space-y-3">
                        <Label className="text-slate-900 font-black tracking-tight flex items-center justify-between">
                          Allowed Participant Account Tier
                        </Label>
                        <select
                          value={formData.target_tier || "all"}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              target_tier: e.target.value,
                            }))
                          }
                          className="w-full h-12 bg-gray-50 border-2 border-slate-100 rounded-xl px-3 font-bold text-sm focus:ring-amber-500 text-slate-800"
                        >
                          <option value="all">🌐 All Users (Free & Premium Accounts)</option>
                          <option value="premium">💎 Premium Accounts Only (Free accounts blocked)</option>
                        </select>
                        <p className="text-[10px] font-bold text-slate-400">
                          {formData.target_tier === "premium"
                            ? "🔒 Restricted: Only premium tier/paying users can access this challenge."
                            : "🔓 Open Access: Active users on any account tier can attempt."}
                        </p>
                      </div>

                      {/* Promotional Write-up on offers */}
                      <div className="space-y-3">
                        <Label className="text-slate-900 font-black tracking-tight flex items-center justify-between">
                          Promotional Write-up / Offers <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">(Optional)</span>
                        </Label>
                        <textarea
                          value={formData.promotional_writeup}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              promotional_writeup: e.target.value,
                            }))
                          }
                          placeholder="e.g. Special Offer: Complete this book trivia today to stand a chance to win a free copy of our upcoming sequel next month!"
                          rows={3}
                          className="w-full bg-gray-50 border-2 border-slate-100 rounded-xl p-3 font-bold text-xs focus:ring-amber-500 text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-slate-900 font-black tracking-tight">
                          Self-Destruct Date (Expiry)
                        </Label>
                        <Input
                          type="datetime-local"
                          value={formData.expiry_at}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              expiry_at: e.target.value,
                            }))
                          }
                          className="bg-gray-50 border-slate-100 font-bold"
                        />
                      </div>

                      <div className="pt-4 border-t border-slate-100 space-y-4">
                        {error && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                                Deployment Blocked
                              </p>
                              <p className="text-xs font-bold text-red-700 leading-tight">
                                {error}
                              </p>
                            </div>
                          </div>
                        )}
                        {success && (
                          <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">
                                Success
                              </p>
                              <p className="text-xs font-bold text-green-700 leading-tight">
                                {success}
                              </p>
                            </div>
                          </div>
                        )}

                        <Button
                          type="submit"
                          disabled={
                            isSubmitting ||
                            questions.length < 5 ||
                            !formData.expiry_at
                          }
                          className="w-full bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-300 h-16 rounded-[2rem] font-black text-lg transition-all shadow-xl shadow-slate-900/10 flex flex-col items-center justify-center gap-0 group"
                        >
                          {isSubmitting ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : (
                            <>
                              <span className="flex items-center gap-2 group-hover:scale-105 transition-transform">
                                <Sparkles className="w-5 h-5 text-amber-500" />{" "}
                                DEPLOY TO CORE
                              </span>
                              <div className="flex flex-wrap gap-2 items-center justify-center">
                                {questions.length < 5 && (
                                  <span className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">
                                    NEED {5 - questions.length} MORE Qs
                                  </span>
                                )}
                                {!formData.expiry_at &&
                                  questions.length >= 5 && (
                                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-tighter">
                                      Set Expiry
                                    </span>
                                  )}
                              </div>
                            </>
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleSaveDraft}
                          disabled={isSaving || questions.length === 0}
                          className="w-full text-slate-600 font-black h-12 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Settings className="w-4 h-4" />
                          )}
                          PERSIST AS DRAFT
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "Active Sessions",
                    val: trivias.filter(
                      (t) => new Date(t.expiry_at) > new Date(),
                    ).length,
                    icon: <Clock className="w-4 h-4 text-green-600" />,
                  },
                  {
                    label: "Total Rewards Paid",
                    val: "₦0",
                    icon: <Trophy className="w-4 h-4 text-amber-600" />,
                  },
                  {
                    label: "Participation Rate",
                    val: "0%",
                    icon: <BarChart className="w-4 h-4 text-blue-600" />,
                  },
                  {
                    label: "Unique Players",
                    val: "0",
                    icon: <Users className="w-4 h-4 text-purple-600" />,
                  },
                ].map((stat, i) => (
                  <Card
                    key={i}
                    className="border-none shadow-sm ring-1 ring-gray-100"
                  >
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                          {stat.label}
                        </p>
                        <p className="text-2xl font-black text-gray-900 leading-none">
                          {stat.val}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl">
                        {stat.icon}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-none shadow-xl ring-1 ring-gray-100 overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                  <CardTitle>Existing Trivias</CardTitle>
                </CardHeader>
                <div className="max-h-[600px] overflow-y-auto">
                  <div className="overflow-x-auto w-full min-w-0">
                    <table className="w-full text-left border-collapse responsive-table">
                      <thead className="bg-gray-50/50 text-[10px] uppercase tracking-widest text-gray-400 font-black">
                        <tr>
                          <th className="px-6 py-4 border-b border-gray-100">
                            Challenge
                          </th>
                          <th className="px-6 py-4 border-b border-gray-100">
                            Target
                          </th>
                          <th className="px-6 py-4 border-b border-gray-100">
                            Rewards
                          </th>
                          <th className="px-6 py-4 border-b border-gray-100">
                            Status
                          </th>
                          <th className="px-6 py-4 border-b border-gray-100 text-right">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {loading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i} className="animate-pulse">
                              <td
                                colSpan={5}
                                className="px-6 py-8 border-b border-gray-50 bg-gray-50/30"
                              ></td>
                            </tr>
                          ))
                        ) : trivias.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-6 py-12 text-center text-gray-500 font-medium"
                            >
                              No trivia challenges launched yet. Click "Launch
                              New Trivia" to start.
                            </td>
                          </tr>
                        ) : (
                          trivias.map((trivia) => (
                            <tr
                              key={trivia.id}
                              className="hover:bg-gray-50/50 transition-colors group"
                            >
                              <td className="px-6 py-4 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                  {trivia.thumbnail_url ? (
                                    <img
                                      src={trivia.thumbnail_url}
                                      className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                                      alt=""
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                      <BrainCircuit className="w-5 h-5 text-amber-600" />
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-bold text-gray-900">
                                      {trivia.title}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-medium tracking-tight">
                                      Created:{" "}
                                      {new Date(
                                        trivia.lastUpdated ||
                                          trivia.created_at ||
                                          Date.now(),
                                      ).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 border-b border-gray-100">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] uppercase font-black tracking-widest"
                                >
                                  {trivia.target_category || "All"}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 border-b border-gray-100">
                                <div className="font-bold text-amber-600 text-lg leading-none">
                                  {trivia.reward_points || 100} TP
                                </div>
                                <div className="text-[10px] text-gray-400 font-bold mt-1">
                                  ₦
                                  {(
                                    (trivia.reward_points || 100) * 5
                                  ).toLocaleString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 border-b border-gray-100">
                                {trivia.status === "active" &&
                                new Date(trivia.expiry_at) > new Date() ? (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[10px] font-black uppercase tracking-widest">
                                    Live
                                  </Badge>
                                ) : trivia.status === "suspended" ? (
                                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none text-[10px] font-black uppercase tracking-widest">
                                    Suspended
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 border-none text-[10px] font-black uppercase tracking-widest">
                                    {trivia.status === "draft"
                                      ? "Draft"
                                      : "Expired"}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-6 py-4 border-b border-gray-100 text-right">
                                <div className="flex justify-end gap-2">
                                  {isAdmin || trivia.is_owner || accountTier === "author" ? (
                                    <>
                                      {trivia.status !== "active" ? (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            handleLaunchTrivia(trivia.id)
                                          }
                                          disabled={launchingId === trivia.id}
                                          className="bg-amber-600 text-white border-amber-600 hover:bg-amber-700 font-bold px-4"
                                        >
                                          {launchingId === trivia.id
                                            ? "Launching..."
                                            : "Launch"}
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            handleToggleStatus(
                                              trivia.id,
                                              trivia.status,
                                            )
                                          }
                                          className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 font-bold"
                                        >
                                          Suspend
                                        </Button>
                                      )}

                                      {trivia.status === "suspended" && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            handleToggleStatus(
                                              trivia.id,
                                              trivia.status,
                                            )
                                          }
                                          className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 font-bold"
                                        >
                                          Resume
                                        </Button>
                                      )}

                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDelete(trivia.id, trivia.session_id, trivia.title)}
                                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold px-3 py-1.5 h-9 rounded-xl transition-all"
                                      >
                                        <Trash2 className="w-4 h-4 mr-1.5 shrink-0" />
                                        Delete
                                      </Button>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      {trivia.status === "inactive" && (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] text-amber-600 border-amber-200 italic"
                                        >
                                          Pends CEO Review
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-bold">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-bold">{success}</span>
            </div>
          </div>
        )}
        {/* Safety Confirmation Modal */}
        <AdminConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          description={confirmModal.description}
          actionName={confirmModal.actionName}
          requiredWord={confirmModal.requiredWord}
          targetId={confirmModal.targetId}
          targetType={confirmModal.targetType}
        />
      </div>
    </DashboardLayout>
  );
};
