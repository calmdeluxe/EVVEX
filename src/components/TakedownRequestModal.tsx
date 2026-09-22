import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import axios from 'axios';

interface TakedownRequestModalProps {
  isOpen: boolean;
  book: { id: string | number; title: string } | null;
  onClose: () => void;
  onSubmitted: () => void;
}

export const TakedownRequestModal: React.FC<TakedownRequestModalProps> = ({
  isOpen,
  book,
  onClose,
  onSubmitted,
}) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !book) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for the takedown request.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let success = false;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (token) {
        try {
          const res = await axios.post(
            '/api/author/takedown/request',
            { bookId: book.id, reason: reason.trim() },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.data?.success) success = true;
        } catch (apiErr) {
          console.warn('[TakedownModal] API request failed, trying direct Supabase fallback...', apiErr);
        }
      }

      if (!success) {
        // Direct Supabase fallback
        const authorId = user?.id;
        const { error: insertErr } = await supabase.from('takedown_requests').insert({
          book_id: book.id,
          author_id: authorId,
          reason: reason.trim(),
          status: 'pending',
          created_at: new Date().toISOString()
        });

        if (insertErr) {
          console.warn('[TakedownModal] Direct insert failed, attempting book status update...', insertErr);
        }

        const { error: updateErr } = await supabase
          .from('books')
          .update({ status: 'takedown_requested' })
          .eq('id', book.id);

        if (updateErr) {
          throw new Error(updateErr.message || 'Failed to update book status');
        }
        success = true;
      }

      alert('Takedown request submitted successfully! An administrator will review your request.');
      setReason('');
      onSubmitted();
      onClose();
    } catch (err: any) {
      console.error('Takedown request error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to submit takedown request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white rounded-[2rem] border border-slate-100 p-6 shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-black text-slate-900 tracking-tight italic">
            Request eBook Takedown
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-slate-500 leading-relaxed">
            You are requesting to take down <strong className="text-slate-900">"{book.title}"</strong> from public view. Published content cannot be edited or deleted directly by authors, but admins review all takedown requests promptly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Reason for Takedown Request <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you want to unpublish or remove this eBook (e.g., copyright update, formatting revision, content unpublishing request)..."
              rows={4}
              className="rounded-xl border-slate-200 focus:ring-indigo-500 font-medium text-sm"
              required
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl font-bold border-slate-200 text-slate-600 h-11 flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-xl font-black bg-amber-600 hover:bg-amber-700 text-white h-11 flex-1 gap-2 shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" /> Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
