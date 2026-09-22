import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { LazyCoverImage } from '../components/LazyCoverImage';
import { Badge } from '@/components/ui/badge';
import { Search, Play, Clock, User, Film, BookOpen, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import axios from 'axios';

export const BrowseVideos: React.FC = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchVideos = async () => {
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
            console.warn("[BrowseVideos] Direct fetch empty or failed, trying API...", dbError);
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
          console.warn("[BrowseVideos] Error during videos fetch, attempting API fallback...", err);
          try {
            const { data } = await axios.get('/api/marketplace/books');
            if (data && data.books) {
              finalBooks = data.books;
            }
          } catch (apiErr) {
            console.error("[BrowseVideos] API fallback also failed:", apiErr);
          }
        }

        const videoList = finalBooks.filter((b: any) => 
          (b.admin_note || '').includes('type:video') && 
          (b.is_published === true || b.is_published === 1)
        );
        setVideos(videoList);
      } catch (err) {
        console.error("Error fetching videos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const filteredVideos = videos.filter(b => 
    (b.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (b.author_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 pb-20 font-sans">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 h-20 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <BookOpen className="w-6 h-6 text-[#EAB308]" />
            <span className="font-sans font-black text-xl tracking-tighter text-white">CalmReader</span>
          </Link>
          <button 
            onClick={() => {
              if (window.history.length > 2) {
                navigate(-1);
              } else {
                navigate(user ? '/dashboard' : '/');
              }
            }}
            className="text-sm font-bold text-white/50 hover:text-[#EAB308] flex items-center gap-2 transition-colors bg-transparent border-none cursor-pointer focus:outline-none"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
        </div>
      </nav>

      <div className="pt-32 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-10 mb-20">
          <div className="space-y-6 max-w-2xl">
            <Badge className="bg-red-600/20 text-red-500 border-red-500/30 px-4 py-1 text-xs font-black uppercase tracking-widest">Cinema Hall</Badge>
            <h1 className="text-5xl md:text-7xl font-serif font-black text-white tracking-tight leading-[0.9]">
              Visual <span className="italic text-red-600">Mastery</span>
            </h1>
            <p className="text-xl text-slate-400 font-medium leading-relaxed">
              Experience knowledge in motion. Curated video series and masterclasses designed for deep immersion.
            </p>
          </div>

          <div className="w-full md:w-96 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-red-500 transition-colors" />
            <Input 
              placeholder="Search masterclasses..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-16 pl-14 rounded-2xl border-white/10 bg-white/5 focus:bg-white/10 text-white transition-all text-lg font-medium"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-video bg-white/5 rounded-[40px] animate-pulse" />
            ))}
          </div>
        ) : filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredVideos.map(video => (
              <Card 
                key={video.id} 
                className="border-none shadow-none bg-transparent group cursor-pointer"
                onClick={() => navigate(`/read/${video.id}`)}
              >
                <div className="aspect-video relative rounded-[40px] overflow-hidden mb-6 bg-slate-900 border border-white/5 ring-4 ring-transparent group-hover:ring-red-600/20 transition-all duration-500 shadow-2xl">
                  <LazyCoverImage 
                    bookId={video.id} 
                    initialSrc={video.cover_image} 
                    className="w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:opacity-100 transition-all duration-1000" 
                    fallbackSrc="https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800" 
                    alt={video.title} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80 group-hover:opacity-40 transition-opacity" />
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-600/20 transform group-hover:scale-110 transition-transform duration-500">
                      <Play className="w-8 h-8 text-white fill-current ml-1" />
                    </div>
                  </div>

                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-[10px] font-black text-white/60 uppercase tracking-widest">
                    <span className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                      <Clock className="w-3 h-3 text-red-500" /> 12:45
                    </span>
                    <span className="bg-red-600 text-white px-3 py-1.5 rounded-full">4K HDR</span>
                  </div>
                </div>

                <div className="space-y-3 px-2 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-4 text-white/40 text-[10px] font-black uppercase tracking-widest leading-none">
                    <span className="text-red-500">{video.category || 'Series'}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="flex items-center gap-2"><User className="w-3 h-3" /> {video.author_name}</span>
                  </div>
                  <h3 className="text-3xl font-black text-white leading-tight group-hover:text-red-500 transition-colors">
                    {video.title}
                  </h3>
                  <p className="text-slate-500 font-medium line-clamp-2">
                    {video.description || "Comprehensive visual guide into complex narratives."}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 bg-white/5 rounded-[64px] border border-white/5">
            <Film className="w-16 h-16 text-white/10 mx-auto mb-6" />
            <h3 className="text-3xl font-black text-white">No masterpiece found</h3>
            <p className="text-slate-500 mt-2 text-lg">Check back later for new visual content</p>
          </div>
        )}
      </div>
    </div>
  );
};
