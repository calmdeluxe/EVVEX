import React, { useState } from 'react';
import { Play, Share2, Trophy, BookOpen, BrainCircuit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getAppUrl } from '../lib/utils';

// TRIVIA FIX: thumbnail with play button
interface TriviaCardProps {
  trivia: any;
  onPlayClick: (trivia: any) => void;
  onShareClick: (triviaId: string) => void;
  copiedId?: string | null;
  accountTier?: string;
  isAdmin?: boolean;
}

export const TriviaCard: React.FC<TriviaCardProps> = ({
  trivia,
  onPlayClick,
  onShareClick,
  copiedId,
  accountTier,
  isAdmin
}) => {
  const isGeneral = trivia.id === 'general' || !trivia.book_id;
  const isMarketing = trivia.type !== 'reader_reward';
  const isUnlocked = isMarketing || isGeneral || trivia.hasAccess || trivia.readingCompleted || isAdmin || accountTier === 'author';
  const isLocked = !isUnlocked;

  return (
    <div 
      className="w-full flex flex-col group transition-all duration-300 relative cursor-pointer"
      onClick={() => onPlayClick(trivia)}
    >
      {/* Thumbnail Container: Same aspect ratio and responsive scaling as eBook thumbnails */}
      <div className="w-full aspect-[3/4] rounded-[1.5rem] relative overflow-hidden bg-[#020617] shadow-md group-hover:shadow-2xl transition-all duration-500 m-1 select-none">
        
        {/* Dynamic Gradients / Noise Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute inset-0 mix-blend-overlay opacity-25 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
          <div 
            className="absolute top-0 left-0 w-full h-full opacity-40 blur-[40px] group-hover:opacity-60 transition-all duration-700" 
            style={{ 
              background: isGeneral 
                ? 'radial-gradient(circle at 20% 20%, #d97706 0%, transparent 60%), radial-gradient(circle at 80% 80%, #b45309 0%, transparent 60%)'
                : 'radial-gradient(circle at 20% 20%, #4f46e5 0%, transparent 60%), radial-gradient(circle at 80% 80%, #7e22ce 0%, transparent 60%)' 
            }} 
          />
        </div>

        {/* Thumbnail Image */}
        {trivia.thumbnail_url || trivia.cover_image ? (
          <img 
            src={trivia.thumbnail_url || trivia.cover_image} 
            alt={trivia.title} 
            className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition-all duration-700 brightness-90 group-hover:brightness-100"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col p-4 justify-between text-white relative z-10">
            <BrainCircuit className="w-6 h-6 text-white/80" />
            <span className="font-mono text-[9px] tracking-wider uppercase bg-white/10 px-2 py-0.5 rounded text-white font-bold w-max">
              {trivia.book_title || 'General Knowledge'}
            </span>
          </div>
        )}

        {/* Dark overlay for text contrast and premium feel */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />

        {/* Locked / Ready Overlays */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          <Badge className={`border-none text-[8px] font-black tracking-widest uppercase px-2 py-0.5 shadow-sm rounded-full ${
            isLocked 
              ? 'bg-amber-600 text-white' 
              : isMarketing
                ? 'bg-emerald-500/90 text-white'
                : 'bg-indigo-600 text-white'
          }`}>
            {isLocked ? 'Read 90% to unlock' : isMarketing ? 'Open Challenge' : 'Reader Reward'}
          </Badge>
        </div>

        {/* T-Points Overlay */}
        <div className="absolute top-2 right-2 z-10">
          <span className="bg-amber-600/95 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-sm">
            +{trivia.reward_points || 100} TP
          </span>
        </div>

        {/* Circular Play Button Overlay: Small, circular (▶) bottom-right of thumbnail */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayClick(trivia);
          }}
          disabled={trivia.alreadyAttempted}
          className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg transition-all z-20 ${
            trivia.alreadyAttempted
              ? 'bg-gray-500 cursor-not-allowed opacity-80'
              : 'bg-amber-500 hover:bg-amber-600 hover:scale-110 active:scale-90 rotate-0 hover:rotate-12'
          }`}
          title={trivia.alreadyAttempted ? "Already Completed" : "Play Trivia"}
        >
          <Play className="w-4 h-4 fill-white ml-0.5" />
        </button>
      </div>

      {/* Title & Info below the thumbnail */}
      <div className="mt-2.5 px-1.5 flex flex-col">
        <h4 className="text-xs font-black tracking-tighter text-slate-900 group-hover:text-amber-700 transition-colors duration-300 line-clamp-1 italic">
          {trivia.title}
        </h4>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 line-clamp-1">
          {isGeneral ? 'General Knowledge' : (trivia.book_title || 'Linked eBook')}
        </span>
        
        {/* Play Status / Price text */}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] font-black text-amber-600">
            {trivia.price > 0 ? `₦${Number(trivia.price).toLocaleString()}` : 'Free Entry'}
          </span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onShareClick(trivia.session_id || trivia.id);
            }}
            className={`p-1.5 rounded-full transition-all border border-transparent ${
              copiedId === (trivia.session_id || trivia.id) 
                ? 'bg-emerald-50 text-emerald-600' 
                : 'hover:bg-amber-50 text-slate-400 hover:text-amber-600'
            }`}
            title="Share Trivia"
          >
            <Share2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
