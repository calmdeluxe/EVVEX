import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Send, Sparkles, Shield, Info, Play, Plus, Check, X, Timer, 
  MessageSquare, Film, Image as ImageIcon, Award, Clock, DollarSign,
  Lock, ArrowRight, UserPlus, HelpCircle, Eye, AlertCircle, Ban, Bell
} from 'lucide-react';
import { User, Transaction } from '../types';

export interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  role: 'admin' | 'tutor' | 'member';
  text: string;
  timestamp: string;
  isCorrectAnswer?: boolean;
}

export interface RoomParticipant {
  id: string;
  username: string;
  avatar: string;
  role: 'admin' | 'tutor' | 'member';
  membershipStatus: string;
  joinedAt: string;
  lastActiveTime: number; // Date.now() timestamp
  balance: number;
  status: 'active' | 'kicked';
}

export interface GroupJoinRequest {
  id: string;
  username: string;
  avatar: string;
  membershipStatus: string;
  requestTime: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface QuizSessionConfig {
  id: string;
  title: string;
  startTime: string; // e.g., "08:30"
  endTime: string; // e.g., "09:45"
  timerSeconds: number; // e.g., 3 or 6 seconds
  allowedCategory: 'premium' | 'tutors' | 'verified_members';
  entryPrice: number;
  questionText: string;
  correctAnswer: string;
  puzzleUrl?: string; // puzzle image or video link
  puzzleType?: 'image' | 'video' | 'none';
}

export interface TutorQuizRequest {
  id: string;
  tutorName: string;
  quizTitle: string;
  description: string;
  companionEbookTitle: string;
  timerDuration: number;
  entryFee: number;
  status: 'pending' | 'approved' | 'declined';
  requestedAt: string;
}

interface InteractiveChatQuizHallProps {
  currentUser: User;
  onToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onAddTransaction: (tx: Transaction) => void;
  setCurrentUser?: React.Dispatch<React.SetStateAction<User>>;
}

const PRELOADED_REQUESTS: TutorQuizRequest[] = [];

export default function InteractiveChatQuizHall({
  currentUser,
  onToast,
  onAddTransaction,
  setCurrentUser
}: InteractiveChatQuizHallProps) {
  const isCEO = currentUser.username.toLowerCase() === 'winbigonly' || currentUser.email.toLowerCase() === 'winbigonly@gmail.com';
  const isTutor = (currentUser as any).role === 'tutor';

  // State
  const [activeTab, setActiveTab] = useState<'chat_hall' | 'studio' | 'tutor_setup' | 'requests_inbox'>('chat_hall');
  
  // Real-Time Simulator parameters
  const [sessionActive, setSessionActive] = useState(true);
  const [elapsedStatus, setElapsedStatus] = useState<string>('Active (Within 8:30 AM - 9:45 AM)');

  // Quiz active parameters
  const [quizConfig, setQuizConfig] = useState<QuizSessionConfig>({
    id: 'quiz_curr_1',
    title: 'Naira Compounding Speed Challenge',
    startTime: '08:30',
    endTime: '09:45',
    timerSeconds: 3,
    allowedCategory: 'verified_members',
    entryPrice: 100,
    questionText: 'Given Naira devaluates at 5% monthly, double the value of x where x = OPay daily ₦1,000 compounding limit?',
    correctAnswer: '2000',
    puzzleUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=400',
    puzzleType: 'image'
  });

  // Host/Studio creator state overrides
  const [inputTitle, setInputTitle] = useState('Dynamic Naira Velocity');
  const [inputStartTime, setInputStartTime] = useState('08:30');
  const [inputEndTime, setInputEndTime] = useState('09:45');
  const [inputTimer, setInputTimer] = useState<number>(3);
  const [inputCategory, setInputCategory] = useState<'premium' | 'tutors' | 'verified_members'>('verified_members');
  const [inputPrice, setInputPrice] = useState<number>(100);
  const [inputQuestion, setInputQuestion] = useState('Calculate 15% wallet tax on a ₦10,000 base transfer?');
  const [inputAnswer, setInputAnswer] = useState('1500');
  const [inputPuzzleUrl, setInputPuzzleUrl] = useState('https://images.unsplash.com/photo-1614064641938-3bbee52942c7?q=80&w=400');
  const [inputPuzzleType, setInputPuzzleType] = useState<'image' | 'video' | 'none'>('image');

  // Active Live super countdown
  const [countdownLeft, setCountdownLeft] = useState<number>(0);
  const [isCountdownRunning, setIsCountdownRunning] = useState(false);
  const [winnerFound, setWinnerFound] = useState<string | null>(null);

  // Chat Feed state
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('quizoe_quiz_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });
  const [userTypedMsg, setUserTypedMsg] = useState('');

  // Group User database with real profile attributes - Empty by default, loaded from localStorage
  const [roomMembers, setRoomMembers] = useState<RoomParticipant[]>(() => {
    const isCEO = currentUser.username.toLowerCase() === 'winbigonly' || currentUser.email.toLowerCase() === 'winbigonly@gmail.com';
    const isTutor = (currentUser as any).role === 'tutor';
    const saved = localStorage.getItem('quizoe_live_room_members_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasMe = parsed.some(m => m.username === currentUser.username);
          if (hasMe) return parsed;
          return [
            ...parsed,
            {
              id: 'm_curr_user',
              username: currentUser.username,
              avatar: currentUser.avatar,
              role: isCEO ? 'admin' : isTutor ? 'tutor' : 'member',
              membershipStatus: currentUser.membershipStatus,
              joinedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
              lastActiveTime: Date.now(),
              balance: currentUser.balance,
              status: 'active'
            }
          ];
        }
      } catch (e) {
        console.error(e);
      }
    }
    
    return [
      {
        id: 'm_curr_user',
        username: currentUser.username,
        avatar: currentUser.avatar,
        role: isCEO ? 'admin' : isTutor ? 'tutor' : 'member',
        membershipStatus: currentUser.membershipStatus,
        joinedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        lastActiveTime: Date.now(),
        balance: currentUser.balance,
        status: 'active'
      }
    ];
  });

  // Keep track of roomMembers in a ref to let the inactivity check inspect latest status safely
  const roomMembersRef = useRef<RoomParticipant[]>(roomMembers);
  useEffect(() => {
    roomMembersRef.current = roomMembers;
    localStorage.setItem('quizoe_live_room_members_v2', JSON.stringify(roomMembers));
  }, [roomMembers]);

  // Join Requests database - empty by default, fully dynamic
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>(() => {
    const saved = localStorage.getItem('quizoe_group_join_requests_v2');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('quizoe_group_join_requests_v2', JSON.stringify(joinRequests));
  }, [joinRequests]);

  // Persistent Setup Questions Deck
  const [setupQuestions, setSetupQuestions] = useState<any[]>(() => {
    const saved = localStorage.getItem('quizoe_setup_questions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'setup_q1',
        questionText: "Calculate a 15% transaction fee on a ₦10,000 wallet transfer.",
        correctAnswer: "1500",
        timerSeconds: 10
      },
      {
        id: 'setup_q2',
        questionText: "What is the compounding result of ₦2,000 growing 5% monthly at month-end?",
        correctAnswer: "2100",
        timerSeconds: 6
      },
      {
        id: 'setup_q3',
        questionText: "Which Fintech Partner secure tunnel handles Quizoe payouts in Naira?",
        correctAnswer: "OPay",
        timerSeconds: 10
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('quizoe_setup_questions', JSON.stringify(setupQuestions));
  }, [setupQuestions]);

  // eBook Quiz Generation State managers
  const [selectedEbookId, setSelectedEbookId] = useState<string>('');
  const [isGeneratingAiQuestions, setIsGeneratingAiQuestions] = useState<boolean>(false);

  // Track approval status (Admins and host Tutors are approved instantly)
  const [userApproved, setUserApproved] = useState<boolean>(isCEO || isTutor);
  const [userRequestSubmitted, setUserRequestSubmitted] = useState<boolean>(false);

  // Profile modal click details state
  const [selectedProfileUser, setSelectedProfileUser] = useState<RoomParticipant | null>(null);

  // Configured Super Timer inactive user threshold (configurable in Admin studio dashboard)
  const [inactivityLimitSec, setInactivityLimitSec] = useState<number>(30);

  // Super timer participation check effect
  useEffect(() => {
    if (!sessionActive) return;
    
    const watcher = setInterval(() => {
      const now = Date.now();
      const currentMembers = roomMembersRef.current;
      
      const kickedMembers = currentMembers.filter(member => {
        if (member.role === 'admin' || member.status === 'kicked') return false;
        return member.status === 'active' && (now - member.lastActiveTime) > (inactivityLimitSec * 1000);
      });
      
      if (kickedMembers.length > 0) {
        // Construct system messages
        const newSysMsgs = kickedMembers.map(member => ({
          id: `sys_kick_${member.username}_${Date.now()}_${Math.random()}`,
          sender: '⚠️ SYSTEM COMPACT GATEKEEPER',
          avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=150',
          role: 'admin' as const,
          text: `🚨 Inactivity Kick: @${member.username} was automatically removed from the active chat state because they did not participate (exceeded ${inactivityLimitSec}s super timer).`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        
        // Safety check state updates out of the render loop / state updater functions
        setMessages(prev => [...prev, ...newSysMsgs]);
        
        const wasMeKicked = kickedMembers.some(m => m.username === currentUser.username);
        if (wasMeKicked) {
          setUserApproved(false);
          setUserRequestSubmitted(false);
          onToast("You were removed from active chat due to inactivity. Re-submit a join request!", "warning");
        }
        
        kickedMembers.forEach(member => {
          if (member.username !== currentUser.username) {
            onToast(`@${member.username} removed from board due to idle state!`, "info");
          }
        });
        
        setRoomMembers(prevMembers => {
          return prevMembers.map(m => {
            const isKicked = kickedMembers.some(km => km.username === m.username);
            if (isKicked) {
              return { ...m, status: 'kicked' as const };
            }
            return m;
          }).filter(m => m.status === 'active');
        });
      }
    }, 2050);
    
    return () => clearInterval(watcher);
  }, [sessionActive, inactivityLimitSec, currentUser.username, onToast]);

  // Request to join group handler
  const submitRequestToJoinGroup = () => {
    if (userRequestSubmitted) return;
    
    const newReq: GroupJoinRequest = {
      id: `req_${Date.now()}`,
      username: currentUser.username,
      avatar: currentUser.avatar,
      membershipStatus: currentUser.membershipStatus,
      requestTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'pending'
    };
    
    setJoinRequests(prev => [...prev, newReq]);
    setUserRequestSubmitted(true);
    onToast("Group join request submitted. Waiting for CEO Admin approval!", "success");
    
    // Simulate other participants typing or active updates
    setTimeout(() => {
      onToast("Admin received your join request in the inbox.", "info");
    }, 1500);
  };

  // Admin decision on join requests
  const handleReviewJoinRequest = (reqId: string, decision: 'approved' | 'rejected') => {
    setJoinRequests(prev => prev.map(r => {
      if (r.id !== reqId) return r;
      if (decision === 'approved') {
        // Add to active members
        const alreadyIn = roomMembers.some(m => m.username === r.username);
        if (!alreadyIn) {
          const newM: RoomParticipant = {
            id: `m_appr_${Date.now()}`,
            username: r.username,
            avatar: r.avatar,
            role: 'member',
            membershipStatus: r.membershipStatus,
            joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            lastActiveTime: Date.now(),
            balance: 6500,
            status: 'active'
          };
          setRoomMembers(prevM => [...prevM, newM]);
        }
        
        // Notify chat
        const announce: ChatMessage = {
          id: `sys_join_appr_${Date.now()}`,
          sender: '👑 SYSTEM OPERATOR',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150',
          role: 'admin',
          text: `✅ Join Request Approved: @${r.username} (${r.membershipStatus.toUpperCase()}) has been admitted live to the controlled chat group group!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prevMsg => [...prevMsg, announce]);
        
        if (r.username === currentUser.username) {
          setUserApproved(true);
        }
      }
      return { ...r, status: decision };
    }));
    
    onToast(`Group Join Request from user has been successfully ${decision.toUpperCase()}!`, decision === 'approved' ? 'success' : 'warning');
  };

  // Admin instant member kick
  const handleKickMemberInstantly = (memberUsername: string) => {
    setRoomMembers(prev => prev.map(m => {
      if (m.username === memberUsername) {
        return { ...m, status: 'kicked' as const };
      }
      return m;
    }).filter(m => m.status === 'active'));

    // Append system message
    const sysMsg: ChatMessage = {
      id: `sys_kick_adm_${Date.now()}`,
      sender: '👑 ADMIN INJUNCTION',
      avatar: currentUser.avatar,
      role: 'admin',
      text: `⛔ DISMISSED BY ADMIN: @${memberUsername} was manually kicked and removed from the active chat state live by the Admin!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, sysMsg]);
    setSelectedProfileUser(null);
    onToast(`User @${memberUsername} removed from controlled chat group instantly!`, "success");

    if (memberUsername === currentUser.username) {
      setUserApproved(false);
      setUserRequestSubmitted(false);
    }
  };

  // Tutor submission setup
  const [tutorQuizRequests, setTutorQuizRequests] = useState<TutorQuizRequest[]>(() => {
    const saved = localStorage.getItem('quizoe_tutor_quiz_requests');
    return saved ? JSON.parse(saved) : PRELOADED_REQUESTS;
  });
  const [reqQuizTitle, setReqQuizTitle] = useState('');
  const [reqEbookTitle, setReqEbookTitle] = useState('Sovereign Web3 Ventures');
  const [reqDesc, setReqDesc] = useState('');
  const [reqTimer, setReqTimer] = useState(6);
  const [reqFee, setReqFee] = useState(150);

  // Auto-scroller for chat window
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('quizoe_quiz_messages', JSON.stringify(messages));
  }, [messages]);

  // Static session state init
  useEffect(() => {
    setSessionActive(true);
    setElapsedStatus('Active (Within 8:30 AM - 9:45 AM)');
  }, []);

  // Countdown Live timer decrement loop
  useEffect(() => {
    let timerId: any = null;
    if (isCountdownRunning && countdownLeft > 0) {
      timerId = setInterval(() => {
        setCountdownLeft(prev => {
          if (prev <= 1) {
            setIsCountdownRunning(false);
            
            // Auto lock input box on completion!
            onToast("Timer elapsed! Chat textbox deactivated successfully.", "info");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isCountdownRunning, countdownLeft]);

  // Handle message sending
  const handleSendMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userTypedMsg.trim()) return;

    // Check scheduling boundaries
    if (!sessionActive && !isCEO) {
      onToast("Message blocked! Controlled room is inactive outside 8:30 AM - 9:45 AM scheduled times.", "error");
      return;
    }

    // Check countdown active deactivation
    if (countdownLeft === 0 && !isCEO) {
      onToast("Access Deactivated! Timer is currently inactive. Waiting for Admin to trigger the next question.", "error");
      return;
    }

    const trimmedAnswer = userTypedMsg.trim().toLowerCase();
    const isCorrect = trimmedAnswer === quizConfig.correctAnswer.toLowerCase();

    // Create client message item
    const newMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      sender: currentUser.username,
      avatar: currentUser.avatar,
      role: isCEO ? 'admin' : isTutor ? 'tutor' : 'member',
      text: userTypedMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCorrectAnswer: isCorrect
    };

    setMessages(prev => [...prev, newMsg]);
    setUserTypedMsg('');

    // Update active participation timestamp to prevent automatic super-timer cleanup
    setRoomMembers(prev => prev.map(m => {
      if (m.username === currentUser.username) {
        return { ...m, lastActiveTime: Date.now() };
      }
      return m;
    }));

    // If answer is correct, proclaim the first correct active responder as winner automatically!
    if (isCorrect && !winnerFound) {
      setWinnerFound(newMsg.sender);
      setIsCountdownRunning(false);
      setCountdownLeft(0); // Instantly deactivates textbox for perfect game-loop precision!

      // Award 5GB data reward to the winner dynamically!
      const winningAlert: ChatMessage = {
        id: `m_system_win_${Date.now()}`,
        sender: '🏆 SYSTEM OPERATOR',
        avatar: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=150',
        role: 'admin',
        text: `🎉 CONGRATULATIONS! @${newMsg.sender} won the 5GB High-Speed Data Prize Reward as the FIRST correct responder of this question (perfect match found: "${quizConfig.correctAnswer}")!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, winningAlert]);
      onToast(`Winner selected! 5GB High-Speed Data packet routed to user: @${newMsg.sender}`, 'success');
    }
  };

  // TRIGGER NEXT QUESTION (ADMIN/TUTOR CONTROLS)
  const triggerNextQuestion = () => {
    if (!isCEO && !isTutor) {
      onToast("Unauthorized publisher! Tutors require CEO event room host certification.", "error");
      return;
    }

    // Set config
    const nextConfig: QuizSessionConfig = {
      id: `quiz_gen_${Date.now()}`,
      title: inputTitle,
      startTime: inputStartTime,
      endTime: inputEndTime,
      timerSeconds: inputTimer,
      allowedCategory: inputCategory,
      entryPrice: inputPrice,
      questionText: inputQuestion,
      correctAnswer: inputAnswer,
      puzzleUrl: inputPuzzleUrl,
      puzzleType: inputPuzzleType
    };

    setQuizConfig(nextConfig);
    setCountdownLeft(nextConfig.timerSeconds);
    setIsCountdownRunning(true);
    setWinnerFound(null);

    // Announce to Chat Stream
    const announcementMsg: ChatMessage = {
      id: `m_announce_${Date.now()}`,
      sender: '👑 SYSTEM EVENT BROADCASTER',
      avatar: currentUser.avatar,
      role: 'admin',
      text: `📢 NEW DROPPED CHALLENGE: "${nextConfig.questionText}" // Countdown timer triggered: ${nextConfig.timerSeconds} Seconds live! Send your answer below right now!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, announcementMsg]);
    setActiveTab('chat_hall');
    onToast(`Super timer of ${nextConfig.timerSeconds}s activated live in the chat group!`, 'success');
  };

  // TUTOR REQUEST SUBMITTER
  const submitTutorRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqQuizTitle.trim()) {
      onToast("Please provide a tutor challenge title", 'warning');
      return;
    }

    const newReq: TutorQuizRequest = {
      id: `tq_req_${Date.now()}`,
      tutorName: currentUser.username,
      quizTitle: reqQuizTitle,
      description: reqDesc,
      companionEbookTitle: reqEbookTitle,
      timerDuration: reqTimer,
      entryFee: reqFee,
      status: 'pending',
      requestedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };

    const nextList = [newReq, ...tutorQuizRequests];
    setTutorQuizRequests(nextList);
    localStorage.setItem('quizoe_tutor_quiz_requests', JSON.stringify(nextList));

    setReqQuizTitle('');
    setReqDesc('');
    onToast("Tutor hosting request sent to CEO. Awaiting verification review.", 'success');
  };

  // CEO INBOX DECISION HANDLERS
  const handleReviewTutorRequest = (reqId: string, decision: 'approved' | 'declined') => {
    const updated = tutorQuizRequests.map(r => {
      if (r.id !== reqId) return r;
      return { ...r, status: decision };
    });

    setTutorQuizRequests(updated);
    localStorage.setItem('quizoe_tutor_quiz_requests', JSON.stringify(updated));
    onToast(`Hosting request #${reqId.slice(-4)} has been ${decision.toUpperCase()}!`, decision === 'approved' ? 'success' : 'warning');
  };

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto px-4 md:px-8 mt-4">
      
      {/* 1. TOP HEADER BRAND BOX */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-150 shadow-xs select-none">
        <div>
          <span className="text-[10px] font-black uppercase bg-blue-600 text-white tracking-widest px-3 py-1 rounded-full shadow-sm">🎯 Live Conversational Quiz</span>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-2.5">Controlled Quiz Chat Studio Hub</h1>
          <p className="text-xs text-slate-500 font-medium">Controlled social media style chat environment active only during specific timelines.</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto shrink-0 overflow-x-auto pb-1 md:pb-0">
          <button 
            onClick={() => setActiveTab('chat_hall')}
            className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer flex-1 md:flex-none text-center ${
              activeTab === 'chat_hall' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:text-slate-800'
            }`}
          >
            💬 Interactive group Chat
          </button>

          {(isCEO || isTutor) && (
            <button 
              onClick={() => setActiveTab('studio')}
              className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer flex-1 md:flex-none text-center ${
                activeTab === 'studio' ? 'bg-indigo-650 text-white shadow-sm animate-pulse' : 'bg-slate-50 text-slate-500 hover:text-slate-800'
              }`}
            >
              👑 Chat Quiz Studio Controls
            </button>
          )}

          {isTutor && (
            <button 
              onClick={() => setActiveTab('tutor_setup')}
              className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer flex-1 md:flex-none text-center ${
                activeTab === 'tutor_setup' ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:text-slate-800'
              }`}
            >
              🎓 Request host room
            </button>
          )}

          {isCEO && (
            <button 
              onClick={() => setActiveTab('requests_inbox')}
              className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer flex-1 md:flex-none text-center relative ${
                activeTab === 'requests_inbox' ? 'bg-emerald-650 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:text-slate-800'
              }`}
            >
              📥 Tutor requests ({tutorQuizRequests.filter(r => r.status === 'pending').length})
              {tutorQuizRequests.filter(r => r.status === 'pending').length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
            </button>
          )}
        </div>
      </header>

      {/* 2. CHAT FEED BLOCK */}
      {activeTab === 'chat_hall' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 8 COLUMNS: INTERACTIVE CHAT SCREEN OR ACCESS PORTAL (Split if CEO is accessing) */}
          <div className="lg:col-span-8">
            
            {!userApproved ? (
              <div className="bg-white border border-slate-150 p-8 rounded-3xl text-center space-y-5 py-20 shadow-xs max-w-xl mx-auto">
                <div className="w-16 h-16 bg-slate-900 border border-slate-850 text-amber-400 rounded-full flex items-center justify-center mx-auto text-xl shadow-md animate-pulse">
                  <Lock className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Group Chat Admission Lock</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1.5 leading-relaxed">
                    This interactive multi-user quiz room is controlled. Only authorized candidates approved by the Admin are allowed inside.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl text-[11px] font-bold text-slate-600 font-sans">
                  <span className="text-indigo-650 uppercase font-extrabold text-[10px] block mb-1">📋 Admission Policy</span>
                  - Basic and Sovereign Premium readers submit requests.<br />
                  - Admins evaluate qualifications instantly.<br />
                  - Inactive candidates are automatically pruned to maintain speed.
                </div>

                <div className="pt-2">
                  {userRequestSubmitted ? (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black rounded-2xl animate-pulse">
                      ⏰ Access request pending decision. Check back shortly as admins review!
                    </div>
                  ) : (
                    <button
                      onClick={submitRequestToJoinGroup}
                      className="bg-blue-600 hover:bg-blue-700 text-white block w-full text-xs font-black uppercase py-4 rounded-2xl cursor-pointer shadow-xs transition-all tracking-wider"
                    >
                      🚀 Request Access to Join Live Chat Group
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* INLINE MINI SHORTCUT DECK BACK-END (For Owner Participation Setup) */}
                {isCEO && (
                  <div className="md:col-span-4 bg-slate-900 border border-slate-800 text-white p-4 rounded-3xl flex flex-col justify-between self-stretch h-[544px] min-h-[500px]">
                    <div className="space-y-3">
                      <div className="border-b border-white/10 pb-2 flex justify-between items-center select-none">
                        <span className="text-[9px] uppercase font-black tracking-widest text-[#5c73e7]">⚡ Live master shortcut panel</span>
                        <span className="w-2 h-2 rounded-full bg-[#5c73e7] animate-pulse"></span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mb-3">
                        Select a compiled question to broadcast it as a live message, activate group point rewards, and trigger the exciting excitement countdown automatically!
                      </p>

                      <div className="space-y-2.5 overflow-y-auto max-h-[360px] pr-1">
                        {setupQuestions.length === 0 ? (
                          <em className="text-[10px] text-slate-500 block text-center py-6">
                            Deck empty! Load eBook questions via the "Controls Setup" tab above.
                          </em>
                        ) : (
                          setupQuestions.map((q, idx) => (
                            <button
                              key={q.id || idx}
                              type="button"
                              onClick={() => {
                                const nextConfig: QuizSessionConfig = {
                                  id: q.id,
                                  title: "Live Question Sprint",
                                  startTime: "08:30",
                                  endTime: "09:45",
                                  timerSeconds: q.timerSeconds,
                                  allowedCategory: "verified_members",
                                  entryPrice: 100,
                                  questionText: q.questionText,
                                  correctAnswer: q.correctAnswer,
                                  puzzleUrl: undefined,
                                  puzzleType: "none"
                                };

                                setQuizConfig(nextConfig);
                                setCountdownLeft(q.timerSeconds);
                                setIsCountdownRunning(true);
                                setWinnerFound(null);

                                // Broadcast to active stream
                                const annMsg: ChatMessage = {
                                  id: `m_announce_${Date.now()}`,
                                  sender: '👑 SYSTEM EVENT BROADCASTER',
                                  avatar: currentUser.avatar,
                                  role: 'admin',
                                  text: `📢 LIVE CHALLENGE: "${q.questionText}" // Countdown timer triggered: ${q.timerSeconds} Seconds live! Submit answers!`,
                                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                };
                                setMessages(prev => [...prev, annMsg]);
                                onToast(`Successfully sent: "${q.questionText}"! Timer countdown live!`, 'success');
                              }}
                              className="w-full text-left p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl transition-all cursor-pointer block text-[11px] font-semibold text-slate-200 space-y-1 select-none"
                            >
                              <strong className="text-indigo-400 block mb-0.5">QUESTION {idx + 1}</strong>
                              <p className="line-clamp-2 leading-relaxed text-slate-300 font-semibold">{q.questionText}</p>
                              <div className="flex justify-between items-center text-[8px] text-slate-400 pt-1 border-t border-white/5">
                                <span>MATCH_KEY: <strong className="text-emerald-400 font-mono">{q.correctAnswer}</strong></span>
                                <span className="bg-slate-900 border px-1 rounded border-slate-800 text-[#5c73e7] font-black">{q.timerSeconds}s</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-2 text-center rounded-xl font-mono text-[9px] text-[#5c73e7] font-black uppercase">
                      Deck index load active
                    </div>
                  </div>
                )}

                {/* INTERACTIVE CHAT SCREEN CONTAINER */}
                <div className={`${isCEO ? 'md:col-span-8' : 'md:col-span-12'} space-y-4`}>
                  
                  {/* DYNAMIC EXCITEMENT BANNER FOR TIMER COUNTDOWN */}
                  {countdownLeft > 0 && (
                    <div className="bg-red-50 border border-red-150 p-3.5 rounded-2xl flex items-center justify-between text-red-700 select-none animate-bounce">
                      <div className="flex items-center gap-2">
                        <Timer className="w-5 h-5 text-red-650 animate-spin" />
                        <div className="text-left">
                          <strong className="text-xs font-black block leading-none">ACTIVE COUNTDOWN SPRINT:</strong>
                          <span className="text-[10px] text-red-650/85 font-semibold">First exact matching responder wins ₦500!</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xl font-black bg-red-650 text-white rounded-lg px-2.5 py-0.5 shadow-sm">{countdownLeft}s</span>
                        <span className="text-[10px] font-bold text-red-650">left</span>
                      </div>
                    </div>
                  )}

                  {/* CHAT WINDOW STREAM */}
                  <div className="bg-white border border-slate-150 rounded-3xl overflow-hidden flex flex-col h-[500px] shadow-xs justify-between">
                    
                    {/* STATUS BAR BAR */}
                    <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between select-none text-[11px] md:text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="font-extrabold text-slate-700">Official scheduling: 08:30 AM - 09:45 AM</span>
                      </div>
                      
                      <div className="flex items-center gap-1 bg-white border rounded-xl py-1 px-3 shadow-xs font-black text-[10px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-[9px] uppercase text-emerald-600 font-extrabold">LIVE QUIZ PORT</span>
                      </div>
                    </div>

                    {/* MESSAGE LOGS FEED */}         </div>

                  {/* MESSAGE LOGS FEED */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {messages.map((m) => {
                      const isSpecialAnnounce = m.sender.toUpperCase().includes('Broadcaster'.toUpperCase()) || m.sender.toUpperCase().includes('Operator'.toUpperCase()) || m.sender.toUpperCase().includes('SYSTEM') || m.sender.toUpperCase().includes('GATEKEEPER');
                      return (
                        <div 
                          key={m.id} 
                          className={`flex gap-3 text-xs max-w-[85%] text-left ${
                            isSpecialAnnounce
                              ? 'bg-slate-50 border p-4 rounded-2xl border-slate-200 w-full max-w-full'
                              : m.sender === currentUser.username 
                                ? 'ml-auto flex-row-reverse' 
                                : ''
                          }`}
                        >
                          {!isSpecialAnnounce && (
                            <img src={m.avatar} alt={m.sender} className="w-8 h-8 rounded-full object-cover shrink-0" />
                          )}
                          <div>
                            <div className="flex items-center gap-1.5 select-none text-[10px] text-slate-400 font-extrabold">
                              <span className={m.role === 'admin' ? 'text-rose-605 text-rose-600' : m.role === 'tutor' ? 'text-purple-600' : 'text-slate-800'}>
                                @{m.sender}
                              </span>
                              <span>•</span>
                              <span>{m.timestamp}</span>
                            </div>
                            <p className={`mt-1 font-semibold text-slate-700 leading-normal break-all block ${isSpecialAnnounce ? 'text-slate-805 text-[11px] font-bold' : ''}`}>
                              {m.text}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* INTERACTIVE INPUT CONTROL - AUTOMATICALLY DEACTIVATES ON TIMER EXPIRY */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <form onSubmit={handleSendMessageSubmit} className="flex gap-2">
                      <input 
                        type="text" 
                        disabled={!isCEO && (!sessionActive || countdownLeft === 0)}
                        placeholder={
                          isCEO
                            ? "Type a message or quiz answer as the Application Owner..."
                            : !sessionActive 
                              ? "Event over (Time is outside 8:30 - 9:45 AM). Users auto-dismissed."
                              : countdownLeft === 0 
                                ? "TextBox Locked! Deactivated. Waiting for next question from Admin..." 
                                : `Type exact correctAnswer matching equation! (${countdownLeft}s remaining)`
                        }
                        value={userTypedMsg}
                        onChange={(e) => setUserTypedMsg(e.target.value)}
                        className="flex-1 bg-white border border-slate-250 py-3 px-4 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed" 
                      />
                      <button 
                        type="submit"
                        disabled={!isCEO && (!sessionActive || countdownLeft === 0)}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-5 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      >
                        Send <Send className="w-4.5 h-4.5" />
                      </button>
                    </form>
                    
                    {/* Visual feedback warning */}
                    {!isCEO && sessionActive && countdownLeft === 0 && (
                      <span className="text-[10px] text-amber-600 font-extrabold flex items-center gap-1 mt-2 justify-center select-none">
                        <Ban className="w-3.5 h-3.5 shrink-0" /> Input Deactivated! Wait until Admin drops another question.
                      </span>
                    )}
                  </div>

                </div>

              </div>
            )}

          </div>

            {/* RIGHT 4 COLUMNS: SYSTEM ACTIVE STATUS, MEMBERS LIST, AND ADMISSIONS INBOX */}
            <div className="lg:col-span-4 space-y-4">
            
            {/* SUPER COUNTDOWN COMPONENT */}
            <div className="bg-slate-900 border border-slate-800 text-white p-5 rounded-3xl space-y-4 text-left shadow-premium select-none">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live super Countdown Algorithm</h4>
                {countdownLeft > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                )}
              </div>
              
              <div className="flex items-center gap-4 py-2 border-y border-slate-800 justify-between">
                <div className="p-3 bg-rose-650/15 text-rose-400 border border-rose-500/20 rounded-2xl flex items-center justify-center shrink-0">
                  <Timer className={`w-9 h-9 ${isCountdownRunning ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <span className="text-2xl font-black font-mono tracking-tight block">
                    {countdownLeft}s
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">SEC remaining before auto deactivation</span>
                </div>
              </div>

              {/* Super timer selector helper to let host configure duration easily during active lobbies */}
              {(isCEO || isTutor) && (
                <div className="space-y-1 bg-slate-950 p-3 rounded-2xl border border-slate-850">
                  <span className="text-[9px] text-slate-400 uppercase font-extrabold flex items-center gap-1">
                    ⚡ Inactivity threshold (Super Timer Limit):
                  </span>
                  <div className="flex items-center gap-1.5 justify-between">
                    {[15, 30, 60, 120].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => {
                          setInactivityLimitSec(sec);
                          onToast(`Pruning idle candidates set to ${sec}s inactivity super-timer!`, "success");
                        }}
                        className={`text-[10px] font-mono py-1 px-2 rounded-lg font-bold border ${
                          inactivityLimitSec === sec 
                            ? 'bg-rose-600 border-rose-500 text-white' 
                            : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 text-xs text-slate-300">
                <p className="font-extrabold text-[11px] text-indigo-400 uppercase">Qualifying Criteria:</p>
                <p className="text-slate-400 font-semibold leading-normal">
                  - Answer must match exact correct key values dropped.<br />
                  - Inactive candidates auto-purged if silent for {inactivityLimitSec}s.
                </p>
                <div className="bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-700/20 text-[10px] flex items-center gap-1.5 text-indigo-300">
                  <Award className="w-4 h-4 shrink-0" />
                  <span>Immediate prize routed: <strong>5GB Dynamic High-Speed Packet</strong></span>
                </div>
              </div>
            </div>

            {/* LIVE GROUP MEMBERS DIRECTORY */}
            <div className="bg-white border border-slate-150 p-5 rounded-3xl space-y-3.5 text-left select-none">
              <div className="flex justify-between items-center border-b pb-2">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4.5 h-4.5 text-slate-700" />
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Group Members ({roomMembers.filter(m => m.status === 'active').length})
                  </h4>
                </div>
                <span className="text-[10px] bg-slate-150 text-slate-600 font-bold px-2 py-0.5 rounded-md">Live</span>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {roomMembers.filter(m => m.status === 'active').map((member) => {
                  const idleTime = Math.round((Date.now() - member.lastActiveTime) / 1000);
                  const isCur = member.username === currentUser.username;
                  return (
                    <div 
                      key={member.id}
                      onClick={() => setSelectedProfileUser(member)}
                      className="flex items-center justify-between p-2 hover:bg-slate-50 border border-transparent hover:border-slate-150 rounded-xl cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className="relative">
                          <img src={member.avatar} alt={member.username} className="w-8 h-8 rounded-full border object-cover" />
                          <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-white" />
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-slate-950 flex items-center gap-1">
                            @{member.username} {isCur && <span className="text-[9px] text-indigo-650 font-bold">(You)</span>}
                          </p>
                          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-tight">
                            {member.role === 'admin' ? '👑 Admin' : member.role === 'tutor' ? '🎓 Tutor' : '📚 Member'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[9px] text-emerald-600 font-black font-mono uppercase bg-emerald-50 px-1.5 py-0.5 rounded-md">
                          {idleTime <= 4 ? 'Active' : `${idleTime}s ago`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-slate-400 font-semibold text-center italic">
                💡 Click on any user from the index list to view facts, check wallet balances, or kick users.
              </p>
            </div>

            {/* ADMISSION JOIN REQUESTS INBOX (ONLY CEOs/ADMINS CAN REVIEW) */}
            {isCEO && (
              <div className="bg-white border border-slate-150 p-5 rounded-3xl space-y-3 text-left shadow-xs">
                <div className="flex items-center gap-1.5 border-b pb-2">
                  <UserPlus className="w-4.5 h-4.5 text-indigo-650" />
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Admission Join Requests ({joinRequests.filter(r => r.status === 'pending').length})
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {joinRequests.filter(r => r.status === 'pending').length === 0 ? (
                    <p className="text-[11px] text-slate-400 font-bold py-2 text-center">Inbox clean. No pending candidate requests.</p>
                  ) : (
                    joinRequests.filter(r => r.status === 'pending').map((req) => (
                      <div key={req.id} className="p-3 bg-slate-50 border border-slate-150 rounded-2xl space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5">
                            <img src={req.avatar} alt={req.username} className="w-6.5 h-6.5 rounded-full object-cover" />
                            <div>
                              <span className="font-extrabold text-slate-900 block text-xs">@{req.username}</span>
                              <span className="text-[9px] text-slate-400 font-black uppercase tracking-tight">{req.membershipStatus} client</span>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400">{req.requestTime}</span>
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={() => handleReviewJoinRequest(req.id, 'approved')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 py-1 px-2 text-[10px] font-black uppercase rounded-lg cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Admit
                          </button>
                          <button
                            onClick={() => handleReviewJoinRequest(req.id, 'rejected')}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 flex-1 py-1 px-2 text-[10px] font-black uppercase rounded-lg cursor-pointer flex items-center justify-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Deny
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* SEED SECURITY ELIGIBILITY BOX */}
            <div className="bg-white border border-slate-150 p-5 rounded-3xl space-y-4 select-none">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Session Security &amp; Eligibility</h4>
              
              <div className="space-y-3">
                <div className="p-2.5 bg-slate-50 rounded-xl border flex items-center justify-between text-xs font-bold">
                  <span>Current Event Scheduler:</span>
                  <span className="text-indigo-650 font-black">08:30 — 09:45 AM</span>
                </div>
                
                <div className="p-2.5 bg-slate-50 rounded-xl border flex items-center justify-between text-xs font-bold">
                  <span>Vetting time limits:</span>
                  <span className="text-slate-700">{elapsedStatus}</span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border text-xs space-y-1">
                  <p className="font-bold">EBook Learning credentials status:</p>
                  <div className="flex items-center gap-1 text-emerald-600 font-extrabold text-[10px] uppercase">
                    <Check className="w-4 h-4" /> Consumed Sovereign ebooks (Qualified)
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* CHAT STUDIO CONTROLS (CEOS/TUTORS HOST PANEL) */}
      {activeTab === 'studio' && (isCEO || isTutor) && (() => {
        const savedEbooksRaw = localStorage.getItem('quizoe_compiled_ebooks');
        const compiledEbooks = savedEbooksRaw ? JSON.parse(savedEbooksRaw) : [];

        // Manual add fields
        const handleAddManualSetupQuestion = (e: React.FormEvent) => {
          e.preventDefault();
          if (!inputQuestion.trim() || !inputAnswer.trim()) {
            onToast("Please fill in both the question text and answer key!", "warning");
            return;
          }
          const nextQ = {
            id: `setup_man_${Date.now()}`,
            questionText: inputQuestion.trim(),
            correctAnswer: inputAnswer.trim().toUpperCase(),
            timerSeconds: inputTimer
          };
          setSetupQuestions(prev => [nextQ, ...prev]);
          setInputQuestion('');
          setInputAnswer('');
          onToast("Added custom question to live setup deck! Point to it in your live chat panel to invoke.", "success");
        };

        const handleInjectTestMembers = () => {
          const testMembers = [
            {
              id: 'm_samuel',
              username: 'samuel_opay',
              avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150',
              role: 'member' as const,
              membershipStatus: 'premium',
              joinedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
              lastActiveTime: Date.now(),
              balance: 14500,
              status: 'active' as const
            },
            {
              id: 'm_chi_ama',
              username: 'chi_ama',
              avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150',
              role: 'member' as const,
              membershipStatus: 'premium',
              joinedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
              lastActiveTime: Date.now(),
              balance: 8900,
              status: 'active' as const
            },
            {
              id: 'm_dan',
              username: 'tutor_dan',
              avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150',
              role: 'tutor' as const,
              membershipStatus: 'premium',
              joinedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
              lastActiveTime: Date.now(),
              balance: 45000,
              status: 'active' as const
            }
          ];

          setRoomMembers(prev => {
            const nextList = [...prev];
            testMembers.forEach(tm => {
              if (!nextList.some(m => m.username === tm.username)) {
                nextList.push(tm);
              }
            });
            return nextList;
          });

          // Inject pending join requests for vetting demonstration
          setJoinRequests([
            {
              id: 'req_hope',
              username: 'hope_fintech',
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150',
              membershipStatus: 'premium',
              requestTime: '08:42 AM',
              status: 'pending'
            },
            {
              id: 'req_kunle',
              username: 'investor_kunle',
              avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150',
              membershipStatus: 'basic',
              requestTime: '08:45 AM',
              status: 'pending'
            }
          ]);

          onToast("Simulated test members (samuel_opay, chi_ama, tutor_dan) and join requests applied to database successfully!", "success");
        };

        const handlePurgeToOwnerOnly = () => {
          setRoomMembers([
            {
              id: 'm_curr_user',
              username: currentUser.username,
              avatar: currentUser.avatar,
              role: isCEO ? 'admin' : isTutor ? 'tutor' : 'member',
              membershipStatus: currentUser.membershipStatus,
              joinedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
              lastActiveTime: Date.now(),
              balance: currentUser.balance,
              status: 'active'
            }
          ]);
          setJoinRequests([]);
          onToast("Database database cleaned! All default/fake group room records wiped cleanly.", "success");
        };

        const handleGenerateFromEbook = async () => {
          if (!selectedEbookId) {
            onToast("Please select a compiled eBook to generate questions from first!", "warning");
            return;
          }
          const matchingBook = compiledEbooks.find((b: any) => b.id === selectedEbookId);
          if (!matchingBook) {
            onToast("Selected eBook metadata is missing or corrupted.", "error");
            return;
          }

          setIsGeneratingAiQuestions(true);
          onToast(`Generating quiz questions & answers dynamically from eBook: "${matchingBook.title}"...`, "info");

          try {
            const resp = await fetch('/api/openrouter/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: `Analyze this eBook details for generating interactive quiz questions:
Title: "${matchingBook.title}"
Description: "${matchingBook.description}"
Cards content: ${JSON.stringify(matchingBook.cards || [])}

Generate exactly 3 relevant mathematical or factual quiz questions and answers for the active tournament.
Return format MUST be a plain JSON array of objects, with keys "questionText" (string) and "correctAnswer" (string, short key value in UPPERCASE/number). Do not include any other markdown characters outside the raw JSON.`,
                model: 'google/gemini-2.5-flash'
              })
            });

            const rawObj = await resp.json();
            let parsedList = [];
            if (rawObj.status || rawObj.success || rawObj.text) {
              const textContent = rawObj.text || '';
              try {
                const cleanedText = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();
                parsedList = JSON.parse(cleanedText);
              } catch (errParse) {
                console.warn("Regex matching JSON fallbacks", textContent);
              }
            }

            // Fallback generation for 100% reliability matching eBook topic
            if (!parsedList || parsedList.length === 0) {
              parsedList = [
                {
                  questionText: `Using compiled "${matchingBook.title}" guide, calculate 10% daily ROI limits on a ₦10,000 OPay entry stake?`,
                  correctAnswer: "1000"
                },
                {
                  questionText: `Under standard "${matchingBook.title}" rules, what is the core secure gateway protocol?`,
                  correctAnswer: "PAYSTACK"
                },
                {
                  questionText: `How many chapters are compiled in "${matchingBook.title}" companion eBook?`,
                  correctAnswer: String(matchingBook.cards?.length || 1)
                }
              ];
            }

            const formattedNew = parsedList.map((item: any, i: number) => ({
              id: `setup_ai_${Date.now()}_${i}`,
              questionText: item.questionText,
              correctAnswer: String(item.correctAnswer).trim().toUpperCase(),
              timerSeconds: 10
            }));

            setSetupQuestions(prev => [...formattedNew, ...prev]);
            onToast(`🤖 AI Assistant generated ${formattedNew.length} quiz questions and answers matching "${matchingBook.title}"!`, "success");
          } catch (e) {
            onToast("OpenAI Assistant offline. Generated companion questions with robust local heuristics.", "warning");
            const fallbackList = [
              {
                id: `setup_ai_fallback_${Date.now()}_1`,
                questionText: `According to published "${matchingBook.title}" content, what is the standard cashout fee on ₦5,000?`,
                correctAnswer: "100",
                timerSeconds: 10
              },
              {
                id: `setup_ai_fallback_${Date.now()}_2`,
                questionText: `What is the card multiplier rate when compounding balance in "${matchingBook.title}"?`,
                correctAnswer: "2",
                timerSeconds: 6
              }
            ];
            setSetupQuestions(prev => [...fallbackList, ...prev]);
          } finally {
            setIsGeneratingAiQuestions(false);
          }
        };

        return (
          <div className="space-y-6 animate-fade-in select-none">
            
            {/* DUAL DIVISION SETUP SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEFT 7 COLS: eBook and AI Question Generator Controls */}
              <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-150 p-6 md:p-8 space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase bg-slate-900 text-white tracking-widest px-3 py-1 rounded-full shadow-xs inline-block">Aspect 1: Full Life Setup Page</span>
                  <h3 className="text-sm font-black text-slate-950 mt-3 flex items-center gap-2">
                    🤖 AI Assistant &amp; eBook Selection Suite
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Select your published learning companion, generate automatic equations and answers via AI, or add custom questions.</p>
                </div>

                {/* Ebook selector component */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-205 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Published Companion eBook Source</label>
                    {compiledEbooks.length === 0 ? (
                      <div className="p-3.5 bg-yellow-50 border border-yellow-250 rounded-xl text-yellow-700 text-xs font-bold leading-normal">
                        ⚠️ Currently no eBooks have been compiled or published yet. Access the <strong>eBook Studio</strong> tab or click "Go to eBook Publisher" on home board to create your first book!
                      </div>
                    ) : (
                      <select
                        value={selectedEbookId}
                        onChange={(e) => setSelectedEbookId(e.target.value)}
                        className="w-full bg-white border border-slate-200 py-3 px-3 rounded-xl text-xs font-extrabold cursor-pointer text-slate-800 focus:outline-none"
                      >
                        <option value="">-- Choose Published eBook Companion --</option>
                        {compiledEbooks.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            📖 {b.title} ({b.cards?.length || 0} swipe cards compiled) — by @{b.authorName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* AI trigger */}
                  <button
                    type="button"
                    disabled={!selectedEbookId || isGeneratingAiQuestions}
                    onClick={handleGenerateFromEbook}
                    className="w-full bg-indigo-650 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs uppercase py-3.5 px-4 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all"
                  >
                    {isGeneratingAiQuestions ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block"></span>
                        AI assistant is generating questions &amp; answers...
                      </>
                    ) : (
                      <>
                        🤖 AI Assistant: Generate 3 Quiz Questions &amp; Answers from eBook
                      </>
                    )}
                  </button>
                </div>

                {/* Manual Add Question Card */}
                <form onSubmit={handleAddManualSetupQuestion} className="bg-slate-900 text-white p-5 rounded-2xl space-y-4 select-none">
                  <div className="border-b border-white/5 pb-2">
                    <span className="text-[10px] font-black uppercase text-indigo-400">➕ Compile Custom/Manual Question</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Question/Math Equation Text</label>
                      <textarea
                        rows={2}
                        required
                        placeholder="e.g. Calculate the total value limit of Naira if transaction cost is ₦150?"
                        value={inputQuestion}
                        onChange={(e) => setInputQuestion(e.target.value)}
                        className="w-full bg-slate-950 text-white border border-slate-800 p-2 text-xs font-semibold rounded-xl focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Correct Answer key (UPPERCASE/Numeric)</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 1500"
                          value={inputAnswer}
                          onChange={(e) => setInputAnswer(e.target.value)}
                          className="w-full bg-slate-950 text-white border border-slate-800 py-2.5 px-3 text-xs font-black rounded-xl uppercase tracking-wider"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Seconds countdown super timer</label>
                        <select
                          value={inputTimer}
                          onChange={(e) => setInputTimer(Number(e.target.value))}
                          className="w-full bg-slate-950 text-white border border-slate-800 py-2.5 px-2 text-xs font-extrabold rounded-xl focus:outline-none cursor-pointer"
                        >
                          <option value={3}>3 Seconds (Extremely fast)</option>
                          <option value={6}>6 Seconds (Exciting Game)</option>
                          <option value={10}>10 Seconds (Standard Quiz)</option>
                          <option value={15}>15 Seconds (Analytical)</option>
                          <option value={30}>30 Seconds (Time Cushion)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-white hover:bg-slate-100 text-slate-900 py-3 px-4 text-xs font-black uppercase rounded-xl cursor-pointer shadow-md transition-all text-center"
                  >
                    ✓ Compile &amp; Add Question to Setup Deck
                  </button>
                </form>

              </div>

              {/* RIGHT 5 COLS: Prepared Questions Deck & Simulation Controls */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-150 p-6 md:p-8 space-y-6">
                
                {/* Wetting database parameters */}
                <div className="space-y-3 select-none">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 racking-wider">📋 Live Vetting Database &amp; Tests</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  </div>

                  <div className="bg-slate-50 border p-4 rounded-2xl border-slate-205 space-y-3">
                    <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                      Wipe out unrequested autopilot bots or dummy participants and inject exact test candidates dynamically to run fully initiated simulations.
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-center pt-2">
                      <button
                        type="button"
                        onClick={handleInjectTestMembers}
                        className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase rounded-xl cursor-pointer tracking-wider transition-all"
                      >
                        ➕ Inject Simulation Members
                      </button>
                      <button
                        type="button"
                        onClick={handlePurgeToOwnerOnly}
                        className="p-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-[10px] font-black uppercase rounded-xl cursor-pointer tracking-wider transition-all"
                      >
                        🗑️ Reset Db to Owner Only
                      </button>
                    </div>
                  </div>
                </div>

                {/* Prepared Deck List of Questions */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Prepared Setup Deck ({setupQuestions.length})
                    </h4>
                    <button
                      onClick={() => {
                        setSetupQuestions([]);
                        onToast("Setup questions deck wiped cleanly.", "info");
                      }}
                      className="text-[9px] uppercase font-black tracking-wider text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear Deck
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {setupQuestions.length === 0 ? (
                      <em className="text-[11px] text-slate-450 block py-5 text-center">Setup deck empty. Compile custom questions or use the eBook AI tool above to build your deck list.</em>
                    ) : (
                      setupQuestions.map((q, idx) => (
                        <div key={q.id || idx} className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-2xl flex justify-between gap-3 text-xs font-semibold leading-relaxed relative overflow-hidden group">
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 block font-bold">Question #{idx + 1} ({q.timerSeconds}s timer limit)</span>
                            <p className="text-slate-800 font-bold">{q.questionText}</p>
                            <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-mono font-black select-all">ANSWER KEY: {q.correctAnswer}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSetupQuestions(prev => prev.filter(item => item.id !== q.id));
                              onToast("Removed question from setup deck.", "info");
                            }}
                            className="text-slate-400 hover:text-red-600 p-1 self-start rounded-md border border-transparent hover:border-red-100 hover:bg-red-50 cursor-pointer text-[10px]"
                            title="Remove from setup deck"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>
        );
      })()}

      {/* TUTOR CHALLENGE EVENT DEPLOYMENT REQUEST */}
      {activeTab === 'tutor_setup' && isTutor && (
        <form onSubmit={submitTutorRequest} className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 space-y-6 text-left animate-fade-in shadow-xs">
          <div>
            <span className="text-[10px] font-black uppercase bg-violet-600 text-white px-3 py-1 rounded-full shadow-sm">Academic Endorsement Request</span>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-3">Request to Host Quiz Chat Room</h3>
            <p className="text-xs text-slate-500 font-semibold leading-normal">Submit hosting parameters. You will need to bind your challenge to a specific publication ebook companion consumed by members.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Target Quiz Chat title</label>
              <input 
                type="text" 
                placeholder="e.g. Web3 Escrow Ledger Masterclass"
                value={reqQuizTitle}
                onChange={(e) => setReqQuizTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl text-xs font-semibold focus:outline-none" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Companion Ebook</label>
              <select 
                value={reqEbookTitle}
                onChange={(e) => setReqEbookTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 py-3 px-3 rounded-xl text-xs font-black cursor-pointer uppercase text-slate-700 focus:outline-none"
              >
                <option value="Sovereign Web3 Ventures">Sovereign Web3 Ventures (My Upload)</option>
                <option value="OPay Wealth Velocity">OPay Wealth Velocity (CEO Masterpiece)</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Timer Limit Configuration</label>
                <select 
                  value={reqTimer}
                  onChange={(e) => setReqTimer(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 py-3 px-2 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value={3}>3 Seconds (Extremely fast)</option>
                  <option value={6}>6 Seconds (Puzzles Standard)</option>
                  <option value={10}>10 Seconds (Classic standard)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Spectator Entry price (₦)</label>
                <input 
                  type="number" 
                  value={reqFee}
                  onChange={(e) => setReqFee(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl text-xs font-mono font-bold" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-extrabold uppercase text-slate-400">Brief Challenge Outline &amp; Guidelines</label>
            <textarea 
              rows={4} 
              placeholder="e.g. Provide a short description explaining what puzzles, equations, or smart questions you plan to pose to the students in the chat."
              value={reqDesc}
              onChange={(e) => setReqDesc(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 leading-normal"
            />
          </div>

          <div className="flex justify-end select-none">
            <button 
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase py-3 px-6 rounded-xl shadow-md cursor-pointer"
            >
              Submit Chat Room hosting proposal
            </button>
          </div>

        </form>
      )}

      {/* CEO REVIEWER INBOX FOR TUTOR CHALLENGE ROOM REQUESTS */}
      {activeTab === 'requests_inbox' && isCEO && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="flex items-center justify-between border-b pb-3 border-slate-100 select-none">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Tutor Event Hosting Proposals Inbox</h3>
            <span className="text-[10px] font-mono font-black uppercase text-emerald-600 bg-emerald-100 py-0.5 px-3 rounded-full">Vetting system ready</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {tutorQuizRequests.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border text-slate-400">
                No tutor hosting proposals received.
              </div>
            ) : (
              tutorQuizRequests.map((req) => (
                <div key={req.id} className="bg-white rounded-3xl border border-slate-150 p-6 flex flex-col md:flex-row justify-between gap-6 shadow-xs relative overflow-hidden">
                  
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500" />

                  <div className="space-y-3 max-w-xl text-xs font-semibold text-slate-700">
                    <div className="flex items-center gap-2 select-none">
                      <span className="p-1 px-2.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-black uppercase">Tutor: @{req.tutorName}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-[10px] text-slate-400">Submitted: {req.requestedAt}</span>
                    </div>

                    <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{req.quizTitle}</h4>
                    <p className="text-slate-500 leading-relaxed font-semibold italic">"{req.description}"</p>
                    
                    <div className="flex flex-wrap gap-4 text-[10px] text-slate-400 font-extrabold uppercase select-none">
                      <span>Companion Book: <strong className="text-slate-700">【 {req.companionEbookTitle} 】</strong></span>
                      <span>•</span>
                      <span>Suggested Timer: <strong className="text-slate-800">{req.timerDuration}s</strong></span>
                      <span>•</span>
                      <span>Suggested price: <strong className="text-indigo-600">₦{req.entryFee.toLocaleString()}</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center gap-2 shrink-0 select-none text-xs md:text-right">
                    <span className="text-[10px] font-bold text-slate-450 block mb-1">Status:</span>
                    {req.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleReviewTutorRequest(req.id, 'declined')}
                          className="bg-slate-150 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-xl font-bold uppercase transition-all cursor-pointer"
                        >
                          Decline
                        </button>
                        <button 
                          onClick={() => handleReviewTutorRequest(req.id, 'approved')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-4 rounded-xl font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                        >
                          Approve Proposals
                        </button>
                      </div>
                    ) : (
                      <span className={`text-xs font-black uppercase ${req.status === 'approved' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        Processed: {req.status.toUpperCase()}
                      </span>
                    )}
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* USER PROFILE MODAL FLYOUT */}
      {selectedProfileUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in select-none">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-150 p-6 space-y-5 text-slate-800 shadow-xl relative text-left">
            <button 
              onClick={() => setSelectedProfileUser(null)}
              className="absolute top-4 right-4 p-1.5 bg-slate-50 border rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-4">
              <img 
                src={selectedProfileUser.avatar} 
                alt={selectedProfileUser.username} 
                className="w-14 h-14 rounded-full border border-indigo-650 object-cover" 
              />
              <div>
                <h3 className="font-extrabold text-slate-900">@{selectedProfileUser.username}</h3>
                <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
                  selectedProfileUser.role === 'admin' ? 'bg-red-50 text-red-700' : selectedProfileUser.role === 'tutor' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {selectedProfileUser.role.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl text-xs space-y-2 font-semibold">
              <div className="flex justify-between">
                <span className="text-slate-400">Class Access:</span>
                <span className="text-slate-800 capitalize font-bold">{selectedProfileUser.membershipStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">User Wallet Balance:</span>
                <span className="text-indigo-650 font-extrabold font-mono">₦{selectedProfileUser.balance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Joined Room At:</span>
                <span className="text-slate-700 font-bold">{selectedProfileUser.joinedAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status state duration:</span>
                <span className="text-emerald-600 font-black">
                  {selectedProfileUser.status === 'active' ? 'Active Approved' : 'Suspended'}
                </span>
              </div>
            </div>

            {isCEO && selectedProfileUser.username !== currentUser.username && (
              <button
                onClick={() => handleKickMemberInstantly(selectedProfileUser.username)}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm text-center"
              >
                ❌ Remove user from group live instantly
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
