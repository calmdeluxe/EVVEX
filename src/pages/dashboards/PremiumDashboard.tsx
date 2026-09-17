import React, { useState } from 'react';
import { 
  Crown, Sparkles, Zap, BookOpen, MessageSquare, Award, ArrowUpRight, Check, 
  ChevronRight, Play, BookText, Filter, Star, Send, ShieldAlert, Heart
} from 'lucide-react';
import { User, Challenge } from '../../types';

interface PremiumDashboardProps {
  currentUser: User;
  challenges: Challenge[];
  onPlayQuiz: (c: Challenge) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function PremiumDashboard({
  currentUser,
  challenges,
  onPlayQuiz,
  onToast
}: PremiumDashboardProps) {
  
  // Filter premium quizzes from the app challenges list
  const premiumQuizzes = challenges.filter(c => c.category === 'Quiz');

  // Exclusive Chat with House mentors / Authors
  const [messages, setMessages] = useState([
    { id: 'msg_1', sender: 'Tutor Samuel', role: 'Mentor', text: 'Good morning champions! Today we will discuss how to optimize the Paystack webhook handshake.', time: '10:14 AM' },
    { id: 'msg_2', sender: 'Lagos Lens', role: 'Creator', text: 'I just uploaded my custom photo challenge guide to the feed.', time: '10:28 AM' }
  ]);
  const [newMessage, setNewMessage] = useState('');

  const submitPeerMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg = {
      id: `m_${Date.now()}`,
      sender: currentUser.username,
      role: 'Premium Member',
      text: newMessage,
      time: 'Just now'
    };
    setMessages((prev) => [...prev, msg]);
    setNewMessage('');
    onToast('Message routed through the secure Premium House tunnel!', 'success');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in text-left">
      
      {/* PREMIUM WELCOME CARD */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 blur-3xl rounded-full" />
        
        <div className="relative z-10 flex items-center gap-4.5">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20">
            <Crown className="w-8 h-8 text-yellow-300 fill-yellow-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              Premium Sovereign Charter Active
              <Sparkles className="w-5 h-5 text-yellow-350 fill-yellow-350 animate-pulse" />
            </h1>
            <p className="text-xs text-amber-50 font-medium mt-1">
              Double (2x) payout rewards, early-access books, direct elite tutor chat, and exclusive challenges are fully unlocked.
            </p>
          </div>
        </div>

        {/* DOUBLE REWARD MULTIPLIER MULTIPLIER BOX */}
        <div className="relative z-10 bg-black/15 backdrop-blur-md border border-white/10 p-3 px-4 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-yellow-400 text-slate-900 flex items-center justify-center font-black text-xs shadow-sm">
            2X
          </div>
          <div>
            <p className="text-[10px] text-amber-200 font-extrabold uppercase">Earn Multiplier</p>
            <p className="text-xs font-black text-white mt-0.5">Dual Cash Bounty payouts</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: EXCLUSIVE QUIZZES & EBOOKS */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* EXCLUSIVE PREMIUM QUIZ SESSIONS */}
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-sm font-black text-slate-905">Premium Exclusive Quizzes</h3>
                  <p className="text-[10.5px] text-slate-400 font-semibold">Take dynamic examinations at standard double prize metrics.</p>
                </div>
              </div>
              <span className="text-[9.5px] font-black uppercase text-amber-600 bg-amber-50 py-1 px-2.5 rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-600 fill-amber-600" />
                <span>2x Bonus Active</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {premiumQuizzes.map((quiz) => (
                <div key={quiz.id} className="p-4 rounded-2xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 hover:border-amber-400 transition-all text-left flex flex-col justify-between h-48">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-black text-amber-700 bg-amber-50/50 py-0.5 px-2 rounded-md">
                        {quiz.timeLeft} remaining
                      </span>
                      <span className="text-[10px] font-bold text-slate-405">
                        {quiz.participants} players
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-sm mt-3 group-hover:text-amber-700 transition-colors">
                      {quiz.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 font-semibold leading-relaxed">
                      {quiz.description || 'Structured quiz challenge compiled by master level Tutors.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100/50 mt-3">
                    <div>
                      <p className="text-[9px] text-slate-400 font-black uppercase">Standard Bounty</p>
                      <p className="text-sm font-black text-amber-600 flex items-center gap-1.5 mt-0.5">
                        ₦{(quiz.prizePool).toLocaleString()}
                        <span className="text-[10px] text-slate-400 font-semibold line-through">
                          ₦{Math.floor(quiz.prizePool / 2)}
                        </span>
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        onPlayQuiz(quiz);
                        onToast(`Armed with a 2x premium multiplier for "${quiz.title}"!`, 'success');
                      }}
                      className="py-1.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>Play Now</span>
                      <Play className="w-3 h-3 fill-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: PEER TUTOR CHAT TUNNEL */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          <div className="bg-slate-900 text-slate-100 rounded-3xl p-5 border border-slate-800 shadow-sm flex flex-col h-[500px]">
            <div className="border-b border-slate-800 pb-3.5 flex items-center gap-2.5 mb-4 justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-400" />
                <div className="text-left">
                  <h3 className="text-xs font-black text-white">Elite tutor Chat</h3>
                  <p className="text-[10px] text-slate-400 font-semibold font-mono">Channel locked to premium tier</p>
                </div>
              </div>
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            </div>

            {/* MESSAGE TIMELINE */}
            <div className="flex-grow overflow-y-auto space-y-3.5 pr-1.5 flex flex-col text-left">
              {messages.map((m) => (
                <div key={m.id} className="p-3.5 rounded-2xl bg-slate-800 border border-slate-750 max-w-[90%] self-start">
                  <div className="flex items-center justify-between gap-3 text-[10px] font-black">
                    <span className="text-amber-400">{m.sender}</span>
                    <span className="text-slate-400 font-semibold bg-white/5 py-0.5 px-1.5 rounded">{m.role}</span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium mt-1 leading-normal font-sans">
                    {m.text}
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold mt-1 text-right">{m.time}</p>
                </div>
              ))}
            </div>

            {/* SEND MESSAGE FORM */}
            <form onSubmit={submitPeerMessage} className="mt-4 pt-4 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                required
                placeholder="Ask our master tutors a question..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-grow bg-slate-850 border border-slate-750 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 placeholder-slate-500"
              />
              <button
                type="submit"
                className="w-10 h-10 bg-amber-600 hover:bg-amber-500 text-white rounded-xl flex items-center justify-center cursor-pointer transition-colors"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </div>

          <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-150 text-left">
            <div className="flex gap-2 text-amber-800 font-black text-xs leading-normal">
              <Star className="w-5 h-5 text-amber-600 fill-amber-500 shrink-0" />
              <div>
                <h4>Premium Guarantee Protected</h4>
                <p className="text-[10.5px] text-amber-605 mt-1 font-semibold leading-relaxed">
                  Your double rewards ledger is completely tracked by our smart Paystack settlements framework. Payouts are dispatched directly within standard hours.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
