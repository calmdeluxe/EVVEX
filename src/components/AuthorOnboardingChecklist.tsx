import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ArrowRight, Copy, BookOpen, Image as ImageIcon, Globe, Share2, X, Trophy, Video, Sparkles, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '../supabase';
import { getAppUrl, getReferralCode } from '../lib/utils';

interface AuthorOnboardingChecklistProps {
  books?: any[];
  user?: any;
  profile?: any;
  accountTier?: string;
  isAdmin?: boolean;
  onClose?: () => void;
  onRefreshProfile?: () => void;
}

export const AuthorOnboardingChecklist: React.FC<AuthorOnboardingChecklistProps> = ({
  books = [],
  user,
  profile,
  accountTier = 'free',
  isAdmin = false,
  onClose,
  onRefreshProfile,
}) => {
  const navigate = useNavigate();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAffiliate, setCopiedAffiliate] = useState(false);
  const [manuallyShared, setManuallyShared] = useState<boolean>(() => {
    return localStorage.getItem(`onboarding_shared_${user?.id}`) === 'true';
  });
  const [showCelebration, setShowCelebration] = useState(false);

  // Determine user role
  const isUserAdmin = isAdmin || accountTier === 'admin' || profile?.account_tier === 'admin' || profile?.is_admin === true;
  const isAuthor = !isUserAdmin && (accountTier === 'author' || profile?.account_tier === 'author' || profile?.role === 'author');
  const isPremium = !isUserAdmin && !isAuthor && (accountTier === 'premium' || profile?.account_tier === 'premium' || profile?.is_premium === true);
  const isFree = !isUserAdmin && !isAuthor && !isPremium;

  // For Admin or Free Users: Show nothing
  if (isUserAdmin || isFree) {
    return null;
  }

  const handleDismissPermanently = async () => {
    if (user?.id) {
      localStorage.setItem(`onboarding_dismissed_${user.id}`, 'true');
      try {
        await supabase.from('users').update({ onboarding_completed: true }).eq('id', user.id);
        if (onRefreshProfile) onRefreshProfile();
      } catch (e) {
        console.warn('Failed to update onboarding_completed in DB:', e);
      }
    }
    if (onClose) onClose();
  };

  // ---------------------------------------------------------------------------
  // PREMIUM USER AFFILIATE GUIDE (No video, text + referral link with copy button)
  // ---------------------------------------------------------------------------
  if (isPremium) {
    const affiliateCode = getReferralCode(user?.id);
    const affiliateLink = `${getAppUrl()}/auth?ref=${affiliateCode}`;

    const handleCopyAffiliate = () => {
      navigator.clipboard.writeText(affiliateLink);
      setCopiedAffiliate(true);
      setTimeout(() => setCopiedAffiliate(false), 3000);
    };

    return (
      <div className="bg-gradient-to-br from-indigo-900 via-purple-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-purple-500/20 relative overflow-hidden mb-8">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between relative z-10 gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-purple-500/20 text-purple-300 text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-purple-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" /> Premium Affiliate Guide
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              💎 Share & Earn with CalmReader Affiliate Rewards
            </h2>
            <p className="text-gray-300 text-xs mt-1 max-w-xl leading-relaxed">
              Earn passive reward points and commissions whenever readers or authors sign up using your unique referral link below!
            </p>
          </div>

          <button
            onClick={handleDismissPermanently}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/15 shrink-0 self-start"
            title="Dismiss guide permanently"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            Got it, don't show again
          </button>
        </div>

        {/* Affiliate Link Container */}
        <div className="bg-black/30 backdrop-blur-xs border border-white/10 rounded-xl p-4 relative z-10 space-y-2 mt-2">
          <label className="text-xs font-semibold text-gray-300 block flex items-center justify-between">
            <span>Your Personal Affiliate Referral Link:</span>
            {copiedAffiliate && <span className="text-emerald-400 font-bold text-[11px]">✓ Copied to clipboard!</span>}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={affiliateLink}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-purple-300 focus:outline-none select-all"
            />
            <Button
              size="sm"
              onClick={handleCopyAffiliate}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0 gap-1.5 px-4 h-9"
            >
              {copiedAffiliate ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              {copiedAffiliate ? 'Link Copied!' : 'Copy Link'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // AUTHOR USER GUIDE (Video + Short Checklist + Dismissible "Got it, don't show again")
  // ---------------------------------------------------------------------------
  const hasCreatedBook = books && books.length > 0;
  const firstBook = hasCreatedBook ? books[0] : null;
  const hasCoverImage = books && books.some(b => Boolean(b.cover_image && b.cover_image.length > 5));
  const hasPublishedBook = books && books.some(b => b.is_published === true || b.status === 'published' || b.status === 1);
  const hasSharedLink = manuallyShared || copiedLink;

  const completedCount = [hasCreatedBook, hasCoverImage, hasPublishedBook, hasSharedLink].filter(Boolean).length;
  const isAllCompleted = completedCount === 4;

  useEffect(() => {
    if (isAllCompleted && !profile?.onboarding_completed) {
      setShowCelebration(true);
      const markCompleted = async () => {
        try {
          await supabase.from('users').update({ onboarding_completed: true }).eq('id', user?.id);
          if (onRefreshProfile) onRefreshProfile();
        } catch (e) {
          console.warn('Failed to save onboarding_completed status:', e);
        }
      };
      markCompleted();
    }
  }, [isAllCompleted, profile, user, onRefreshProfile]);

  const handleShareCopy = (book: any) => {
    if (!book) return;
    const shareUrl = `${getAppUrl()}/read/${book.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setManuallyShared(true);
    localStorage.setItem(`onboarding_shared_${user?.id}`, 'true');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const steps = [
    {
      id: 1,
      title: 'Create your first eBook',
      description: 'Use the eBook Studio to write or upload your manuscript.',
      completed: hasCreatedBook,
      actionText: hasCreatedBook ? 'Book Created' : 'Create eBook',
      action: () => navigate('/create-book?type=ebook'),
      highlight: !hasCreatedBook,
      icon: BookOpen,
    },
    {
      id: 2,
      title: 'Add a cover image',
      description: 'Design or upload an eye-catching book cover.',
      completed: hasCoverImage,
      actionText: hasCoverImage ? 'Cover Added' : (firstBook ? 'Edit Book' : 'Create & Add Cover'),
      action: () => navigate(firstBook ? `/edit/${firstBook.id}` : '/create-book?type=ebook'),
      highlight: hasCreatedBook && !hasCoverImage,
      icon: ImageIcon,
    },
    {
      id: 3,
      title: 'Publish your book',
      description: 'Submit your eBook to make it available to readers.',
      completed: hasPublishedBook,
      actionText: hasPublishedBook ? 'Published' : (firstBook ? 'Publish Now' : 'Create & Publish'),
      action: () => navigate(firstBook ? `/edit/${firstBook.id}` : '/create-book?type=ebook'),
      highlight: hasCoverImage && !hasPublishedBook,
      icon: Globe,
    },
    {
      id: 4,
      title: 'Share your book link',
      description: 'Promote your book link to start generating readers and sales.',
      completed: hasSharedLink,
      actionText: copiedLink ? 'Link Copied!' : 'Copy Share Link',
      action: () => {
        const publishedBook = books?.find(b => b.is_published || b.status === 'published') || firstBook;
        if (publishedBook) {
          handleShareCopy(publishedBook);
        } else {
          alert('Please create and publish a book first to share its link.');
        }
      },
      highlight: hasPublishedBook && !hasSharedLink,
      icon: Share2,
    },
  ];

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 text-white rounded-2xl p-6 shadow-xl border border-white/10 relative overflow-hidden mb-8">
      {/* Background glow effect */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between relative z-10 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-500/30">
              Author Onboarding Guide
            </span>
            <span className="text-xs text-gray-300 font-medium">
              Step {completedCount} of 4 completed
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            🚀 Launch Your Author Journey
          </h2>
          <p className="text-gray-300 text-xs md:text-sm mt-1">
            Watch the video tutorial and follow the short 4-step checklist to publish your first eBook.
          </p>
        </div>

        {/* Dismiss Button: "Got it, don't show again" */}
        <button
          onClick={handleDismissPermanently}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/15 shrink-0 self-start"
          title="Dismiss guide permanently"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Got it, don't show again
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/10 h-2 rounded-full mb-6 overflow-hidden">
        <div
          className="bg-gradient-to-r from-emerald-400 to-green-500 h-full transition-all duration-500 rounded-full"
          style={{ width: `${(completedCount / 4) * 100}%` }}
        />
      </div>

      {/* Video Guide Component for Author */}
      <div className="mb-6 rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-lg relative z-10">
        <div className="p-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
            <Video className="w-4 h-4 text-emerald-400" />
            <span>Author Video Guide: How to Write & Publish Your First eBook</span>
          </div>
          <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
            2-Min Video Tutorial
          </span>
        </div>
        <div className="relative aspect-video w-full max-h-72 bg-slate-950 flex items-center justify-center">
          <iframe
            className="w-full h-full"
            src="https://www.youtube-nocookie.com/embed/5qap5aO4i9A?rel=0"
            title="CalmReader Author Quickstart Video Guide"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>

      {/* Celebration Banner if finished */}
      {isAllCompleted && (
        <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-xl p-4 mb-6 flex items-center justify-between animate-pulse relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-300 text-base">🎉 You're officially an author!</h4>
              <p className="text-xs text-emerald-100">Your book is live and ready for readers worldwide.</p>
            </div>
          </div>
        </div>
      )}

      {/* Short Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {steps.map((step) => {
          const IconComponent = step.icon;
          return (
            <div
              key={step.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                step.completed
                  ? 'bg-white/5 border-emerald-500/30 text-gray-200'
                  : step.highlight
                  ? 'bg-emerald-900/40 border-emerald-400 shadow-lg ring-2 ring-emerald-500/30'
                  : 'bg-white/5 border-white/10 text-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                  ) : (
                    <Circle className={`w-5 h-5 ${step.highlight ? 'text-emerald-400 font-bold' : 'text-gray-400'}`} />
                  )}
                </div>
                <div>
                  <h3 className={`font-semibold text-sm ${step.completed ? 'line-through text-gray-400' : 'text-white'}`}>
                    {step.title}
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  onClick={step.action}
                  disabled={step.completed && step.id !== 4}
                  className={`text-xs font-bold gap-1.5 ${
                    step.completed
                      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
                      : step.highlight
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                  {step.actionText}
                  {!step.completed && <ArrowRight className="w-3 h-3 ml-0.5" />}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
