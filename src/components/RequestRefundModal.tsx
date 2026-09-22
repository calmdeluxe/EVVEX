import React, { useState } from 'react';
import { X, RefreshCw, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

interface RequestRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any; // { id, amount, book_title, buyer_email }
  user: any;
  onSuccess?: () => void;
}

export const RequestRefundModal: React.FC<RequestRefundModalProps> = ({
  isOpen,
  onClose,
  transaction,
  user,
  onSuccess,
}) => {
  const [reasonCategory, setReasonCategory] = useState<string>('technical_issue');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a brief explanation for your refund request.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const fullReason = `[Category: ${reasonCategory}] ${description.trim()}`;
      const res = await axios.post('/api/refund-requests', {
        transaction_id: transaction.id,
        reason: fullReason,
        user_email: user?.email || transaction.buyer_email,
        userId: user?.id || null,
      });

      if (res.data && res.data.success) {
        setSuccess(true);
        if (onSuccess) onSuccess();
        setTimeout(() => {
          setSuccess(false);
          setDescription('');
          onClose();
        }, 2500);
      } else {
        throw new Error(res.data?.error || 'Failed to submit refund request');
      }
    } catch (err: any) {
      console.error('[RefundModal] Error submitting:', err);
      setError(err.response?.data?.error || err.message || 'Could not submit refund request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#0d0d15] border border-gray-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
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
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Refund Request Submitted</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
              Our support team will review your request for "{transaction.book_title || 'eBook'}" within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Purchase Refund
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                Request a Refund
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Submitting refund for <span className="font-semibold text-gray-900 dark:text-white">"{transaction.book_title || 'eBook'}"</span> (₦{(transaction.amount || 0).toLocaleString()})
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Reason Category
              </label>
              <select
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="technical_issue">Technical Issue (Cannot read/open eBook)</option>
                <option value="wrong_book">Purchased Wrong Book</option>
                <option value="accidental_purchase">Accidental Duplicate Purchase</option>
                <option value="other">Other Reason</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Detailed Explanation
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue you encountered with this purchase..."
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
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
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
