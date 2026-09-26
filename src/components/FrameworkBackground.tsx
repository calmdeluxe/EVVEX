import React from 'react';
import corkboardBgMobile from '../assets/images/evvex_corkboard_bg_1790420198845.jpg';
import corkboardBgDesktop from '../assets/images/evvex_corkboard_desktop_1790420212259.jpg';

interface FrameworkBackgroundProps {
  children: React.ReactNode;
  className?: string;
  overlayOpacity?: string;
}

export const FrameworkBackground: React.FC<FrameworkBackgroundProps> = ({
  children,
  className = '',
  overlayOpacity = 'from-[#A84C27]/40 via-transparent to-[#576B57]/50'
}) => {
  return (
    <div className={`min-h-screen relative w-full overflow-x-hidden selection:bg-[#F5EEDB] selection:text-[#933D1E] font-sans ${className}`}>
      {/* ── ABSOLUTE MAIN BACKGROUND FRAMEWORK LAYER ── */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: `url(${corkboardBgDesktop})`,
          backgroundColor: '#A84C27'
        }}
      >
        {/* Mobile portrait asset overlay */}
        <div 
          className="absolute inset-0 sm:hidden bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${corkboardBgMobile})` }}
        />
        
        {/* Soft atmospheric gradient to ensure crisp typography */}
        <div className={`absolute inset-0 bg-gradient-to-b ${overlayOpacity}`} />
      </div>

      {/* ── FOREGROUND CONTENT ── */}
      <div className="relative z-10 w-full min-h-screen">
        {children}
      </div>
    </div>
  );
};

export default FrameworkBackground;
