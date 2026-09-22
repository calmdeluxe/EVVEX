import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { BookCard } from '../components/BookCard';
import { Input } from '@/components/ui/input';
import { Search, Filter, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { useAuth } from '../AuthContext';

export const BrowseBooks: React.FC = () => {
  const { user, accountTier } = useAuth();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');
  const [genres, setGenres] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchBooksAndGenres = async () => {
      try {
        setLoading(true);
        // Load genres with robust fallback to direct Supabase or static list
        let genresList: any[] = [];
        try {
          const genresRes = await axios.get('/api/genres');
          if (genresRes.data && genresRes.data.genres) {
            genresList = genresRes.data.genres;
          }
        } catch (err) {
          console.warn("[BrowseBooks] Failed to fetch genres via API, trying direct Supabase...", err);
          try {
            const { data: dbGenres, error: dbGenresErr } = await supabase
              .from('genres')
              .select('*')
              .order('name', { ascending: true });
            if (!dbGenresErr && dbGenres && dbGenres.length > 0) {
              genresList = dbGenres;
            } else {
              throw new Error(dbGenresErr?.message || "Empty genres");
            }
          } catch (dbErr) {
            genresList = [
              { id: "comic-id-placeholder", name: "Comic", slug: "comic" },
              { id: "horror-id-placeholder", name: "Horror", slug: "horror" },
              { id: "sci-fi-id-placeholder", name: "Sci-Fi", slug: "sci-fi" },
              { id: "romance-id-placeholder", name: "Romance", slug: "romance" },
              { id: "thriller-id-placeholder", name: "Thriller", slug: "thriller" },
              { id: "drama-id-placeholder", name: "Drama", slug: "drama" },
              { id: "fantasy-id-placeholder", name: "Fantasy", slug: "fantasy" },
              { id: "mystery-id-placeholder", name: "Mystery", slug: "mystery" },
            ];
          }
        }
        setGenres(genresList);

        // Fetch purchased eBook IDs for filtering (marketplace shows only unpurchased books for standard/regular users)
        let purchasedIdsArr: string[] = [];
        const currentProfileId = user?.id;
        if (currentProfileId) {
          try {
            const { data: directPurchases, error: dpErr } = await supabase
              .from('ebook_purchases')
              .select('ebook_id')
              .eq('user_id', currentProfileId);
            if (directPurchases && !dpErr) {
              purchasedIdsArr = directPurchases.map((p: any) => p.ebook_id);
            }
          } catch (pErr) {
            console.warn("[BrowseBooks] Optional purchased fetch warning:", pErr);
          }
        }

        // Load books with seamless mapping (tries status 1/integer 1, then true as fallback)
        let finalBooks: any[] = [];
        try {
          // Join-free query for speed and to avoid table RLS statement timeouts.
          let { data: dbBooks, error: dbError } = await supabase
            .from('books')
            .select('*')
            .order('created_at', { ascending: false });

          if (dbError || !dbBooks || dbBooks.length === 0) {
            console.warn("[BrowseBooks] Direct fetch empty or failed, trying API...", dbError);
            const { data } = await axios.get('/api/marketplace/books');
            if (data && data.books) {
              finalBooks = data.books;
            }
          } else {
            finalBooks = dbBooks.map((b: any) => ({
              ...b,
              author_name: b.admin_note?.match(/author:([^,]+)/)?.[1] || b.author_name || 'Verified Author'
            }));
          }
        } catch (err) {
          console.warn("[BrowseBooks] Error during books fetch, attempting API fallback...", err);
          try {
            const { data } = await axios.get('/api/marketplace/books');
            if (data && data.books) {
              finalBooks = data.books;
            }
          } catch (apiErr) {
            console.error("[BrowseBooks] API fallback also failed:", apiErr);
          }
        }

        let ebookList = finalBooks.filter((b: any) => 
          !(b.admin_note || '').includes('type:blog') && 
          !(b.admin_note || '').includes('type:video') &&
          (b.is_published === true || b.is_published === 1)
        );

        // Regular users should only see unpurchased eBooks in the marketplace
        const isRegularUser = accountTier !== 'admin' && accountTier !== 'author';
        if (isRegularUser && purchasedIdsArr.length > 0) {
          ebookList = ebookList.filter((b: any) => !purchasedIdsArr.includes(b.id));
        }

        setBooks(ebookList);
      } catch (err) {
        console.error("Error fetching marketplace data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBooksAndGenres();
  }, [user, accountTier]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, category]);

  const filteredBooks = books.filter(b => {
    const matchesSearch = (b.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (b.author_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const bookGenreId = b.genre_id || (b.admin_note?.includes('genre:') ? b.admin_note.split('genre:')[1].split(',')[0] : '');
    const matchesCategory = category === 'All' || bookGenreId === category;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);
  const sanitizedPage = Math.min(Math.max(1, currentPage), totalPages || 1);
  const paginatedBooks = filteredBooks.slice((sanitizedPage - 1) * itemsPerPage, sanitizedPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <Badge className="bg-indigo-100 text-indigo-600 border-none px-3 py-1">Digital Library</Badge>
            <h1 className="text-4xl md:text-5xl font-serif font-black text-slate-900 tracking-tight">Explore the Library</h1>
            <p className="text-slate-500 font-medium">Find your next favorite interactive card book</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <Input 
                placeholder="Search titles or authors..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-12 w-full sm:w-64 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-0 transition-all font-medium"
              />
            </div>
            
            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="pl-11 pr-8 h-12 w-full sm:w-48 rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-0 transition-all font-medium appearance-none"
              >
                <option value="All">All Genres</option>
                {genres.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="aspect-[3/4] bg-white rounded-[32px] animate-pulse shadow-sm border border-slate-100" />
            ))}
          </div>
        ) : filteredBooks.length > 0 ? (
          <div className="space-y-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {paginatedBooks.map(book => (
                <BookCard key={book.id} book={book} />
              ))}
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
                              ? 'bg-indigo-600 text-white border-indigo-600' 
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
        ) : (
          <div className="py-24 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No books found</h3>
            <p className="text-slate-500 mt-2">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>
    </div>
  );
};
