// LEGACY: CalmReader file, not part of EVEX product. To be unmounted in a later pass.
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { Calendar, User, ArrowLeft, Share2, Facebook, Twitter, Link2, Clock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../AuthContext';
import Markdown from 'react-markdown';

export const BlogPost: React.FC = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [blog, setBlog] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // SHARE FIX: added share link for blog post with ref parameter
  const handleShare = async (platform?: 'twitter' | 'facebook') => {
    if (!user) {
      alert("Sign in to share and earn rewards!");
      return;
    }
    const shareUrl = `${window.location.origin}/blog/${slug}?ref=${user.id}`;
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(blog?.title || '')}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    } else {
      if (navigator.share) {
        try {
          await navigator.share({
            title: blog?.title || 'Insight',
            url: shareUrl
          });
        } catch (e) {
          console.warn("Web Share failed:", e);
        }
      } else {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const { data } = await supabase
          .from('books')
          .select('*')
          .or(`public_slug.eq."${slug}",id.eq."${slug}"`)
          .single();
        
        if (data) {
          setBlog(data);
          try {
            const parsedCards = typeof data.cards_json === 'string' ? JSON.parse(data.cards_json) : (data.cards_json || []);
            setCards(Array.isArray(parsedCards) ? parsedCards : []);
          } catch (e) {
            setCards([]);
          }
        }
      } catch (err) {
        console.error("Error fetching blog post:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen pt-32 flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-indigo-600" />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Article...</p>
    </div>
  );

  if (!blog) return (
    <div className="min-h-screen pt-32 text-center px-6">
      <h1 className="text-3xl font-black text-slate-900 mb-4">Article Not Found</h1>
      <Button onClick={() => navigate('/blog')} variant="outline" className="rounded-xl">Return to Journal</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100 h-20 flex items-center px-6">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <BookOpen className="w-6 h-6 text-[#EAB308]" />
            <span className="font-sans font-black text-xl tracking-tighter text-slate-900">CalmReader</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/blog" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">Journal</Link>
            <button 
              onClick={() => {
                if (window.history.length > 2) {
                  navigate(-1);
                } else {
                  navigate(user ? '/dashboard' : '/');
                }
              }}
              className="text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-colors bg-transparent border-none cursor-pointer focus:outline-none"
            >
              Home
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative h-[60vh] min-h-[400px] w-full overflow-hidden">
        <img 
          src={blog.cover_image || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=1200'} 
          className="w-full h-full object-cover" 
          alt={blog.title} 
        />
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />
        
        <div className="absolute inset-0 flex items-center justify-center p-6 mt-16">
          <div className="max-w-4xl w-full text-center space-y-6">
            <Badge className="bg-indigo-500 text-white border-none px-4 py-1 text-xs font-black uppercase tracking-widest">{blog.category || 'Journal'}</Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-black text-white tracking-tight leading-[1.1]">
              {blog.title}
            </h1>
            <div className="flex items-center justify-center gap-6 text-white/80 font-bold text-sm uppercase tracking-widest">
              <span className="flex items-center gap-2"><User className="w-4 h-4" /> {blog.author_name || 'Calm Editorial'}</span>
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(blog.created_at).toLocaleDateString()}</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {Math.max(3, cards.length)} min read</span>
            </div>
          </div>
        </div>

        <Button 
          onClick={() => navigate('/blog')} 
          variant="ghost" 
          className="absolute top-24 left-8 text-white hover:bg-white/10 rounded-full h-12 w-12 p-0"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
      </div>

      {/* Content Section */}
      <div className="max-w-3xl mx-auto px-6 -mt-20 relative z-10">
        <div className="bg-white rounded-[48px] p-8 md:p-16 shadow-2xl shadow-slate-200 border border-slate-100">
          <div className="prose prose-slate prose-lg max-w-none">
            {cards.map((card, idx) => (
              <div key={idx} className="mb-16 last:mb-0 space-y-8">
                {card.title && idx > 0 && (
                  <h2 className="text-3xl font-serif font-black text-slate-900 tracking-tight border-l-4 border-indigo-600 pl-6 py-2">
                    {card.title}
                  </h2>
                )}
                
                {card.image_url && (
                  <div className="rounded-3xl overflow-hidden shadow-xl shadow-slate-100">
                    <img src={card.image_url} alt={card.title || 'Blog visual'} className="w-full h-auto" />
                  </div>
                )}

                <div className="markdown-body text-slate-700 leading-relaxed text-lg font-medium">
                  <Markdown>{card.text}</Markdown>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-20 pt-12 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-xl">
                {(blog.author_name || 'C')[0]}
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">{blog.author_name || 'Calm Editorial'}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Content Architect</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Share this insight</span>
              <div className="flex gap-2 items-center">
                <Button onClick={() => handleShare('twitter')} variant="outline" size="icon" className="rounded-xl hover:text-indigo-600 transition-colors" title="Share on Twitter"><Twitter className="w-4 h-4" /></Button>
                <Button onClick={() => handleShare('facebook')} variant="outline" size="icon" className="rounded-xl hover:text-indigo-600 transition-colors" title="Share on Facebook"><Facebook className="w-4 h-4" /></Button>
                <Button onClick={() => handleShare()} variant="outline" size="icon" className={`rounded-xl transition-all ${copied ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'hover:text-indigo-600'}`} title="Copy Link / Share">
                  <Link2 className="w-4 h-4" />
                </Button>
                {copied && <span className="text-emerald-600 font-bold text-xs animate-in fade-in duration-300">Copied!</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
