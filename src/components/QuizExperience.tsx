import React, { useState, useEffect } from 'react';
import { Timer, Trophy, ArrowRight, ArrowLeft, Sparkles, CheckSquare, Smile, ShieldCheck, Heart, RotateCcw } from 'lucide-react';
import { Challenge, QuizQuestion, User } from '../types';

interface QuizExperienceProps {
  challenge: Challenge;
  user: User;
  onFinishQuiz: (scorePct: number, rewardEarned: number) => void;
  onQuitQuiz: () => void;
}

export default function QuizExperience({ challenge, user, onFinishQuiz, onQuitQuiz }: QuizExperienceProps) {
  const questions: QuizQuestion[] = challenge.questions || [];
  
  // Quiz active states
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(questions[0]?.timeLimit || 15);
  const [correctCount, setCorrectCount] = useState(0);
  const [hasCheckedAnswer, setHasCheckedAnswer] = useState(false);
  const [showResultScreen, setShowResultScreen] = useState(false);

  // Confetti particles generator
  const [confettiList, setConfettiList] = useState<{ id: number; left: number; color: string; delay: number }[]>([]);

  const activeQuestion = questions[currentIdx];

  // Tick-timer countdown
  useEffect(() => {
    if (showResultScreen || !activeQuestion || hasCheckedAnswer) return;

    if (timeLeft <= 0) {
      // Auto-validate as skipped/incorrect on timeout
      setHasCheckedAnswer(true);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, showResultScreen, activeQuestion, hasCheckedAnswer]);

  // Generate particle confettis on compilation
  useEffect(() => {
    if (showResultScreen && correctCount > 0) {
      const colorsList = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#a855f7'];
      const generated = Array.from({ length: 45 }).map((_, idx) => ({
        id: idx,
        left: Math.random() * 98,
        color: colorsList[Math.floor(Math.random() * colorsList.length)],
        delay: Math.random() * 2
      }));
      setConfettiList(generated);
    } else {
      setConfettiList([]);
    }
  }, [showResultScreen, correctCount]);

  const handleOptionClick = (idx: number) => {
    if (hasCheckedAnswer) return; // Locked down once selected
    setSelectedIdx(idx);
    setHasCheckedAnswer(true);

    if (idx === activeQuestion.correctOptionIndex) {
      setCorrectCount((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedIdx(null);
      setHasCheckedAnswer(false);
      setTimeLeft(questions[currentIdx + 1].timeLimit);
    } else {
      setShowResultScreen(true);
    }
  };

  const calculateRewards = () => {
    const pct = (correctCount / questions.length) * 100;
    // Calculate fractional proportion of campaign prize pool
    // e.g. Score Pct * (Challenge Prize / 100 players average share estimation)
    const baseShare = challenge.prizePool / 10; 
    return pct >= 60 ? Number(((pct / 100) * baseShare).toFixed(2)) : 0.00;
  };

  const handleSaveResults = () => {
    const pct = (correctCount / questions.length) * 100;
    const finalPrize = calculateRewards();
    onFinishQuiz(pct, finalPrize);
  };

  if (!activeQuestion && !showResultScreen) {
    return (
      <div className="quiz-layout p-8 flex items-center justify-center min-h-screen text-slate-400 select-none text-center">
        <div className="flex flex-col items-center gap-3">
          <Trophy className="w-10 h-10 text-slate-500" />
          <p className="font-semibold text-slate-300">This map challenge does not have active question nodes.</p>
          <button onClick={onQuitQuiz} className="mt-4 bg-white/10 hover:bg-white/15 px-5 py-2 rounded-xl text-xs text-white">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-layout relative overflow-hidden flex flex-col justify-between py-8 px-4 md:px-8">
      
      {/* CONFETTI ELEMENT OVERLAYS */}
      {showResultScreen && confettiList.map((c) => (
        <span
          key={c.id}
          className="confetti-particle"
          style={{
            left: `${c.left}%`,
            backgroundColor: c.color,
            animationDelay: `${c.delay}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }}
        />
      ))}

      {/* QUIZ HEADER AREA */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onQuitQuiz}
            className="p-2 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-white rounded-xl cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-left">
            <h1 className="font-extrabold text-sm truncate max-w-[180px] sm:max-w-xs">{challenge.title}</h1>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Quiz Match Arena</span>
          </div>
        </div>

        {/* Dynamic Timer Gauge Widget */}
        {!showResultScreen && (
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-black font-mono text-slate-100">{timeLeft}s remaining</span>
          </div>
        )}
      </header>

      {/* MAIN QUIZ FLOW CONTAINER */}
      <main className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center my-8 shrink-0">
        
        {!showResultScreen ? (
          <div className="flex flex-col gap-6 w-full animate-fade-in text-left">
            
            {/* Question Counter tracker */}
            <div className="flex justify-between items-center bg-white/5 border border-white/5 p-3 rounded-2xl">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                QUESTION NODE {currentIdx + 1} OF {questions.length}
              </span>
              <div className="text-xs text-slate-300 font-bold font-mono">
                Running Score: {correctCount}/{questions.length}
              </div>
            </div>

            {/* Progression Bar */}
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden shrink-0">
              <div 
                className="bg-indigo-500 h-full transition-all duration-305" 
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Large question body */}
            <div className="question-holder text-left relative overflow-hidden">
              <p className="text-lg md:text-xl font-bold leading-relaxed text-slate-100 relative z-10">
                {activeQuestion.questionText}
              </p>
            </div>

            {/* Multi Options List */}
            <div className="flex flex-col gap-3">
              {activeQuestion.options.map((option, idx) => {
                const isSelected = selectedIdx === idx;
                const isCorrectAnswer = idx === activeQuestion.correctOptionIndex;
                let cardClass = '';

                if (hasCheckedAnswer) {
                  if (isCorrectAnswer) {
                    cardClass = 'correct';
                  } else if (isSelected) {
                    cardClass = 'incorrect';
                  } else {
                    cardClass = 'disabled opacity-50 cursor-not-allowed';
                  }
                } else if (isSelected) {
                  cardClass = 'selected';
                }

                return (
                  <button
                    key={idx}
                    disabled={hasCheckedAnswer}
                    onClick={() => handleOptionClick(idx)}
                    className={`option-card text-left cursor-pointer focus:outline-none w-full ${cardClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-white/5 text-white/70 text-xs font-bold font-mono flex items-center justify-center border border-white/10">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-sm font-semibold">{option}</span>
                    </div>

                    {/* Indicator state icons */}
                    {hasCheckedAnswer && isCorrectAnswer && (
                      <span className="w-5 h-5 rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center font-bold">✓</span>
                    )}
                    {hasCheckedAnswer && isSelected && !isCorrectAnswer && (
                      <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">✕</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Unlocked "Next" button */}
            {hasCheckedAnswer && (
              <button
                onClick={handleNext}
                className="btn-premium bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shrink-0 mt-5 w-full text-center cursor-pointer"
              >
                {currentIdx + 1 === questions.length ? 'Verify Results' : 'Proceed Forward'}
                <ArrowRight className="w-4.5 h-4.5" />
              </button>
            )}

          </div>
        ) : (
          
          /* SCORE RESULTS SUMMARY SCREEN */
          <div className="bg-[#121630] border border-[#212c5b] p-6 md:p-8 rounded-3xl shadow-premium text-center flex flex-col items-center max-w-md mx-auto relative z-10 animate-scale-up">
            
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 mb-6 shrink-0 shadow-md">
              <Trophy className="w-10 h-10 fill-emerald-500/10" />
            </div>

            <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block mb-1">
              Contest Completed
            </span>
            <h2 className="text-2xl font-black text-white px-2">Quiz Summary report</h2>
            
            {/* Score circle */}
            <div className="relative w-36 h-36 flex items-center justify-center my-6">
              {/* Outer stroke */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="62" className="stroke-white/5 fill-transparent" strokeWidth="8" />
                <circle 
                  cx="72" 
                  cy="72" 
                  r="62" 
                  className="stroke-emerald-500 fill-transparent transition-all duration-1000" 
                  strokeWidth="8" 
                  strokeDasharray={2 * Math.PI * 62}
                  strokeDashoffset={2 * Math.PI * 62 * (1 - correctCount / questions.length)}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold font-mono text-white">
                  {Math.round((correctCount / questions.length) * 105) > 100 ? 100 : Math.round((correctCount / questions.length) * 100)}%
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">Accuracy Grade</span>
              </div>
            </div>

            {/* Payout analysis summary */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 w-full text-left flex flex-col gap-2.5 mb-8">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Answering Accuracy:</span>
                <span className="font-extrabold text-slate-200">{correctCount} of {questions.length} Correct</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Competitor Level:</span>
                <span className="font-extrabold text-slate-200 capitalize">@{user.username} ({user.membershipStatus})</span>
              </div>
              <div className="border-t border-white/5 pt-3.5 mt-1 flex justify-between items-center text-sm">
                <span className="indigo-300 font-bold text-slate-300">USDT Bounty Reward:</span>
                <span className="font-black font-mono text-emerald-400">
                  {calculateRewards() > 0 ? `+$${calculateRewards().toFixed(2)}` : '$0.00'}
                </span>
              </div>
            </div>

            {/* Actions triggers */}
            <button
              onClick={handleSaveResults}
              className="btn-premium w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-md cursor-pointer text-center"
            >
              Claim Earnings &amp; Exit
            </button>
            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-4">
              Earnings are credited to your active wallet balance instantly in partners of PalmPay OPay frameworks.
            </p>

          </div>
        )}

      </main>

      {/* QUIZ FOOTER */}
      <footer className="shrink-0 text-center text-[10px] text-slate-500 tracking-wide font-mono mt-auto pt-4 border-t border-white/5 max-w-3xl mx-auto w-full">
        Quizoe Distraction-free concentrated engine. Partnered under Paystack microfinance licenses.
      </footer>

    </div>
  );
}
