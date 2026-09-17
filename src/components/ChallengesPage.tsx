import React, { useState } from 'react';
import { Search, Trophy, Landmark, Flame, Compass, HelpCircle, ArrowUpRight, ShieldCheck, Users, Clock, Sparkles } from 'lucide-react';
import { Challenge } from '../types';

interface ChallengesPageProps {
  challenges: Challenge[];
  onJoinChallenge: (challenge: Challenge) => void;
  onPlayQuiz: (challenge: Challenge) => void;
}

export default function ChallengesPage({ challenges, onJoinChallenge, onPlayQuiz }: ChallengesPageProps) {
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'upcoming' | 'sponsored' | 'free' | 'paid'>('all');
  const [searchWord, setSearchWord] = useState('');

  const filterTabsList: { id: typeof filterTab; label: string }[] = [
    { id: 'all', label: 'All Challenges' },
    { id: 'active', label: '● Live Active' },
    { id: 'upcoming', label: '⏳ Upcoming' },
    { id: 'sponsored', label: '🔥 Sponsored' },
    { id: 'free', label: '🎁 Free Entry' },
    { id: 'paid', label: '💳 Premium Entry' }
  ];

  // Filtering logic
  const filteredList = challenges.filter((chal) => {
    // Search query match
    const matchesSearch = chal.title.toLowerCase().includes(searchWord.toLowerCase()) || 
                          chal.category.toLowerCase().includes(searchWord.toLowerCase()) ||
                          chal.description.toLowerCase().includes(searchWord.toLowerCase());
    
    if (!matchesSearch) return false;

    // Filter type match
    switch (filterTab) {
      case 'active':
        return chal.status === 'active';
      case 'upcoming':
        return chal.status === 'upcoming';
      case 'sponsored':
        return chal.status === 'sponsored';
      case 'free':
        return chal.entryFee === 0;
      case 'paid':
        return chal.entryFee > 0;
      default:
        return true;
    }
  });

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto text-left">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-950 flex items-center gap-2 tracking-tight">
            Challenge Arena
            <Sparkles className="w-5 h-5 text-indigo-500 fill-indigo-400" />
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Select a creative bowl or a sponsored quiz chat map to start cashing out.</p>
        </div>

        {/* Local search engine */}
        <div className="dashboard-search-bar flex items-center pl-3.5 pr-2 py-2.5 w-full sm:w-64">
          <Search className="w-4.5 h-4.5 text-slate-400 shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Search active maps..."
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none w-full"
          />
        </div>
      </div>

      {/* FILTER TABS BLOCK */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-4 mb-8">
        {filterTabsList.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            className={`px-4.5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterTab === tab.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-slate-500 hover:text-slate-800 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CARD GRID */}
      {filteredList.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-100 flex flex-col items-center justify-center min-h-[300px]">
          <Compass className="w-12 h-12 text-slate-300 mb-4 stroke-[1.5px]" />
          <h3 className="text-lg font-bold text-slate-800">No active challenges found</h3>
          <p className="text-sm text-slate-400 max-w-sm mt-1">Verify your character spelling filters or adjust categories to discover map events.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredList.map((chal) => (
            <div key={chal.id} className="challenge-card flex flex-col h-full bg-white select-none">
              
              {/* Media Card head */}
              <div className="relative overflow-hidden aspect-video transform-gpu">
                <img 
                  src={chal.coverImage} 
                  alt={chal.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
                
                {/* Status custom badge overlays */}
                <span className={`challenge-badge ${
                  chal.status === 'sponsored' ? 'badge-sponsored' : 
                  chal.status === 'active' ? 'badge-active' : 
                  chal.status === 'upcoming' ? 'badge-upcoming' : 'badge-completed'
                }`}>
                  {chal.status === 'sponsored' ? '🔥 SPONSORED' : 
                   chal.status === 'active' ? '● LIVE' : 
                   chal.status === 'upcoming' ? '⏳ UPCOMING' : '✓ ENDED'}
                </span>

                {/* Cover price tag */}
                <div className="absolute top-4 right-4 z-10">
                  <div className={`entry-fee-tag text-xs ${chal.entryFee === 0 ? 'free font-bold' : 'font-extrabold text-slate-800'}`}>
                    {chal.entryFee === 0 ? 'FREE ENTRY' : `₦${chal.entryFee.toFixed(2)}`}
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3.5 shrink-0">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider bg-slate-100 text-slate-500 py-1 px-2.5 rounded-lg">
                    {chal.category}
                  </span>
                  <div className="challenge-countdown font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{chal.timeLeft}</span>
                  </div>
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-2 line-clamp-1">
                  {chal.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-2 max-w-sm flex-1">
                  {chal.description}
                </p>

                {/* Participant and actionable triggers footer */}
                <div className="border-t border-slate-100 pt-5 mt-auto flex items-center justify-between shrink-0">
                  <div className="text-left flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Estimated Prize Pool</span>
                    <span className="text-lg font-black text-emerald-600 font-mono tracking-tight">₦{chal.prizePool.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{chal.participants.toLocaleString()}</span>
                    </div>

                    <button
                      onClick={() => {
                        if (chal.questions && chal.questions.length > 0) {
                          onPlayQuiz(chal);
                        } else {
                          onJoinChallenge(chal);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-colors text-xs cursor-pointer text-center"
                    >
                      {chal.questions && chal.questions.length > 0 ? 'Play Quiz' : 'Join Challenge'}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
