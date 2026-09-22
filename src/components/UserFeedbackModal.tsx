import React, { useState } from 'react';
import { MessageSquare, X, Send, Sparkles, Bug, Lightbulb, RefreshCw, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { useAuth } from '../AuthContext';

interface UserFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserFeedbackModal: React.FC<UserFeedbackModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [type, setType] = useState<'bug' | 'feature' | 'general'>('general');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('Please fill in both the subject and description.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await axios.post('/api/user-feedback', {
        type,
        subject: subject.trim(),
        description: description.trim(),
        screenshot_url: screenshotUrl.trim() || null,
        userId: user?.id || null,
        userEmail: user?.email || 'Anonymous Reader',
      });

      if (res.data && res.data.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setSubject('');
          setDescription('');
          setScreenshotUrl('');
          onClose();
        }, 2200);
      } else {
        throw new Error(res.data?.error || 'Failed to submit feedback');
      }
    } catch (err: any) {
      console.error('[UserFeedbackModal] Error:', err);
      setError(err.response?.data?.error || err.message || 'Could not send feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#0d0d15] border border-gray-200 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Thank You for Your Feedback!</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
              Your feedback helps us continuously shape and refine CalmReader for readers and authors.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Direct Feedback Loop
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                Share Feedback & Suggestions
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Report bugs, suggest new capabilities, or share your reader experience.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs">
                {error}
              </div>
            )}

            {/* Type selection tabs */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Feedback Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setType('bug')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                    type === 'bug'
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-700 dark:text-red-300 shadow-xs'
                      : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Bug className="w-4 h-4 text-red-500" />
                  Bug Report
                </button>

                <button
                  type="button"
                  onClick={() => setType('feature')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                    type === 'feature'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs'
                      : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Feature Request
                </button>

                <button
                  type="button"
                  onClick={() => setType('general')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                    type === 'general'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  General
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your feedback..."
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Description & Details
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What happened or what feature would make your experience better?"
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" /> Screenshot URL (Optional)
              </label>
              <input
                type="url"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                placeholder="https://example.com/screenshot.png"
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
              >
                {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {submitting ? 'Sending...' : 'Submit Feedback'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
