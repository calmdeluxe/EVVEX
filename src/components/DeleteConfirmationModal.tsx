import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  isDeleting?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  isDeleting = false
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-white rounded-[3rem] overflow-hidden shadow-2xl relative"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mb-6 ring-8 ring-red-50/50">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 tracking-tight italic mb-2">Delete Permanently?</h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-10">
                Are you sure you want to delete <span className="font-black text-slate-900 italic">"{title}"</span>? This action cannot be undone and the content will be purged from all discovery lists.
              </p>
              
              <div className="flex flex-col w-full gap-3">
                <Button 
                  disabled={isDeleting}
                  onClick={onConfirm}
                  className="h-16 w-full rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-lg shadow-xl shadow-red-200 gap-3"
                >
                  {isDeleting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Trash2 className="w-6 h-6" />}
                  {isDeleting ? 'PURGING CONTENT...' : 'YES, DELETE FOREVER'}
                </Button>
                <Button 
                  variant="ghost"
                  onClick={onClose}
                  disabled={isDeleting}
                  className="h-14 w-full rounded-2xl text-slate-400 font-bold hover:bg-slate-50"
                >
                  KEEP CONTENT
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
