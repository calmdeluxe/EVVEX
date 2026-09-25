// Shared creation shell for legacy content and EVEX event/ticket modes.
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { VoiceDictationButton } from '../components/VoiceDictationButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Wand2, 
  ChevronLeft, 
  BookOpen, 
  Layout, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Send, 
  RefreshCw, 
  X, 
  ChevronRight, 
  Eye, 
  Settings2, 
  Trash2, 
  Plus, 
  Loader2, 
  ArrowRight, 
  Palette, 
  Image as ImageIcon, 
  Save, 
  Video, 
  FileText,
  DollarSign,
  User,
  ShieldCheck,
  ShieldAlert,
  ShoppingBag,
  Store,
  Ticket,
  Upload,
  ArrowUp,
  ArrowDown,
  Edit3,
  Maximize2,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { generateAiContent } from '../lib/ai';
import { normalizeBookPayload, verifyBooksSchema } from '../lib/schemaGuard';

const CARD_THEMES = [
  { id: 'nebula', name: 'Celestial Spark', font: 'font-serif', gradient: 'radial-gradient(circle at 50% 10%, #7e22ce33 0%, transparent 60%), radial-gradient(circle at 15% 85%, #f59e0b22 0%, transparent 40%)', bg: '#050212' },
  { id: 'aurora', name: 'Emerald Nebula', font: 'font-sans', gradient: 'radial-gradient(circle at 20% 20%, #10b98144 0%, transparent 60%), radial-gradient(circle at 80% 80%, #3b82f633 0%, transparent 60%)', bg: '#01050a' },
  { id: 'eclipse', name: 'Solar Flare', font: 'font-serif', gradient: 'radial-gradient(circle at 50% 50%, #f9731622 0%, transparent 70%), radial-gradient(circle at 20% 80%, #7c2d1244 0%, transparent 50%)', bg: '#0a0502' },
  { id: 'sunset', name: 'Cyber Sunset', font: 'font-serif', gradient: 'radial-gradient(circle at 30% 20%, #ff4e0066 0%, transparent 60%), radial-gradient(circle at 70% 80%, #3a1510dd 0%, transparent 60%)', bg: '#080402' },
  { id: 'neon', name: 'Neon Void', font: 'font-sans', gradient: 'radial-gradient(circle at 20% 30%, #4f46e555 0%, transparent 50%), radial-gradient(circle at 80% 70%, #7e22ce66 0%, transparent 50%)', bg: '#02041a' },
  { id: 'emerald', name: 'Hyper Green', font: 'font-mono', gradient: 'radial-gradient(circle at 40% 10%, #10b98155 0%, transparent 60%), radial-gradient(circle at 60% 90%, #064e3b77 0%, transparent 60%)', bg: '#010804' },
  { id: 'royal', name: 'Royal Velvet', font: 'font-serif', gradient: 'radial-gradient(circle at 10% 40%, #a855f755 0%, transparent 50%), radial-gradient(circle at 90% 60%, #4c1d9577 0%, transparent 50%)', bg: '#080414' },
  { id: 'gold', name: 'Liquid Gold', font: 'font-sans', gradient: 'radial-gradient(circle at 20% 20%, #f59e0b33 0%, transparent 60%), radial-gradient(circle at 80% 80%, #78350f55 0%, transparent 60%)', bg: '#080705' },
];

export const AVAILABLE_FONTS = [
  { id: 'font-lora', name: 'Lora (Serene & Soft)' },
  { id: 'font-merriweather', name: 'Merriweather (Warm & Cozy)' },
  { id: 'font-garamond', name: 'EB Garamond (Classic & Literary)' },
  { id: 'font-spectral', name: 'Spectral (Poetic & Elegant)' },
  { id: 'font-playfair', name: 'Playfair Display (Editorial & Bold)' },
  { id: 'font-grotesk', name: 'Space Grotesk (Modern & Tech)' },
  { id: 'font-sans', name: 'Geist Sans (Minimalist)' },
  { id: 'font-mono', name: 'JetBrains Mono (Technical & Clean)' },
];

export const CreateBook: React.FC = () => {
  const { user, profile, isAdmin, isMpr, isVendor, canCreateEvents, canCreateProducts, accountTier, loading: authLoading, refreshProfile, getOrCreateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: pathId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const id = pathId || searchParams.get('id');
  const [typeState, setTypeState] = useState<string | null>(null);
  
  // Default type: Vendors default to 'product', Admin/MPR default to 'event'
  const routeType = location.pathname === '/create-ticket' ? 'ticket' : location.pathname === '/create-event' ? 'event' : null;
  const requestedType = typeState || searchParams.get('type') || routeType;
  const contentType = requestedType || (isVendor && !isAdmin && !isMpr ? 'product' : 'event');
  const isEventMode = contentType === 'event';
  const isTicketMode = contentType === 'ticket';

  const [activeStep, setActiveStep] = useState<'content' | 'cards' | 'publish'>('content');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [cards, setCards] = useState<any[]>([]);
  const [price, setPrice] = useState('0');
  const [pdfPrice, setPdfPrice] = useState('0');
  const [isFree, setIsFree] = useState(false);
  const [coverImage, setCoverImage] = useState('');
  const [coverPrompt, setCoverPrompt] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(CARD_THEMES[0]);
  const [selectedFont, setSelectedFont] = useState('font-lora');
  const [bookUrl, setBookUrl] = useState('');
  const [authorName, setAuthorName] = useState(profile?.full_name || '');
  const [wordsPerCard, setWordsPerCard] = useState(100);
  const [genreId, setGenreId] = useState('');
  const [genres, setGenres] = useState<any[]>([]);
  const [aiPolishEnabled, setAiPolishEnabled] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfName, setPdfName] = useState('');
  const [videoUploading, setVideoUploading] = useState(false);
  const [tags, setTags] = useState('');
  const [eventId, setEventId] = useState('');
  const [eventOptions, setEventOptions] = useState<any[]>([]);
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [city, setCity] = useState('Lagos');
  const [state, setState] = useState('Lagos State');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [eventCategory, setEventCategory] = useState('other');
  const [capacity, setCapacity] = useState('100');
  const [tierType, setTierType] = useState('standard');
  const [isPatronOnly, setIsPatronOnly] = useState(false);
  const [salesStart, setSalesStart] = useState('');
  const [salesEnd, setSalesEnd] = useState('');

  // Edit vs Review mode separation
  const initialMode = searchParams.get('mode') === 'review' || searchParams.get('step') === 'publish' || searchParams.get('step') === 'review' ? 'review' : 'edit';
  const [viewMode, setViewMode] = useState<'edit' | 'review'>(initialMode);
  const [previewCardIdx, setPreviewCardIdx] = useState(0);
  const [modalImagePreview, setModalImagePreview] = useState<string | null>(null);

  // IPC vs FC Publishing Model States
  const [publishingType, setPublishingType] = useState<'ipc' | 'fc'>('fc');
  const [rightsDeclared, setRightsDeclared] = useState(false);
  const [exclusivityDeclared, setExclusivityDeclared] = useState(false);
  const [mprReferralCode, setMprReferralCode] = useState('');
  const [mprValidation, setMprValidation] = useState<{
    checking: boolean;
    valid: boolean | null;
    partnerName?: string;
    error?: string;
  }>({ checking: false, valid: null });

  // Real-time dynamic word count across draft content and card architecture
  const totalWordCount = useMemo(() => {
    let count = 0;
    if (content && content.trim()) {
      count += content.trim().split(/\s+/).filter(Boolean).length;
    }
    if (cards && cards.length > 0) {
      const cardWords = cards.reduce((acc, c) => {
        const text = [c.title, c.text, c.chapter].filter(Boolean).join(' ');
        return acc + (text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0);
      }, 0);
      count = Math.max(count, cardWords);
    }
    return count;
  }, [content, cards]);

  const handleValidateMprCode = async (codeToTest?: string) => {
    const code = (codeToTest !== undefined ? codeToTest : mprReferralCode).trim();
    if (!code) {
      setMprValidation({ checking: false, valid: null });
      return;
    }
    setMprValidation({ checking: true, valid: null });
    try {
      const authProfile = profile || user;
      const res = await axios.get(
        `/api/mpr/validate-code/${encodeURIComponent(code)}?authorId=${authProfile?.id || ''}&authorEmail=${encodeURIComponent(authProfile?.email || '')}`
      );
      if (res.data.valid) {
        setMprValidation({ checking: false, valid: true, partnerName: res.data.mpr?.full_name || res.data.mpr?.username });
      } else {
        setMprValidation({ checking: false, valid: false, error: res.data.error || 'Invalid MPR code' });
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Validation failed';
      setMprValidation({ checking: false, valid: false, error: msg });
    }
  };

  // Comprehensive session persistence to guarantee zero data loss across page navigation
  const draftStorageKey = `calmreader_full_draft_${id || contentType || 'new'}`;

  // Restore draft state from sessionStorage on initial component mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(draftStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title && !title) setTitle(parsed.title);
        if (parsed.description && !description) setDescription(parsed.description);
        if (parsed.content && !content) setContent(parsed.content);
        if (parsed.cards && Array.isArray(parsed.cards) && parsed.cards.length > 0 && cards.length === 0) setCards(parsed.cards);
        if (parsed.price && price === '0') setPrice(parsed.price);
        if (parsed.pdfPrice && pdfPrice === '0') setPdfPrice(parsed.pdfPrice);
        if (parsed.coverImage && !coverImage) setCoverImage(parsed.coverImage);
        if (parsed.selectedFont) setSelectedFont(parsed.selectedFont);
        if (parsed.authorName && !authorName) setAuthorName(parsed.authorName);
        if (parsed.genreId && !genreId) setGenreId(parsed.genreId);
        if (parsed.activeStep) setActiveStep(parsed.activeStep);
        if (parsed.viewMode) setViewMode(parsed.viewMode);
      }
    } catch (err) {
      console.warn('[CreateBook] Draft restore error:', err);
    }
  }, [id, contentType]);

  // Continuously save state changes to sessionStorage
  useEffect(() => {
    if (title || content || (cards && cards.length > 0)) {
      try {
        const draftData = {
          title,
          description,
          content,
          cards,
          price,
          pdfPrice,
          isFree,
          coverImage,
          selectedFont,
          authorName,
          genreId,
          activeStep,
          viewMode,
          updatedAt: Date.now()
        };
        sessionStorage.setItem(draftStorageKey, JSON.stringify(draftData));
      } catch (e) {
        console.warn('[CreateBook] Draft save error:', e);
      }
    }
  }, [title, description, content, cards, price, pdfPrice, isFree, coverImage, selectedFont, authorName, genreId, activeStep, viewMode, draftStorageKey]);

  // Card Insertion Anywhere & Card Management
  const handleInsertCard = (index: number, position: 'above' | 'below') => {
    const targetIndex = position === 'above' ? index : index + 1;
    const currentChapter = cards[index]?.chapter || (cards.length > 0 ? cards[cards.length - 1]?.chapter : '');
    const newCard = {
      chapter: currentChapter,
      title: 'New Card',
      text: '',
      image_prompt: '',
      image_url: ''
    };
    const updated = [...cards];
    updated.splice(targetIndex, 0, newCard);
    setCards(updated);
  };

  const handleMoveCard = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === cards.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...cards];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setCards(updated);
  };

  const handleRemoveCardImage = (index: number) => {
    const updated = [...cards];
    updated[index].image_url = '';
    setCards(updated);
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('blog-content-textarea') as HTMLTextAreaElement | null;
    if (!textarea) {
      setContent(prev => prev + `${prefix}text${suffix}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end) || 'text';
    const replacement = `${prefix}${selected}${suffix}`;
    const newText = text.substring(0, start) + replacement + text.substring(end);
    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 50);
  };

  const handleBlogSubmit = async (isPublishing = true) => {
    if (!title.trim()) {
      setError('Blog title is required.');
      return;
    }
    if (!content.trim()) {
      setError('Blog post content is required.');
      return;
    }
    const numPrice = parseInt(price) || 0;
    if (!isFree && !isAdmin) {
      if (numPrice < 800) {
        setError('Minimum blog price for authors is ₦800. Please set it to at least ₦800, or toggle Free.');
        return;
      }
    }

    if (isPublishing) setPublishing(true);
    else setSaving(true);
    setError('');
    setMessage('');

    try {
      const userProfile = await getOrCreateProfile();
      let profileId = userProfile?.id || user?.id;
      if (!profileId) {
        throw new Error('You must be signed in to save a blog post.');
      }

      let assignedUserId = profileId;
      if (isAdmin && selectedAuthorId) {
        assignedUserId = selectedAuthorId;
      } else if (id && bookUserId) {
        assignedUserId = bookUserId;
      }

      const { hasPdfPrice, hasCoverImage } = await verifyBooksSchema();

      const blogCards = [{
        title: title.trim(),
        text: content.trim(),
        excerpt: description.trim() || content.trim().slice(0, 200),
        tags: tags.trim(),
        type: 'blog_post'
      }];

      const rawData = {
        title: title.trim(),
        description: description.trim() || content.trim().slice(0, 200),
        cards_json: blogCards,
        book_url: null,
        price: isFree ? 0 : numPrice,
        pdf_price: 0,
        is_published: isPublishing ? (isAdmin ? 1 : 0) : 0, 
        status: isPublishing ? (isAdmin ? 1 : 2) : 0,
        public_slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Math.random().toString(36).slice(2, 7) + '-blog',
        cover_image: coverImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=2000',
        admin_note: `type:blog,author:${authorName || profile?.full_name || 'Verified Author'}${tags ? `,tags:${tags}` : ''}${genreId ? `,genre:${genreId}` : ''}`,
        user_id: assignedUserId,
        genre_id: genreId || null
      };

      const bookData = normalizeBookPayload(rawData, { hasPdfPrice, hasCoverImage });

      if (id) {
        const { error: updateError } = await supabase.from('books').update(bookData).eq('id', id);
        if (updateError) throw updateError;
      } else {
        const { error: saveError } = await supabase.from('books').insert(bookData);
        if (saveError) throw saveError;
      }

      if (isPublishing) {
        setPublished(true);
        setMessage(isAdmin ? 'Blog Post Published Successfully!' : 'Blog Submitted for Admin Review!');
      } else {
        setMessage('Blog Draft Saved Successfully!');
      }

      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: any) {
      console.error('Blog Submit Error:', err);
      setError(`Failed to save blog post: ${err.message}`);
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const handleProductSubmit = async (isPublishing = true) => {
    if (!title.trim()) {
      setError('Product title is required.');
      return;
    }
    const numPrice = parseInt(price) || 0;

    if (isPublishing) setPublishing(true);
    else setSaving(true);
    setError('');
    setMessage('');

    try {
      const userProfile = await getOrCreateProfile();
      let profileId = userProfile?.id || user?.id;
      if (!profileId) {
        throw new Error('You must be signed in to save a product.');
      }

      let assignedUserId = profileId;
      if (isAdmin && selectedAuthorId) {
        assignedUserId = selectedAuthorId;
      } else if (id && bookUserId) {
        assignedUserId = bookUserId;
      }

      const { hasPdfPrice, hasCoverImage } = await verifyBooksSchema();

      const productCards = [{
        title: title.trim(),
        text: description.trim() || 'Vendor Shop Product',
        type: 'product_listing'
      }];

      const rawData = {
        title: title.trim(),
        description: description.trim() || 'Vendor Shop Product',
        cards_json: productCards,
        book_url: null,
        price: isFree ? 0 : numPrice,
        pdf_price: 0,
        is_published: isPublishing ? 1 : 0, 
        status: isPublishing ? 1 : 0,
        public_slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Math.random().toString(36).slice(2, 7) + '-product',
        cover_image: coverImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2000',
        admin_note: `type:product,vendor:${authorName || profile?.full_name || 'Verified Vendor'}${genreId ? `,genre:${genreId}` : ''}`,
        user_id: assignedUserId,
        genre_id: genreId || null
      };

      const bookData = normalizeBookPayload(rawData, { hasPdfPrice, hasCoverImage });

      if (id) {
        const { error: updateError } = await supabase.from('books').update(bookData).eq('id', id);
        if (updateError) throw updateError;
      } else {
        const { error: saveError } = await supabase.from('books').insert(bookData);
        if (saveError) throw saveError;
      }

      if (isPublishing) {
        setPublished(true);
        setMessage('Product Published to Vendor Shop Successfully!');
      } else {
        setMessage('Product Draft Saved Successfully!');
      }

      setTimeout(() => navigate('/my-books'), 1500);
    } catch (err: any) {
      console.error('Product Submit Error:', err);
      setError(`Failed to save product: ${err.message}`);
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const handleVideoSubmit = async (isPublishing = true) => {
    if (!title.trim()) {
      setError('Video title is required.');
      return;
    }
    if (!bookUrl.trim()) {
      setError('Please provide a Video URL or upload a video file.');
      return;
    }
    const numPrice = parseInt(price) || 0;
    if (!isFree && !isAdmin) {
      if (numPrice < 800) {
        setError('Minimum video price for authors is ₦800. Please set it to at least ₦800, or toggle Free.');
        return;
      }
    }

    if (isPublishing) setPublishing(true);
    else setSaving(true);
    setError('');
    setMessage('');

    try {
      const userProfile = await getOrCreateProfile();
      let profileId = userProfile?.id || user?.id;
      if (!profileId) {
        throw new Error('You must be signed in to save a video.');
      }

      let assignedUserId = profileId;
      if (isAdmin && selectedAuthorId) {
        assignedUserId = selectedAuthorId;
      } else if (id && bookUserId) {
        assignedUserId = bookUserId;
      }

      const { hasPdfPrice, hasCoverImage } = await verifyBooksSchema();

      const videoCards = [{
        title: title.trim(),
        text: description.trim() || 'Video presentation',
        video_url: bookUrl.trim(),
        type: 'video_post'
      }];

      const rawData = {
        title: title.trim(),
        description: description.trim() || 'Video presentation',
        cards_json: videoCards,
        book_url: bookUrl.trim(),
        price: isFree ? 0 : numPrice,
        pdf_price: 0,
        is_published: isPublishing ? (isAdmin ? 1 : 0) : 0, 
        status: isPublishing ? (isAdmin ? 1 : 2) : 0,
        public_slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Math.random().toString(36).slice(2, 7) + '-video',
        cover_image: coverImage || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=2000',
        admin_note: `type:video,author:${authorName || profile?.full_name || 'Verified Author'},video_url:${bookUrl.trim()}${genreId ? `,genre:${genreId}` : ''}`,
        user_id: assignedUserId,
        genre_id: genreId || null
      };

      const bookData = normalizeBookPayload(rawData, { hasPdfPrice, hasCoverImage });

      if (id) {
        const { error: updateError } = await supabase.from('books').update(bookData).eq('id', id);
        if (updateError) throw updateError;
      } else {
        const { error: saveError } = await supabase.from('books').insert(bookData);
        if (saveError) throw saveError;
      }

      if (isPublishing) {
        setPublished(true);
        setMessage(isAdmin ? 'Video Published Successfully!' : 'Video Submitted for Admin Review!');
      } else {
        setMessage('Video Draft Saved Successfully!');
      }

      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: any) {
      console.error('Video Submit Error:', err);
      setError(`Failed to save video: ${err.message}`);
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoUploading(true);
    setError('');
    try {
      const fileExt = file.name.split('.').pop() || 'mp4';
      const fileName = `videos/${Math.random()}.${fileExt}`;

      let finalUrl = '';
      let { error: uploadError } = await supabase.storage.from('media').upload(fileName, file);

      if (uploadError && (uploadError.message?.toLowerCase().includes('bucket') || (uploadError as any).status === 404)) {
        try {
          await supabase.storage.createBucket('media', { public: true });
          const retryRes = await supabase.storage.from('media').upload(fileName, file);
          uploadError = retryRes.error;
        } catch (createErr) {
          console.error("[Storage] Failed to auto-create media bucket:", createErr);
        }
      }

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
        finalUrl = publicUrl;
      } else {
        finalUrl = URL.createObjectURL(file);
      }

      setBookUrl(finalUrl);
      setMessage(`Video file "${file.name}" attached successfully!`);
    } catch (err) {
      console.error('Video upload error:', err);
      setError('Failed to upload video file. Please check file format.');
    } finally {
      setVideoUploading(false);
    }
  };
  
  // Admin Compliance states
  const [bookStatus, setBookStatus] = useState<any>(null);
  const [bookUserId, setBookUserId] = useState<string | null>(null);
  const [reviewAdminNote, setReviewAdminNote] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);
  const [authorsList, setAuthorsList] = useState<any[]>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>('');
  
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [published, setPublished] = useState(false);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const { data } = await axios.get('/api/genres');
        if (data && data.genres) {
          setGenres(data.genres);
        }
      } catch (err) {
        console.error("Failed to fetch genres:", err);
      }
    };
    fetchGenres();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      const fetchAuthors = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
          const res = await axios.get('/api/admin/authors', headers);
          if (res.data?.authors) {
            setAuthorsList(res.data.authors);
          }
        } catch (e) {
          const { data } = await supabase.from('users').select('id, email, full_name, username, account_tier').order('full_name', { ascending: true });
          if (data) setAuthorsList(data);
        }
      };
      fetchAuthors();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (id) {
      const fetchBook = async () => {
        let data: any = null;
        try {
          const { data: sbData, error: sbError } = await supabase.from('books').select('*').eq('id', id).single();
          if (sbData) {
            data = sbData;
          }
        } catch (e) {
          console.warn("Client Supabase fetch failed or restricted by RLS:", e);
        }

        if (!data) {
          try {
            const apiRes = await axios.get(`/api/admin/books/${id}`);
            if (apiRes.data && apiRes.data.book) {
              data = apiRes.data.book;
            }
          } catch (apiErr) {
            console.error("Admin API fetch error for book:", apiErr);
          }
        }

        if (data) {
          setTitle(data.title || '');
          setDescription(data.description || '');
          setContent(data.content || '');
          setPrice(String(data.price || 0));
          setPdfPrice(String(data.pdf_price || 0));
          setIsFree((parseInt(data.price) || 0) === 0);
          setCoverImage(data.cover_image || '');
          setBookUrl(data.book_url || '');
          
          setBookStatus(data.status);
          setBookUserId(data.user_id || null);
          if (data.user_id) {
            setSelectedAuthorId(data.user_id);
          }
          setReviewAdminNote(data.admin_note || '');

          if (data.admin_note) {
            if (data.admin_note.includes('type:blog')) {
              setTypeState('blog');
            } else if (data.admin_note.includes('type:video')) {
              setTypeState('video');
            } else {
              setTypeState('ebook');
            }

            const authorMatch = data.admin_note.match(/author:([^,]+)/);
            if (authorMatch) setAuthorName(authorMatch[1]);
            
            const themeMatch = data.admin_note.match(/theme:([a-z]+)/);
            if (themeMatch) {
              const theme = CARD_THEMES.find(t => t.id === themeMatch[1]);
              if (theme) setSelectedTheme(theme);
            }

            const fontMatch = data.admin_note.match(/font:([a-zA-Z0-9-]+)/);
            if (fontMatch) {
              setSelectedFont(fontMatch[1]);
            }
          }

          if (data.genre_id) {
            setGenreId(String(data.genre_id));
          } else if (data.admin_note && data.admin_note.includes('genre:')) {
            const genreMatch = data.admin_note.match(/genre:([^,]+)/);
            if (genreMatch) setGenreId(genreMatch[1]);
          }

          // Load IPC vs FC Publishing Model details
          if (data.content_type) {
            setPublishingType(data.content_type.toLowerCase() === 'ipc' ? 'ipc' : 'fc');
          } else if (data.admin_note && data.admin_note.includes('content_type:ipc')) {
            setPublishingType('ipc');
          }
          if (data.rights_declared !== undefined) setRightsDeclared(!!data.rights_declared);
          if (data.exclusivity_declared !== undefined) setExclusivityDeclared(!!data.exclusivity_declared);
          if (data.mpr_referral_code) {
            setMprReferralCode(data.mpr_referral_code);
            handleValidateMprCode(data.mpr_referral_code);
          }
          
          let normalized = [];
          if (typeof data.cards_json === 'string') {
            try { normalized = JSON.parse(data.cards_json); } catch (e) { normalized = []; }
          } else {
            normalized = data.cards_json || [];
          }

          // If cards are empty but content exists, auto-split content into cards for a rich review/read state
          if ((!normalized || normalized.length === 0) && data.content) {
            normalized = chunkTextVerbatim(data.content, 100);
          }
          setCards(normalized);

          if (normalized.length > 0 || data.content) {
            setActiveStep('cards');
          }
        }
      };
      fetchBook();
    }
  }, [id]);

  // Detects chapter-like headers
  function isChapterHeader(line: string): { isHeader: boolean; title: string } {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 100) return { isHeader: false, title: "" };

    // 1. Markdown heading: e.g. # Chapter 1
    const mdMatch = trimmed.match(/^#+\s+(.+)$/);
    if (mdMatch) {
      return { isHeader: true, title: mdMatch[1].trim() };
    }

    // 2. Markdown bold heading: e.g. **Chapter 1**
    const boldMatch = trimmed.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      const inner = boldMatch[1].trim();
      if (inner.length < 80) {
        return { isHeader: true, title: inner };
      }
    }

    // 3. Patterns like "Chapter 1", "Chapter One", "CHAPTER 1", "Chap 3", "Part II", "Section A", "Chap. 4"
    const chapterRegex = /^(?:chapter|chap\.|part|section|chap)\s*(\d+|[ivxldcm]+|one|two|three|four|five|six|seven|eight|nine|ten)?[:.\s-]*(.*)/i;
    const chapMatch = trimmed.match(chapterRegex);
    if (chapMatch) {
      const num = chapMatch[1];
      const rest = chapMatch[2]?.trim();
      const lower = trimmed.toLowerCase();
      if (lower.startsWith('chapter') || lower.startsWith('chap') || lower.startsWith('part') || lower.startsWith('section')) {
        if (num || rest || trimmed.length < 50) {
          return { isHeader: true, title: trimmed };
        }
      }
    }

    // 4. Numbered sections / Roman numerals: e.g. "1. THE ESCAPE", "I. The Journey", "1 - The Escape", "I - The Encounter"
    if (/^(?:[ivxldcm]+|\d+)[:.\s-]+\s*[A-Za-z]/i.test(trimmed) && trimmed.length < 60) {
      return { isHeader: true, title: trimmed };
    }

    // 5. Plain Roman numerals only: e.g. "I", "II", "III"
    if (/^[ivxldcm]+$/i.test(trimmed) && trimmed.length <= 10) {
      return { isHeader: true, title: `Chapter ${trimmed.toUpperCase()}` };
    }

    return { isHeader: false, title: "" };
  }

  function normalizeChapterTitle(rawTitle: string, index: number) {
    const trimmed = (rawTitle || "").trim();
    if (!trimmed) {
      return `Chapter ${index}`;
    }
    let cleaned = trimmed.replace(/^[#*\s]+/, '').replace(/[#*\s]+$/, '').trim();
    
    // If it already starts with "Chapter [Number]:", keep it or clean it
    const chapWithNumRegex = /^(?:chapter|chap\.|part|section|chap)\s*(\d+|[ivxldcm]+|one|two|three|four|five|six|seven|eight|nine|ten)?[:.\s-]*(.*)/i;
    const match = cleaned.match(chapWithNumRegex);
    if (match) {
      const num = match[1] || index;
      const rest = match[2]?.trim();
      if (rest) {
        return `Chapter ${num}: ${rest}`;
      } else {
        return `Chapter ${num}`;
      }
    }

    // If it is a Roman numeral followed by text: "I. THE ENCOUNTER"
    const romanMatch = cleaned.match(/^([ivxldcm]+)[:.\s-]+\s*(.+)$/i);
    if (romanMatch) {
      return `Chapter ${romanMatch[1].toUpperCase()}: ${romanMatch[2]}`;
    }

    // If it is a number followed by text: "1. The Escape"
    const numMatch = cleaned.match(/^(\d+)[:.\s-]+\s*(.+)$/i);
    if (numMatch) {
      return `Chapter ${numMatch[1]}: ${numMatch[2]}`;
    }

    return `Chapter ${index}: ${cleaned}`;
  }

  function chunkTextVerbatim(text: string, targetWords: number) {
    interface ChapterGroup {
      title: string;
      lines: string[];
    }
    
    // Scan lines to extract and clean chapter headers
    const inputLines = text.split(/\r?\n/);
    const chapters: ChapterGroup[] = [];
    let currentChapter: ChapterGroup | null = null;
    let fallbackChapterNum = 1;

    for (const line of inputLines) {
      const trimmedLine = line.trim();
      const { isHeader, title: headerTitle } = isChapterHeader(trimmedLine);

      if (isHeader) {
        if (currentChapter) {
          chapters.push(currentChapter);
        }
        currentChapter = {
          title: headerTitle,
          lines: []
        };
      } else {
        if (!currentChapter) {
          currentChapter = {
            title: "", // Treat as fallback/unnamed initially, normalized to Chapter 1 later
            lines: []
          };
        }
        currentChapter.lines.push(line);
      }
    }

    if (currentChapter) {
      chapters.push(currentChapter);
    }

    // Now, process each chapter and split into cards of targetWords max words
    const finalCards: any[] = [];
    let chapIndex = 1;

    for (const chap of chapters) {
      const formattedTitle = normalizeChapterTitle(chap.title, chapIndex);
      chapIndex++;

      const chapChunks: string[] = [];
      let cardLines: string[] = [];
      let currentWordCount = 0;

      for (const line of chap.lines) {
        const trimmed = line.trim();
        const wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;

        // If adding this line exceeds target words and we already have some text
        if (currentWordCount + wordCount > targetWords && cardLines.length > 0) {
          chapChunks.push(cardLines.join("\n"));
          cardLines = [];
          currentWordCount = 0;
        }

        if (wordCount > targetWords) {
          // If a single line itself is longer than targetWords, we split it
          const words = trimmed.split(/\s+/).filter(Boolean);
          let i = 0;
          while (i < words.length) {
            const slice = words.slice(i, i + targetWords);
            chapChunks.push(slice.join(" "));
            i += targetWords;
          }
        } else {
          cardLines.push(line);
          currentWordCount += wordCount;
        }
      }

      if (cardLines.length > 0) {
        chapChunks.push(cardLines.join("\n"));
      }

      // Convert chapChunks into cards
      chapChunks.forEach((chunkText, index) => {
        // Double check no headers are left in the text
        const finalChunkLines = chunkText.split(/\r?\n/)
          .filter(l => !isChapterHeader(l).isHeader);
        const finalChunkText = finalChunkLines.join("\n").trim();

        if (finalChunkText) {
          finalCards.push({
            chapter: index === 0 ? formattedTitle : "",
            title: index === 0 ? formattedTitle : "", // Only the first card displays the title
            text: finalChunkText,
            image_prompt: `A beautiful minimalist conceptual background illustrating Chapter: ${formattedTitle}`,
            image_url: ''
          });
        }
      });
    }

    if (finalCards.length === 0) {
      const cleanFallbackText = text.split(/\r?\n/)
        .filter(l => !isChapterHeader(l).isHeader)
        .join("\n")
        .trim();
      return [{
        chapter: "Chapter 1",
        title: "Chapter 1",
        text: cleanFallbackText || text,
        image_prompt: "A beautiful minimalist conceptual background",
        image_url: ''
      }];
    }

    return finalCards;
  };

  const enforceChapterTitleStructure = (cardsList: any[]) => {
    if (!cardsList || cardsList.length === 0) return [];
    
    const processed: any[] = [];
    let lastChapterLower = "";
    let currentChapterDisplay = "";
    
    cardsList.forEach((card) => {
      const rawChapter = (card.chapter || card.title || "").trim().toUpperCase();
      const rawChapterLower = rawChapter.toLowerCase();
      
      // Filter out any embedded chapter headings from card text to ensure no duplicates
      const cleanCardText = (card.text || "").split(/\r?\n/)
        .filter((l: string) => !isChapterHeader(l).isHeader)
        .join("\n")
        .trim();
      
      if (rawChapter && rawChapterLower !== lastChapterLower) {
        // New chapter detected!
        lastChapterLower = rawChapterLower;
        currentChapterDisplay = rawChapter;
        processed.push({
          ...card,
          chapter: currentChapterDisplay,
          title: currentChapterDisplay, // Set title to match Chapter Title clearly in UPPERCASE
          text: cleanCardText,
        });
      } else {
        // Subsequent card of the same chapter
        processed.push({
          ...card,
          chapter: currentChapterDisplay || "",
          title: "", // Clear titles for subsequent cards of the chapter
          text: cleanCardText,
        });
      }
    });
    
    return processed;
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setError('Please select a valid PDF file.');
      return;
    }

    setPdfUploading(true);
    setPdfName(file.name);
    setError('');
    try {
      // @ts-ignore
      const pdfjsLib = await import('pdfjs-dist');
      // Set worker matching installed pdfjs-dist version dynamically
      const pdfjsVersion = pdfjsLib.version || '6.0.227';
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }

      const extractedText = fullText.trim();
      if (extractedText && extractedText.length >= 50) {
        setContent(extractedText);
        // Automatically suggest title if empty
        const suggestedTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, ' ');
        const activeTitle = title.trim() || suggestedTitle;
        if (!title.trim()) {
          setTitle(suggestedTitle);
        }

        // Generate cards automatically from extracted PDF text
        let generatedCards: any[] = [];
        if (aiPolishEnabled) {
          try {
            const { data } = await generateAiContent(
              `Process the following content into a high-quality swipeable card-book format.
              Structure the content logically into several engaging cards. 
              Each card should be about ${wordsPerCard} words long.
              
              CONTENT:
              ${extractedText}`,
              {
                responseMimeType: "application/json",
                systemInstruction: `You are a world-class content architect. Your goal is to break down long-form content into highly engaging, bite-sized "cards" for an interactive reading app.`
              }
            );

            if (data?.cards && data.cards.length > 0) {
              const formattedCards = enforceChapterTitleStructure(data.cards);
              generatedCards = formattedCards.map((c: any) => ({ ...c, image_url: '' }));
              if (data.cover_prompt) setCoverPrompt(data.cover_prompt);
            }
          } catch (aiErr) {
            console.warn('[PDF Upload] AI generation failed, using verbatim chunking fallback:', aiErr);
          }
        }

        if (!generatedCards || generatedCards.length === 0) {
          generatedCards = chunkTextVerbatim(extractedText, wordsPerCard);
        }

        if (generatedCards && generatedCards.length > 0) {
          setCards(generatedCards);
          setCoverPrompt(`A highly descriptive minimalist book cover illustration for "${activeTitle}"`);
          setActiveStep('cards');
          setMessage(`Successfully extracted text from PDF "${file.name}" and generated ${generatedCards.length} cards! Review and edit your cards below.`);
        } else {
          setError('This PDF appears to be image-based or empty. Please try uploading a text-based PDF, or paste your content directly.');
        }
      } else {
        setError('This PDF appears to be image-based or empty. Please try uploading a text-based PDF, or paste your content directly.');
      }
    } catch (err: any) {
      console.error('PDF extraction failed:', err);
      setError('This PDF appears to be image-based or empty. Please try uploading a text-based PDF, or paste your content directly.');
    } finally {
      setPdfUploading(false);
    }
  };

  const handleAiPolish = async () => {
    if (!content.trim()) return;
    setGenerating(true);
    setGenStep('AI Polishing Content...');
    try {
      setGenerating(true);
      setGenStep('AI Polishing Content...');
      
      const { text: polished } = await generateAiContent(
        `Review and polish the following ${contentType || 'text'} content. Improve flow, grammar, and engagement while keeping the original meaning and length similar.
        
        CONTENT:
        ${content}`,
        {
          systemInstruction: "You are a professional editor. Deliver only the polished text."
        }
      );
      
      if (polished) {
        setContent(polished);
        setMessage('Content Polished by AI!');
      }
    } catch (err: any) {
      console.error('AI Polish Error:', err);
      setError(err.message || 'AI Polishing failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (contentType !== 'video' && !content.trim()) {
      setError('Content is required.');
      return;
    }
    if (contentType === 'video' && !bookUrl.trim() && !content.trim()) {
      setError('Please provide a Video URL or upload a video file.');
      return;
    }

    setGenerating(true);
    setGenStep('Architecting Cards...');
    setError('');
    try {
      // Check for duplicate title
      const { data: existing } = await supabase
        .from('books')
        .select('id')
        .eq('user_id', profile?.id)
        .eq('title', title.trim())
        .neq('status', -1)
        .maybeSingle();
      
      if (existing && !id) {
         setError('Content with this title already exists in your library.');
         setGenerating(false);
         return;
      }

      let generatedCards: any[] = [];

      if (!aiPolishEnabled || contentType === 'video') {
        setGenStep('Structuring cards...');
        if (content.trim()) {
          generatedCards = chunkTextVerbatim(content, wordsPerCard);
        }
      } else {
        setGenStep('AI Generating Cards...');
        const { data } = await generateAiContent(
          `Process the following content into a high-quality swipeable card-book format.
          Structure the content logically into several engaging cards. 
          Each card should be about ${wordsPerCard} words long.
          Each card should be a complete thought or section of the story/knowledge.
          
          CONTENT:
          ${content}`,
          {
            responseMimeType: "application/json",
            systemInstruction: `You are a world-class content architect. Your goal is to break down long-form content into highly engaging, bite-sized "cards" for an interactive reading app.
            
            Return a JSON object with:
            {
              "cover_prompt": "highly descriptive prompt for an AI image generator for the cover image",
              "cards": [
                {
                  "chapter": "Chapter Title (e.g. Chapter 1: The Beginning)",
                  "title": "Chapter Title (e.g. Chapter 1: The Beginning)",
                  "text": "bite-sized, engaging content (approx ${wordsPerCard} words)",
                  "image_prompt": "descriptive prompt for an AI image generator for this specific card's background image"
                }
              ]
            }
            
            CRITICAL FORMATTING RULES FOR "text" FIELD IN CARDS:
            1. Preserve original paragraphs exactly as written, separating paragraphs by at least one blank line (using \n\n).
            2. Preserve original dialogue formatting with proper line breaks: put each speaker's lines/dialogue on a new line (using \n).
            3. DO NOT remove, flatten, or merge any original line breaks or formatting into one continuous block. Keep the reading flow breathable, natural, and formatted.
            4. Do not omit dialogue quotes or speaker turn breaks.

            CRITICAL CHAPTER STRUCTURE RULES:
            1. Group cards logically into chapters.
            2. The very first card of each chapter MUST have the "chapter" and "title" fields set to "Chapter [Number]: [Chapter Title]".
            3. All following cards in that chapter MUST have "chapter" and "title" set to an empty string "". Only the first card of each chapter displays a title. Keep the flow smooth.`
          }
        );

        if (data?.cards && data.cards.length > 0) {
          generatedCards = data.cards;
          if (data.cover_prompt) setCoverPrompt(data.cover_prompt);
        }
      }

      if (contentType === 'video' && bookUrl) {
        const videoCard = {
          chapter: 'Video Presentation',
          title: title.trim(),
          text: content.trim() || 'Watch the featured video below.',
          video_url: bookUrl,
          image_url: ''
        };
        generatedCards = [videoCard, ...generatedCards];
      }

      if (!generatedCards || generatedCards.length === 0) {
        generatedCards = [{ chapter: '', title: title.trim(), text: content.trim() || 'Content preview', image_url: '' }];
      }

      const formattedCards = contentType === 'ebook' ? enforceChapterTitleStructure(generatedCards) : generatedCards;
      const enhancedCards = formattedCards.map((c: any) => ({ ...c, image_url: c.image_url || '' }));
      setCards(enhancedCards);
      if (!coverPrompt) {
        setCoverPrompt(`A minimalist cover illustration for "${title}"`);
      }
      setActiveStep('cards');
      setMessage(`Generated ${enhancedCards.length} section card(s)! Preview and edit below.`);
    } catch (err: any) {
      console.error('Generation Error:', err);
      setError(err.message || 'Failed to generate cards. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (isPublishing = false) => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    if (contentType === 'ebook' && cards.length === 0) {
      setError('Wait for AI to generate cards or add one manually.');
      return;
    }

    const numPrice = parseInt(price) || 0;
    const numPdfPrice = parseInt(pdfPrice) || 0;
    if (!isAdmin) {
      if (numPrice > 0 && numPrice < 800) {
        setError('Minimum eBook price for authors is ₦800. Please set it to at least ₦800, or 0 for free.');
        return;
      }
      if (numPdfPrice > 0 && numPdfPrice < 800) {
        setError('Minimum PDF price for authors is ₦800. Please set it to at least ₦800, or 0 for free.');
        return;
      }
    }

    // IPC vs FC Validation Rules for Launching
    if (isPublishing && contentType === 'ebook') {
      if (publishingType === 'ipc') {
        if (totalWordCount < 30000 && !isAdmin) {
          setError(
            `IPC (Independent Premium Content) requires at least 30,000 words. Your current draft has ${totalWordCount.toLocaleString()} words. You can publish as Free Content (FC) with 30% royalties + 20% MPR viral distribution, and apply to upgrade to IPC once your book reaches 100 sales.`
          );
          return;
        }
        if (!rightsDeclared) {
          setError('You must declare 100% legal copyright ownership of this work to publish as IPC.');
          return;
        }
        if (!exclusivityDeclared) {
          setError('You must agree to the 12-month platform exclusivity agreement to publish as IPC.');
          return;
        }
      }

      if (mprReferralCode && mprValidation.valid === false) {
        setError(`Please correct or remove the invalid MPR referral code before launching: ${mprValidation.error}`);
        return;
      }
    }

    if (isPublishing) setPublishing(true);
    else setSaving(true);
    setError('');

    try {
      const userProfile = await getOrCreateProfile();
      let profileId = userProfile?.id || user?.id;

      if (!profileId) {
        throw new Error('You must be signed in to save a book.');
      }

      let assignedUserId = profileId;
      if (isAdmin && selectedAuthorId) {
        assignedUserId = selectedAuthorId;
      } else if (id && bookUserId) {
        assignedUserId = bookUserId;
      }

      const { ok, problems, hasPdfPrice, hasCoverImage, hasContentType } = await verifyBooksSchema();

      const finalCardsList = contentType === 'ebook' ? enforceChapterTitleStructure(cards) : cards;
      if (cards.length > 0) {
        setCards(finalCardsList);
      }

      const isIpc = publishingType === 'ipc';
      const rawData = {
        title: title.trim(),
        description: description || content.slice(0, 200),
        cards_json: finalCardsList.length > 0 ? finalCardsList : [{ text: content, type: 'full_content' }],
        book_url: contentType === 'video' ? bookUrl : null,
        price: parseInt(price) || 0,
        pdf_price: parseInt(pdfPrice) || 0,
        is_published: isPublishing ? (isAdmin ? 1 : 0) : 0, 
        status: isPublishing ? (isAdmin ? 1 : 2) : 0,
        public_slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Math.random().toString(36).slice(2, 7) + (contentType !== 'ebook' ? `-${contentType}` : ''),
        cover_image: coverImage || `https://images.unsplash.com/photo-1543003919-a9957004bfa0?q=80&w=2000`,
        admin_note: `theme:${selectedTheme.id},font:${selectedFont},type:${contentType},content_type:${publishingType},word_count:${totalWordCount},author:${authorName || profile?.full_name || 'Verified Author'},cover_prompt:${coverPrompt},cards_count:${cards.length || 1}${genreId ? `,genre:${genreId}` : ''}`,
        user_id: assignedUserId,
        genre_id: genreId || null,
        content_type: publishingType,
        word_count: totalWordCount,
        mpr_referral_code: mprReferralCode ? mprReferralCode.trim() : null,
        author_share: isIpc ? 70 : 30,
        platform_share: isIpc ? 30 : 50,
        mpr_share: isIpc ? 0 : 20,
        publishing_lane: isIpc ? 'lane_b' : 'lane_a',
        trivia_rights_granted: !isIpc,
        rights_declared: rightsDeclared,
        exclusivity_declared: exclusivityDeclared,
        exclusivity_expires_at: isIpc ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null,
      };

      const bookData = normalizeBookPayload(rawData, { hasPdfPrice, hasCoverImage, hasContentType });

      let savedBookId = id;
      if (id) {
        const { error: updateError } = await supabase.from('books').update(bookData).eq('id', id);
        if (updateError) throw updateError;
      } else {
        const { data: inserted, error: saveError } = await supabase
          .from('books')
          .insert(bookData)
          .select('id')
          .single();
        
        if (saveError) {
          const { error: fallbackError } = await supabase.from('books').insert(bookData);
          if (fallbackError) throw fallbackError;
        } else if (inserted) {
          savedBookId = inserted.id;
        }
      }
      
      if (isPublishing) {
        setPublished(true);
        setMessage(isAdmin ? 'Event / Ticket Published Successfully!' : 'Event / Ticket Submitted for Admin Review & Approval!');
      } else {
        setMessage('Draft Saved Successfully!');
      }
      
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      console.error('Save Error:', err);
      setError(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };
  
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

  const handleFileUpload = async (index: number | 'cover', e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0];
    if (!originalFile) return;

    if (index === 'cover') setSaving(true);
    else {
      const newCards = [...cards];
      newCards[index].is_uploading = true;
      setCards(newCards);
    }

    try {
      // Compress and resize image
      console.log(`Original file size: ${Math.round(originalFile.size / 1024)} KB`);
      const compressedBlob = await compressImage(originalFile, 400);
      const file = new File([compressedBlob], originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) + '.jpg', { type: 'image/jpeg' });
      console.log(`Compressed file size: ${Math.round(file.size / 1024)} KB`);

      const fileExt = 'jpg';
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `books/${fileName}`;

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

      if (index === 'cover') {
        setCoverImage(finalUrl);
        setMessage('Cover image uploaded successfully (resilient mode)!');
      } else {
        const newCards = [...cards];
        newCards[index].image_url = finalUrl;
        newCards[index].is_uploading = false;
        setCards(newCards);
      }
    } catch (err) {
      console.error('Upload Error:', err);
      setError('Failed to process image upload.');
    } finally {
      if (index === 'cover') {
        setSaving(false);
      } else {
        const newCards = [...cards];
        newCards[index].is_uploading = false;
        setCards(newCards);
      }
    }
  };

  const [deletingBook, setDeletingBook] = useState(false);

  const handleAdminDeleteBook = async () => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this eBook submission? This action cannot be undone.")) return;

    setDeletingBook(true);
    setError('');
    setMessage('');
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      let deleted = false;

      try {
        const res = await axios.delete(`/api/books/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.data?.success) deleted = true;
      } catch (apiErr) {
        console.warn("[handleAdminDeleteBook] API delete failed, using direct DB fallback:", apiErr);
      }

      if (!deleted) {
        const { error: sbErr } = await supabase.from('books').update({ status: -1, is_published: 0 }).eq('id', id);
        if (!sbErr) {
          deleted = true;
          try { await supabase.from('books').delete().eq('id', id); } catch (e) {}
        } else {
          throw sbErr;
        }
      }

      if (deleted) {
        setMessage("eBook deleted successfully.");
        setTimeout(() => {
          navigate('/admin');
        }, 1200);
      } else {
        setError("Failed to delete eBook.");
      }
    } catch (err: any) {
      console.error("Delete book error:", err);
      setError(err.response?.data?.error || err.message || "Failed to delete eBook.");
    } finally {
      setDeletingBook(false);
    }
  };

  const handleAdminReview = async (action: 'approve' | 'reject') => {
    if (!id) return;
    setReviewSubmitting(true);
    setError('');
    setMessage('');
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      let success = false;

      try {
        const response = await axios.post('/api/admin/books/review', {
          bookId: id,
          action,
          admin_note: reviewAdminNote
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (response.data?.success) {
          success = true;
        }
      } catch (apiErr) {
        console.warn("[handleAdminReview] API review failed, using direct Supabase fallback...", apiErr);
      }

      // Direct Supabase fallback to guarantee status update
      const statusValue = action === 'approve' ? 1 : 3;
      const isPublished = action === 'approve' ? 1 : 0;
      const { error: sbError } = await supabase
        .from('books')
        .update({
          status: statusValue,
          is_published: isPublished,
          admin_note: reviewAdminNote || null
        })
        .eq('id', id);

      if (!sbError) {
        success = true;
      }

      if (success) {
        setBookStatus(statusValue);
        setMessage(action === 'approve' ? 'eBook Approved and Published Successfully! 🚀' : 'eBook Submission Declined Successfully.');
        setTimeout(() => {
          navigate('/admin');
        }, 1500);
      } else {
        setError('Failed to update compliance review.');
      }
    } catch (err: any) {
      console.error("Compliance review error:", err);
      setError(err.response?.data?.error || err.message || 'Failed to submit review decision.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-container max-w-5xl mx-auto space-y-6 pb-20">
        
        {/* Admin Compliance & Decision Panel */}
        {isAdmin && id && (
          <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/50 via-indigo-50 to-white/80 rounded-[2rem] overflow-hidden shadow-lg border-2">
            <CardHeader className="bg-indigo-900 text-white p-8">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-indigo-800 text-indigo-200 border-indigo-700/50 mb-2 uppercase font-black tracking-widest text-[10px]">
                    ADMIN CONTROL CENTER
                  </Badge>
                  <CardTitle className="text-2xl font-black">Book Compliance Review</CardTitle>
                  <CardDescription className="text-indigo-200 text-xs font-semibold mt-1">
                    Direct live publisher mode. You can read, modify, and force publish or reject this book.
                  </CardDescription>
                </div>
                <ShieldCheck className="w-12 h-12 text-indigo-200 opacity-80" />
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/60 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 font-extrabold text-xs uppercase tracking-wider">Current Book Status:</span>
                  <Badge className={`font-black uppercase text-[11px] tracking-wider py-1 px-3 ${
                    bookStatus === 3 || bookStatus === 1 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                    bookStatus === 5 ? 'bg-red-100 text-red-800 border-red-200' :
                    'bg-amber-100 text-amber-800 border-amber-200 animate-pulse'
                  }`}>
                    {bookStatus === 3 || bookStatus === 1 ? 'Approved & Published' :
                     bookStatus === 5 ? 'Declined / Rejected' :
                     'Pending Review'}
                  </Badge>
                </div>
                <Button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleAdminReview('reject'); }}
                  disabled={reviewSubmitting || deletingBook}
                  variant="destructive"
                  className="h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2 px-6"
                >
                  {reviewSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Decline & Feedback
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-indigo-800 block">
                  Compliance Feedback & Notes
                </Label>
                <Textarea
                  placeholder="Provide feedback on the book content, guidelines compliance, or rejection reasons..."
                  value={reviewAdminNote}
                  onChange={(e) => setReviewAdminNote(e.target.value)}
                  className="rounded-2xl border-slate-200 bg-white min-h-[100px] text-slate-700 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t">
                <Button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleAdminReview('approve'); }}
                  disabled={reviewSubmitting || deletingBook}
                  className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                >
                  {reviewSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Approve & Launch eBook (Preserve Author)
                </Button>
                <Button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleAdminDeleteBook(); }}
                  disabled={reviewSubmitting || deletingBook}
                  variant="outline"
                  className="h-14 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2 shrink-0 px-6"
                >
                  {deletingBook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete eBook
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Mode Switcher: Edit Interface vs Review Interface */}
        {contentType === 'ebook' && (
          <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-2xl">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black italic tracking-tight uppercase">
                  {viewMode === 'edit' ? 'Manage & Edit Studio' : 'eBook Review & Pre-Publication Interface'}
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {viewMode === 'edit'
                    ? 'Modify raw content, cards, image prompts, and metadata freely.'
                    : 'Review final formatted book before submitting for publication.'}
                </p>
              </div>
            </div>
            <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700/60 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all ${
                  viewMode === 'edit'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Edit3 className="w-4 h-4" /> Manage eBook
              </button>
              <button
                type="button"
                onClick={() => setViewMode('review')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all ${
                  viewMode === 'review'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Eye className="w-4 h-4" /> Review Interface
              </button>
            </div>
          </div>
        )}

        {/* Step Indicator - Only for eBooks in Edit Mode */}
        {contentType === 'ebook' && viewMode === 'edit' && (
          <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
            {[
              { id: 'content', label: 'Drafting', icon: FileText },
              { id: 'cards', label: 'Architecture', icon: Layout },
              { id: 'publish', label: 'Launching', icon: Send }
            ].map((step, idx) => {
              const isActive = activeStep === step.id;
              const isPast = idx < ['content', 'cards', 'publish'].indexOf(activeStep);
              return (
                <div key={step.id} className="flex-1 flex items-center">
                  <button 
                    onClick={() => idx <= ['content', 'cards', 'publish'].indexOf(activeStep) && setActiveStep(step.id as any)}
                    disabled={!isPast && !isActive}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full justify-center ${
                      isActive ? 'bg-slate-900 text-white shadow-lg scale-105' : isPast ? 'text-green-600' : 'text-slate-400'
                    }`}
                  >
                    <step.icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                    <span className="font-black text-xs uppercase tracking-widest hidden md:block">{step.label}</span>
                    {isPast && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                  </button>
                  {idx < 2 && <div className="h-0.5 w-8 bg-slate-100 mx-2" />}
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="w-5 h-5" />
            <p className="font-bold text-sm">{error}</p>
            <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setError('')}><X className="w-4 h-4" /></Button>
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-center gap-3 text-green-600 animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-bold text-sm">{message}</p>
            <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setMessage('')}><X className="w-4 h-4" /></Button>
          </div>
        )}

        {/* Vendor Scope Boundary Protection: Vendors NEVER see Ticket/Event workflows */}
        {isVendor && !isAdmin && !isMpr && (contentType === 'event' || contentType === 'ticket' || contentType === 'ebook') && (
          <Card className="border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-900/40 rounded-3xl p-8 text-center space-y-4 shadow-md">
            <ShieldAlert className="w-12 h-12 text-amber-600 mx-auto" />
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Vendor Portal Scope Boundary</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-lg mx-auto">
              Vendors manage their shop catalog, list products, and publish vendor articles. Ticket & event creation is strictly reserved for Platform Administrators and Marketing Partners (MPR).
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button onClick={() => setTypeState('product')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider">
                <ShoppingBag className="w-4 h-4 mr-2" /> Go to Product Studio
              </Button>
              <Button onClick={() => setTypeState('blog')} variant="outline" className="font-bold rounded-xl text-xs uppercase tracking-wider">
                Create Vendor Post
              </Button>
              <Button onClick={() => navigate('/dashboard')} variant="ghost" className="font-bold rounded-xl text-xs uppercase tracking-wider">
                Return to Dashboard
              </Button>
            </div>
          </Card>
        )}

        {/* Dedicated Vendor Product & Listing Studio */}
        {contentType === 'product' && (
          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-[#0d0d15] overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-8 md:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-emerald-500 text-slate-950 font-extrabold uppercase tracking-widest text-[9px]">
                  Vendor Shop Studio
                </Badge>
                {isAdmin && <Badge className="bg-amber-400 text-slate-950 font-black text-[9px]">Admin Management Mode</Badge>}
              </div>
              <CardTitle className="text-3xl md:text-4xl font-black italic tracking-tight">Create Shop Product / Listing</CardTitle>
              <CardDescription className="text-slate-300 font-medium text-sm mt-1">
                List products, goods, or merchandise in your EVVEX vendor storefront.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 md:p-10 space-y-8">
              {/* 1. Product Title */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Product / Item Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Handmade Leather Tote, Custom Event Merch, Premium Coffee Beans"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-lg focus:ring-2 ring-emerald-500/20"
                />
              </div>

              {/* 2. Product Description */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Product Specifications & Description</Label>
                <Textarea
                  placeholder="Describe your product, materials, sizes, shipping details, or pickup instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-28 rounded-2xl bg-slate-50 border-slate-100 font-medium text-sm p-4 resize-none"
                />
              </div>

              {/* 3. Category & Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Category</Label>
                  <select
                    value={genreId}
                    onChange={(e) => setGenreId(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold px-4 h-14 text-sm focus:border-emerald-400 outline-none transition-all"
                  >
                    <option value="">Select Product Category...</option>
                    {genres.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Price (NGN ₦)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₦</span>
                    <Input
                      type="number"
                      placeholder="e.g. 5000"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="h-14 pl-10 rounded-2xl bg-slate-50 border-slate-100 font-black text-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Product Display Image */}
              <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-600" /> Product Image / Photo
                </Label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Option 1: Paste Image URL</span>
                    <Input
                      placeholder="https://images.unsplash.com/..."
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      className="h-14 rounded-2xl bg-white border-slate-200 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Option 2: Direct Photo Upload</span>
                    <label className="flex items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-white hover:bg-slate-100/50 transition-all p-4">
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                        <Upload className="w-5 h-5 text-emerald-600" />
                        <span>Upload photo file</span>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload('cover', e)} />
                    </label>
                  </div>
                  {coverImage && (
                    <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-slate-200">
                      <img src={coverImage} alt="Product preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Vendor Pen/Shop Name */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Vendor / Shop Name</Label>
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. Deluxe Apparel Shop"
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold"
                />
              </div>
            </CardContent>
            <CardFooter className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-4 justify-end">
              <Button
                variant="outline"
                onClick={() => handleProductSubmit(false)}
                disabled={saving || publishing}
                className="rounded-2xl h-14 px-8 border-2 font-black text-xs uppercase tracking-wider gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </Button>
              <Button
                onClick={() => handleProductSubmit(true)}
                disabled={saving || publishing}
                className="rounded-2xl h-14 px-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider gap-2 shadow-xl shadow-emerald-100"
              >
                {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Publish to Vendor Shop
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Dedicated Blog Creator View */}
        {contentType === 'blog' && (
          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-8 md:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-emerald-500 text-slate-950 font-extrabold uppercase tracking-widest text-[9px]">
                  Blog Studio
                </Badge>
                {isAdmin && <Badge className="bg-amber-400 text-slate-950 font-black text-[9px]">Admin Direct Publish Mode</Badge>}
              </div>
              <CardTitle className="text-3xl md:text-4xl font-black italic tracking-tight">Create Blog Post</CardTitle>
              <CardDescription className="text-slate-300 font-medium text-sm mt-1">
                Publish articles, essays, and stories directly to your readers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 md:p-10 space-y-8">
              {/* 1. Title */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Blog Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. 10 Essential Reading Habits for Daily Growth"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-lg focus:ring-2 ring-emerald-500/20"
                />
              </div>

              {/* 2. Excerpt */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Excerpt / Summary (Optional)</Label>
                <Textarea
                  placeholder="Provide a brief teaser for discovery feeds..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-20 rounded-2xl bg-slate-50 border-slate-100 font-medium text-sm p-4 resize-none"
                />
              </div>

              {/* 3. Category & Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Category</Label>
                  <select
                    value={genreId}
                    onChange={(e) => setGenreId(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold px-4 h-14 text-sm focus:border-emerald-400 outline-none transition-all"
                  >
                    <option value="">Select Category...</option>
                    {genres.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Tags (Optional)</Label>
                  <Input
                    placeholder="e.g. mindfulness, productivity, books"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold text-sm"
                  />
                </div>
              </div>

              {/* 4. Rich Text Content Editor */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Article Content <span className="text-red-500">*</span>
                  </Label>
                  {/* Toolbar */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => insertFormatting('**', '**')}
                      className="px-2.5 py-1 text-xs font-black rounded-lg hover:bg-white text-slate-700 transition-all"
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('*', '*')}
                      className="px-2.5 py-1 text-xs font-black italic rounded-lg hover:bg-white text-slate-700 transition-all"
                      title="Italics"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('### ')}
                      className="px-2.5 py-1 text-xs font-black rounded-lg hover:bg-white text-slate-700 transition-all"
                      title="Heading"
                    >
                      H3
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('- ')}
                      className="px-2.5 py-1 text-xs font-black rounded-lg hover:bg-white text-slate-700 transition-all"
                      title="Bullet List"
                    >
                      • List
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('[Link Title](', ')')}
                      className="px-2.5 py-1 text-xs font-black rounded-lg hover:bg-white text-slate-700 transition-all"
                      title="Insert Link"
                    >
                      🔗 Link
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('> ')}
                      className="px-2.5 py-1 text-xs font-black rounded-lg hover:bg-white text-slate-700 transition-all"
                      title="Quote"
                    >
                      " Quote
                    </button>
                    <VoiceDictationButton
                      onTranscript={(transcript) =>
                        setContent((prev) => (prev ? `${prev} ${transcript}` : transcript))
                      }
                    />
                  </div>
                </div>

                <Textarea
                  id="blog-content-textarea"
                  placeholder="Write your article content here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[350px] rounded-3xl bg-slate-50 border-slate-100 font-medium leading-relaxed p-6 resize-y focus:ring-2 ring-emerald-500/20"
                />
              </div>

              {/* 5. Featured Cover Image */}
              <div className="space-y-3 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-600" /> Featured Cover Image (Optional)
                </Label>
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="w-28 h-28 bg-slate-200 rounded-2xl relative overflow-hidden flex items-center justify-center shrink-0 border border-slate-300">
                    {coverImage ? (
                      <img src={coverImage} className="w-full h-full object-cover" alt="Blog cover" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex flex-wrap gap-3">
                      <label className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase cursor-pointer transition-all shadow-md">
                        <Input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload('cover', e)} disabled={saving} />
                        <Upload className="w-4 h-4" /> Upload Image
                      </label>
                      {coverImage && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setCoverImage('')} className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs font-black">
                          Remove
                        </Button>
                      )}
                    </div>
                    <Input
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="Or paste image URL (https://...)"
                      className="h-11 rounded-xl bg-white border-slate-200 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 6. Pricing Access Switch */}
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-indigo-600 block">Pricing Access</span>
                    <span className="text-[10px] text-slate-400 font-bold block">Free for all readers or Paid premium blog post</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black ${isFree ? 'text-emerald-600' : 'text-slate-400'}`}>Free</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!isFree}
                        onChange={(e) => {
                          const paid = e.target.checked;
                          setIsFree(!paid);
                          if (!paid) setPrice('0');
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-12 h-7 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600" />
                    </label>
                    <span className={`text-xs font-black ${!isFree ? 'text-emerald-600' : 'text-slate-400'}`}>Paid</span>
                  </div>
                </div>

                {!isFree && (
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Price (NGN ₦)</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₦</span>
                      <Input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="800"
                        className="h-14 pl-10 rounded-2xl bg-white border-slate-200 font-black text-lg"
                      />
                    </div>
                    {!isAdmin && <p className="text-[10px] text-slate-400 font-bold">Minimum price for paid blog posts is ₦800.</p>}
                  </div>
                )}
              </div>

              {/* 7. Author Name & Admin Assignment */}
              {isAdmin && (
                <div className="space-y-2 p-5 rounded-2xl bg-indigo-50 border border-indigo-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black uppercase tracking-widest text-indigo-700 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-600" /> Select Author (Admin View)
                    </Label>
                    <Badge className="bg-indigo-600 text-white font-mono text-[9px] uppercase">Admin</Badge>
                  </div>
                  <select
                    value={selectedAuthorId || (bookUserId || profile?.id || '')}
                    onChange={(e) => {
                      const aId = e.target.value;
                      setSelectedAuthorId(aId);
                      const chosen = authorsList.find(a => a.id === aId);
                      if (chosen && (!authorName || authorName === profile?.full_name)) {
                        setAuthorName(chosen.full_name || chosen.username || chosen.email?.split('@')[0] || '');
                      }
                    }}
                    className="w-full h-12 rounded-xl bg-white border border-indigo-200 font-bold text-xs text-slate-800 px-3 outline-none"
                  >
                    <option value="">-- Assign to Author Account --</option>
                    {authorsList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name || a.username || 'Unnamed'} ({a.email}) [{a.account_tier || 'author'}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Author Pen Name</Label>
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold"
                />
              </div>
            </CardContent>

            <CardFooter className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-4 justify-end">
              <Button
                variant="outline"
                onClick={() => handleBlogSubmit(false)}
                disabled={saving || publishing}
                className="rounded-2xl h-14 px-8 border-2 font-black text-xs uppercase tracking-wider gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </Button>
              <Button
                onClick={() => handleBlogSubmit(true)}
                disabled={saving || publishing}
                className="rounded-2xl h-14 px-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider gap-2 shadow-xl shadow-emerald-100"
              >
                {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {publishing ? (isAdmin ? 'Publishing...' : 'Submitting...') : (isAdmin ? 'Publish Blog Post' : 'Submit Blog for Review')}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Dedicated Video Creator View */}
        {contentType === 'video' && (
          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-8 md:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-pink-500 text-white font-extrabold uppercase tracking-widest text-[9px]">
                  Video Studio
                </Badge>
                {isAdmin && <Badge className="bg-amber-400 text-slate-950 font-black text-[9px]">Admin Direct Publish Mode</Badge>}
              </div>
              <CardTitle className="text-3xl md:text-4xl font-black italic tracking-tight">Upload Video Content</CardTitle>
              <CardDescription className="text-slate-300 font-medium text-sm mt-1">
                Share video lectures, webinars, or tutorials directly with your audience.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-8 md:p-10 space-y-8">
              {/* 1. Title */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Video Title <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. Masterclass: Deep Reading & Focus Strategies"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-lg focus:ring-2 ring-pink-500/20"
                />
              </div>

              {/* 2. Description */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Video Description / Notes (Optional)</Label>
                <Textarea
                  placeholder="Describe what viewers will learn or attach lesson notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-28 rounded-2xl bg-slate-50 border-slate-100 font-medium text-sm p-4 resize-none"
                />
              </div>

              {/* 3. Video Source (URL or File Upload) */}
              <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Video className="w-4 h-4 text-pink-600" /> Video File or Embedded Link <span className="text-red-500">*</span>
                </Label>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Option 1: Paste Video URL (YouTube / Vimeo / MP4 Link)</span>
                    <Input
                      placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                      value={bookUrl}
                      onChange={(e) => setBookUrl(e.target.value)}
                      className="h-14 rounded-2xl bg-white border-slate-200 font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Option 2: Direct Video File Upload (MP4, MOV, AVI)</span>
                    <label className="flex items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-white hover:bg-slate-100/50 transition-all p-4">
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                        {videoUploading ? (
                          <>
                            <Loader2 className="w-5 h-5 text-pink-600 animate-spin" />
                            <span>Uploading Video File...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-pink-600" />
                            <span>{bookUrl ? 'Video File Set (Click to Change)' : 'Click to Upload Video File'}</span>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoFileUpload}
                        className="hidden"
                        disabled={videoUploading}
                      />
                    </label>
                  </div>

                  {bookUrl && (
                    <div className="pt-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1 mb-2">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Video Link Active
                      </span>
                      <div className="aspect-video w-full rounded-2xl bg-black overflow-hidden relative shadow-lg flex items-center justify-center">
                        {bookUrl.includes('youtube.com') || bookUrl.includes('youtu.be') ? (
                          <iframe
                            src={bookUrl.replace('watch?v=', 'embed/')}
                            className="w-full h-full border-0"
                            allowFullScreen
                            title="Video Preview"
                          />
                        ) : bookUrl.includes('vimeo.com') ? (
                          <iframe
                            src={`https://player.vimeo.com/video/${bookUrl.split('/').pop()}`}
                            className="w-full h-full border-0"
                            allowFullScreen
                            title="Video Preview"
                          />
                        ) : (
                          <video src={bookUrl} controls className="w-full h-full object-contain" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Thumbnail Image */}
              <div className="space-y-3 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-pink-600" /> Video Thumbnail Cover (Optional)
                </Label>
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="w-36 h-24 bg-slate-200 rounded-2xl relative overflow-hidden flex items-center justify-center shrink-0 border border-slate-300">
                    {coverImage ? (
                      <img src={coverImage} className="w-full h-full object-cover" alt="Video cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Video className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex flex-wrap gap-3">
                      <label className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase cursor-pointer transition-all shadow-md">
                        <Input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload('cover', e)} disabled={saving} />
                        <Upload className="w-4 h-4" /> Upload Thumbnail
                      </label>
                      {coverImage && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setCoverImage('')} className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs font-black">
                          Remove
                        </Button>
                      )}
                    </div>
                    <Input
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="Or paste thumbnail image URL (https://...)"
                      className="h-11 rounded-xl bg-white border-slate-200 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Category */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Category</Label>
                <select
                  value={genreId}
                  onChange={(e) => setGenreId(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold px-4 h-14 text-sm focus:border-pink-400 outline-none transition-all"
                >
                  <option value="">Select Category...</option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* 6. Pricing Access Switch */}
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-indigo-600 block">Pricing Access</span>
                    <span className="text-[10px] text-slate-400 font-bold block">Free for all readers or Paid premium video</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black ${isFree ? 'text-emerald-600' : 'text-slate-400'}`}>Free</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!isFree}
                        onChange={(e) => {
                          const paid = e.target.checked;
                          setIsFree(!paid);
                          if (!paid) setPrice('0');
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-12 h-7 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-pink-600" />
                    </label>
                    <span className={`text-xs font-black ${!isFree ? 'text-pink-600' : 'text-slate-400'}`}>Paid</span>
                  </div>
                </div>

                {!isFree && (
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Price (NGN ₦)</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₦</span>
                      <Input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="800"
                        className="h-14 pl-10 rounded-2xl bg-white border-slate-200 font-black text-lg"
                      />
                    </div>
                    {!isAdmin && <p className="text-[10px] text-slate-400 font-bold">Minimum price for paid videos is ₦800.</p>}
                  </div>
                )}
              </div>

              {/* 7. Presenter Name & Admin Assignment */}
              {isAdmin && (
                <div className="space-y-2 p-5 rounded-2xl bg-indigo-50 border border-indigo-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black uppercase tracking-widest text-indigo-700 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-600" /> Select Author (Admin View)
                    </Label>
                    <Badge className="bg-indigo-600 text-white font-mono text-[9px] uppercase">Admin</Badge>
                  </div>
                  <select
                    value={selectedAuthorId || (bookUserId || profile?.id || '')}
                    onChange={(e) => {
                      const aId = e.target.value;
                      setSelectedAuthorId(aId);
                      const chosen = authorsList.find(a => a.id === aId);
                      if (chosen && (!authorName || authorName === profile?.full_name)) {
                        setAuthorName(chosen.full_name || chosen.username || chosen.email?.split('@')[0] || '');
                      }
                    }}
                    className="w-full h-12 rounded-xl bg-white border border-indigo-200 font-bold text-xs text-slate-800 px-3 outline-none"
                  >
                    <option value="">-- Assign to Author Account --</option>
                    {authorsList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name || a.username || 'Unnamed'} ({a.email}) [{a.account_tier || 'author'}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Presenter / Author Name</Label>
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold"
                />
              </div>
            </CardContent>

            <CardFooter className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-4 justify-end">
              <Button
                variant="outline"
                onClick={() => handleVideoSubmit(false)}
                disabled={saving || publishing}
                className="rounded-2xl h-14 px-8 border-2 font-black text-xs uppercase tracking-wider gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </Button>
              <Button
                onClick={() => handleVideoSubmit(true)}
                disabled={saving || publishing}
                className="rounded-2xl h-14 px-10 bg-pink-600 hover:bg-pink-700 text-white font-black text-xs uppercase tracking-wider gap-2 shadow-xl shadow-pink-100"
              >
                {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {publishing ? (isAdmin ? 'Publishing...' : 'Submitting...') : (isAdmin ? 'Publish Video' : 'Submit Video for Review')}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Event & Ticket Architect Wizard (Admin & MPR only) */}
        {(contentType === 'ebook' || contentType === 'event' || contentType === 'ticket') && !(isVendor && !isAdmin && !isMpr) && (
          <AnimatePresence mode="wait">
            {activeStep === 'content' && (
              <motion.div 
                key="step-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                  <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                        <Ticket className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight italic">
                          Event & Ticket Architect
                        </CardTitle>
                        <CardDescription className="font-medium">
                          Design your event experience, configure highlights, and set up ticket pricing tiers.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Event Title</Label>
                        <Input 
                          placeholder="e.g. EVVEX Annual Tech & Culture Summit, Live Gala Concert" 
                          value={title} 
                          onChange={(e) => setTitle(e.target.value)}
                          className="h-14 rounded-2xl bg-white border-slate-100 focus:ring-2 ring-indigo-500/20 font-bold transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Words Per Card: {wordsPerCard}</Label>
                        <select 
                          value={wordsPerCard}
                          onChange={(e) => setWordsPerCard(parseInt(e.target.value))}
                          className="w-full bg-white border-2 border-slate-100 rounded-2xl font-bold px-4 h-14 text-sm focus:border-indigo-400 outline-none transition-all"
                        >
                          <option value="50">50 Words (Minimum)</option>
                          <option value="100">100 Words (Quick Reads)</option>
                          <option value="150">150 Words (Standard)</option>
                          <option value="200">200 Words (Detailed)</option>
                          <option value="250">250 Words (Informative)</option>
                          <option value="300">300 Words (In-depth)</option>
                          <option value="350">350 Words (Maximum)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Genre (Categorization)</Label>
                        <select 
                          value={genreId}
                          onChange={(e) => setGenreId(e.target.value)}
                          className="w-full bg-white border-2 border-slate-100 rounded-2xl font-bold px-4 h-14 text-sm focus:border-indigo-400 outline-none transition-all"
                        >
                          <option value="">Select Genre...</option>
                          {genres.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3 bg-indigo-50/10 p-6 rounded-3xl border border-indigo-100/30">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-indigo-500" /> Optional: Upload PDF Document
                        </Label>
                        {pdfName && (
                          <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full truncate max-w-[220px]">
                            {pdfName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-indigo-200/40 border-dashed rounded-3xl cursor-pointer bg-white hover:bg-indigo-50/5 transition-all">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                            {pdfUploading ? (
                              <>
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                                <p className="text-xs font-black uppercase tracking-wider text-slate-600">Extracting Text from PDF...</p>
                              </>
                            ) : (
                              <>
                                <Upload className="w-8 h-8 text-indigo-500 mb-2" />
                                <p className="text-xs font-bold text-slate-600">
                                  <span className="font-extrabold text-indigo-600">Click to upload PDF</span> or drag and drop
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold mt-1">
                                  The raw text will be automatically extracted and loaded below
                                </p>
                              </>
                            )}
                          </div>
                          <input 
                            type="file" 
                            accept=".pdf" 
                            onChange={handlePdfUpload} 
                            className="hidden" 
                            disabled={pdfUploading}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">AI Polish & Formatting Switch</Label>
                          <span className="text-[10px] text-slate-400 font-bold">Enhance text flow and styling via Gemini AI (disable to strictly keep raw text verbatim)</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={aiPolishEnabled} 
                            onChange={(e) => setAiPolishEnabled(e.target.checked)} 
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                      {aiPolishEnabled && (
                        <div className="flex items-center justify-end border-t border-slate-100/60 pt-3">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={handleAiPolish} 
                            disabled={generating || !content.trim()} 
                            className="h-8 text-[10px] font-black text-indigo-600 gap-1.5 hover:bg-indigo-50 border-indigo-200/50 rounded-xl bg-white shadow-sm transition-all"
                          >
                            <Wand2 className="w-3.5 h-3.5" /> Force Run AI Polish Now
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Raw Source Material</Label>
                          <VoiceDictationButton
                            onTranscript={(transcript) =>
                              setContent((prev) => (prev ? `${prev} ${transcript}` : transcript))
                            }
                          />
                        </div>
                        {!aiPolishEnabled && (
                          <Badge variant="outline" className="text-[8px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 border-emerald-200">
                            Verbatim Raw Preservation Mode
                          </Badge>
                        )}
                      </div>
                      <div className="relative group">
                        <Textarea 
                          placeholder="Paste your article, book chapters, or notes here... Minimum 5 sentences for best AI results." 
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          className="min-h-[400px] max-h-[800px] rounded-3xl bg-slate-50 border-slate-100 focus:ring-2 ring-indigo-500/20 font-medium leading-relaxed p-10 resize-none overflow-y-auto custom-scrollbar"
                        />
                        {content.length > 500 && (
                          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <Badge className="bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest">
                              Content Boss Scrollable
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')} className="rounded-xl h-12 px-6 font-bold">Discard</Button>
                    <Button 
                      onClick={handleGenerate} 
                      disabled={generating || !title.trim() || !content.trim()}
                      className="rounded-xl h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg gap-2"
                    >
                      {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      {generating ? genStep : 'Generate Architecture'}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}

          {activeStep === 'cards' && viewMode === 'edit' && (
            <motion.div 
              key="step-cards"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
               <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight italic">
                    {contentType === 'ebook' ? 'Card Architecture & Layout' : 'Event Highlights & Ticket Tiers'}
                  </h2>
                  <p className="text-slate-500 font-medium text-xs mt-0.5">
                    {contentType === 'ebook' ? 'Modify text, manage images, reorder cards, or insert new cards anywhere.' : 'Preview and fine-tune your event highlights and ticket tiers before publishing.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => handleInsertCard(0, 'above')} variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1 border-slate-200">
                    <Plus className="w-3.5 h-3.5" /> Top Card
                  </Button>
                  <Button onClick={() => {
                    const lastChapter = cards[cards.length - 1]?.chapter || '';
                    setCards([...cards, { chapter: lastChapter, title: 'New Card', text: '', image_prompt: '', image_url: '' }]);
                  }} variant="outline" size="sm" className="rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-black gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Card
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {cards.map((card, idx) => (
                  <Card key={idx} className="border border-slate-200/80 shadow-md rounded-3xl overflow-hidden group hover:shadow-xl transition-all bg-white">
                    {/* Top Toolbar for Card Ordering & Insertion */}
                    <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-slate-900 text-white font-black text-[10px] px-2.5 py-1 rounded-lg">
                          Card {idx + 1} of {cards.length}
                        </Badge>
                        <span className="text-xs font-bold text-slate-400">|</span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={idx === 0}
                            onClick={() => handleMoveCard(idx, 'up')}
                            className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-30"
                            title="Move Card Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={idx === cards.length - 1}
                            onClick={() => handleMoveCard(idx, 'down')}
                            className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-30"
                            title="Move Card Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleInsertCard(idx, 'above')}
                          className="h-7 px-2.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 border-indigo-100 hover:bg-indigo-50 rounded-lg gap-1"
                        >
                          <Plus className="w-3 h-3" /> Insert Above
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleInsertCard(idx, 'below')}
                          className="h-7 px-2.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 border-indigo-100 hover:bg-indigo-50 rounded-lg gap-1"
                        >
                          <Plus className="w-3 h-3" /> Insert Below
                        </Button>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setCards(cards.filter((_, i) => i !== idx))} 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2 rounded-lg text-xs font-bold"
                          title="Delete Card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row">
                      {/* Image Preview & Upload / Deletion Box */}
                      <div className="w-full md:w-56 bg-slate-100 relative aspect-video md:aspect-square flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-slate-100 group/img">
                        {card.image_url ? (
                          <>
                            <img src={card.image_url} className="absolute inset-0 w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-xs p-3">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setModalImagePreview(card.image_url)}
                                className="w-full h-8 text-[10px] font-black uppercase bg-white/90 text-slate-900 hover:bg-white rounded-lg gap-1.5"
                              >
                                <Maximize2 className="w-3 h-3" /> Preview
                              </Button>
                              <label className="w-full h-8 text-[10px] font-black uppercase bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                                <Input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(idx, e)} />
                                {card.is_uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                Replace
                              </label>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveCardImage(idx)}
                                className="w-full h-8 text-[10px] font-black uppercase bg-red-600 text-white hover:bg-red-700 rounded-lg gap-1.5"
                              >
                                <Trash2 className="w-3 h-3" /> Remove Image
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center space-y-3 p-4">
                            <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Card Image</p>
                            <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-black uppercase cursor-pointer shadow-sm mx-auto inline-flex">
                              <Input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(idx, e)} />
                              {card.is_uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                              Upload Image
                            </label>
                          </div>
                        )}
                      </div>

                      <CardContent className="flex-1 p-6 space-y-4">
                        <div className="flex items-center gap-2">
                          <Input 
                            value={card.chapter || ''} 
                            onChange={(e) => {
                              const newVal = e.target.value;
                              const newCards = [...cards];
                              const oldVal = newCards[idx].chapter || '';
                              newCards[idx].chapter = newVal;
                              for (let i = idx + 1; i < newCards.length; i++) {
                                const currentVal = newCards[i].chapter || '';
                                if (currentVal && currentVal !== oldVal) break;
                                newCards[i].chapter = newVal;
                              }
                              setCards(newCards);
                            }}
                            placeholder="Chapter (e.g. Chapter 1)"
                            className="w-1/2 md:w-1/3 font-bold text-[10px] uppercase tracking-widest text-indigo-600 border-none bg-indigo-50/70 h-8 rounded-lg px-3 focus-visible:ring-0"
                          />
                        </div>
                        <Input 
                          value={card.title} 
                          onChange={(e) => {
                            const newCards = [...cards];
                            newCards[idx].title = e.target.value;
                            setCards(newCards);
                          }}
                          placeholder="Card Title"
                          className="font-black italic text-lg border-none bg-transparent p-0 h-auto focus-visible:ring-0 text-slate-900"
                        />
                        <Textarea 
                          value={card.text} 
                          onChange={(e) => {
                            const newCards = [...cards];
                            newCards[idx].text = e.target.value;
                            setCards(newCards);
                          }}
                          placeholder="Card Content"
                          className="border-none bg-transparent p-0 min-h-[80px] focus-visible:ring-0 text-slate-600 font-medium leading-relaxed resize-none"
                        />
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <Button variant="ghost" onClick={() => setActiveStep('content')} className="rounded-xl h-12 font-bold px-6">Back to Draft</Button>
                <div className="flex items-center gap-3">
                  <Button onClick={() => setViewMode('review')} variant="outline" className="rounded-xl h-12 font-black border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-6 gap-2">
                    <Eye className="w-4 h-4" /> Open Review Interface
                  </Button>
                  <Button onClick={() => setActiveStep('publish')} className="rounded-xl h-12 bg-slate-900 hover:bg-black text-white font-black px-8 shadow-lg">Finalize & Launch</Button>
                </div>
              </div>
            </motion.div>
          )}

          {activeStep === 'publish' && viewMode === 'edit' && (
            <motion.div 
              key="step-publish"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto space-y-8"
            >
               <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm border border-indigo-100">
                  <Settings2 className="w-10 h-10" />
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">eBook Setup & Launch</h2>
                <p className="text-slate-500 font-medium italic">Configure your pricing and author details before going live.</p>
              </div>

              <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white/80 backdrop-blur">
                <CardContent className="p-10 space-y-10">
                  
                  {/* Theme Selector */}
                  <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                      <Palette className="w-4 h-4" /> Visual Atmosphere
                    </Label>
                    <div className="grid grid-cols-5 gap-3">
                      {CARD_THEMES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTheme(t)}
                          className={`aspect-square rounded-2xl transition-all relative overflow-hidden group border-4 ${
                            selectedTheme.id === t.id ? 'border-indigo-500 scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: t.bg }}
                        >
                          <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity" style={{ background: t.gradient }} />
                          {selectedTheme.id === t.id && (
                             <div className="absolute inset-0 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-white" />
                             </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Selector */}
                  <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                      <Settings2 className="w-4 h-4" /> Book Typography (Font Face)
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {AVAILABLE_FONTS.map(f => (
                        <button
                          type="button"
                          key={f.id}
                          onClick={() => setSelectedFont(f.id)}
                          className={`flex flex-col text-left p-3.5 rounded-2xl transition-all border-2 ${
                            selectedFont === f.id 
                              ? 'bg-indigo-50/80 border-indigo-500 shadow-md scale-[1.01]' 
                              : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <span className={`text-xl leading-none font-normal ${f.id} text-slate-800`}>ABC abc</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1.5">{f.name.split(' (')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* eBook Thumbnail Cover Selection */}
                  <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" /> Book Cover Thumbnail
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-6 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner items-center">
                      <div 
                        onClick={() => coverImage && setModalImagePreview(coverImage)}
                        className="w-32 h-44 bg-slate-200 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center shadow-md shrink-0 border-2 border-slate-300 cursor-pointer group/cover"
                      >
                        {coverImage ? (
                          <>
                            <img 
                              src={coverImage} 
                              className="absolute inset-0 w-full h-full object-cover" 
                              alt="eBook Cover preview" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Maximize2 className="w-6 h-6" />
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-3 space-y-1">
                            <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No Cover</p>
                          </div>
                        )}
                        {saving && (
                          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-4 w-full">
                        <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                          This thumbnail is what displays on the main discovery bookshelf and author portfolios. A professional-looking cover dramatically increases click-through rates.
                        </p>
                        
                        <div className="flex flex-wrap gap-3">
                          <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest cursor-pointer shadow-md shadow-indigo-100 active:scale-95 transition-all">
                            <Input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={(e) => handleFileUpload('cover', e)} 
                              disabled={saving}
                            />
                            <Upload className="w-4 h-4" /> Upload Image
                          </label>
                          {coverImage && (
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm" 
                              onClick={() => setCoverImage('')} 
                              className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-11 px-4 text-xs font-black uppercase tracking-widest"
                            >
                              Remove Cover
                            </Button>
                          )}
                        </div>

                        <div className="space-y-1.5 pt-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">Or enter external image URL</span>
                          <Input 
                            value={coverImage} 
                            onChange={(e) => setCoverImage(e.target.value)} 
                            placeholder="https://images.unsplash.com/photo-..." 
                            className="h-11 rounded-xl bg-white border-slate-200 text-xs px-4"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Monetization - MORE PROMINENT */}
                  <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner space-y-6">
                    <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 block">Offer Free Admission</span>
                        <span className="text-[10px] text-slate-400 font-bold block">Allow patrons to claim passes or attend this event for free</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isFree}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setIsFree(checked);
                            if (checked) {
                              setPrice('0');
                              setPdfPrice('0');
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-14 h-8 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600" />
                      </label>
                    </div>

                    {!isFree ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in zoom-in-95 duration-200">
                          <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                              <Ticket className="w-4 h-4 text-indigo-600" /> Standard Ticket Price
                            </Label>
                            <div className="relative">
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">₦</span>
                              <Input 
                                type="number" 
                                value={price || "0"} 
                                onChange={(e) => setPrice(e.target.value)}
                                className="h-16 pl-12 rounded-2xl bg-white border-slate-200 font-black text-2xl shadow-sm focus:ring-primary"
                              />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                              <Ticket className="w-4 h-4 text-amber-500" /> VIP / Premium Ticket Price
                            </Label>
                            <div className="relative">
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">₦</span>
                              <Input 
                                type="number" 
                                value={pdfPrice || "0"} 
                                onChange={(e) => setPdfPrice(e.target.value)}
                                className="h-16 pl-12 rounded-2xl bg-white border-slate-200 font-black text-2xl shadow-sm focus:ring-primary"
                              />
                            </div>
                          </div>
                          <p className="col-span-full text-[10px] font-bold text-slate-400 text-center uppercase tracking-tighter italic">Set to 0 if you want admission to be free.</p>
                        </div>

                        {/* Live Gross vs Net Revenue Split Visualizer */}
                        {(parseInt(price) || 0) > 0 && (() => {
                          const grossVal = parseInt(price) || 0;
                          let fee = grossVal * 0.015;
                          if (grossVal >= 2500) fee += 100;
                          fee = Math.min(2000, Math.round(fee));
                          const netVal = Math.max(0, grossVal - fee);
                          const isLaneB = publishingType === 'ipc';
                          const authorAmt = isLaneB ? Math.round(netVal * 0.70) : Math.round(netVal * 0.30);
                          const mprAmt = isLaneB ? Math.round((netVal * 0.30) * 0.05) : Math.round(netVal * 0.20);
                          const platformAmt = Math.max(0, netVal - authorAmt - (mprReferralCode ? mprAmt : 0));

                          return (
                            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                                  Economics: Gross vs Net Revenue ({isLaneB ? 'Lane B — Independent' : 'Lane A — Entertainment'})
                                </span>
                                <Badge variant="outline" className="text-[10px] font-mono text-indigo-700 border-indigo-200 bg-indigo-50">
                                  Paystack 1.5% + ₦100
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                <div className="p-2.5 bg-slate-50 rounded-xl">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Gross Sale</span>
                                  <span className="text-sm font-black text-slate-800">₦{grossVal.toLocaleString()}</span>
                                </div>
                                <div className="p-2.5 bg-red-50/60 rounded-xl">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-red-500 block">Gateway Fee</span>
                                  <span className="text-sm font-black text-red-600">-₦{fee.toLocaleString()}</span>
                                </div>
                                <div className="p-2.5 bg-emerald-50 rounded-xl">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 block">Author Net</span>
                                  <span className="text-sm font-black text-emerald-700">₦{authorAmt.toLocaleString()}</span>
                                  <span className="text-[9px] font-bold text-emerald-600 block">{isLaneB ? '70% Net' : '30% Net'}</span>
                                </div>
                                <div className="p-2.5 bg-indigo-50 rounded-xl">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 block">Platform Net</span>
                                  <span className="text-sm font-black text-indigo-700">₦{platformAmt.toLocaleString()}</span>
                                  <span className="text-[9px] font-bold text-indigo-600 block">{isLaneB ? '30% Net' : '50% Net'}</span>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                * Payment processing fees are deducted from gross before split calculation. The platform absorbs cloud and gateway hosting costs from its share to keep creator payouts transparent and sustainable.
                              </p>
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="text-center p-4 bg-indigo-50 border border-indigo-100/50 rounded-2xl text-xs text-indigo-700 font-bold uppercase tracking-tight">
                        🎉 This book is designated as a FREE catalog entry and bypasses payment gateways completely.
                      </div>
                    )}
                  </div>

                  {/* Admin Author Assignment Selector */}
                  {isAdmin && (
                    <div className="space-y-3 p-6 bg-indigo-50/80 rounded-[2.5rem] border border-indigo-100 shadow-sm">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-black uppercase tracking-widest text-indigo-700 flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-indigo-600" /> Select Author (Admin Ownership Assignment)
                        </Label>
                        <Badge className="bg-indigo-600 text-white font-mono text-[9px] uppercase">Admin Control</Badge>
                      </div>
                      <p className="text-xs text-indigo-900/70 leading-relaxed font-medium">
                        Assign this eBook directly to the selected author's account so they can manage it, view analytics, and earn sales royalties.
                      </p>
                      <select
                        value={selectedAuthorId || (bookUserId || profile?.id || '')}
                        onChange={(e) => {
                          const aId = e.target.value;
                          setSelectedAuthorId(aId);
                          const chosen = authorsList.find(a => a.id === aId);
                          if (chosen && (!authorName || authorName === profile?.full_name)) {
                            setAuthorName(chosen.full_name || chosen.username || chosen.email?.split('@')[0] || '');
                          }
                        }}
                        className="w-full h-14 rounded-2xl bg-white border border-indigo-200 font-bold text-sm text-slate-900 px-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Choose Registered Author Account --</option>
                        {authorsList.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.full_name || a.username || 'Unnamed'} ({a.email}) [{a.account_tier || 'author'}]
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                      <User className="w-4 h-4" /> Author Pen Name
                    </Label>
                    <Input 
                      placeholder="e.g. Chief Olabisi" 
                      value={authorName} 
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="h-16 rounded-2xl bg-slate-50 border-slate-100 font-black text-lg focus:ring-primary px-6"
                    />
                  </div>

                  {/* Strict Publishing Model & Content Type Configuration */}
                  <div className="p-8 bg-slate-50/80 rounded-[2.5rem] border border-slate-200/80 space-y-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-widest text-indigo-700">
                            Publishing Model & Rights Framework
                          </span>
                          <Badge variant="outline" className="text-[10px] font-black border-indigo-200 text-indigo-700 bg-indigo-50">
                            {totalWordCount.toLocaleString()} Words
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Select your distribution model based on length, rights, and revenue sharing tiers.
                        </p>
                      </div>
                      <div>
                        {totalWordCount >= 30000 ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider py-1 px-3">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> IPC Eligible (30k+ words)
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500 hover:bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider py-1 px-3">
                            FC Tier (&lt;30k words)
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Content Type Selector Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* IPC Card */}
                      <div
                        onClick={() => {
                          if (totalWordCount >= 30000 || isAdmin) {
                            setPublishingType('ipc');
                          } else {
                            setError('IPC (Independent Premium Content) requires 30,000+ words. Your draft has ' + totalWordCount.toLocaleString() + ' words. You can publish as FC and upgrade after 100 sales.');
                          }
                        }}
                        className={`p-6 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                          publishingType === 'ipc'
                            ? 'border-indigo-600 bg-indigo-50/40 shadow-md ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        } ${totalWordCount < 30000 && !isAdmin ? 'opacity-80' : ''}`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-900 text-base flex items-center gap-1.5">
                              IPC — Premium
                            </span>
                            <Badge className="bg-indigo-600 text-white font-black text-[10px]">
                              70% Author / 30% Platform
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            Independent Premium Content for full-length titles (30,000+ words). You retain 100% copyright ownership with 12-month platform exclusivity.
                          </p>
                          <div className="space-y-1.5 text-[11px] text-slate-500 pt-1">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>70% direct royalty payout to author</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>5% referral bonus from platform share to your MPR</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>12-month platform exclusivity commitment</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700">
                          <span>30,000+ Words Required</span>
                          <span className="text-[10px] uppercase font-black tracking-wider">
                            {publishingType === 'ipc' ? '✓ Active Model' : 'Select IPC'}
                          </span>
                        </div>
                      </div>

                      {/* FC Card */}
                      <div
                        onClick={() => setPublishingType('fc')}
                        className={`p-6 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                          publishingType === 'fc'
                            ? 'border-indigo-600 bg-indigo-50/40 shadow-md ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-900 text-base flex items-center gap-1.5">
                              FC — Free / Fast Track
                            </span>
                            <Badge className="bg-slate-800 text-white font-black text-[10px]">
                              30% Author / 50% Plat / 20% MPR
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            For works under 30,000 words or non-exclusive distribution. 20% MPR viral commission incentivizes partner promoters to drive massive reader discovery.
                          </p>
                          <div className="space-y-1.5 text-[11px] text-slate-500 pt-1">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>30% author royalty with viral MPR promoter push (20%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Non-exclusive distribution license</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Reaching 100 sales unlocks IPC upgrade eligibility!</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>Under 30k Words Allowed</span>
                          <span className="text-[10px] uppercase font-black tracking-wider text-indigo-700">
                            {publishingType === 'fc' ? '✓ Active Model' : 'Select FC'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* IPC Declarations */}
                    {publishingType === 'ipc' && (
                      <div className="p-6 bg-white rounded-2xl border border-indigo-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-indigo-900">
                          <ShieldCheck className="w-5 h-5 text-indigo-600" />
                          <h5 className="font-black text-xs uppercase tracking-wider">Mandatory IPC Legal Declarations</h5>
                        </div>
                        
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={rightsDeclared}
                            onChange={(e) => setRightsDeclared(e.target.checked)}
                            className="w-5 h-5 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          <span className="text-xs text-slate-700 font-medium group-hover:text-slate-900 leading-relaxed">
                            <strong className="text-slate-900">Copyright Ownership:</strong> I solemnly declare that I am the sole author and copyright owner of this literary work and hold 100% legal distribution rights without copyright infringement.
                          </span>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={exclusivityDeclared}
                            onChange={(e) => setExclusivityDeclared(e.target.checked)}
                            className="w-5 h-5 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          <span className="text-xs text-slate-700 font-medium group-hover:text-slate-900 leading-relaxed">
                            <strong className="text-slate-900">12-Month Platform Exclusivity:</strong> I agree to 12 months of exclusive digital distribution on CalmReader from the date of publication. After 12 months, I may distribute elsewhere while CalmReader retains distribution of past sales.
                          </span>
                        </label>
                      </div>
                    )}

                    {/* MPR Referral Tracking Field */}
                    <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-indigo-600" /> Marketing Partner (MPR) Referral Code
                        </Label>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Optional</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        If an active Marketing Partner (MPR) referred you to CalmReader, enter their unique referral code. This permanently links your account and locks on your first sale to prevent disputes.
                      </p>

                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. MPR-ABC123 or username"
                          value={mprReferralCode}
                          onChange={(e) => {
                            setMprReferralCode(e.target.value);
                            setMprValidation({ checking: false, valid: null });
                          }}
                          onBlur={() => mprReferralCode.trim() && handleValidateMprCode()}
                          className="h-12 rounded-xl bg-slate-50 font-bold text-sm uppercase px-4 border-slate-200"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleValidateMprCode()}
                          disabled={mprValidation.checking || !mprReferralCode.trim()}
                          className="h-12 px-5 rounded-xl font-black text-xs uppercase tracking-wider shrink-0"
                        >
                          {mprValidation.checking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Code'}
                        </Button>
                      </div>

                      {mprValidation.valid === true && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Verified Partner: {mprValidation.partnerName}</span>
                        </div>
                      )}

                      {mprValidation.valid === false && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-bold">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>{mprValidation.error}</span>
                        </div>
                      )}
                    </div>

                    {/* Campaign Contracts Notice */}
                    <div className="p-5 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h6 className="font-black text-xs uppercase tracking-wider text-indigo-900">
                          Need Dedicated Marketing Support?
                        </h6>
                        <p className="text-[11px] text-indigo-700/80 font-medium leading-relaxed">
                          Hire an MPR for an official platform Campaign Contract (₦2,000 – ₦50,000). Funds are held in escrow for a 7-day dispute window to guarantee deliverables.
                        </p>
                      </div>
                      <Badge className="bg-indigo-600 text-white font-bold text-[10px] shrink-0 uppercase tracking-widest py-1 px-3">
                        Protected Escrow
                      </Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4 sm:p-6 md:p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row w-full gap-3 sm:gap-4">
                    <Button 
                      variant="outline" 
                      onClick={() => handleSave(false)}
                      disabled={saving || publishing}
                      className="w-full sm:flex-1 rounded-xl sm:rounded-2xl min-h-[44px] h-12 sm:h-14 border-2 font-black uppercase tracking-wider text-xs gap-2 hover:bg-white transition-all shadow-sm"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Progress
                    </Button>
                    <Button 
                      onClick={() => setViewMode('review')}
                      className="w-full sm:flex-[2] rounded-xl sm:rounded-2xl min-h-[44px] h-12 sm:h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-xl shadow-emerald-200 gap-2 transition-all"
                    >
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5" /> Proceed to Review Interface
                    </Button>
                  </div>
                  <Button variant="ghost" onClick={() => setActiveStep('cards')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-2 h-auto hover:bg-transparent hover:text-indigo-600">Back to Architecture</Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}

          {/* DEDICATED REVIEW INTERFACE (When viewMode === 'review') */}
          {viewMode === 'review' && (
            <motion.div
              key="mode-review-interface"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 max-w-4xl mx-auto w-full"
            >
              {/* Review Header Banner */}
              <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-indigo-950 text-white p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-[2.5rem] shadow-2xl space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <Badge className="bg-emerald-500 text-slate-950 font-black uppercase tracking-widest text-[10px] mb-2">
                      Pre-Publication Review Mode
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl font-black italic tracking-tight">{title || 'Untitled Book Review'}</h2>
                    <p className="text-slate-300 text-xs font-semibold mt-1">
                      Inspect the final reader experience, verify card pagination, formatting, and metadata before submitting.
                    </p>
                  </div>
                  {(!searchParams.get('mode') || searchParams.get('mode') !== 'review') && !published && (
                    <Button
                      onClick={() => setViewMode('edit')}
                      variant="outline"
                      className="border-slate-700 text-white hover:bg-slate-800 font-bold rounded-xl sm:rounded-2xl text-xs gap-2 min-h-[40px]"
                    >
                      <Edit3 className="w-4 h-4 text-indigo-400" /> Switch back to Edit Interface
                    </Button>
                  )}
                </div>
              </div>

              {/* Reader Card Simulator */}
              {cards.length > 0 && (
                <Card className="border-none shadow-2xl rounded-2xl sm:rounded-[2.5rem] overflow-hidden bg-white w-full">
                  <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-indigo-600 text-white font-black text-xs">
                        Card Reader Simulator ({previewCardIdx + 1}/{cards.length})
                      </Badge>
                      {cards[previewCardIdx]?.chapter && (
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate max-w-[200px]">
                          {cards[previewCardIdx].chapter}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={previewCardIdx === 0}
                        onClick={() => setPreviewCardIdx(prev => Math.max(0, prev - 1))}
                        className="rounded-xl text-xs font-bold"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={previewCardIdx === cards.length - 1}
                        onClick={() => setPreviewCardIdx(prev => Math.min(cards.length - 1, prev + 1))}
                        className="rounded-xl text-xs font-bold"
                      >
                        Next
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 md:p-8">
                    <div 
                      className="min-h-[300px] sm:min-h-[400px] p-4 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl shadow-xl flex flex-col justify-between transition-all relative overflow-hidden"
                      style={{ backgroundColor: selectedTheme.bg, color: '#f8fafc' }}
                    >
                      {cards[previewCardIdx]?.image_url && (
                        <div className="w-full aspect-video md:aspect-[21/9] rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-6 shadow-md relative group/preview">
                          <img 
                            src={cards[previewCardIdx].image_url} 
                            className="w-full h-full object-cover" 
                            alt="" 
                            referrerPolicy="no-referrer"
                          />
                          <button
                            onClick={() => setModalImagePreview(cards[previewCardIdx].image_url)}
                            className="absolute bottom-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-xl backdrop-blur-sm opacity-0 group-hover/preview:opacity-100 transition-opacity"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      
                      <div className="space-y-3 sm:space-y-4">
                        <h3 className={`text-xl sm:text-2xl md:text-3xl font-black italic tracking-tight ${selectedFont}`}>
                          {cards[previewCardIdx]?.title}
                        </h3>
                        <p className={`text-sm sm:text-base md:text-lg leading-relaxed font-normal opacity-90 ${selectedFont}`}>
                          {cards[previewCardIdx]?.text}
                        </p>
                      </div>

                      <div className="pt-6 sm:pt-8 flex items-center justify-between border-t border-black/10 text-xs font-extrabold opacity-60 uppercase tracking-widest mt-6 sm:mt-8">
                        <span className="truncate max-w-[200px]">{title}</span>
                        <span>{previewCardIdx + 1} / {cards.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Final Metadata Verification Summary */}
              <Card className="border-none shadow-xl rounded-2xl sm:rounded-[2.5rem] bg-white p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 w-full">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 italic tracking-tight border-b border-slate-100 pb-3 sm:pb-4">
                  Publication Overview & Metadata
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="flex gap-3 sm:gap-4 items-center bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                    {coverImage ? (
                      <div 
                        onClick={() => setModalImagePreview(coverImage)}
                        className="w-14 h-18 sm:w-16 sm:h-20 bg-slate-200 rounded-lg sm:rounded-xl overflow-hidden shrink-0 shadow-sm cursor-pointer hover:opacity-90"
                      >
                        <img src={coverImage} className="w-full h-full object-cover" alt="Cover" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <div className="w-14 h-18 sm:w-16 sm:h-20 bg-slate-200 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                        <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Title</span>
                      <h4 className="font-black text-slate-900 text-sm truncate">{title || 'Untitled'}</h4>
                      <span className="text-xs text-slate-500 font-medium truncate block">By {authorName || 'Author'}</span>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3 bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col justify-center">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Access & Price:</span>
                      <Badge className="font-black bg-emerald-100 text-emerald-800">
                        {isFree ? 'FREE Catalog' : `₦${price}`}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Word Count & Length:</span>
                      <span className="font-extrabold text-slate-800">{totalWordCount.toLocaleString()} Words ({cards.length} Cards)</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Publishing Model:</span>
                      <Badge className={`font-black ${publishingType === 'ipc' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white'}`}>
                        {publishingType === 'ipc' ? 'IPC (70% Author / 30% Plat)' : 'FC (30% Author / 50% Plat / 20% MPR)'}
                      </Badge>
                    </div>
                    {publishingType === 'ipc' && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Legal Declarations:</span>
                        <span className="font-bold text-emerald-600 text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 100% Rights & Exclusivity Agreed
                        </span>
                      </div>
                    )}
                    {mprReferralCode && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Referred by MPR:</span>
                        <span className="font-mono font-bold text-indigo-700">{mprReferralCode}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit / Publish Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-slate-100">
                  {published && !isAdmin ? (
                    <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                      <span className="text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> This event & ticket listing is published and live in the store. Edits are locked to preserve content consistency.
                      </span>
                      <Button onClick={() => navigate('/dashboard')} variant="outline" className="text-xs font-black rounded-xl w-full sm:w-auto shrink-0">
                        Return to Management Dashboard
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleSave(false)}
                        disabled={saving || publishing}
                        className="w-full sm:flex-1 min-h-[44px] h-12 sm:h-14 rounded-xl sm:rounded-2xl font-black uppercase text-xs tracking-wider gap-2"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Progress as Draft
                      </Button>
                      <Button
                        onClick={() => handleSave(true)}
                        disabled={saving || publishing}
                        className="w-full sm:flex-[2] min-h-[44px] h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-wider shadow-xl shadow-emerald-100 gap-2"
                      >
                        {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        {publishing ? (isAdmin ? 'Publishing...' : 'Submitting...') : (isAdmin ? 'Finalize & Publish Event / Ticket' : 'Submit Event / Ticket for Admin Review')}
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        )}

        {/* Global Image Lightbox Preview Modal */}
        {modalImagePreview && (
          <div 
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setModalImagePreview(null)}
          >
            <div 
              className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={modalImagePreview} 
                className="w-full h-full object-contain max-h-[80vh] rounded-2xl" 
                alt="Enlarged Preview" 
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setModalImagePreview(null)}
                className="absolute top-4 right-4 p-2.5 bg-black/70 hover:bg-black text-white rounded-full transition-all shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
