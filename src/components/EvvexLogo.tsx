import React from 'react';

interface EvvexLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'terracotta' | 'gold';
  showText?: boolean;
  withTagline?: boolean;
  className?: string;
}

export const EvvexLogo: React.FC<EvvexLogoProps> = ({
  size = 'md',
  variant = 'light',
  showText = true,
  withTagline = false,
  className = '',
}) => {
  // Dimensions
  const pixelMap = {
    xs: { emblem: 24, font: 'text-lg', badge: 'text-[9px]' },
    sm: { emblem: 32, font: 'text-xl', badge: 'text-[10px]' },
    md: { emblem: 40, font: 'text-2xl', badge: 'text-[11px]' },
    lg: { emblem: 52, font: 'text-3xl', badge: 'text-xs' },
    xl: { emblem: 68, font: 'text-4xl', badge: 'text-sm' },
  };

  const dim = pixelMap[size];

  // Color styles for the text
  const textColorClass = {
    light: 'text-white',
    dark: 'text-[#1F1610]',
    terracotta: 'text-[#933D1E]',
    gold: 'text-amber-500',
  }[variant];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* SVG Emblem */}
      <div 
        className="relative flex-shrink-0 flex items-center justify-center transition-transform duration-300 hover:scale-105"
        style={{ width: dim.emblem, height: dim.emblem }}
      >
        <svg 
          viewBox="0 0 512 512" 
          width={dim.emblem} 
          height={dim.emblem} 
          className="w-full h-full drop-shadow-md"
        >
          <defs>
            <radialGradient id="logoClayGrad" cx="50%" cy="38%" r="65%">
              <stop offset="0%" stopColor="#C2410C" />
              <stop offset="50%" stopColor="#9A3412" />
              <stop offset="100%" stopColor="#431407" />
            </radialGradient>
            <linearGradient id="logoGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="35%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            <linearGradient id="logoShimmerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFBEB" />
              <stop offset="60%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>

          {/* Terracotta Coin Base */}
          <circle cx="256" cy="256" r="236" fill="url(#logoClayGrad)" stroke="url(#logoGoldGrad)" strokeWidth="12" />
          
          {/* Inner Stitch Ring */}
          <circle cx="256" cy="256" r="212" fill="none" stroke="#FDE68A" strokeWidth="3" strokeDasharray="8,10" opacity="0.65" />

          {/* Compass Points */}
          <path d="M 256 70 L 260 82 L 272 86 L 260 90 L 256 102 L 252 90 L 240 86 L 252 82 Z" fill="#FEF08A" />
          <path d="M 256 410 L 260 422 L 272 426 L 260 430 L 256 442 L 252 430 L 240 426 L 252 422 Z" fill="#FEF08A" />
          <path d="M 86 256 L 90 260 L 102 256 L 90 252 L 86 240 L 82 252 L 70 256 L 82 260 Z" fill="#FEF08A" />
          <path d="M 426 256 L 430 260 L 442 256 L 430 252 L 426 240 L 422 252 L 410 256 L 422 260 Z" fill="#FEF08A" />

          {/* Interlocking Double V Monarch Wings */}
          <g>
            <path 
              d="M 124 168 L 184 168 L 256 348 L 328 168 L 388 168 L 284 394 C 274 416, 238 416, 228 394 Z" 
              fill="url(#logoGoldGrad)" 
            />
            <path 
              d="M 178 184 L 226 184 L 256 266 L 286 184 L 334 184 L 272 328 C 266 342, 246 342, 240 328 Z" 
              fill="url(#logoShimmerGrad)" 
            />
          </g>

          {/* Star Beacon Top Center */}
          <g transform="translate(256, 146)">
            <path d="M 0 -24 Q 0 0 24 0 Q 0 0 0 24 Q 0 0 -24 0 Q 0 0 0 -24 Z" fill="#FFFFFF" />
            <circle cx="0" cy="0" r="3.5" fill="#F59E0B" />
          </g>
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`font-serif font-black tracking-widest ${dim.font} ${textColorClass}`}>
              EVVEX
            </span>
          </div>
          {withTagline && (
            <span className={`font-sans tracking-[0.2em] uppercase font-bold text-[#FDE68A] opacity-90 ${dim.badge} mt-1`}>
              Live Gatherings
            </span>
          )}
        </div>
      )}
    </div>
  );
};
