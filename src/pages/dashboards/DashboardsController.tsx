import React, { useState, useEffect } from 'react';
import { useUserRole, UserRole } from '../../hooks/useUserRole';
import { User, Challenge, FeedPost } from '../../types';
import CEODashboard from './CEODashboard';
import TutorDashboard from './TutorDashboard';
import PremiumDashboard from './PremiumDashboard';
import FreeDashboard from './FreeDashboard';
import { Sparkles, Compass, Shield, Users, Award, Landmark } from 'lucide-react';

interface DashboardsControllerProps {
  currentUser: User;
  onUpdateCurrentUser: (user: User) => void;
  challenges: Challenge[];
  onAddChallenge: (c: Challenge) => void;
  feedPosts: FeedPost[];
  onAddFeedPost: (p: FeedPost) => void;
  users: User[];
  onUpdateUsers: (u: User[]) => void;
  onUpgradeToPremium: (cost: number, finalRole: 'premium' | 'tutor') => void;
  onOpenModal: (type: 'deposit' | 'withdraw' | 'transfer' | 'refer') => void;
  onPlayQuiz: (c: Challenge) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function DashboardsController({
  currentUser,
  onUpdateCurrentUser,
  challenges,
  onAddChallenge,
  feedPosts,
  onAddFeedPost,
  users,
  onUpdateUsers,
  onUpgradeToPremium,
  onOpenModal,
  onPlayQuiz,
  onToast
}: DashboardsControllerProps) {
  // Resolve user role based on hook
  const { role: initialRole } = useUserRole(currentUser);
  
  // Only genuine administrative emails are permitted to see or interact with the Sandbox Switcher
  const isActualCEO = currentUser.email?.toLowerCase() === 'winbigonly@gmail.com' || currentUser.email?.toLowerCase() === 'samuelchukwuemeke05@gmail.com';

  // Keep live interactive role state for easy live preview switching
  const [activeWorkspaceRole, setActiveWorkspaceRole] = useState<UserRole>('free');

  useEffect(() => {
    setActiveWorkspaceRole(initialRole);
  }, [initialRole]);

  const handleLiveRoleTransition = (target: UserRole) => {
    if (!isActualCEO && target !== initialRole) {
      onToast("Unauthorized: You cannot bypass account security tiers.", "error");
      return;
    }
    setActiveWorkspaceRole(target);
    onToast(`Switched active workspace sandbox to ${target.toUpperCase()} console.`, 'info');
  };

  // Securely force role consistency for standard accounts
  const finalRenderingRole = isActualCEO ? activeWorkspaceRole : initialRole;

  return (
    <div className="space-y-4 animate-fade-in text-left">
      
      {/* PERSISTENT SANDBOX WORKSPACE PICKER - ONLY RENDER FOR INTENT TESTING ADMINS */}
      {isActualCEO && (
        <div className="mx-4 md:mx-8 bg-indigo-50/70 border border-indigo-100 p-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-800">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600 animate-spin-slow shrink-0" />
            <div className="text-left">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1">
                Admin Testing Console - Sandbox Role Switcher 
                <span className="text-[9px] bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full font-bold">Active View: {activeWorkspaceRole.toUpperCase()}</span>
              </h4>
              <p className="text-[10px] text-slate-500 font-medium font-mono">Bypass controls only visible to verified owner accounts.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => handleLiveRoleTransition('ceo')}
              className={`py-1 px-2 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeWorkspaceRole === 'ceo' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-3 h-3 text-indigo-400" />
              <span>CEO Board</span>
            </button>
            <button
              onClick={() => handleLiveRoleTransition('tutor')}
              className={`py-1 px-2 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeWorkspaceRole === 'tutor' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3 h-3 text-indigo-400" />
              <span>Tutor</span>
            </button>
            <button
              onClick={() => handleLiveRoleTransition('premium')}
              className={`py-1 px-2 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeWorkspaceRole === 'premium' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Premium</span>
            </button>
            <button
              onClick={() => handleLiveRoleTransition('free')}
              className={`py-1 px-2 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeWorkspaceRole === 'free' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Award className="w-3 h-3 text-indigo-600" />
              <span>Free user</span>
            </button>
          </div>
        </div>
      )}

      {/* DETAILED ACTIVE DASHBOARD CHANNELS */}
      {finalRenderingRole === 'ceo' && (
        <CEODashboard 
          currentUser={currentUser}
          challenges={challenges}
          feedPosts={feedPosts}
          users={users}
          onAddChallenge={onAddChallenge}
          onAddFeedPost={onAddFeedPost}
          onUpdateUsers={onUpdateUsers}
          onToast={onToast}
        />
      )}

      {finalRenderingRole === 'tutor' && (
        <TutorDashboard 
          currentUser={currentUser}
          onAddChallenge={onAddChallenge}
          onToast={onToast}
        />
      )}

      {finalRenderingRole === 'premium' && (
        <PremiumDashboard 
          currentUser={currentUser}
          challenges={challenges}
          onPlayQuiz={onPlayQuiz}
          onToast={onToast}
        />
      )}

      {finalRenderingRole === 'free' && (
        <FreeDashboard 
          currentUser={currentUser}
          onUpgradeToPremium={onUpgradeToPremium}
          onOpenModal={onOpenModal}
          onToast={onToast}
        />
      )}

    </div>
  );
}
