// LEGACY: CalmReader file, not part of EVEX product. To be unmounted in a later pass.
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { BookOpen, Search, Filter, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../AuthContext';
import axios from 'axios';

export const Bookshelf: React.FC = () => {
    const { user, accountTier } = useAuth();
    const navigate = useNavigate();
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                setLoading(true);
                if (!user?.id) {
                    let { data: dbBooks, error: dbError } = await supabase
                        .from('books')
                        .select('*')
                        .order('created_at', { ascending: false });

                    let finalBooks = dbBooks || [];
                    if (dbError || !dbBooks || dbBooks.length === 0) {
                        try {
                            const { data } = await axios.get('/api/marketplace/books');
                            if (data && data.books) {
                                finalBooks = data.books;
                            }
                        } catch (e) {
                            console.warn("[Bookshelf] Guest fallback API failed:", e);
                        }
                    }

                    const compiledList = finalBooks.filter((b: any) => 
                        !(b.admin_note || '').includes('type:blog') && 
                        !(b.admin_note || '').includes('type:video')
                    ).map((b: any) => ({
                        ...b,
                        author_name: b.admin_note?.match(/author:([^,]+)/)?.[1] || b.author_name || 'Verified Author',
                        is_purchased: false
                    }));
                    setBooks(compiledList);
                    return;
                }
                
                const currentUserId = user.id;

                // 1. Fetch purchased ebook IDs using robust checks (direct + transaction fallback)
                let purchasedIdsArr: string[] = [];
                
                // Query ebook_purchases view/table
                try {
                    const { data: directPurchases, error: dpErr } = await supabase
                        .from('ebook_purchases')
                        .select('ebook_id')
                        .eq('user_id', currentUserId);
                    if (directPurchases && !dpErr) {
                        purchasedIdsArr = directPurchases.map((p: any) => p.ebook_id);
                    }
                } catch (e) {
                    console.warn("[Bookshelf] Direct ebook_purchases fetch error", e);
                }

                // Fallback to successful purchase transactions
                if (purchasedIdsArr.length === 0) {
                    try {
                        const { data: txs, error: txErr } = await supabase
                            .from('transactions')
                            .select('book_id')
                            .eq('user_id', currentUserId)
                            .eq('status', 'successful')
                            .eq('type', 'purchase');
                        if (txs && !txErr) {
                            purchasedIdsArr = txs.map((t: any) => t.book_id).filter(Boolean);
                        }
                    } catch (e) {
                        console.warn("[Bookshelf] Direct transaction fallback error", e);
                    }
                }

                // Fallback to API endpoint
                if (purchasedIdsArr.length === 0) {
                    try {
                        const token = (await supabase.auth.getSession()).data.session?.access_token;
                        const res = await axios.get('/api/user/purchases', {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        if (res.data && res.data.purchased_ids) {
                            purchasedIdsArr = res.data.purchased_ids;
                        }
                    } catch (e) {
                        console.warn("[Bookshelf] Purchases API fallback error", e);
                    }
                }

                // 2. Fetch full book records. Standard users see ALL books in their bookshelf (flagged by purchased status).
                const isRegularUser = accountTier !== 'admin' && accountTier !== 'author';
                
                if (isRegularUser) {
                    let { data: dbBooks, error: dbError } = await supabase
                        .from('books')
                        .select('*')
                        .order('created_at', { ascending: false });

                    let finalBooks = dbBooks || [];
                    if (dbError || !dbBooks || dbBooks.length === 0) {
                        try {
                            const { data } = await axios.get('/api/marketplace/books');
                            if (data && data.books) {
                                finalBooks = data.books;
                            }
                        } catch (e) {
                            console.warn("[Bookshelf] User fallback API failed:", e);
                        }
                    }

                    const compiledList = finalBooks.filter((b: any) => 
                        !(b.admin_note || '').includes('type:blog') && 
                        !(b.admin_note || '').includes('type:video')
                    ).map((b: any) => ({
                        ...b,
                        author_name: b.admin_note?.match(/author:([^,]+)/)?.[1] || b.author_name || 'Verified Author',
                        is_purchased: purchasedIdsArr.includes(b.id)
                    }));
                    setBooks(compiledList);
                } else {
                    // Admins and authors only see actually owned items on their bookshelf
                    if (purchasedIdsArr.length > 0) {
                        const { data: pBooks, error: pErr } = await supabase
                            .from('books')
                            .select('*')
                            .in('id', purchasedIdsArr)
                            .neq('status', -1);
                        if (!pErr && pBooks) {
                            const compiledList = pBooks.map((b: any) => ({
                                ...b,
                                author_name: b.admin_note?.match(/author:([^,]+)/)?.[1] || b.author_name || 'Verified Author',
                                is_purchased: true
                            }));
                            setBooks(compiledList);
                        } else {
                            console.warn("[Bookshelf] Failed to fetch purchased books details:", pErr);
                            setBooks([]);
                        }
                    } else {
                        setBooks([]);
                    }
                }
            } catch (err) {
                console.error('Error fetching bookshelf:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchBooks();
    }, [user, accountTier]);

    const filteredBooks = books.filter((book: any) => {
        const query = searchQuery.toLowerCase();
        const title = (book.title || '').toLowerCase();
        const author = (book.author_name || '').toLowerCase();
        return title.includes(query) || author.includes(query);
    });

    const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);
    const sanitizedPage = Math.min(Math.max(1, currentPage), totalPages || 1);
    const paginatedBooks = filteredBooks.slice((sanitizedPage - 1) * itemsPerPage, sanitizedPage * itemsPerPage);

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-20 px-4">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">My Bookshelf</h1>
                    <p className="text-slate-500 font-medium italic">Your personal collection of purchased card books.</p>
                </header>

                <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search by title or author..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-green-700' : 'text-slate-400'}`}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-100 text-green-700' : 'text-slate-400'}`}
                        >
                            <List className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="aspect-[3/4] bg-white rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredBooks.length === 0 ? (
                    <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm p-8 col-span-full">
                        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900">Your Bookshelf is empty</h3>
                        <p className="text-slate-500 mt-2 max-w-sm mx-auto mb-6">You haven't purchased any eBooks yet. Browse our marketplace to find stories that speak to you!</p>
                        <Button asChild className="bg-green-700 hover:bg-green-800 text-white rounded-xl font-bold h-11 px-6 text-sm">
                            <Link to="/dashboard/discovery">Browse Marketplace</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-12">
                        <div className={viewMode === 'grid' 
                            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6" 
                            : "flex flex-col gap-4"
                        }>
                            {paginatedBooks.map((book) => {
                                const isOwned = book.is_purchased !== false;
                                return (
                                    <motion.div 
                                        key={book.id}
                                        whileHover={{ y: -5 }}
                                        className={`bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-2xl transition-all group ${
                                            viewMode === 'list' ? 'flex flex-row h-40' : 'flex flex-col'
                                        }`}
                                    >
                                        <div className={`${viewMode === 'list' ? 'w-40' : 'aspect-[3/4]'} relative overflow-hidden shrink-0`}>
                                            <div className="absolute inset-0 bg-slate-50 flex items-center justify-center">
                                                <BookOpen className="w-12 h-12 text-slate-200" />
                                            </div>
                                            {book.cover_image && (
                                                <img 
                                                    src={book.cover_image} 
                                                    className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" 
                                                    alt={book.title}
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            )}
                                            <div className="absolute top-3 right-3 z-10">
                                                {isOwned ? (
                                                    <span className="bg-green-600 text-white font-black text-xs px-2 py-1 rounded-lg shadow-lg">
                                                        OWNED
                                                    </span>
                                                ) : (
                                                    <span className="bg-indigo-600 text-white font-black text-xs px-2 py-1 rounded-lg shadow-lg">
                                                        LOCK GATED
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-4 flex flex-col justify-between flex-1">
                                            <div>
                                                <h4 className="font-black text-slate-800 line-clamp-1 mb-1">{book.title}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">By {book.author_name || 'Verified Author'}</p>
                                            </div>
                                            {isOwned ? (
                                                <Button asChild className="w-full bg-slate-900 hover:bg-green-700 text-white rounded-xl font-bold h-10 text-xs transition-colors mt-4">
                                                    <Link to={`/read/${book.id}`}>Read Now</Link>
                                                </Button>
                                            ) : (
                                                <div className="flex flex-col gap-2 mt-4">
                                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Price: {book.price && Number(book.price) > 0 ? `₦${Number(book.price).toLocaleString()}` : 'FREE'}</span>
                                                    <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold h-10 text-xs transition-colors">
                                                        <Link to={`/book/${book.public_slug}/buy`}>Buy to Access</Link>
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-200">
                                <p className="text-sm font-semibold text-slate-500">
                                    Showing <span className="font-extrabold text-slate-800">{((sanitizedPage - 1) * itemsPerPage) + 1}</span> to <span className="font-extrabold text-slate-800">{Math.min(sanitizedPage * itemsPerPage, filteredBooks.length)}</span> of <span className="font-extrabold text-slate-800">{filteredBooks.length}</span> eBooks
                                </p>
                                
                                <div className="flex items-center gap-2">
                                    <button 
                                        disabled={sanitizedPage === 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: totalPages }).map((_, idx) => {
                                            const pNum = idx + 1;
                                            return (
                                                <button
                                                    key={pNum}
                                                    onClick={() => setCurrentPage(pNum)}
                                                    className={`w-9 h-9 rounded-lg text-xs font-extrabold transition-all border ${
                                                        sanitizedPage === pNum 
                                                            ? 'bg-green-600 text-white border-green-600' 
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {pNum}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    <button 
                                        disabled={sanitizedPage === totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <button 
                onClick={() => {
                  if (window.history.length > 2) {
                    navigate(-1);
                  } else {
                    navigate(user ? '/dashboard' : '/');
                  }
                }}
                className="fixed bottom-8 left-8 bg-white border border-slate-200 p-4 rounded-2xl shadow-xl hover:scale-105 transition-transform font-bold text-green-700 text-sm z-50 flex items-center gap-2 cursor-pointer focus:outline-none"
            >
                Back to Home
            </button>
        </div>
    );
};
