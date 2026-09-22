import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { BookCard } from '../components/BookCard';
import { UserCircle, MapPin, Link as LinkIcon, Twitter, Github, Award, Globe, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const AuthorProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [author, setAuthor] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuthorData = async () => {
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();
        
        if (profile) {
          setAuthor(profile);
          const { data: authorBooks } = await supabase
            .from('books')
            .select('*')
            .eq('author_id', profile.id)
            .or('is_published.eq.1,status.eq.1');
          setBooks(authorBooks || []);
        }
      } catch (err) {
        console.error("Error fetching author profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuthorData();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen pt-32 flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-amber-600" />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Calling Architect...</p>
    </div>
  );

  if (!author) return (
    <div className="min-h-screen pt-32 text-center">
      <h1 className="text-3xl font-black text-slate-900 mb-4">Architect Not Found</h1>
      <Button onClick={() => navigate('/authors')} variant="outline" className="rounded-xl">Return to Directory</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Cover Header */}
      <div className="h-64 md:h-80 w-full bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-grid-white/[0.02]" />
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row gap-10 -mt-24 relative z-10">
          {/* Profile Sidebar */}
          <div className="md:w-80 shrink-0 space-y-8">
            <div className="bg-white rounded-[48px] p-8 shadow-2xl shadow-slate-200 border border-slate-100 text-center">
              <div className="w-40 h-40 rounded-[48px] mx-auto overflow-hidden ring-8 ring-slate-50 mb-6 bg-slate-100">
                {author.avatar_url ? (
                  <img src={author.avatar_url} className="w-full h-full object-cover" alt={author.full_name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-amber-600 text-white text-5xl font-black">
                    {(author.full_name || 'A')[0]}
                  </div>
                )}
              </div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">{author.full_name || author.username}</h1>
              <p className="text-sm font-black text-amber-600 uppercase tracking-widest mt-1">@{author.username || 'calmauthor'}</p>
              
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {author.is_premium && <Badge className="bg-amber-100 text-amber-700 border-none px-3 font-bold">Premium Curator</Badge>}
                <Badge variant="outline" className="border-slate-100 text-slate-400 font-bold uppercase tracking-tighter text-[9px]">ID: {author.id.substring(0, 8)}</Badge>
              </div>

              <div className="mt-8 space-y-4 text-left">
                {author.bio && <p className="text-slate-500 text-sm font-medium leading-relaxed italic">"{author.bio}"</p>}
                
                <div className="space-y-3 pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-3 text-slate-400 font-bold text-xs">
                    <MapPin className="w-4 h-4" /> Lagos, Nigeria
                  </div>
                  <div className="flex items-center gap-3 text-indigo-600 font-bold text-xs hover:underline cursor-pointer">
                    <Globe className="w-4 h-4" /> calmreader.shop
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-50 flex justify-center gap-4">
                <Button variant="ghost" size="icon" className="rounded-2xl text-slate-400 hover:text-indigo-600"><Twitter className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon" className="rounded-2xl text-slate-400 hover:text-indigo-600"><Github className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon" className="rounded-2xl text-slate-400 hover:text-indigo-600"><LinkIcon className="w-5 h-5" /></Button>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[40px] p-10 text-white space-y-6 shadow-2xl">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Architect Stats</h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-3xl font-black text-amber-500">{books.length}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/60">Works</p>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black text-amber-500">12.4k</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/60">Swipes</p>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black text-amber-500">92%</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/60">Rating</p>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black text-amber-500">248</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/60">Followers</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Areas */}
          <div className="flex-1 space-y-12">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-3xl font-serif font-black text-slate-900 tracking-tight">Published Masterpieces</h2>
                <p className="text-slate-500 font-medium">Explore the collection by this architect.</p>
              </div>
              <BookOpen className="w-12 h-12 text-slate-200" />
            </div>

            {books.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {books.map(book => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <div className="py-24 text-center bg-white rounded-[48px] border border-dashed border-slate-200">
                <Badge variant="ghost" className="mb-4 text-slate-300 font-extrabold uppercase tracking-widest">Architectural Drafts Only</Badge>
                <p className="text-slate-400 font-medium">This architect hasn't published any public works yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
