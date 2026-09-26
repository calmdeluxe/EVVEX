import React, { useEffect, useState } from 'react';
import { EvvexLogo } from './EvvexLogo';

interface EvvexLoaderProps {
  message?: string;
  subMessage?: string;
  fullscreen?: boolean;
}

export const EvvexLoader: React.FC<EvvexLoaderProps> = ({
  message = "Opening EVVEX Experiences",
  subMessage = "Curating live gatherings, VIP access & ticket passes...",
  fullscreen = true,
}) => {
  const [pulseIndex, setPulseIndex] = useState(0);

  const gatheringNotes = [
    "Discovering live stage concerts & showcases...",
    "Securing VIP tables & patrolled access...",
    "Syncing verified tickets & gate passes...",
    "Curating premier culinary & social galas...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseIndex((prev) => (prev + 1) % gatheringNotes.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [gatheringNotes.length]);

  return (
    <div 
      className={`relative overflow-hidden flex flex-col items-center justify-center select-none ${
        fullscreen ? 'fixed inset-0 z-[999999] min-h-screen w-screen' : 'w-full py-16'
      }`}
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #A84C27 0%, #431407 50%, #15100D 100%)',
        fontFamily: "'Playfair Display', Georgia, serif",
      }}
    >
      {/* ── AMBIENT TEXTURE & GLOW OVERLAY ── */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.15) 0%, transparent 60%),
            repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.02) 0px, rgba(255, 255, 255, 0.02) 2px, transparent 2px, transparent 8px)
          `,
        }}
      />

      {/* Decorative Warm Top & Bottom Macrame Fringe Glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent opacity-60" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D97706] to-transparent opacity-40" />

      {/* ── CENTRAL FLOATING ARTISAN MEDALLION CARD ── */}
      <div className="relative z-10 flex flex-col items-center px-6 max-w-sm sm:max-w-md w-full">
        {/* Brass Header Pin / Lanyard Hook */}
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-5 h-5 rounded-full bg-gradient-to-b from-[#FEF08A] to-[#B45309] shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-[#FFFBEB]/40 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#78350F]/70" />
          </div>
          {/* Subtle string/hook line */}
          <div className="absolute top-5 w-[1.5px] h-3 bg-[#FEF08A]/40" />
        </div>

        {/* Embossed Artisan Pass Card */}
        <div 
          className="w-full relative rounded-3xl p-8 sm:p-10 flex flex-col items-center text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border border-[#FDE68A]/30 backdrop-blur-md"
          style={{
            background: 'linear-gradient(145deg, rgba(147, 61, 30, 0.85) 0%, rgba(30, 20, 15, 0.92) 100%)',
          }}
        >
          {/* Cork Stitch Perimeter Border */}
          <div 
            className="absolute inset-2 rounded-2xl pointer-events-none border border-dashed border-[#FDE68A]/30"
          />

          {/* Glowing Animated Emblem */}
          <div className="relative mb-6">
            {/* Ambient Breathing Gold Aura */}
            <div 
              className="absolute -inset-4 rounded-full opacity-60 filter blur-xl animate-pulse"
              style={{
                background: 'radial-gradient(circle, rgba(245, 158, 11, 0.5) 0%, rgba(194, 65, 12, 0.2) 60%, transparent 100%)',
                animationDuration: '2.5s',
              }}
            />

            {/* Radiant Breathing Scale */}
            <div 
              className="relative transition-transform duration-700 ease-in-out"
              style={{
                animation: 'evvexFloat 3s ease-in-out infinite alternate',
              }}
            >
              <EvvexLogo size="xl" showText={false} variant="light" />
            </div>
          </div>

          {/* Shimmering Gold Brand Name */}
          <div className="relative mb-3">
            <h1 
              className="text-3xl sm:text-4xl font-serif font-black tracking-[0.25em] uppercase text-transparent bg-clip-text"
              style={{
                backgroundImage: 'linear-gradient(90deg, #FDE68A 0%, #FFFFFF 30%, #F59E0B 70%, #FDE68A 100%)',
                backgroundSize: '200% auto',
                animation: 'evvexShimmer 2.8s linear infinite',
              }}
            >
              EVVEX
            </h1>
            <p className="font-sans text-[10px] sm:text-xs font-bold uppercase tracking-[0.35em] text-[#FDE68A]/80 mt-1">
              Live Gatherings & VIP Passes
            </p>
          </div>

          {/* Ticket Perforation Notch Divider */}
          <div className="w-full relative flex items-center justify-between my-5">
            <div className="w-3 h-6 -ml-8 sm:-ml-10 rounded-r-full bg-[#15100D] border-y border-r border-[#FDE68A]/30" />
            <div className="flex-1 border-t border-dashed border-[#FDE68A]/30 mx-2" />
            <div className="w-3 h-6 -mr-8 sm:-mr-10 rounded-l-full bg-[#15100D] border-y border-l border-[#FDE68A]/30" />
          </div>

          {/* Dynamic Gathering Status */}
          <div className="w-full flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F59E0B] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FDE68A]" />
              </span>
              <span className="font-sans text-xs font-semibold tracking-wider text-amber-200">
                {message}
              </span>
            </div>

            <p 
              className="font-sans text-[11px] text-amber-100/70 h-4 transition-opacity duration-500 ease-in-out"
              style={{ opacity: 0.9 }}
            >
              {gatheringNotes[pulseIndex] || subMessage}
            </p>

            {/* Glowing Golden Shimmer Progress Bar */}
            <div className="w-48 sm:w-56 h-1.5 rounded-full bg-black/40 overflow-hidden relative mt-5 border border-[#FDE68A]/20">
              <div 
                className="absolute top-0 bottom-0 w-24 rounded-full bg-gradient-to-r from-transparent via-[#FDE68A] to-transparent shadow-[0_0_12px_#F59E0B]"
                style={{
                  animation: 'evvexBeam 1.8s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Security / Authenticity Stamp */}
        <div className="mt-5 flex items-center gap-2 text-[10px] font-sans text-amber-200/50 uppercase tracking-widest">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Nigeria Verified Event Network</span>
        </div>
      </div>

      {/* Keyframe Styles */}
      <style>{`
        @keyframes evvexShimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes evvexBeam {
          0% { left: -40%; }
          100% { left: 110%; }
        }
        @keyframes evvexFloat {
          0% { transform: translateY(0px) scale(1); }
          100% { transform: translateY(-4px) scale(1.03); }
        }
      `}</style>
    </div>
  );
};
