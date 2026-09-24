// LEGACY: CalmReader file, not part of EVEX product.
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LayoutGrid,
  List,
  Search,
  Filter,
  FileText,
  Video,
  ChevronRight,
  TrendingUp,
  Clock,
  Trophy,
  Share2
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { TakedownRequestModal } from '../components/TakedownRequestModal';
import { getAppUrl, getReferralCode } from '../lib/utils';
import { ShieldAlert } from 'lucide-react';

export const MyBooks: React.FC = () => {
  const { user, profile, isAdmin, isMpr, isVendor, canCreateEvents, canCreateProducts, accountTier, isAuthReady } = useAuth();
  const navigate = useNavigate();

  const handleShare = (book: any) => {
    const slugOrId = book.public_slug || book.id;
    const affiliateCode = getReferralCode(user?.id);
    const link = `${getAppUrl()}/ebook/${slugOrId}${affiliateCode ? `?ref=${affiliateCode}` : ''}`;
    navigator.clipboard.writeText(link);
    alert('Shareable link copied to clipboard!\n' + link);
  };

  // Security Redirect
  useEffect(() => {
    if (isAuthReady && !user) {
      console.log('[MyBooks] Unauthenticated access. Redirecting to login.');
      navigate('/login');
    }
  }, [user, isAuthReady, navigate]);

  const [books, setBooks] = useState<any[]>([]);
  const [authorStats, setAuthorStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bookToDelete, setBookToDelete] = useState<{ id: string; title: string } | null>(null);
  const [takedownBook, setTakedownBook] = useState<{ id: string | number; title: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ebook' | 'blog' | 'video'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchData = async () => {
    if (!user) return;
    if (books.length === 0) {
      setLoading(true);
    }
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const userIds = [...new Set([user?.id, profile?.id].filter(Boolean))];
      if (userIds.length === 0) return;

      const [booksRes, statsRes] = await Promise.all([
        supabase
          .from('books')
          .select('*')
          .in('user_id', userIds)
          .neq('status', -1)
          .order('created_at', { ascending: false }),
        axios.get('/api/author/stats', config).catch(() => ({ data: { stats: [] } }))
      ]);
      
      if (booksRes.error) throw booksRes.error;
      setBooks(booksRes.data || []);
      setAuthorStats(statsRes.data?.stats || []);
    } catch (err) {
      console.error('Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, profile]);

  const confirmDelete = async () => {
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
        } catch (err) {
          console.warn('[MyBooks] Axios delete failed, trying direct Supabase fallback...', err);
        }
      }

      if (!deleted) {
        const { error } = await supabase.from('books').delete().eq('id', bookToDelete.id);
        if (!error) {
          deleted = true;
        } else {
          console.warn('[MyBooks] Direct delete failed, trying soft delete fallback...', error);
          const { error: softErr } = await supabase.from('books').update({ status: -1, is_published: 0 }).eq('id', bookToDelete.id);
          if (!softErr) {
            deleted = true;
          } else {
            console.error('[MyBooks] Direct delete error:', error);
            throw error;
          }
        }
      }

      if (deleted) {
        alert('Item deleted successfully!');
        setBooks(prev => prev.filter(b => String(b.id) !== String(bookToDelete.id)));
        setBookToDelete(null);
        fetchData();
      }
    } catch (err: any) {
      alert('Error deleting item: ' + (err.response?.data?.error || err.message || 'Failed to delete'));
      fetchData();
    } finally {
      setDeletingId(null);
    }
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase());
    const type = book.admin_note?.includes('type:') ? book.admin_note.split('type:')[1].split(',')[0] : 'ebook';
    const matchesFilter = filterType === 'all' || type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">
              {isVendor && !isAdmin && !isMpr ? 'Vendor Storefront & Products' : (isAdmin || isMpr) ? 'Events & Ticket Listings' : 'My Content & Catalog'}
            </h1>
            <p className="text-slate-500 font-medium">
              {isVendor && !isAdmin && !isMpr 
                ? 'Manage your vendor storefront items, shop listings, and product performance.' 
                : 'Manage, edit, and track your events, tickets, and content performance.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isVendor && !isAdmin && !isMpr ? (
              <>
                <Button onClick={() => navigate('/create-product')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl h-11 px-4 gap-1.5 shadow-md">
                   <Plus className="w-4 h-4" /> Add Product
                </Button>
                <Button onClick={() => navigate('/create-book?type=blog')} className="bg-slate-900 hover:bg-black text-white font-black rounded-xl h-11 px-4 gap-1.5 shadow-md">
                   <Plus className="w-4 h-4" /> Vendor Post
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => navigate('/create-event')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl h-11 px-4 gap-1.5 shadow-md">
                   <Plus className="w-4 h-4" /> Create Event
                </Button>
                <Button onClick={() => navigate('/create-ticket')} className="bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl h-11 px-4 gap-1.5 shadow-md">
                   <Plus className="w-4 h-4" /> Issue Ticket
                </Button>
                <Button onClick={() => navigate('/create-book?type=blog')} className="bg-slate-900 hover:bg-black text-white font-black rounded-xl h-11 px-4 gap-1.5 shadow-md">
                   <Plus className="w-4 h-4" /> Blog
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search your library..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-slate-50 border-none rounded-2xl focus:ring-2 ring-indigo-500/20 font-bold transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-2xl w-full md:w-auto overflow-x-auto">
            {(['all', ...(isVendor && !isAdmin && !isMpr ? ['product', 'blog'] : ['event', 'ticket', 'ebook', 'blog', 'video'])] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type as any)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  filterType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-slate-200 hidden md:block" />

          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl">
             <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
             >
                <LayoutGrid className="w-4 h-4" />
             </button>
             <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
             >
                <List className="w-4 h-4" />
             </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 grayscale">
            <Loader2 className="w-12 h-12 animate-spin text-slate-200" />
            <p className="mt-4 font-black text-slate-300 uppercase tracking-widest text-sm italic">Loading your library...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-20 space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-300 border-4 border-white shadow-inner">
               <BookOpen className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight italic">Empty Library</h3>
              <p className="text-slate-500 font-medium">You haven't created any content yet or your search matched nothing.</p>
            </div>
            <Button onClick={() => navigate('/create-book')} className="bg-slate-900 text-white font-black rounded-xl h-12 px-8">
              Start Creating Now
            </Button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            <AnimatePresence mode="popLayout">
              {filteredBooks.map((book) => {
                const type = book.admin_note?.includes('type:') ? book.admin_note.split('type:')[1].split(',')[0] : 'ebook';
                const isDeleting = deletingId === book.id;

                const isPublished = book.is_published === 1 || book.is_published === true || book.is_published === '1' || book.is_published === 'true' || book.status === 3 || book.status === '3' || book.status === 'published';
                const isPending = !isPublished && (book.status === 1 || book.status === 2 || book.status === '1' || book.status === '2' || book.status === 'pending' || book.status === 'submitted' || book.status === 'pending_review');
                const isRevisionRequired = !isPublished && (book.status === 5 || book.status === '5' || book.status === 3 && !isPublished || book.status === 'revision_required' || book.status === 'declined' || book.status === 'rejected');
                const isArchived = book.status === 4 || book.status === '4' || book.status === 'archived';
                const isTakedownRequested = book.status === 'takedown_requested';
                const isDraft = !isPublished && !isPending && !isRevisionRequired && !isTakedownRequested && !isArchived;

                if (viewMode === 'grid') {
                  return (
                    <motion.div
                      key={book.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-[2.5rem] overflow-hidden group h-full flex flex-col bg-white">
                        <div className="aspect-[4/5] relative overflow-hidden shrink-0">
                          <img 
                            src={book.cover_image || `https://images.unsplash.com/photo-1543003919-a9957004bfa0?q=80&w=2000`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                            alt={book.title}
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                            <Badge className="bg-white/90 text-slate-900 border-none font-black text-[8px] uppercase tracking-widest px-2 backdrop-blur-sm">
                              {type.toUpperCase()}
                            </Badge>
                            {isPublished ? (
                              <Badge className="bg-emerald-500 text-white border-none font-black text-[8px] uppercase tracking-widest px-2">Published</Badge>
                            ) : isPending ? (
                              <Badge className="bg-amber-500 text-white border-none font-black text-[8px] uppercase tracking-widest px-2">Pending Review</Badge>
                            ) : isRevisionRequired ? (
                              <Badge className="bg-rose-500 text-white border-none font-black text-[8px] uppercase tracking-widest px-2">Revision Required</Badge>
                            ) : isTakedownRequested ? (
                              <Badge className="bg-orange-600 text-white border-none font-black text-[8px] uppercase tracking-widest px-2">Takedown Requested</Badge>
                            ) : (
                              <Badge className="bg-slate-500 text-white border-none font-black text-[8px] uppercase tracking-widest px-2">Draft</Badge>
                            )}
                          </div>
                        </div>
                        <CardContent className="p-6 flex-1 space-y-4">
                           <h3 className="font-black text-xl italic tracking-tight leading-tight line-clamp-2 min-h-[3rem] text-slate-800">
                             {book.title}
                           </h3>
                           <div className="flex items-center justify-between pt-2">
                              <div className="flex flex-col">
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Book Performance</span>
                                 <div className="flex flex-col gap-0.5">
                                   <span className="text-lg font-black text-indigo-600">
                                     ₦{(authorStats.find(s => s.id === book.id)?.revenue || 0).toLocaleString()}
                                   </span>
                                   <div className="flex items-center gap-2">
                                     <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                       <TrendingUp className="w-2 h-2" /> {authorStats.find(s => s.id === book.id)?.salesCount || 0} Sales
                                     </span>
                                     <span className="text-[9px] font-bold text-slate-500 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                       <Trophy className="w-2 h-2" /> {authorStats.find(s => s.id === book.id)?.participants || 0} Trivia
                                     </span>
                                   </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleShare(book)}
                                  className="h-10 w-10 rounded-xl bg-slate-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                  title="Copy Shareable Link"
                                 >
                                    <Share2 className="w-4 h-4" />
                                 </Button>
                                 {isAdmin ? (
                                   <>
                                     <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => navigate(`/edit/${book.id}`)}
                                      className="h-10 w-10 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                      title="Edit eBook"
                                     >
                                        <Edit3 className="w-4 h-4" />
                                     </Button>
                                     <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => setBookToDelete({ id: book.id, title: book.title })}
                                      className="h-10 w-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                      title="Delete eBook"
                                     >
                                        <Trash2 className="w-4 h-4" />
                                     </Button>
                                   </>
                                 ) : isDraft ? (
                                   <>
                                     <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => navigate(`/edit/${book.id}`)}
                                      className="h-10 w-10 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                      title="Edit Draft"
                                     >
                                        <Edit3 className="w-4 h-4" />
                                     </Button>
                                     <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => setBookToDelete({ id: book.id, title: book.title })}
                                      className="h-10 w-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                      title="Delete Draft"
                                     >
                                        <Trash2 className="w-4 h-4" />
                                     </Button>
                                   </>
                                 ) : isPublished && !isTakedownRequested ? (
                                   <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setTakedownBook({ id: book.id, title: book.title })}
                                    className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                                    title="Request Takedown"
                                   >
                                     <ShieldAlert className="w-4 h-4" />
                                   </Button>
                                 ) : null}
                              </div>
                           </div>
                        </CardContent>
                        <CardFooter className="px-6 pb-6 pt-0 flex flex-col gap-2">
                          <div className="grid grid-cols-2 gap-2 w-full">
                            {isDraft ? (
                              <Button 
                                variant="outline"
                                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 font-extrabold rounded-2xl h-11 text-xs gap-1.5 transition-all"
                                onClick={() => navigate(`/edit/${book.id}?mode=edit`)}
                              >
                                <Edit3 className="w-3.5 h-3.5 text-indigo-600" /> Manage Draft
                              </Button>
                            ) : isPublished && !isTakedownRequested ? (
                              <Button 
                                variant="outline"
                                className="w-full bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 font-extrabold rounded-2xl h-11 text-xs gap-1.5 transition-all"
                                onClick={() => setTakedownBook({ id: book.id, title: book.title })}
                              >
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Takedown
                              </Button>
                            ) : (
                              <Button 
                                variant="outline"
                                disabled={isTakedownRequested}
                                className="w-full bg-slate-50 text-slate-400 border-slate-200 font-extrabold rounded-2xl h-11 text-xs gap-1.5"
                              >
                                {isTakedownRequested ? 'Pending Takedown' : 'Under Review'}
                              </Button>
                            )}
                            <Button 
                              variant="outline"
                              className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 font-extrabold rounded-2xl h-11 text-xs gap-1.5 transition-all"
                              onClick={() => navigate(`/edit/${book.id}?mode=review`)}
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-600" /> Review
                            </Button>
                          </div>
                          <Button 
                            className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black rounded-2xl h-11 text-xs gap-2 shadow-sm transition-all"
                            onClick={() => navigate(`/read/${book.id}`)}
                          >
                            <BookOpen className="w-3.5 h-3.5" /> Read eBook
                          </Button>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  );
                }

                // List View
                return (
                  <motion.div
                    key={book.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Card className="border-none shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden bg-white p-4 flex flex-row items-center gap-6 group">
                      <div className="w-20 aspect-[3/4] rounded-2xl overflow-hidden shrink-0 border border-slate-100 shadow-inner">
                        <img 
                          src={book.cover_image || `https://images.unsplash.com/photo-1543003919-a9957004bfa0?q=80&w=2000`} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                          alt=""
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-black italic text-lg leading-tight text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{book.title}</h4>
                        <div className="flex items-center gap-3">
                           <Badge variant="ghost" className="p-0 text-slate-400 font-black text-[9px] uppercase tracking-widest">{type}</Badge>
                           <span className="w-1 h-1 rounded-full bg-slate-200" />
                           <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                             <Clock className="w-3 h-3" /> {new Date(book.created_at).toLocaleDateString()}
                           </span>
                        </div>
                      </div>
                      
                      <div className="hidden md:flex flex-col items-end px-6">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Status</span>
                        {isPublished ? (
                          <div className="flex items-center gap-1.5 text-emerald-500 font-black text-xs uppercase tracking-widest">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Published
                          </div>
                        ) : isPending ? (
                          <div className="flex items-center gap-1.5 text-amber-500 font-black text-xs uppercase tracking-widest">
                            <Clock className="w-3.5 h-3.5" /> Pending Review
                          </div>
                        ) : isRevisionRequired ? (
                          <div className="flex items-center gap-1.5 text-rose-500 font-black text-xs uppercase tracking-widest">
                            <AlertCircle className="w-3.5 h-3.5" /> Revision Required
                          </div>
                        ) : isTakedownRequested ? (
                          <div className="flex items-center gap-1.5 text-orange-600 font-black text-xs uppercase tracking-widest">
                            <ShieldAlert className="w-3.5 h-3.5" /> Takedown Pending
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-500 font-black text-xs uppercase tracking-widest">
                            <Clock className="w-3.5 h-3.5" /> Draft
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pr-4">
                         <Button onClick={() => handleShare(book)} variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl bg-slate-50 text-indigo-600 hover:text-indigo-600 hover:bg-white mr-1 shadow-sm" title="Copy Shareable Link">
                           <Share2 className="w-4 h-4" />
                         </Button>
                         {isAdmin ? (
                           <>
                             <Button onClick={() => navigate(`/edit/${book.id}?mode=edit`)} variant="ghost" size="sm" className="px-3 h-10 rounded-xl bg-slate-50 text-slate-700 hover:text-indigo-600 font-bold text-xs gap-1" title="Manage eBook">
                               <Edit3 className="w-4 h-4 text-indigo-600" /> Manage
                             </Button>
                             <Button 
                              onClick={() => setBookToDelete({ id: book.id, title: book.title })} 
                              variant="ghost" 
                              size="sm" 
                              className="h-10 w-10 p-0 rounded-xl bg-red-50 text-red-500 hover:text-red-600"
                              title="Delete Content"
                             >
                                <Trash2 className="w-4 h-4" />
                             </Button>
                           </>
                         ) : isDraft ? (
                           <>
                             <Button onClick={() => navigate(`/edit/${book.id}?mode=edit`)} variant="ghost" size="sm" className="px-3 h-10 rounded-xl bg-slate-50 text-slate-700 hover:text-indigo-600 font-bold text-xs gap-1" title="Manage Draft">
                               <Edit3 className="w-4 h-4 text-indigo-600" /> Edit
                             </Button>
                             <Button 
                              onClick={() => setBookToDelete({ id: book.id, title: book.title })} 
                              variant="ghost" 
                              size="sm" 
                              className="h-10 w-10 p-0 rounded-xl bg-red-50 text-red-500 hover:text-red-600"
                              title="Delete Draft"
                             >
                                <Trash2 className="w-4 h-4" />
                             </Button>
                           </>
                         ) : isPublished && !isTakedownRequested ? (
                           <Button 
                            onClick={() => setTakedownBook({ id: book.id, title: book.title })}
                            variant="ghost"
                            size="sm"
                            className="px-3 h-10 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs gap-1"
                            title="Request Takedown"
                           >
                             <ShieldAlert className="w-4 h-4 text-amber-600" /> Takedown
                           </Button>
                         ) : null}
                         <Button onClick={() => navigate(`/edit/${book.id}?mode=review`)} variant="ghost" size="sm" className="px-3 h-10 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs gap-1" title="Review eBook">
                           <Eye className="w-4 h-4 text-emerald-600" /> Review
                         </Button>
                         <Button onClick={() => navigate(`/read/${book.id}`)} variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl bg-slate-900 text-white hover:bg-black ml-1 shadow-lg" title="Read eBook">
                           <BookOpen className="w-4 h-4" />
                         </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <DeleteConfirmationModal 
        isOpen={!!bookToDelete}
        title={bookToDelete?.title || ''}
        isDeleting={!!deletingId}
        onClose={() => setBookToDelete(null)}
        onConfirm={confirmDelete}
      />

      <TakedownRequestModal
        isOpen={!!takedownBook}
        book={takedownBook}
        onClose={() => setTakedownBook(null)}
        onSubmitted={() => fetchData()}
      />
    </DashboardLayout>
  );
};
