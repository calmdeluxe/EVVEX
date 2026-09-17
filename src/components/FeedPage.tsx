import React, { useState, useEffect } from 'react';
import { 
  Plus, ImageIcon, Sparkles, BrainCircuit, RefreshCw, Trash2, CheckCircle, 
  HelpCircle, Timer, Play, Eye, BookOpen, Clock, AlertCircle, Copy, Check, ArrowRight, Video
} from 'lucide-react';

export interface Puzzle {
  id: string;
  category: 'Image Recognition' | 'Mathematics' | 'Logic Riddle' | 'Anagram & Wordplay';
  title: string;
  prompt: string;
  type: 'image' | 'animation';
  url: string;
  answer: string;
  hint: string;
  createdAt: string;
  used: boolean;
  timesUsed: number;
}

interface FeedPageProps {
  onToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function FeedPage({ onToast }: FeedPageProps) {
  // Navigation tabs: 'maker' (Puzzle Creator), 'bank' (Puzzle Bank), 'history' (Used Puzzles History)
  const [activeTab, setActiveTab] = useState<'maker' | 'bank' | 'history'>('maker');

  // Load from local storage or set defaults
  const [puzzles, setPuzzles] = useState<Puzzle[]>(() => {
    const saved = localStorage.getItem('quizoe_puzzles_bank');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'puz_seed_1',
        category: 'Mathematics',
        title: 'Naira Compounding Offsets',
        prompt: 'If a local Opay ledger charges ₦5 base fee plus a compounding 1.5% overhead on transactions exceeding ₦1,000, what is the total charge on a transaction of ₦2,000?',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=300',
        answer: '₦35',
        hint: 'Apply base fee first, then compute 1.5% on the entire transaction amount of ₦2,000.',
        createdAt: '2026-06-08',
        used: false,
        timesUsed: 0
      },
      {
        id: 'puz_seed_2',
        category: 'Image Recognition',
        title: 'Lagos Traffic Sign Puzzle',
        prompt: 'Look at the visual signal. Highlight the section indicating a regulatory lane restriction. Is it Section Left, Section Middle, or Section Right?',
        type: 'animation',
        url: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?q=80&w=300',
        answer: 'Section Left',
        hint: 'The regulatory stripe is angled at 45 degrees strictly in the leftmost quadrant.',
        createdAt: '2026-06-08',
        used: true,
        timesUsed: 1
      },
      {
        id: 'puz_seed_3',
        category: 'Logic Riddle',
        title: 'The Ledger Chain Audit',
        prompt: 'Five blocks are in a chain. Block C can only be mined after Block A. Block B must follow Block C immediately. Block D cannot be last. Block E is the Genesis Block (First). What is the exact sequence?',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=300',
        answer: 'EACBD',
        hint: 'E is 1st. Block A must precede Block C, followed immediately by Block B (ACB sequence).',
        createdAt: '2026-06-08',
        used: false,
        timesUsed: 0
      }
    ];
  });

  const savePuzzles = (updated: Puzzle[]) => {
    setPuzzles(updated);
    localStorage.setItem('quizoe_puzzles_bank', JSON.stringify(updated));
  };

  // Puzzle Creator state
  const [category, setCategory] = useState<Puzzle['category']>('Image Recognition');
  const [puzTitle, setPuzTitle] = useState('');
  const [aiPrompt, setAiPrompt] = useState('Draft an intelligent math riddle regarding Naira peer-to-peer transfers with a security trap.');
  const [puzPrompt, setPuzPrompt] = useState('');
  const [puzType, setPuzType] = useState<'image' | 'animation'>('image');
  const [puzUrl, setPuzUrl] = useState('https://images.unsplash.com/photo-1614064641938-3bbee52942c7?q=80&w=300');
  const [puzAnswer, setPuzAnswer] = useState('');
  const [puzHint, setPuzHint] = useState('');
  
  // Animation simulation status
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);
  const [animationTimer, setAnimationTimer] = useState(6);

  // Trigger 6-second animation visual loop simulation
  const handlePlayAnimation = () => {
    if (isAnimationPlaying) return;
    setIsAnimationPlaying(true);
    setAnimationTimer(6);
    
    const interval = setInterval(() => {
      setAnimationTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsAnimationPlaying(false);
          onToast("6-second prompt preview finished! Seamless loop completed.", "success");
          return 6;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // AI Generation from OpenRouter
  const handleGenerateWithAi = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAi(true);
    onToast("Connecting to Creator OpenRouter API... Brainstorming vectors...", "info");

    try {
      const response = await fetch('/api/openrouter/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Generate a specialized interactive puzzle question for the category: "${category}". 
The prompt requested by the user is: "${aiPrompt}".
Please return a JSON-like format with the following fields:
1. Title: Short attractive name (Max 4 words)
2. Question: Clear text of the puzzle challenge
3. CorrectAnswer: Very short correct answer key
4. ExplanationHint: Helper explanation.
Keep the statement extremely clear, logical and compelling.`,
          model: 'google/gemini-2.5-flash'
        })
      });

      const resData = await response.json();
      if (resData.success || resData.simulated) {
        // Parse simple content returned from model
        const outputText = resData.text;
        
        // Simple regex fallback to parse fields if AI did not return perfect JSON
        let titleTmp = `${category} Master Class`;
        let questionTmp = outputText;
        let answerTmp = "15";
        let hintTmp = "Analyze transaction logs carefully.";

        if (outputText.includes('Title:')) {
          const matchTitle = outputText.match(/Title:\s*(.*?)(?=\n|$)/i);
          if (matchTitle) titleTmp = matchTitle[1].replace(/["']/g, '');
        }
        if (outputText.includes('Question:')) {
          const matchQ = outputText.match(/Question:\s*(.*?)(?=\n|$)/i);
          if (matchQ) questionTmp = matchQ[1];
        }
        if (outputText.includes('CorrectAnswer:')) {
          const matchA = outputText.match(/CorrectAnswer:\s*(.*?)(?=\n|$)/i);
          if (matchA) answerTmp = matchA[1];
        }
        if (outputText.includes('ExplanationHint:')) {
          const matchH = outputText.match(/ExplanationHint:\s*(.*?)(?=\n|$)/i);
          if (matchH) hintTmp = matchH[1];
        }

        setPuzTitle(titleTmp);
        setPuzPrompt(questionTmp);
        setPuzAnswer(answerTmp);
        setPuzHint(hintTmp);

        // Select visual image URL matches
        let visualUrl = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=400';
        if (category === 'Mathematics') {
          visualUrl = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=400';
        } else if (category === 'Image Recognition') {
          visualUrl = 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=400';
        } else if (category === 'Logic Riddle') {
          visualUrl = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=400';
        } else {
          visualUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400';
        }
        setPuzUrl(visualUrl);
        
        onToast("AI assistant generated the puzzle & keys successfully!", "success");
      }
    } catch (err) {
      console.error(err);
      // Fallback pre-generation
      let fallbackTitle = `Compounding Ledger Limit`;
      let fallbackQ = `If a crypto transaction has dual signatures and compounding offsets totaling ₦180, where signatures are weighted 2:1, what is the principal balance?`;
      setPuzTitle(fallbackTitle);
      setPuzPrompt(fallbackQ);
      setPuzAnswer("₦120");
      setPuzHint("Divide the limit by signatures ratio offset.");
      onToast("AI loaded puzzle in offline sandbox mode.", "info");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Save puzzle to bank
  const handleSavePuzzle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!puzTitle.trim() || !puzPrompt.trim() || !puzAnswer.trim()) {
      onToast("Title, question text and answer key are mandatory!", "warning");
      return;
    }

    const newPuzzle: Puzzle = {
      id: `puz_${Date.now()}`,
      category,
      title: puzTitle,
      prompt: puzPrompt,
      type: puzType,
      url: puzUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400',
      answer: puzAnswer,
      hint: puzHint || 'Follow sequence rules.',
      createdAt: new Date().toISOString().split('T')[0],
      used: false,
      timesUsed: 0
    };

    savePuzzles([newPuzzle, ...puzzles]);
    onToast(`Puzzle "${puzTitle}" has been saved into the Puzzle Bank!`, "success");

    // Clear inputs
    setPuzTitle('');
    setPuzPrompt('');
    setPuzAnswer('');
    setPuzHint('');
    setActiveTab('bank');
  };

  // Re-use used puzzle (clone or mark unused)
  const handleReusePuzzle = (id: string) => {
    const updated = puzzles.map(p => {
      if (p.id === id) {
        return { ...p, used: false, createdAt: new Date().toISOString().split('T')[0] };
      }
      return p;
    });
    savePuzzles(updated);
    onToast("Puzzle cloned and recycled back to live candidate pool!", "success");
    setActiveTab('bank');
  };

  // Permanent Delete
  const handleDeletePuzzle = (id: string) => {
    const updated = puzzles.filter(p => p.id !== id);
    savePuzzles(updated);
    onToast("Puzzle permanently purged from database.", "success");
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto text-left select-none">
      
      {/* HEADER SECTION */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-6">
        <div>
          <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full font-black uppercase tracking-wider">
            🧠 AI PUZZLE ENGINE CONTROL CABINET
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mt-2">🧩 Puzzle Maker Studio</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Construct brainteasers, mathematical codes, image recognition algorithms and export them directly to Quiz Lobbies.
          </p>
        </div>

        {/* Tab switcher navigation */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('maker')}
            className={`px-4 py-2 hover:text-indigo-600 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
              activeTab === 'maker' 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            ⚙️ Creator Hub
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`px-4 py-2 hover:text-indigo-600 rounded-xl text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'bank' 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            🏛️ Puzzle Bank ({puzzles.filter(p => !p.used).length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 hover:text-indigo-600 rounded-xl text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history' 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            📜 Used History ({puzzles.filter(p => p.used).length})
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      
      {/* 1. CREATOR HUB */}
      {activeTab === 'maker' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Creator Panel */}
          <form onSubmit={handleSavePuzzle} className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl border border-slate-150 space-y-6">
            <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider border-b pb-3 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" /> Assemble New Puzzle Artifact
            </h3>

            {/* Category selection */}
            <div>
              <label className="text-[10.5px] text-slate-400 font-extrabold uppercase block mb-2">Category Genre</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {(['Image Recognition', 'Mathematics', 'Logic Riddle', 'Anagram & Wordplay'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      onToast(`Switched puzzle template style to: ${cat}`, 'info');
                    }}
                    className={`text-[10px] font-black uppercase py-2.5 px-3 rounded-xl border transition-all text-center ${
                      category === cat 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {cat === 'Image Recognition' ? '🖼️ Visual' : cat === 'Mathematics' ? '📐 Math' : cat === 'Logic Riddle' ? '🧩 Logic' : '📝 Wordplay'}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive OpenRouter co-writer tool */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3.5 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-spin" /> OpenRouter Prompt Companion
                </span>
                <span className="text-[9px] bg-slate-800 text-slate-400 font-mono py-0.5 px-2 rounded">Gemini-2.5</span>
              </div>
              <p className="text-[10.5px] text-slate-400 font-bold leading-relaxed">
                Describe the riddle or math puzzle. Click "Synthesize" to ask our AI model to prepare matching visual grids and text.
              </p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Generate 3 sequence offsets with prime ratios"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="bg-slate-950 text-white border border-slate-800 rounded-xl px-4 py-3 text-xs flex-1 focus:outline-none placeholder-slate-650"
                />
                <button
                  type="button"
                  disabled={isGeneratingAi}
                  onClick={handleGenerateWithAi}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                >
                  {isGeneratingAi ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Synthesize'}
                </button>
              </div>
            </div>

            {/* Main inputs */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10.5px] text-slate-400 font-extrabold uppercase block mb-1">Puzzle Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Compounding Sigma"
                    value={puzTitle}
                    onChange={(e) => setPuzTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] text-slate-400 font-extrabold uppercase block mb-1">Puzzle Visual Form Choice</label>
                  <div className="flex gap-2 h-11">
                    <button
                      type="button"
                      onClick={() => setPuzType('image')}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase transition-all border ${
                        puzType === 'image' 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" /> Static Image
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPuzType('animation');
                        onToast("Short 6-second dynamic visual rotation activated!", "success");
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase transition-all border ${
                        puzType === 'animation' 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 animate-pulse' 
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Video className="w-4 h-4" /> 6s Animation
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10.5px] text-slate-400 font-extrabold uppercase block mb-1">Riddle Statement / Challenge Text</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Supply the puzzle statement details or mathematical formula..."
                  value={puzPrompt}
                  onChange={(e) => setPuzPrompt(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-semibold focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10.5px] text-slate-400 font-extrabold uppercase block mb-1">Correct Answer Key</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ₦35 or Option B"
                    value={puzAnswer}
                    onChange={(e) => setPuzAnswer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-black text-rose-700 focus:outline-none font-mono"
                  />
                  <p className="text-[9.5px] text-slate-400 font-bold mt-1">
                    Users must input exact characters to claim points.
                  </p>
                </div>
                <div>
                  <label className="text-[10.5px] text-slate-400 font-extrabold uppercase block mb-1">Riddle explanation / Helper Hint</label>
                  <input
                    type="text"
                    placeholder="Provide a clue to help candidates format submissions..."
                    value={puzHint}
                    onChange={(e) => setPuzHint(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10.5px] text-slate-400 font-extrabold uppercase block mb-1">Custom Mockup visual URL</label>
                <input
                  type="text"
                  placeholder="Paste Unsplash image URL or visual graphic link"
                  value={puzUrl}
                  onChange={(e) => setPuzUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-4 px-6 rounded-2xl text-xs uppercase tracking-widest cursor-pointer text-center block transition-all"
            >
              🚀 Save &amp; Dispatch to Puzzle Bank Group
            </button>
          </form>

          {/* Prompt Preview Simulator Sidebar */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-150 space-y-6">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider border-b pb-3 mb-4">
              ✨ Live Prompt Preview Simulator
            </h3>

            {/* Simulated Kindle/Mobile Screen */}
            <div className="bg-slate-900 border border-slate-800 text-white rounded-[32px] p-6 shadow-xl relative overflow-hidden select-none">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
              
              {/* Header inside phone */}
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-800 text-[10px] text-slate-400 font-mono">
                <span className="bg-slate-950 px-2 py-0.5 rounded text-indigo-400 font-bold uppercase tracking-wider">{category}</span>
                <span>📶 10:45 AM</span>
              </div>

              {/* Main Visual */}
              <div className="relative mb-4 bg-slate-950 aspect-video rounded-2xl overflow-hidden border border-slate-800">
                <img 
                  src={puzUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300'} 
                  className="w-full h-full object-cover opacity-80" 
                  alt="Visual clue" 
                />

                {/* Simulated 6-second timer overlay for puzzle animation choice */}
                {puzType === 'animation' && (
                  <div className="absolute inset-0 bg-indigo-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-4">
                    <Timer className={`w-8 h-8 text-indigo-400 ${isAnimationPlaying ? 'animate-spin' : ''}`} />
                    <span className="text-2xl font-black font-mono tracking-tight mt-1">
                      {isAnimationPlaying ? `${animationTimer}s` : '6.0s'}
                    </span>
                    <span className="text-[8px] text-slate-400 uppercase tracking-widest mt-1">Riddle Animation preview</span>
                    
                    {!isAnimationPlaying && (
                      <button
                        type="button"
                        onClick={handlePlayAnimation}
                        className="mt-3 bg-indigo-650 hover:bg-indigo-500 text-white font-bold uppercase text-[9px] py-1 px-3.5 rounded-lg flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-white" /> Run 6s Loop
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Title & prompt text statement */}
              <div className="space-y-2 text-left">
                <h4 className="font-extrabold text-sm text-slate-100">{puzTitle || 'Untitled Puzzle Artifact'}</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-sans italic">
                  "{puzPrompt || 'Write prompt statement in form box...'}"
                </p>
              </div>

              {/* Answer block input simulation */}
              <div className="mt-5 space-y-2.5">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-black uppercase">Correct Key:</span>
                  <span className="text-xs font-black font-mono text-emerald-400">{puzAnswer || 'Unspecified'}</span>
                </div>
                {puzHint && (
                  <div className="bg-indigo-950/20 text-indigo-300 p-3 rounded-xl border border-indigo-500/10 text-[10px] leading-relaxed">
                    💡 <strong>Creator Hint Clue:</strong> {puzHint}
                  </div>
                )}
              </div>
            </div>

            {/* Quick tips about OpenRouter */}
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-[10.5px] text-slate-500 leading-relaxed space-y-2 text-left">
              <span className="font-black text-slate-800 uppercase flex items-center gap-1">
                <BrainCircuit className="w-4 h-4 text-indigo-600" /> Dynamic Quiz Integration Guidelines:
              </span>
              <p>
                - Puzzles generated in the Maker Studio will land inside the <strong>Puzzle Bank</strong>.
              </p>
              <p>
                - When building a new quiz on the <strong>Admin Panel</strong>, you can toggle "Puzzle Related" or "Mixed" and easily select these files.
              </p>
              <p>
                - Active puzzles will be marked <strong>used</strong> automatically.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* 2. PUZZLE BANK */}
      {activeTab === 'bank' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider">
              🏛️ Available Puzzle Assets ({puzzles.filter(p => !p.used).length})
            </h3>
            <span className="text-[10px] text-slate-400 font-bold">Unused puzzles ready for live deployment</span>
          </div>

          {puzzles.filter(p => !p.used).length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h4 className="font-extrabold text-slate-800 text-sm">Puzzle Bank holds no active candidate files</h4>
              <p className="text-xs text-slate-400 leading-normal max-w-sm mx-auto">
                All saved puzzles are currently in play, or none have been compiled yet. Use our OpenRouter Copilot on the left tab to draft elements!
              </p>
              <button
                onClick={() => setActiveTab('maker')}
                className="bg-indigo-600 font-bold uppercase text-xs py-2.5 px-4 rounded-xl text-white shadow-xs cursor-pointer"
              >
                Assemble Puzzle Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {puzzles.filter(p => !p.used).map((puz) => (
                <div key={puz.id} className="bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-xs relative flex flex-col justify-between hover:shadow-md transition-all">
                  
                  {/* Aspect visual frame */}
                  <div className="relative aspect-video">
                    <img src={puz.url} className="w-full h-full object-cover" alt={puz.title} />
                    <span className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-[9px] font-black uppercase text-white tracking-widest px-2 py-0.5 rounded">
                      {puz.category}
                    </span>
                    <span className="absolute top-2.5 right-2.5 bg-indigo-600 text-[8px] font-black uppercase text-white px-2 py-0.5 rounded tracking-wide">
                      {puz.type === 'animation' ? '🎬 6s Animation' : '🖼️ Static'}
                    </span>
                  </div>

                  {/* Body text content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{puz.title}</h4>
                      <p className="text-slate-500 font-medium text-xs leading-relaxed mt-2 italic font-sans">
                        "{puz.prompt}"
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold">Answer Code:</span>
                        <span className="text-rose-700 font-black font-mono bg-rose-50 px-2 py-0.5 rounded">{puz.answer}</span>
                      </div>
                      
                      <div className="bg-slate-50 p-2.5 rounded-xl border text-[10px] text-slate-500 flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">Clue: {puz.hint}</span>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            // Quick toggle used mock for demo or setup
                            const updated = puzzles.map(item => item.id === puz.id ? { ...item, used: true } : item);
                            savePuzzles(updated);
                            onToast(`Riddle "${puz.title}" moved to Used History!`, "success");
                          }}
                          className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold text-[10px] py-2 px-3 rounded-xl flex-1 cursor-pointer flex items-center justify-center gap-1 uppercase"
                        >
                          Mark Used Action
                        </button>
                        <button
                          onClick={() => handleDeletePuzzle(puz.id)}
                          className="bg-slate-50 text-slate-500 hover:text-red-600 border border-slate-200 p-2 rounded-xl cursor-pointer"
                          title="Delete Permanent"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. USED HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider">
              📜 Used Puzzle Index History ({puzzles.filter(p => p.used).length})
            </h3>
            <span className="text-[10px] text-emerald-600 font-bold">History log of deployed elements</span>
          </div>

          {puzzles.filter(p => p.used).length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="font-extrabold text-slate-800 text-sm">Used history log is clean</h4>
              <p className="text-xs text-slate-400 leading-normal max-w-sm mx-auto">
                No puzzles have been deployed to active lobbies yet. Once selected in quiz building, they are locked into this ledger container.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {puzzles.filter(p => p.used).map((puz) => (
                <div key={puz.id} className="bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-xs p-5 relative flex flex-col justify-between hover:shadow-md transition-all brightness-95 opacity-90">
                  
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-200">
                      USED IN ACTIVE ROUNDS
                    </span>
                    <span className="text-[9.5px] text-slate-400 font-bold">Deployed</span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 gray-out">
                    {puz.title}
                  </h4>
                  <p className="text-slate-500 font-medium text-xs leading-relaxed mt-1 italic font-sans line-clamp-2">
                    "{puz.prompt}"
                  </p>

                  <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Answer Keys:</span>
                      <span className="text-slate-800 font-black font-mono">{puz.answer}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReusePuzzle(puz.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] py-2 px-3 rounded-xl flex-1 cursor-pointer flex items-center justify-center gap-1 uppercase tracking-wider"
                      >
                        🔄 Recycle Back to Pool
                      </button>
                      <button
                        onClick={() => handleDeletePuzzle(puz.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[10px] py-2 px-3 rounded-xl cursor-pointer uppercase font-black"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
