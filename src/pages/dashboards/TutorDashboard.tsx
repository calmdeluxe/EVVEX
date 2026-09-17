import React, { useState } from 'react';
import { 
  Sparkles, BookOpen, Layers, PlusCircle, HelpCircle, Eye, RefreshCw, CheckCircle2, 
  Trash2, UploadCloud, Video, AudioLines, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, Check
} from 'lucide-react';
import { Challenge, User, QuizQuestion } from '../../types';

interface TutorDashboardProps {
  currentUser: User;
  onAddChallenge: (c: Challenge) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function TutorDashboard({
  currentUser,
  onAddChallenge,
  onToast
}: TutorDashboardProps) {
  
  // --- STATE FOR AI EBOOK CREATION ---
  const [ebookTitle, setEbookTitle] = useState('');
  const [ebookGenre, setEbookGenre] = useState('Fintech Tutorial');
  const [ebookChapters, setEbookChapters] = useState('Chapter 1: The OPay Paradigm\nChapter 2: Managing Liquid Balances');
  const [ebookCoverUrl, setEbookCoverUrl] = useState('');
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);

  // --- STATE FOR QUIZ MAKER ---
  const [quizTitle, setQuizTitle] = useState('');
  const [quizRequirement, setQuizRequirement] = useState<'free' | 'premium'>('free');
  const [quizTimer, setQuizTimer] = useState(30); // 30 seconds default
  const [quizEntryFee, setQuizEntryFee] = useState(100);

  // Quiz Questions list creator
  const [quizQuestions, setQuizQuestions] = useState<Omit<QuizQuestion, 'id'>[]>([
    { questionText: 'Which platform acts as the direct payments processor for Quizoe?', options: ['Paystack', 'Stripe', 'PayPal', 'Flutterwave'], correctOptionIndex: 0, timeLimit: 30 }
  ]);
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  const [currentOptions, setCurrentOptions] = useState(['', '', '', '']);
  const [correctIdxInput, setCorrectIdxInput] = useState(0);

  // --- STATE FOR VIDEO/AUDIO UPLOADER ---
  const [uploadType, setUploadType] = useState<'video' | 'audio'>('video');
  const [mediaTitle, setMediaTitle] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedItems, setUploadedItems] = useState([
    { id: 'm_1', type: 'video', title: 'Managing Fintech Payout Tunnels', size: '14.2 MB', date: 'Yesterday', status: 'published' },
    { id: 'm_2', type: 'audio', title: 'Why Naira Liquidity Matters for Creators', size: '4.8 MB', date: '3 days ago', status: 'published' }
  ]);

  // --- TUTOR EARNINGS DATA ---
  const [salesDetails] = useState({
    totalSales: 45000,
    platformCut: 13500, // 30% commission
    tutorNet: 31500,
    pendingWithdrawal: 12000
  });
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const triggerCoverArtGenerator = async () => {
    if (!ebookTitle.trim()) {
      onToast('Please enter an Ebook title first to formulate key prompts.', 'error');
      return;
    }

    setIsGeneratingCover(true);
    onToast('Spinning up Edge cover generation servers...', 'info');

    try {
      const response = await fetch('/api/functions/ai-generate-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: ebookTitle, genre: ebookGenre })
      });
      const data = await response.json();
      if (data.success || data.imageUrl) {
        setEbookCoverUrl(data.imageUrl);
        onToast('AI cover successfully designed and stored!', 'success');
      } else {
        throw new Error('Fallback trigger');
      }
    } catch (_) {
      // High-fidelity fallback asset URLs
      const fallbacks = [
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600',
        'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=600',
        'https://images.unsplash.com/photo-1618005198143-e5283b519a7f?q=80&w=600'
      ];
      const picked = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      setTimeout(() => {
        setEbookCoverUrl(picked);
        setIsGeneratingCover(false);
        onToast('Mock secure Edge Cover returned.', 'success');
      }, 1500);
    } finally {
      // Handled inside setTimeout fallback or actual return
    }
  };

  const handlePublishEbook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ebookTitle.trim() || !ebookChapters.trim()) {
      onToast('Please type your eBook title and chapter details.', 'error');
      return;
    }

    onToast(`"${ebookTitle}" submitted successfully. Dispatched to CEO for vetting!`, 'success');
    setEbookTitle('');
    setEbookChapters('');
    setEbookCoverUrl('');
  };

  const handleAddQuestionToQuizForm = () => {
    if (!currentQuestionText.trim()) {
      onToast('Enter a valid question text block.', 'error');
      return;
    }
    if (currentOptions.some(opt => !opt.trim())) {
      onToast('Please fill out all 4 option candidates.', 'error');
      return;
    }

    const newQuestion: Omit<QuizQuestion, 'id'> = {
      questionText: currentQuestionText,
      options: [...currentOptions],
      correctOptionIndex: correctIdxInput,
      timeLimit: Number(quizTimer)
    };

    setQuizQuestions((prev) => [...prev, newQuestion]);
    setCurrentQuestionText('');
    setCurrentOptions(['', '', '', '']);
    setCorrectIdxInput(0);
    onToast('Question appended to Quiz builder draft.', 'success');
  };

  const handlePublishQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle.trim()) {
      onToast('Provide a clear Quiz title.', 'error');
      return;
    }
    if (quizQuestions.length === 0) {
      onToast('Your Quiz must possess at least 1 question block.', 'error');
      return;
    }

    // Map questions with IDs
    const finalizedQuestions: QuizQuestion[] = quizQuestions.map((q, idx) => ({
      ...q,
      id: `q_${idx}_${Date.now()}`
    }));

    const newChallengeObj: Challenge = {
      id: `chal_tutor_${Date.now()}`,
      title: quizTitle,
      description: `Structured Tutor quiz challenge with ${finalizedQuestions.length} multiple choice questions. Access requirements: ${quizRequirement.toUpperCase()}.`,
      coverImage: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600',
      category: 'Quiz',
      prizePool: Number(quizEntryFee) * 10, // Simulated scale
      entryFee: quizRequirement === 'premium' ? 0 : Number(quizEntryFee),
      participants: 0,
      maxParticipants: 150,
      timeLeft: '24h 00m',
      status: 'active',
      questions: finalizedQuestions
    };

    onAddChallenge(newChallengeObj);
    onToast(`Quiz "${quizTitle}" authored. Awaiting audit approval.`, 'success');

    // Reset forms
    setQuizTitle('');
    setQuizQuestions([]);
  };

  const simulateFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaTitle.trim()) {
      onToast('Please indicate a title for the video/audio upload.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const newMedia = {
              id: `m_${Date.now()}`,
              type: uploadType,
              title: mediaTitle,
              size: uploadType === 'video' ? '18.4 MB' : '5.1 MB',
              date: 'Just now',
              status: 'pending'
            };
            setUploadedItems((old) => [newMedia, ...old]);
            setIsUploading(false);
            setUploadProgress(0);
            setMediaTitle('');
            onToast(`${newMedia.title} completely uploaded. CEO notification sent for audit.`, 'success');
          }, 400);
          return 100;
        }
        return prev + 15;
      });
    }, 150);
  };

  const triggerWithdrawFunds = () => {
    setIsWithdrawing(true);
    setTimeout(() => {
      setIsWithdrawing(false);
      onToast('Withdrawn ₦12,000 net profits. Dispatched with PalmPay gateway to OPay account.', 'success');
    }, 1600);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in text-left">
      
      {/* SECTION TABS HEADER */}
      <div className="pb-5 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-905 flex items-center gap-2.5 tracking-tight">
            Tutor &amp; Content Creator Studio
            <Sparkles className="w-6 h-6 text-indigo-650 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Produce dynamic educational assessments, draft premium books with AI cover assist, and check net earnings splits.
          </p>
        </div>
      </div>

      {/* THREE CARDS EARNINGS SNAPSHOT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-widest">Total Sales Stream</span>
            <DollarSign className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-slate-900">₦{salesDetails.totalSales.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Gross eBook &amp; premium entry tickets purchases</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-widest font-sans">Platform Cut (30%)</span>
            <ArrowUpRight className="w-5 h-5 text-rose-500" />
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-slate-500">₦{salesDetails.platformCut.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Deducted according to standard service tier</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-widest">Your Net Share (70%)</span>
            <ArrowDownRight className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-emerald-600">₦{salesDetails.tutorNet.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Directly credited to verified partner balance</p>
          </div>
        </div>

        {/* CASH WITHDRAWAL PANEL */}
        <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-400">
            <span className="text-[11px] font-black uppercase tracking-widest text-indigo-300">Available Withdrawal</span>
            <Wallet className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-black text-white">₦{salesDetails.pendingWithdrawal.toLocaleString()}</h3>
            <button
              onClick={triggerWithdrawFunds}
              disabled={isWithdrawing}
              className="mt-3.5 w-full bg-indigo-650 hover:bg-indigo-600 py-2 rounded-xl text-[11px] font-black cursor-pointer shadow-xs disabled:opacity-50 text-white transition-colors"
            >
              {isWithdrawing ? 'Dispatching funds...' : 'Initiate Secure Settlement'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: EBOOK & QUIZ MAKING */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* AI EBOOK MAKER */}
          <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3 mb-5">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-black text-slate-900">AI eBook Maker</h3>
                <p className="text-[10.5px] text-slate-400 font-semibold">Integrate chapters, author copy-prose, and fetch cover artwork from AI model arrays.</p>
              </div>
            </div>

            <form onSubmit={handlePublishEbook} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Book Title Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Navigating Nigeria's Payouts"
                    value={ebookTitle}
                    onChange={(e) => setEbookTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 text-xs font-bold py-2.5 px-3.5 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">eBook Genre Selection</label>
                  <select
                    value={ebookGenre}
                    onChange={(e) => setEbookGenre(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer text-slate-800"
                  >
                    <option value="Fintech Guide">Fintech Guide &amp; Handshake Tutorial</option>
                    <option value="Naira Yield Mastery">Naira Yield Mastery</option>
                    <option value="Crypto Legalities">Crypto Legalities &amp; Regulations</option>
                    <option value="Alternative Wealth">Alternative Micro-Wealth</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Chapters Schema &amp; Markdown Draft</label>
                  <textarea
                    required
                    placeholder="Describe chapter milestones and notes..."
                    value={ebookChapters}
                    onChange={(e) => setEbookChapters(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 text-xs font-medium p-3 rounded-xl focus:outline-none h-32 leading-relaxed resize-none text-slate-700"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={triggerCoverArtGenerator}
                    disabled={isGeneratingCover}
                    className="flex-1 bg-slate-900 text-white font-extrabold py-2.5 px-3.5 rounded-xl text-xs hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
                    <span>{isGeneratingCover ? 'Baking cover...' : 'AI Generate Cover'}</span>
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 px-3.5 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Submit eBook Draft
                  </button>
                </div>
              </div>

              {/* COVER PREVIEW */}
              <div className="flex flex-col items-center justify-center border border-dashed border-slate-150 rounded-2xl p-4 bg-slate-50 relative min-h-[250px]">
                {ebookCoverUrl ? (
                  <div className="w-full h-full flex flex-col items-center gap-3">
                    <div className="w-40 h-52 rounded-xl overflow-hidden shadow-md relative">
                      <img src={ebookCoverUrl} alt="AI design Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 p-2 text-center">
                        <p className="text-[9px] font-black text-white truncate uppercase">{ebookTitle || 'Draft title'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEbookCoverUrl('')}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      Clear Cover
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-6 flex flex-col items-center justify-center text-slate-400">
                    <UploadCloud className="w-12 h-12 text-slate-300 stroke-[1.5]" />
                    <h4 className="text-xs font-black text-slate-700 mt-2">No cover image generated</h4>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                      Click the "AI Generate Cover" trigger to formulate cover layouts based on your title automatically.
                    </p>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* MASTER QUIZ MAKER */}
          <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3 mb-5">
              <HelpCircle className="w-5 h-5 text-indigo-650" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Configure Comprehensive Quiz</h3>
                <p className="text-[10.5px] text-slate-400 font-semibold">Integrate entry requirements and multiple choice questions streams.</p>
              </div>
            </div>

            <form onSubmit={handlePublishQuiz} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Quiz Global Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Naira Liquidity and Vault mechanics"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 text-xs font-bold py-2.5 px-3.5 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Requirement</label>
                  <select
                    value={quizRequirement}
                    onChange={(e) => setQuizRequirement(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold py-2.5 px-2.5 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="free">Standard (Free)</option>
                    <option value="premium">Premium Only Mode</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Timers (Seconds)</label>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={quizTimer}
                    onChange={(e) => setQuizTimer(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold py-2.5 px-2 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* DRAFTING ACTIVE QUESTIONS BLOCK */}
              <div className="p-4 rounded-2xl bg-indigo-50/10 border border-indigo-100 flex flex-col gap-4">
                <span className="text-[10px] text-indigo-700 font-black uppercase tracking-wider block">Question Stream Composer:</span>
                
                <div>
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase block mb-1">Question Description String</label>
                  <input
                    type="text"
                    placeholder="What is the daily maximum payout limit of an OPay Level 1 account?"
                    value={currentQuestionText}
                    onChange={(e) => setCurrentQuestionText(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-xs font-bold py-2.5 px-3.5 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentOptions.map((opt, oIdx) => (
                    <div key={oIdx}>
                      <label className="text-[9px] text-slate-400 font-extrabold uppercase block mb-1">Option {String.fromCharCode(65 + oIdx)}</label>
                      <input
                        type="text"
                        placeholder={`Option Candidacy ${String.fromCharCode(65 + oIdx)}`}
                        value={opt}
                        onChange={(e) => {
                          const updated = [...currentOptions];
                          updated[oIdx] = e.target.value;
                          setCurrentOptions(updated);
                        }}
                        className="w-full bg-white border border-slate-200 text-xs font-semibold py-2 px-3 rounded-xl focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">Correct Option:</span>
                    <div className="flex gap-1.5">
                      {currentOptions.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCorrectIdxInput(idx)}
                          className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            correctIdxInput === idx 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600'
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddQuestionToQuizForm}
                    className="self-end px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black rounded-lg cursor-pointer transition-colors"
                  >
                    + Append Question to Draft
                  </button>
                </div>
              </div>

              {/* QUESTIONS PREVIEW LIST */}
              {quizQuestions.length > 0 && (
                <div className="space-y-2 pb-2">
                  <h4 className="text-[10px] text-slate-400 font-extrabold uppercase">Questions Draft Queue ({quizQuestions.length}):</h4>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {quizQuestions.map((q, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                        <div className="text-left">
                          <p className="text-xs font-black text-slate-800">Q{idx + 1}: {q.questionText}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            Correct Option: {String.fromCharCode(65 + q.correctOptionIndex)} ({q.options[q.correctOptionIndex]})
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setQuizQuestions((prev) => prev.filter((_, i) => i !== idx));
                            onToast('Question removed.', 'info');
                          }}
                          className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={quizQuestions.length === 0}
                className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Publish Quiz &amp; Draft to CEO Studio</span>
              </button>

            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: VIDEO/AUDIO UPLOADER & UPLOAD TIMELINES */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3 mb-5">
              <UploadCloud className="w-5 h-5 text-indigo-650" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Uploader Console</h3>
                <p className="text-[10.5px] text-slate-400 font-semibold">Store visual modules inside secure Supabase buckets.</p>
              </div>
            </div>

            <form onSubmit={simulateFileUpload} className="space-y-4">
              <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setUploadType('video')}
                  className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    uploadType === 'video' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>MP4 Video clip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadType('audio')}
                  className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    uploadType === 'audio' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  <AudioLines className="w-4 h-4" />
                  <span>MP3 Audio file</span>
                </button>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Catalog Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PalmsPay integration blueprint"
                  value={mediaTitle}
                  onChange={(e) => setMediaTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 text-xs font-bold py-2.5 px-3.5 rounded-xl focus:outline-none"
                />
              </div>

              {/* INTERACTIVE DRAG AREA */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  onToast('Media dropped. Formulating parameters...', 'success');
                }}
                className={`border border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
                  isDragOver 
                    ? 'border-indigo-500 bg-indigo-50/20' 
                    : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50/50'
                }`}
              >
                <UploadCloud className="w-10 h-10 text-slate-350 mb-2 stroke-[1.5]" />
                <p className="text-xs font-extrabold text-slate-700">Drag &amp; Drop media path</p>
                <p className="text-[10px] text-slate-400 mt-1">Accepts FLAC, MP4 or MP3 (limit 50MB)</p>
              </div>

              {isUploading && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-500">
                    <span>Uploading block chunks...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading}
                className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Media Module</span>
              </button>
            </form>
          </div>

          {/* CATALOG STATUS TIMELINE */}
          <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs">
            <h4 className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-4">Authored Content Status:</h4>
            
            <div className="space-y-3">
              {uploadedItems.map((c) => (
                <div key={c.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {c.type === 'video' ? <Video className="w-4.5 h-4.5 text-indigo-600 shrink-0" /> : <AudioLines className="w-4.5 h-4.5 text-indigo-600 shrink-0" />}
                    <div className="overflow-hidden">
                      <p className="text-xs font-extrabold text-slate-800 truncate">{c.title}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{c.size} • {c.date}</p>
                    </div>
                  </div>

                  <span className={`text-[9px] uppercase font-bold py-0.5 px-1.5 rounded ${
                    c.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
