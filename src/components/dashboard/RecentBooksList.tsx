import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Eye, Edit3, Trash2, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RecentBooksListProps {
  books: any[];
  isAuthor: boolean;
  onSelectBookOptions?: (id: string) => void;
  onDeleteBook?: (id: string) => void;
}

export const RecentBooksList: React.FC<RecentBooksListProps> = ({
  books,
  isAuthor,
  onSelectBookOptions,
  onDeleteBook,
}) => {
  const navigate = useNavigate();

  if (!books || books.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl">
        No recent books found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {books.slice(0, 5).map((book) => {
        const isPublished = book.is_published === 1 || book.status === 1;
        return (
          <div
            key={book.id}
            className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#0d0d15] hover:shadow-md transition-all gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              {book.cover_image ? (
                <img
                  src={book.cover_image}
                  alt={book.title}
                  className="w-10 h-13 object-cover rounded-lg shadow-xs shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-13 bg-slate-100 dark:bg-white/5 rounded-lg flex items-center justify-center shrink-0 text-slate-400">
                  <BookOpen className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                  {book.title || 'Untitled eBook'}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 ${
                      isPublished
                        ? 'border-emerald-200 text-emerald-600 bg-emerald-50'
                        : 'border-amber-200 text-amber-600 bg-amber-50'
                    }`}
                  >
                    {isPublished ? 'Published' : 'Draft / Pending'}
                  </Badge>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                    <Eye className="w-3 h-3 text-slate-400" /> {book.views || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(isPublished ? `/read/${book.id}` : `/create-book?id=${book.id}`)}
                className="h-8 px-2.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl gap-1"
              >
                {isPublished ? 'Read' : 'Edit'}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RecentBooksList;
