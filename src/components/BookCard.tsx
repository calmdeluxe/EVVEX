// LEGACY: CalmReader file, not part of EVEX product. To be unmounted in a later pass.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAppUrl } from '../lib/utils';
import { LazyCoverImage } from './LazyCoverImage';
import { Share2, Trash2, Copy, Check, MessageCircle, Twitter, Facebook, ChevronRight, Sparkles, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '../AuthContext';

interface BookCardProps {
  book: any;
  onDelete?: (id: string) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onDelete = () => {} }) => {
  const { isAdmin } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resolvedCover, setResolvedCover] = useState<string | null>(book.cover_image || null);

  const publicUrl = `${getAppUrl()}/book/${book.public_slug}/buy`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    const text = `Check out this interesting book: ${book.title}\n${publicUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareOnTwitter = () => {
    const text = `I just published/found this amazing card book: ${book.title}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(publicUrl)}`, '_blank');
  };

  const cards = React.useMemo(() => {
    try {
      return typeof book.cards_json === 'string' ? JSON.parse(book.cards_json) : (book.cards_json || []);
    } catch (e) { return []; }
  }, [book.cards_json]);

  const chapters = React.useMemo(() => {
    if (!Array.isArray(cards)) return [];
    return Array.from(new Set(cards.filter(c => c && c.chapter).map(c => c.chapter)));
  }, [cards]);

  return (
    <>
      <Card className="group hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] hover:-translate-y-2 transition-all duration-700 overflow-hidden border-none bg-white flex flex-col h-full relative isolate">
        {/* Organic Floating Elements */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-[60px] group-hover:bg-indigo-500/20 transition-all duration-700" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-pink-500/10 rounded-full blur-[60px] group-hover:bg-pink-500/20 transition-all duration-700" />
        
        {/* Advanced Stack Effect */}
        <div className="absolute top-4 left-4 right-4 bottom-0 bg-slate-100/80 rounded-[2.5rem] -z-10 translate-y-3 scale-[0.98] group-hover:translate-y-6 group-hover:scale-[0.97] transition-all duration-700" />
        <div className="absolute top-3 left-3 right-3 bottom-0 bg-slate-50 rounded-[2.5rem] -z-10 translate-y-2 scale-[0.99] group-hover:translate-y-4 group-hover:scale-[0.98] transition-all duration-700" />
        
        <div className="aspect-[3/4.2] bg-[#020617] relative flex items-center justify-center text-center overflow-hidden rounded-[2.5rem] transition-all duration-700 shadow-2xl group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.4)] m-1">
          {/* Animated Premium Border */}
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-10 p-[1px]">
            <div className="absolute -inset-[200%] bg-[conic-gradient(from_0deg,#6366f1,#a855f7,#ec4899,#6366f1)] animate-[spin_6s_linear_infinite]" />
            <div className="absolute inset-[2px] bg-[#020617] rounded-[2.4rem]" />
          </div>

          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
             {/* Dynamic Noise Texture */}
             <div className="absolute inset-0 mix-blend-overlay opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
             <div className="absolute top-0 left-0 w-full h-full opacity-40 blur-[80px] group-hover:opacity-70 group-hover:blur-[100px] transition-all duration-1000" style={{ background: 'radial-gradient(circle at 20% 20%, #4f46e5 0%, transparent 60%), radial-gradient(circle at 80% 80%, #7e22ce 0%, transparent 60%)' }} />
          </div>

          <div className="absolute inset-0 w-full h-full p-[2px] z-0 overflow-hidden rounded-[2.4rem]">
            <LazyCoverImage 
              bookId={book.id}
              initialSrc={book.cover_image}
              className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-2 transition-all duration-[1.5s] ease-out brightness-90 group-hover:brightness-105" 
              alt={book.title}
              onResolveCover={(src) => setResolvedCover(src)}
            />
          </div>
          {!resolvedCover && (
            <div className="absolute inset-0 z-10 space-y-6 p-10 w-full h-full flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px]">
               <div className="w-16 h-1.5 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full mb-6 shadow-[0_0_20px_rgba(255,255,255,0.4)]" />
               <h4 className="text-white text-2xl font-black italic line-clamp-4 leading-[1] tracking-tighter transition-all duration-700 drop-shadow-[0_15px_30px_rgba(0,0,0,1)] uppercase px-2 group-hover:scale-110 group-hover:tracking-normal group-hover:text-indigo-200">
                 {book.title}
               </h4>
               <div className="pt-8 flex justify-center gap-2 opacity-20 group-hover:opacity-100 transition-opacity">
                 {[1,2,3,4].map(i => <div key={i} className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]" style={{ animation: `pulse 2s infinite ${i*0.3}s` }} />)}
               </div>
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity z-10" />
          
          <div className="absolute bottom-8 left-0 right-0 z-20 px-8 transform translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700">
             <div className="backdrop-blur-xl bg-white/10 border border-white/30 p-2.5 rounded-[1.5rem] flex items-center justify-between shadow-2xl">
                <div className="flex flex-col pl-3">
                  <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Premium Entry</span>
                  <span className="text-white text-xs font-bold truncate max-w-[120px]">Read Insight Cards</span>
                </div>
                <div className="bg-white text-slate-950 p-2.5 rounded-2xl shadow-lg transition-all hover:bg-indigo-50 active:scale-90 hover:rotate-12">
                   <ChevronRight className="w-4 h-4" />
                </div>
             </div>
          </div>

          <div className="absolute top-6 right-6 z-20">
            <div className={`text-[10px] font-black tracking-[0.15em] uppercase border border-white/30 backdrop-blur-md px-4 py-1.5 rounded-full shadow-2xl ${
              (book.status === 1 || book.status === 'approved' || book.is_published === 1) 
                ? 'bg-emerald-500/90 text-white' 
                : (book.status === 'rejected') 
                  ? 'bg-rose-500/90 text-white' 
                  : 'bg-amber-400/90 text-slate-950'
            }`}>
              {(book.is_published === 1 || book.is_published === true) ? 'LIVE NOW' : (book.status === 1 || book.status === 'approved') ? 'READY' : 'EN ROUTE'}
            </div>
          </div>
        </div>

        <div className="p-8 pt-10 space-y-6 flex-1 flex flex-col">
          <div className="space-y-2">
            <h3 className="text-2xl font-black tracking-tighter line-clamp-2 group-hover:text-indigo-600 transition-colors duration-500 italic text-slate-900 border-l-8 border-indigo-100 pl-4 leading-tight">
              {book.title}
            </h3>
            <div className="flex items-center gap-3 pl-6">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span className="text-slate-500 text-[11px] font-black uppercase tracking-wider">
                    {cards.length} STACKS
                  </span>
                </div>
                {chapters.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {chapters.slice(0, 2).map((ch, i) => (
                      <span key={i} className="text-[7px] font-black px-1.5 bg-indigo-50 text-indigo-500 rounded border border-indigo-100 uppercase">
                        {ch}
                      </span>
                    ))}
                    {chapters.length > 2 && <span className="text-[7px] font-black text-slate-300">+{chapters.length - 2}</span>}
                  </div>
                )}
              </div>
              <span className="text-slate-200 self-center">|</span>
              <div className={`px-3 py-1 rounded-full text-[11px] font-black tracking-tight self-center ${book.price > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-green-50 text-green-700'}`}>
                {book.price > 0 ? `₦${book.price.toLocaleString()}` : 'FREE ACCESS'}
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full mt-auto">
            <Button size="lg" asChild className="h-14 text-xs font-black flex-1 bg-slate-950 hover:bg-indigo-700 text-white shadow-2xl shadow-indigo-200 rounded-[1.5rem] border-none transition-all hover:scale-[1.03] active:scale-95 group relative overflow-hidden">
              <Link to={`/read/${book.id}`} className="flex items-center justify-center gap-3 w-full">
                <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-400/30 w-full group-hover:h-full transition-all duration-300 -z-10" />
                DIVE IN NOW <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" onClick={() => setShareOpen(true)} className="h-14 w-14 p-0 rounded-[1.5rem] border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 text-slate-400 hover:text-indigo-700 transition-all shadow-sm">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
          
          {isAdmin && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-100/50 opacity-40 group-hover:opacity-100 transition-all duration-500">
               <div className="flex gap-2">
                  <Button size="sm" variant="ghost" asChild className="h-10 text-[10px] font-extrabold gap-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl px-4 transition-all hover:shadow-sm">
                    <Link to={`/edit/${book.id}`}>Revise</Link>
                  </Button>
                  <Button size="sm" variant="ghost" asChild className="h-10 text-[10px] font-extrabold gap-2 text-slate-500 hover:text-emerald-600 hover:bg-white rounded-xl px-4 transition-all hover:shadow-sm">
                    <Link to={`/sell/${book.id}`}>Growth</Link>
                  </Button>
               </div>
               <Button size="sm" variant="ghost" onClick={() => onDelete(book.id)} className="h-10 w-10 p-0 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                 <Trash2 className="w-4 h-4" />
               </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Share Modal */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share this Book</DialogTitle>
            <DialogDescription>
              Share "{book.title}" with your friends and help them discover card books.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <label htmlFor="link" className="sr-only">Link</label>
                <Input
                  id="link"
                  defaultValue={publicUrl}
                  readOnly
                  className="bg-gray-50 h-10"
                />
              </div>
              <Button size="sm" className="px-3 bg-green-700 hover:bg-green-800" onClick={copyToClipboard}>
                <span className="sr-only">Copy</span>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-500 text-center">Or share via</p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" size="icon" className="rounded-full w-12 h-12 border-green-100 text-green-600 hover:bg-green-50" onClick={shareOnWhatsApp}>
                  <MessageCircle className="h-6 w-6" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full w-12 h-12 border-blue-100 text-blue-400 hover:bg-blue-50" onClick={shareOnTwitter}>
                  <Twitter className="h-6 w-6" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full w-12 h-12 border-blue-800 text-blue-800 hover:bg-blue-50" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`, '_blank')}>
                  <Facebook className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="secondary" onClick={() => setShareOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
