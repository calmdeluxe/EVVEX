import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Card, CardContent } from '@/components/ui/card';
import { LazyCoverImage } from '../components/LazyCoverImage';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, User, ArrowRight, Newspaper, BookOpen, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useAuth } from '../AuthContext';
import axios from 'axios';

export const BrowseBlogs: React.FC = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        let finalBooks: any[] = [];
        try {
          // Join-free query for speed and to avoid table RLS statement timeouts.
          let { data: dbBooks, error: dbError } = await supabase
            .from('books')
            .select('id, title, user_id, price, pdf_price, public_slug, is_published, status, admin_note, report_count, created_at, genre_id')
            .eq('is_published', 1)
            .neq('status', -1)
            .order('created_at', { ascending: false });

          if (dbError || !dbBooks || dbBooks.length === 0) {
            console.warn("[BrowseBlogs] Direct fetch empty or failed, trying API...", dbError);
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
          console.warn("[BrowseBlogs] Error during blogs fetch, attempting API fallback...", err);
          try {
            const { data } = await axios.get('/api/marketplace/books');
            if (data && data.books) {
              finalBooks = data.books;
            }
          } catch (apiErr) {
            console.error("[BrowseBlogs] API fallback also failed:", apiErr);
          }
        }

        const blogList = finalBooks.filter((b: any) => 
          (b.admin_note || '').includes('type:blog') && 
          (b.is_published === true || b.is_published === 1)
        );
        setBlogs(blogList);
      } catch (err) {
        console.error("Error fetching blogs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  const filteredBlogs = blogs.filter(b => 
    (b.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (b.author_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Navigation Bar */}
      <nav className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 h-20 flex items-center px-6">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <BookOpen className="w-6 h-6 text-[#EAB308]" />
            <span className="font-sans font-black text-xl tracking-tighter text-slate-900">CalmReader</span>
          </Link>
          <button 
            onClick={() => {
              if (window.history.length > 2) {
                navigate(-1);
              } else {
                navigate(user ? '/dashboard' : '/');
              }
            }}
            className="text-sm font-bold text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors bg-transparent border-none cursor-pointer focus:outline-none"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
        </div>
      </nav>

      <div className="pt-16 px-6 max-w-6xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <Badge className="bg-slate-100 text-slate-800 border-none px-4 py-1 font-bold">Insight Articles</Badge>
          <h1 className="text-5xl md:text-7xl font-serif font-black text-slate-950 tracking-tight">The Calm Journal</h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">Wisdom, updates, and deep dives into our growing collection of digital knowledge.</p>
        </div>

        <div className="relative max-w-xl mx-auto mb-20">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <Input 
            placeholder="Search articles..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all text-lg font-medium"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="space-y-4">
                <div className="aspect-[16/10] bg-slate-50 rounded-3xl animate-pulse" />
                <div className="h-6 w-3/4 bg-slate-50 rounded-full animate-pulse" />
                <div className="h-4 w-1/2 bg-slate-50 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredBlogs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredBlogs.map(blog => (
              <Card 
                key={blog.id} 
                className="border-none shadow-none bg-transparent group cursor-pointer"
                onClick={() => navigate(`/blog/${blog.public_slug || blog.id}`)}
              >
                <div className="aspect-[16/10] relative rounded-[32px] overflow-hidden mb-6 bg-slate-100">
                  <LazyCoverImage 
                    bookId={blog.id} 
                    initialSrc={blog.cover_image} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    fallbackSrc="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800" 
                    alt={blog.title} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 to-transparent" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 text-indigo-600">
                      {blog.category || 'Article'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> {new Date(blog.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                    {blog.title}
                  </h3>
                  <p className="text-slate-500 line-clamp-2 font-medium">
                    {blog.description || "Unlocking the secrets of digital publishing and interactive storytelling."}
                  </p>
                  <div className="pt-2 flex items-center gap-2 text-indigo-600 font-bold text-sm">
                    Read More <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-[48px] border border-slate-100">
            <Newspaper className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900">No articles found</h3>
            <p className="text-slate-500 mt-2">Check back later for new insights</p>
          </div>
        )}
      </div>
    </div>
  );
};
