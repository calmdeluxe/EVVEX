import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import axios from 'axios';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Eye, 
  ArrowLeft, 
  Search, 
  RefreshCw, 
  Loader2, 
  Edit3, 
  Clock, 
  FileText,
  ShieldAlert
} from 'lucide-react';

export const AdminReviews: React.FC = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bookToDelete, setBookToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedBookForPreview, setSelectedBookForPreview] = useState<any | null>(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      // Query books table ensuring cover_image is included
      const { data: dbBooks, error } = await supabase
        .from('books')
        .select('*')
        .neq('status', -1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (dbBooks) {
        const userIds = [...new Set(dbBooks.map((v: any) => v.user_id))].filter(Boolean);
        let userMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, email, full_name')
            .in('id', userIds);
          if (usersData) {
            userMap = usersData.reduce((acc: any, u: any) => {
              acc[u.id] = u;
              return acc;
            }, {});
          }
        }
        const mappedBooks = dbBooks.map((b: any) => ({
          ...b,
          users: userMap[b.user_id] || { email: 'Unknown User', full_name: 'Unknown User' }
        }));
        setSubmissions(mappedBooks);
      }
    } catch (err) {
      console.error('[AdminReviews] Error fetching submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleBookReview = async (bookId: string, action: 'approve' | 'reject') => {
    setActionLoading(bookId);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      let success = false;
      if (token) {
        try {
          const res = await axios.post(`/api/admin/books/${bookId}/review`, { action }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data?.success) success = true;
        } catch (apiErr) {
          console.warn('[AdminReviews] API review failed, falling back to direct Supabase update:', apiErr);
        }
      }

      if (!success) {
        const updateData = action === 'approve' 
          ? { is_published: 1, status: 1 }
          : { is_published: 0, status: 'rejected' };
        
        const { error } = await supabase
          .from('books')
          .update(updateData)
          .eq('id', bookId);

        if (error) throw error;
        success = true;
      }

      if (success) {
        alert(`eBook successfully ${action === 'approve' ? 'approved and published' : 'rejected'}!`);
        fetchSubmissions();
      }
    } catch (err: any) {
      alert(`Error updating review status: ${err.message || 'Action failed'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDeleteBook = async () => {
    if (!bookToDelete) return;
    setDeletingId(bookToDelete.id);
    let deleted = false;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (token) {
        try {
          const res = await axios.delete(`/api/books/${bookToDelete.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data?.success) deleted = true;
        } catch (apiErr) {
          console.warn('[AdminReviews] Axios delete failed, trying direct Supabase fallback...', apiErr);
        }
      }

      if (!deleted) {
        const { error } = await supabase
          .from('books')
          .delete()
          .eq('id', bookToDelete.id);

        if (!error) {
          deleted = true;
        } else {
          console.warn('[AdminReviews] Direct delete failed, trying soft delete fallback...', error);
          const { error: softErr } = await supabase
            .from('books')
            .update({ status: -1, is_published: 0 })
            .eq('id', bookToDelete.id);
          if (!softErr) deleted = true;
          else throw error;
        }
      }

      if (deleted) {
        alert('eBook deleted successfully!');
        setSubmissions(prev => prev.filter(b => String(b.id) !== String(bookToDelete.id)));
        setBookToDelete(null);
        fetchSubmissions();
      }
    } catch (err: any) {
      alert(`Error deleting eBook: ${err.message || 'Failed to delete'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const pendingSubmissions = submissions.filter(b => {
    const isPending = b.status === 0 || b.status === 2 || b.status === 'pending_review' || b.status === 'pending' || b.is_published === 0;
    const matchesSearch = 
      b.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.users?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return isPending && matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/admin')}
              className="rounded-2xl h-11 w-11 border-slate-200 hover:bg-slate-50"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                eBook Submissions Review
                <Badge className="bg-amber-500 text-white border-none font-extrabold text-xs">
                  {pendingSubmissions.length} PENDING
                </Badge>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Review submitted eBooks with cover thumbnails, approve, decline or manage content.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={fetchSubmissions}
              disabled={loading}
              variant="outline"
              className="rounded-2xl h-11 px-4 gap-2 border-slate-200 text-slate-700 font-bold text-xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Queue
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by title, author name or email..."
            className="pl-11 h-12 rounded-2xl border-slate-200 bg-white shadow-xs font-medium text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Review List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-bold">Loading submissions for review...</p>
          </div>
        ) : pendingSubmissions.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 p-12 text-center rounded-[2.5rem]">
            <CardContent className="space-y-4 p-0">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">All Reviews Up To Date</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  There are no pending eBook submissions waiting for review right now.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {pendingSubmissions.map((book) => {
              const contentType = book.admin_note?.includes('type:')
                ? book.admin_note.split('type:')[1].split(',')[0]
                : 'ebook';

              return (
                <Card
                  key={book.id}
                  className="border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-[2rem] overflow-hidden bg-white p-6"
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    {/* Cover Thumbnail & Details */}
                    <div className="flex items-start gap-5 min-w-0 flex-1">
                      {/* Cover Thumbnail Box */}
                      <div className="w-24 sm:w-28 aspect-[3/4] relative overflow-hidden shrink-0 rounded-2xl shadow-md bg-slate-100 border border-slate-200 flex items-center justify-center p-1 group">
                        {book.cover_image ? (
                          <img
                            src={book.cover_image}
                            alt={book.title || 'eBook Cover'}
                            className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              // Fallback on image load error
                              (e.target as HTMLElement).style.display = 'none';
                              const parent = (e.target as HTMLElement).parentElement;
                              if (parent) {
                                const fallback = document.createElement('div');
                                fallback.className = 'flex flex-col items-center justify-center text-slate-400 p-2 text-center';
                                fallback.innerHTML = '<svg class="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg><span class="text-[9px] font-bold">No Image</span>';
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                            <BookOpen className="w-8 h-8 mb-1 text-slate-400" />
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                              No Cover
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="space-y-2.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-indigo-600 text-white font-black text-[9px] uppercase px-2 py-0.5">
                            {contentType.toUpperCase()}
                          </Badge>
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-extrabold text-[9px] uppercase px-2 py-0.5">
                            {book.status === 2 || book.status === 'pending_review'
                              ? 'SUBMITTED FOR REVIEW'
                              : 'DRAFT/PENDING'}
                          </Badge>
                        </div>

                        <h3 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                          {book.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                          <span>
                            Author:{' '}
                            <strong className="text-slate-800">
                              {book.users?.full_name || book.users?.email || 'Unknown'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Price:{' '}
                            <strong className="text-emerald-600 font-black">
                              {book.price && Number(book.price) > 0
                                ? `₦${Number(book.price).toLocaleString()}`
                                : 'FREE'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {book.created_at
                              ? new Date(book.created_at).toLocaleDateString()
                              : 'N/A'}
                          </span>
                        </div>

                        {book.description && (
                          <p className="text-xs text-slate-600 line-clamp-2 font-normal leading-relaxed">
                            {book.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <Button
                        disabled={actionLoading === book.id}
                        onClick={() => handleBookReview(book.id, 'approve')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl h-10 px-4 text-xs gap-1.5 shadow-sm flex-1 sm:flex-initial"
                      >
                        {actionLoading === book.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Approve
                      </Button>

                      <Button
                        disabled={actionLoading === book.id}
                        variant="outline"
                        onClick={() => handleBookReview(book.id, 'reject')}
                        className="border-red-200 text-red-600 hover:bg-red-50 font-extrabold rounded-xl h-10 px-4 text-xs gap-1.5 flex-1 sm:flex-initial"
                      >
                        <XCircle className="w-4 h-4" />
                        Decline
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => setSelectedBookForPreview(book)}
                        className="border-slate-200 text-indigo-600 hover:bg-indigo-50 font-extrabold rounded-xl h-10 px-3 text-xs gap-1.5"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => navigate(`/edit/${book.id}`)}
                        className="border-slate-200 text-slate-700 hover:bg-slate-50 font-extrabold rounded-xl h-10 px-3 text-xs gap-1.5"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() =>
                          setBookToDelete({ id: book.id, title: book.title || 'this eBook' })
                        }
                        className="text-red-500 hover:bg-red-50 hover:text-red-700 h-10 w-10 p-0 rounded-xl"
                        title="Delete Submitted eBook"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete Modal */}
        {bookToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Delete eBook Submission</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to delete <strong className="text-slate-800">"{bookToDelete.title}"</strong>? This will permanently remove it from the database.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setBookToDelete(null)}
                  className="flex-1 rounded-xl h-11 font-bold text-xs border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!!deletingId}
                  onClick={confirmDeleteBook}
                  className="flex-1 rounded-xl h-11 font-bold text-xs bg-red-600 hover:bg-red-700 text-white gap-2"
                >
                  {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete Permanently
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {selectedBookForPreview && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="text-lg font-black text-slate-900">Content Preview</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBookForPreview(null)}
                  className="rounded-full w-8 h-8 p-0"
                >
                  ✕
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-32 aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 shrink-0 border shadow-md">
                  {selectedBookForPreview.cover_image ? (
                    <img
                      src={selectedBookForPreview.cover_image}
                      className="w-full h-full object-cover"
                      alt={selectedBookForPreview.title}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <BookOpen className="w-8 h-8" />
                      <span className="text-[10px] font-bold mt-1">No Cover</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 flex-1">
                  <h2 className="text-xl font-black text-slate-900">
                    {selectedBookForPreview.title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Author Email: {selectedBookForPreview.users?.email || 'N/A'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Price: ₦{selectedBookForPreview.price || '0'}
                  </p>
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">Description:</h4>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                      {selectedBookForPreview.description || 'No description provided.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                  onClick={() => navigate(`/read/${selectedBookForPreview.id}`)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl h-10 px-5"
                >
                  Full Reader Mode
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedBookForPreview(null)}
                  className="font-bold text-xs rounded-xl h-10 px-5"
                >
                  Close Preview
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
