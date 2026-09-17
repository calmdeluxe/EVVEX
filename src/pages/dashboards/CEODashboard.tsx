import React, { useState } from 'react';
import { 
  Shield, CheckSquare, XSquare, PlusCircle, Megaphone, Settings2, Sparkles, 
  Trash2, Layers, AlertCircle, TrendingUp, Users, DollarSign, Award, Landmark, 
  Check, X, FileText, PlayCircle, Radio, Compass, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Challenge, FeedPost, User } from '../../types';
import EbookStudioMarketplace from '../../components/EbookStudioMarketplace';
import InteractiveChatQuizHall from '../../components/InteractiveChatQuizHall';

interface CEODashboardProps {
  currentUser: User;
  challenges: Challenge[];
  feedPosts: FeedPost[];
  users: User[];
  onAddChallenge: (c: Challenge) => void;
  onAddFeedPost: (p: FeedPost) => void;
  onUpdateUsers: (updated: User[]) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export interface HouseItem {
  id: string;
  name: string;
  description: string;
  bannerUrl: string;
  membersCount: number;
}

export interface ApprovalItem {
  id: string;
  type: 'ebook' | 'quiz' | 'video' | 'audio' | 'community' | 'challenge' | 'house';
  title: string;
  author: string;
  date: string;
  rejectionReason?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function CEODashboard({
  currentUser,
  challenges,
  feedPosts,
  users,
  onAddChallenge,
  onAddFeedPost,
  onUpdateUsers,
  onToast
}: CEODashboardProps) {
  // Active CEO dashboard tab: 'registry' | 'ebooks' | 'quizzes' | 'promotions'
  const [ceoViewTab, setCeoViewTab] = useState<'registry' | 'ebooks' | 'quizzes' | 'promotions'>('registry');

  // Input bindings for Promoting Accounts
  const [selectedPromoUserId, setSelectedPromoUserId] = useState('');
  const [promoTargetRole, setPromoTargetRole] = useState<'premium' | 'tutor'>('premium');
  const [promoDurationDays, setPromoDurationDays] = useState(3);

  // Input bindings for generating Promo Codes / Tokens
  const [genTokenRole, setGenTokenRole] = useState<'premium' | 'tutor'>('premium');
  const [genTokenDurationDays, setGenTokenDurationDays] = useState(3);
  const [genTokenMinutesLimit, setGenTokenMinutesLimit] = useState(60); // minutes for token itself to expire

  // Load and save generated tokens in localStorage
  const [tokensList, setTokensList] = useState<any[]>(() => {
    const saved = localStorage.getItem('quizoe_promo_tokens');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const saveTokensListToStorage = (updated: any[]) => {
    setTokensList(updated);
    localStorage.setItem('quizoe_promo_tokens', JSON.stringify(updated));
  };

  // Pending approvals mock data with live operational state
  const [approvals, setApprovals] = useState<ApprovalItem[]>([
    { id: 'app_1', type: 'ebook', title: 'The Smart PalmPay Ledger Guide', author: '@samuel_opay', date: 'Just now', status: 'pending' },
    { id: 'app_2', type: 'quiz', title: 'Advanced Web3 Naira Quiz', author: '@chi_ama', date: '2 hours ago', status: 'pending' },
    { id: 'app_3', type: 'video', title: 'Fintech Hub Lagos Vlog', author: '@tutor_dan', date: '4 hours ago', status: 'pending' },
    { id: 'app_4', type: 'audio', title: 'De-Risking Peer-to-Peer Loans', author: '@yield_master', date: 'Yesterday', status: 'pending' },
    { id: 'app_5', type: 'community', title: 'Moniepoint Elite Affiliates', author: '@monie_pro', date: 'Yesterday', status: 'pending' },
    { id: 'app_6', type: 'challenge', title: 'Nigeria Photojournalism Dash', author: '@lagos_lens', date: '3 days ago', status: 'pending' },
  ]);

  // Houses tracker State
  const [houses, setHouses] = useState<HouseItem[]>([
    { id: 'house_1', name: 'Naira Vanguard House', description: 'Elite group of Fintech quizzers and wealth mentors.', bannerUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=400', membersCount: 42 },
    { id: 'house_2', name: 'PalmPay Scholars Alliance', description: 'Scholars researching mobile finance penetration guides.', bannerUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=400', membersCount: 19 },
  ]);

  // CEO Create House forms
  const [houseName, setHouseName] = useState('');
  const [houseDesc, setHouseDesc] = useState('');
  const [houseBanner, setHouseBanner] = useState('https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=400');

  // CEO Create Challenge forms
  const [challTitle, setChallTitle] = useState('');
  const [challDesc, setChallDesc] = useState('');
  const [challCategory, setChallCategory] = useState('Quiz');
  const [challPrize, setChallPrize] = useState(5000);
  const [challEntry, setChallEntry] = useState(250);

  // Live feed announcement publisher
  const [announcementText, setAnnouncementText] = useState('');

  // Rejection logic flows
  const [activeRejectingId, setActiveRejectingId] = useState<string | null>(null);
  const [rejectionInputText, setRejectionInputText] = useState('');

  // Platform configs state
  const [vcoinEnabled, setVcoinEnabled] = useState(true);
  const [revenueSplitPercentage, setRevenueSplitPercentage] = useState(70); // 70% Tutor by default
  const [withdrawerCapPercent, setWithdrawerCapPercent] = useState(15); // 15% wallet tax ceiling
  const [moderationLevel, setModerationLevel] = useState<'strict' | 'relaxed'>('strict');

  // Approve action
  const handleApprove = (id: string) => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'approved' } : item))
    );
    const item = approvals.find((a) => a.id === id);
    onToast(`Approved ${item?.type} request successfully for ${item?.title}!`, 'success');
  };

  // Reject initial step
  const handleInitiateReject = (id: string) => {
    setActiveRejectingId(id);
    setRejectionInputText('');
  };

  // Reject confirm step
  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionInputText.trim() || !activeRejectingId) return;

    setApprovals((prev) =>
      prev.map((item) =>
        item.id === activeRejectingId
          ? { ...item, status: 'rejected', rejectionReason: rejectionInputText }
          : item
      )
    );
    onToast('Content rejected. Notification returned to author.', 'info');
    setActiveRejectingId(null);
  };

  // Create House action
  const handleCreateHouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseName.trim()) {
      onToast('Please type a unique House Name.', 'error');
      return;
    }
    const newHouse: HouseItem = {
      id: `house_${Date.now()}`,
      name: houseName,
      description: houseDesc || 'No custom guideline details provided yet.',
      bannerUrl: houseBanner || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=400',
      membersCount: 1
    };
    setHouses((prev) => [...prev, newHouse]);
    setHouseName('');
    setHouseDesc('');
    onToast(`"${newHouse.name}" successfully chartered as an authorized Creator House!`, 'success');
  };

  // Create Challenge action
  const handleCreateChallengeBtn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challTitle.trim() || !challDesc.trim()) {
      onToast('Provide a comprehensive title and description guidelines.', 'error');
      return;
    }

    const randomCountdown = `${Math.floor(Math.random() * 23) + 1}h ${Math.floor(Math.random() * 59)}m`;
    const newChal: Challenge = {
      id: `chal_ceo_${Date.now()}`,
      title: challTitle,
      description: challDesc,
      coverImage: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?q=80&w=600',
      category: challCategory,
      prizePool: Number(challPrize),
      entryFee: Number(challEntry),
      participants: 0,
      maxParticipants: 300,
      timeLeft: randomCountdown,
      status: 'active'
    };

    onAddChallenge(newChal);
    setChallTitle('');
    setChallDesc('');
    onToast(`Broadcasting "${newChal.title}" live inside active lists!`, 'success');
  };

  // Post Global Announcement CEO
  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;

    const newAnnPost: FeedPost = {
      id: `post_ann_${Date.now()}`,
      authorName: 'winbigonly',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150',
      authorRole: 'CEO [Platform Owner]',
      content: `📢 [CEO BULLETIN]: ${announcementText}`,
      mediaType: 'video_placeholder',
      likes: 0,
      shares: 0,
      commentsCount: 0,
      isAnnouncement: true,
      timestamp: 'Just now'
    };

    onAddFeedPost(newAnnPost);
    setAnnouncementText('');
    onToast('CEO Bulletin broadcasted directly to community feeds!', 'success');
  };

  // 1. Direct Promotion Handler
  const handlePromoteUserDirectly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPromoUserId) {
      onToast('Please select a free user to promote first.', 'warning');
      return;
    }

    const targetUser = users.find(u => u.id === selectedPromoUserId);
    if (!targetUser) {
      onToast('User not found in roster.', 'error');
      return;
    }

    const expirationDate = new Date(Date.now() + promoDurationDays * 24 * 60 * 60 * 1000);
    const updatedUsers = users.map(u => {
      if (u.id === selectedPromoUserId) {
        return {
          ...u,
          role: promoTargetRole,
          originalRole: 'free' as const, // revert role
          promotionExpiresAt: expirationDate.toISOString()
        };
      }
      return u;
    });

    onUpdateUsers(updatedUsers);
    setSelectedPromoUserId('');
    onToast(`Successfully granted @${targetUser.username} promotional access to ${promoTargetRole.toUpperCase()} level for ${promoDurationDays} days!`, 'success');
  };

  // 2. Direct Revocation Handler
  const handleRevokePromotion = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        const { promotionExpiresAt, originalRole, ...rest } = u;
        return {
          ...rest,
          role: 'free' as const
        };
      }
      return u;
    });

    onUpdateUsers(updatedUsers);
    onToast(`Promotional access for @${targetUser.username} has been manually revoked. Revered to FREE basic client in registry.`, 'info');
  };

  // 3. Token Generation Handler
  const handleGeneratePromoToken = (e: React.FormEvent) => {
    e.preventDefault();
    const tokenPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const tokenCode = `PROMO-${genTokenRole.toUpperCase()}-${tokenPart}`;
    const tokenSelfExpiresAt = new Date(Date.now() + genTokenMinutesLimit * 60 * 1000);

    const newToken = {
      id: `tok_${Date.now()}`,
      token: tokenCode,
      targetRole: genTokenRole,
      durationDays: genTokenDurationDays,
      expiresAt: tokenSelfExpiresAt.toISOString(),
      isUsed: false,
      usedBy: undefined
    };

    saveTokensListToStorage([newToken, ...tokensList]);
    onToast(`Promo Token ${tokenCode} generated! Copy and share with users. Valid for ${genTokenMinutesLimit} minutes.`, 'success');
  };

  // 4. Token Deletion Handler
  const handleDeleteToken = (tokenId: string) => {
    const updated = tokensList.filter(t => t.id !== tokenId);
    saveTokensListToStorage(updated);
    onToast('Promo Token removed from registry.', 'info');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in text-left">
      
      {/* HEADER HERO */}
      <div className="bg-slate-900 border border-slate-800 text-slate-100 p-6 md:p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full" />
        <div className="relative z-10 flex items-center gap-4.5">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              CEO Master Registry Controls
              <Sparkles className="w-5 h-5 text-indigo-400 fill-indigo-400" />
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Welcome @{currentUser.username} (Account Owner). Manage community houses, platform settings, and live creative channels safely.
            </p>
          </div>
        </div>

        <div className="flex gap-4 cursor-default shrink-0">
          <div className="bg-slate-800/80 border border-slate-700/50 p-3 rounded-xl text-center min-w-24">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase">Tutors</p>
            <p className="text-md font-black text-white mt-0.5">8 Live</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/50 p-3 rounded-xl text-center min-w-24">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase">Revenue</p>
            <p className="text-md font-black text-emerald-400 mt-0.5">₦348.5K</p>
          </div>
        </div>
      </div>

      {/* CEO MASTER NAVIGATION TABS */}
      <div className="flex flex-col lg:flex-row border border-slate-205 bg-white p-1 rounded-2xl gap-1.5 select-none shadow-xs">
        <button
          onClick={() => setCeoViewTab('registry')}
          className={`flex-1 py-3 text-center text-xs font-black uppercase rounded-xl transition-all cursor-pointer ${
            ceoViewTab === 'registry' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          🛡️ CEO Registry Controls
        </button>
        <button
          onClick={() => setCeoViewTab('ebooks')}
          className={`flex-1 py-3 text-center text-xs font-black uppercase rounded-xl transition-all cursor-pointer ${
            ceoViewTab === 'ebooks' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          📖 CEO eBook Publishing Suite
        </button>
        <button
          onClick={() => setCeoViewTab('quizzes')}
          className={`flex-1 py-3 text-center text-xs font-black uppercase rounded-xl transition-all cursor-pointer ${
            ceoViewTab === 'quizzes' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          🎯 CEO Conversational Quiz Studio
        </button>
        <button
          onClick={() => setCeoViewTab('promotions')}
          className={`flex-1 py-3 text-center text-xs font-black uppercase rounded-xl transition-all cursor-pointer ${
            ceoViewTab === 'promotions' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          🏆 Account Promotions &amp; Tokens
        </button>
      </div>

      {ceoViewTab === 'ebooks' && (
        <EbookStudioMarketplace 
          currentUser={currentUser}
          onToast={onToast}
          onAddTransaction={() => {}}
        />
      )}

      {ceoViewTab === 'quizzes' && (
        <InteractiveChatQuizHall 
          currentUser={currentUser}
          onToast={onToast}
          onAddTransaction={() => {}}
        />
      )}

      {ceoViewTab === 'registry' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: PENDING APPROVALS */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xs">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 pb-2 border-b border-sidebar">
              <CheckSquare className="w-4 h-4 text-indigo-600" />
              Creator Submissions Awaiting Approval ({approvals.filter(a => a.status === 'pending').length})
            </h2>

            <div className="space-y-4">
              {approvals.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center mt-0.5 text-indigo-600 shrink-0">
                      {item.type === 'ebook' && <FileText className="w-5 h-5" />}
                      {item.type === 'quiz' && <Award className="w-5 h-5" />}
                      {item.type === 'video' && <PlayCircle className="w-5 h-5" />}
                      {item.type === 'audio' && <Radio className="w-5 h-5" />}
                      {item.type === 'community' && <Users className="w-5 h-5" />}
                      {item.type === 'challenge' && <Compass className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{item.title}</span>
                        <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded">
                          {item.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                        Submitted by <span className="text-slate-600">{item.author}</span> • {item.date}
                      </p>
                      
                      {item.status !== 'pending' && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className={`text-[10px] uppercase font-mono font-black py-0.5 px-2 rounded ${
                            item.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {item.status.toUpperCase()}
                          </span>
                          {item.rejectionReason && (
                            <span className="text-[11px] italic text-rose-600 font-semibold truncate max-w-xs block">
                              Reason: "{item.rejectionReason}"
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      <button
                        onClick={() => handleApprove(item.id)}
                        className="flex-1 sm:flex-none py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleInitiateReject(item.id)}
                        className="flex-1 sm:flex-none py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-black flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* REJECTION SHEET MODAL OVERLAY */}
            {activeRejectingId && (
              <form onSubmit={handleConfirmReject} className="mt-4 p-4 rounded-2xl bg-rose-50/50 border border-rose-150 flex flex-col gap-3 animate-fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black text-slate-800">Assign Rejection Reason Code</h4>
                    <p className="text-[10px] text-slate-500 font-medium">Explain why this content cannot be approved on this cycle.</p>
                  </div>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lower resolution cover art, mismatch of categories, copyright guide issue..."
                  value={rejectionInputText}
                  onChange={(e) => setRejectionInputText(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-rose-500 text-xs font-bold py-2.5 px-3.5 rounded-xl focus:outline-none"
                />
                <div className="flex justify-end gap-2 text-xs font-black">
                  <button
                    type="button"
                    onClick={() => setActiveRejectingId(null)}
                    className="py-1.5 px-3 text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-1.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer transition-colors shadow-xs"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* MANAGE OR CREATE HOUSES CHANNELS */}
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xs">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 pb-2 border-b border-sidebar">
              <Landmark className="w-4 h-4 text-indigo-600" />
              Charter Platform Houses
            </h2>

            <form onSubmit={handleCreateHouse} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <input
                type="text"
                placeholder="Unique House Name..."
                value={houseName}
                onChange={(e) => setHouseName(e.target.value)}
                className="bg-slate-50 border border-slate-200 focus:border-indigo-500 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none"
              />
              <input
                type="text"
                placeholder="Introductory slogan / description..."
                value={houseDesc}
                onChange={(e) => setHouseDesc(e.target.value)}
                className="bg-slate-50 border border-slate-200 focus:border-indigo-500 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none"
              />
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Charter House</span>
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {houses.map((house) => (
                <div key={house.id} className="rounded-2xl border border-slate-150 overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between">
                  <div className="h-24 overflow-hidden relative">
                    <img src={house.bannerUrl} alt={house.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/40" />
                    <span className="absolute bottom-2.5 left-3 bg-white/20 backdrop-blur-md border border-white/25 text-white font-extrabold text-[10px] uppercase py-0.5 px-2 rounded-md">
                      {house.id === 'house_1' ? 'Vanguard Level' : 'Scholarship Tier'}
                    </span>
                  </div>
                  <div className="p-4 text-left">
                    <h4 className="font-extrabold text-slate-900 text-sm">{house.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal font-semibold">
                      {house.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-black text-slate-400">
                      <span>Live members: <strong className="text-slate-800">{house.membersCount}</strong></span>
                      <span className="text-emerald-600 bg-emerald-50 py-0.5 px-1.5 rounded">Active</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SETTINGS & CHALLENGES BUILDER */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* DYNAMIC PLATFORM GLOBAL CONFIGURATION */}
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-50 pb-3">
              <Settings2 className="w-4.5 h-4.5 text-indigo-600" />
              Platform Policy &amp; Security Configs
            </h3>

            <div className="space-y-4">
              {/* VCOIN TRIGGER TOGGLE */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900">VCoin Virtual Tokens Mode</h4>
                  <p className="text-[10px] text-slate-400 font-semibold">Switch payout currencies to digital VCoins credits.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVcoinEnabled(!vcoinEnabled);
                    onToast(vcoinEnabled ? 'VCoin tokens bypassed! Switched to direct NGN payouts.' : 'VCoin tokenization mode activated.', 'success');
                  }}
                  className="text-slate-600 cursor-pointer focus:outline-none"
                >
                  {vcoinEnabled ? (
                    <span className="flex items-center text-indigo-600 font-bold text-xs gap-1">
                      <span>ON</span>
                      <ToggleRight className="w-10 h-10 stroke-[1.5]" />
                    </span>
                  ) : (
                    <span className="flex items-center text-slate-400 font-bold text-xs gap-1">
                      <span>OFF</span>
                      <ToggleLeft className="w-10 h-10 stroke-[1.5]" />
                    </span>
                  )}
                </button>
              </div>

              {/* REVENUE SPLIT ADJUST BUTTONS */}
              <div className="border-t border-slate-50 pt-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Tutor Revenue Split Percent</h4>
                    <p className="text-[10px] text-slate-400 font-semibold">Percentage share allotted to Authors. Remainder is platform fees.</p>
                  </div>
                  <span className="text-sm font-black text-indigo-600 font-mono tracking-tight bg-slate-100 p-1 rounded">
                    {revenueSplitPercentage}%
                  </span>
                </div>
                <div className="flex gap-2">
                  {[60, 70, 80, 90].map((val) => (
                    <button
                      key={val}
                      onClick={() => {
                        setRevenueSplitPercentage(val);
                        onToast(`Revenue split changed: ${val}% to Author, ${100 - val}% to Platform.`, 'info');
                      }}
                      className={`flex-1 py-1.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        revenueSplitPercentage === val 
                          ? 'bg-indigo-600 text-white border-indigo-600' 
                          : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {val}/{100 - val}
                    </button>
                  ))}
                </div>
              </div>

              {/* CASH WITHDRAWAL TAX LIMIT */}
              <div className="border-t border-slate-50 pt-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Cashout Processing Cap</h4>
                    <p className="text-[10px] text-slate-400 font-semibold">Maximum tariff charge ceiling on Opay settlements.</p>
                  </div>
                  <span className="text-sm font-black text-slate-800 font-mono">
                    {withdrawerCapPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={withdrawerCapPercent}
                  onChange={(e) => {
                    setWithdrawerCapPercent(Number(e.target.value));
                  }}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* STRATEGIC SECURITY POLICY */}
              <div className="border-t border-slate-50 pt-3 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900">Database RLS Policy Bypass</h4>
                  <p className="text-[10px] text-slate-400 font-semibold">Enforces strict check on Tutor draft submissions.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setModerationLevel('strict');
                      onToast('Moderation set to Strict: Manual audit mandatory.', 'info');
                    }}
                    className={`py-1 px-2.5 text-[9px] font-black uppercase rounded ${
                      moderationLevel === 'strict' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400'
                    }`}
                  >
                    Strict
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModerationLevel('relaxed');
                      onToast('Moderation set to relaxed: Instant publish bypassing rules.', 'warning');
                    }}
                    className={`py-1 px-2.5 text-[9px] font-black uppercase rounded ${
                      moderationLevel === 'relaxed' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400'
                    }`}
                  >
                    Relaxed
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* DYNAMIC CHALLENGES BUILDER FORM */}
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-50 pb-3">
              <Award className="w-4.5 h-4.5 text-indigo-600" />
              Sponsor New Quiz Challenge
            </h3>

            <form onSubmit={handleCreateChallengeBtn} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Challenge Name / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Niger Delta Fintech Marathon"
                  value={challTitle}
                  onChange={(e) => setChallTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Description / Rules</label>
                <textarea
                  required
                  placeholder="Specify total question limit, passing grade rules, and reward splits..."
                  value={challDesc}
                  onChange={(e) => setChallDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 text-xs font-medium p-3 rounded-xl focus:outline-none h-20 leading-relaxed resize-none text-slate-700 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Category</label>
                  <select
                    value={challCategory}
                    onChange={(e) => setChallCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold py-2.5 px-2 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Quiz">Fintech Quiz</option>
                    <option value="eBook Mastery">eBook Mastery</option>
                    <option value="Photography">Lagos Photos</option>
                    <option value="Vocal Art">Vocal Arts</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Bounty (₦)</label>
                  <input
                    type="number"
                    min="100"
                    value={challPrize}
                    onChange={(e) => setChallPrize(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold py-2.5 px-2 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Tariff Fee (₦)</label>
                  <input
                    type="number"
                    min="0"
                    value={challEntry}
                    onChange={(e) => setChallEntry(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold py-2.5 px-2 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ml-auto"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Launch Challenge Contest</span>
              </button>
            </form>
          </div>

          {/* DYNAMIC FEED PUBLISHER */}
          <div className="bg-slate-900 text-slate-100 p-6 rounded-3xl relative overflow-hidden">
            <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
              <Megaphone className="w-4.5 h-4.5 text-indigo-400" />
              Publish Global Feed Announcement
            </h3>

            <form onSubmit={handlePostAnnouncement} className="flex flex-col gap-3">
              <textarea
                required
                placeholder="Broadcast official announcements directly to all user eBooks and stream feeds..."
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-xs font-medium p-3 rounded-xl focus:outline-none focus:border-indigo-500 h-20 leading-relaxed resize-none text-slate-200 placeholder-slate-500"
              />
              <button
                type="submit"
                className="w-full bg-white hover:bg-slate-100 text-slate-900 font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Broadcast Live Feed Post</span>
              </button>
            </form>
          </div>

        </div>

      </div>
      )}

      {ceoViewTab === 'promotions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in text-left">
          {/* LEFT COLUMN: PROMOTION FORMS */}
          <div className="lg:col-span-12 flex flex-col gap-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* DIRECT PROMOTION MODULE */}
              <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-3.5 mb-5">
                  <Award className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Direct Time-Limited Promotion</h3>
                    <p className="text-[10.5px] text-slate-400 font-medium font-sans">Instantly award temporary Premium or Tutor license keys to specific free users.</p>
                  </div>
                </div>

                <form onSubmit={handlePromoteUserDirectly} className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Select Free User</label>
                    <select
                      required
                      value={selectedPromoUserId}
                      onChange={(e) => setSelectedPromoUserId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer text-slate-705"
                    >
                      <option value="">-- Choose a registered free account --</option>
                      {users.filter(u => u.role === 'free').map(u => (
                        <option key={u.id} value={u.id}>
                          @{u.username} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Target Role Badge</label>
                      <select
                        value={promoTargetRole}
                        onChange={(e) => setPromoTargetRole(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none cursor-pointer text-slate-705"
                      >
                        <option value="premium">Sovereign Premium</option>
                        <option value="tutor">Tutor Mini-Office</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Duration (Days)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="365"
                        value={promoDurationDays}
                        onChange={(e) => setPromoDurationDays(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none focus:border-indigo-505"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-400" />
                    <span>Apply Promotional Pass Access</span>
                  </button>
                </form>
              </div>

              {/* TOKEN GENERATOR MODULE */}
              <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-3.5 mb-5">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Alphanumeric Promo Token Generator</h3>
                    <p className="text-[10.5px] text-slate-400 font-medium font-sans">Mint redemption code keys that standard/free accounts can claim on their dashboard.</p>
                  </div>
                </div>

                <form onSubmit={handleGeneratePromoToken} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Target Account Badge</label>
                      <select
                        value={genTokenRole}
                        onChange={(e) => setGenTokenRole(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none cursor-pointer text-slate-705"
                      >
                        <option value="premium">Premium Status</option>
                        <option value="tutor">Tutor Mini-Office</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1 font-sans">Pass Duration</label>
                      <select
                        value={genTokenDurationDays}
                        onChange={(e) => setGenTokenDurationDays(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none cursor-pointer text-slate-705"
                      >
                        <option value={1}>1 Day Standard Trial</option>
                        <option value={3}>3 Days Pro Premium</option>
                        <option value={7}>7 Days Premium Week</option>
                        <option value={30}>30 Days Master Class Month</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Token Validity Limit (Minutes to Claim)</label>
                    <input
                      type="number"
                      required
                      min="5"
                      max="10080"
                      value={genTokenMinutesLimit}
                      onChange={(e) => setGenTokenMinutesLimit(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none focus:border-indigo-505"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <span>Mint &amp; Secure Token Code</span>
                  </button>
                </form>
              </div>

            </div>

            {/* LIVE ROSTERS SECTIONS */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* TIMED PROMOTIONS ROSTER */}
              <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xs">
                <h4 className="text-xs font-black text-slate-900 uppercase border-b border-slate-50 pb-3.5 mb-4 tracking-wider flex items-center justify-between">
                  <span>⏰ Live Time-Limited Promotion Passes</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black uppercase">
                    {users.filter(u => u.promotionExpiresAt).length} Active
                  </span>
                </h4>

                <div className="overflow-x-auto">
                  {users.filter(u => u.promotionExpiresAt).length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-semibold italic">
                      No active time-limited promotional passes currently registered.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 font-extrabold uppercase border-b border-slate-100">
                          <th className="pb-2">User / Email</th>
                          <th className="pb-2">Badge</th>
                          <th className="pb-2">Expires At</th>
                          <th className="pb-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter(u => u.promotionExpiresAt).map(u => {
                          const diff = new Date(u.promotionExpiresAt!).getTime() - Date.now();
                          const hrsLeft = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
                          const daysLeft = Math.floor(hrsLeft / 24);
                          const formattedTime = daysLeft > 0 ? `${daysLeft} days left` : `${hrsLeft}h left`;

                          return (
                            <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                              <td className="py-3">
                                <p className="font-extrabold text-slate-905">@{u.username}</p>
                                <p className="text-[10px] text-slate-400">{u.email}</p>
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  u.role === 'tutor' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-3 font-semibold text-slate-500 font-sans">
                                {formattedTime} ({new Date(u.promotionExpiresAt!).toLocaleDateString()})
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => handleRevokePromotion(u.id)}
                                  className="text-red-650 hover:text-red-800 text-[11px] font-black uppercase cursor-pointer"
                                >
                                  Revoke Pass
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* GENERATED PROMO TOKENS */}
              <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xs">
                <h4 className="text-xs font-black text-slate-900 uppercase border-b border-slate-50 pb-3.5 mb-4 tracking-wider flex items-center justify-between">
                  <span>🎁 Promo Token codes (Claim Registry)</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black uppercase">
                    {tokensList.length} total
                  </span>
                </h4>

                <div className="overflow-x-auto">
                  {tokensList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-semibold italic">
                      No tokens minted yet. Generate one above to reward users!
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 font-extrabold uppercase border-b border-slate-100">
                          <th className="pb-2">Token Code</th>
                          <th className="pb-2">Loot Badge</th>
                          <th className="pb-2">Pass Duration</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2 text-right">Cancel</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tokensList.map(tok => {
                          const isExpired = new Date(tok.expiresAt).getTime() < Date.now();
                          let statusLabel = (
                            <span className="text-emerald-700 font-black uppercase text-[9px] bg-emerald-50 px-2 py-0.5 rounded">Active</span>
                          );
                          if (tok.isUsed) {
                            statusLabel = (
                              <span className="text-indigo-700 font-semibold text-[9px] bg-indigo-50 px-1.5 py-0.5 rounded">
                                Claimed by @{tok.usedBy}
                              </span>
                            );
                          } else if (isExpired) {
                            statusLabel = (
                              <span className="text-red-700 font-black uppercase text-[9px] bg-red-50 px-1.5 py-0.5 rounded">Expired</span>
                            );
                          }

                          return (
                            <tr key={tok.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                              <td className="py-3 font-mono font-black text-indigo-900 select-all">
                                {tok.token}
                              </td>
                              <td className="py-3">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                  tok.targetRole === 'tutor' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {tok.targetRole}
                                </span>
                              </td>
                              <td className="py-3 font-semibold text-slate-500 font-sans">
                                {tok.durationDays} Days Trial
                              </td>
                              <td className="py-3 font-medium">
                                {statusLabel}
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => handleDeleteToken(tok.id)}
                                  className="text-slate-400 hover:text-red-650 py-1 px-1 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
