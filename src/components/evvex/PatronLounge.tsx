import React from 'react';
import { EventItem, User } from '../../types';
import { Crown, Sparkles, Shield, Star, Award, Calendar, MapPin, ArrowRight } from 'lucide-react';

interface PatronLoungeProps {
  currentUser: User;
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
  onUpgradeToPatron: () => void;
}

export const PatronLounge: React.FC<PatronLoungeProps> = ({
  currentUser,
  events,
  onSelectEvent,
  onUpgradeToPatron
}) => {
  const isPatron = currentUser.appRole === 'patron' || currentUser.appRole === 'admin';
  const patronEvents = events.filter(e => e.is_patron_only);

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Luxury Patron Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-950/60 via-slate-950 to-slate-900 border border-amber-500/40 p-8 sm:p-12 shadow-2xl">
        <div className="absolute -top-10 -right-10 w-80 h-80 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-widest">
            <Crown className="w-3.5 h-3.5" />
            The High-Society Circle
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white font-['Syne'] tracking-tight leading-tight">
            EVVEX <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">Patron Society</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Unrivaled access to secret private dining galas, backstage greenroom passes, and prioritized VVIP tables across Lagos, Abuja, and beyond.
          </p>
        </div>

        {/* Digital Gold Card */}
        <div className="mt-8 max-w-sm bg-gradient-to-tr from-amber-500/20 via-amber-400/30 to-amber-600/20 border-2 border-amber-400/50 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 font-mono">EVVEX BLACK PATRON</span>
            <Crown className="w-5 h-5 text-amber-300" />
          </div>

          <div className="my-6">
            <p className="text-xs text-amber-200/80 font-mono tracking-widest">PATRON ID: EVX-PAT-8829</p>
            <h3 className="text-xl font-black text-white tracking-wide mt-1 font-['Syne']">
              {currentUser.username || 'Samuel Chukwuemeka'}
            </h3>
          </div>

          <div className="flex items-center justify-between text-xs text-amber-200/90 pt-3 border-t border-amber-400/30">
            <div>
              <span className="text-[9px] uppercase font-bold text-amber-300/70 block">Tier Status</span>
              <span className="font-bold text-amber-300">{isPatron ? 'Active Fellow' : 'Guest Tier'}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-amber-300/70 block">Jurisdiction</span>
              <span className="font-bold text-white">Nigeria VIP</span>
            </div>
          </div>
        </div>

        {!isPatron && (
          <div className="mt-6">
            <button
              onClick={onUpgradeToPatron}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-amber-400/25 flex items-center gap-2 cursor-pointer"
            >
              <Crown className="w-4 h-4" />
              <span>Activate Patron Society Status</span>
            </button>
          </div>
        )}
      </div>

      {/* Patron Exclusive Events */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 font-['Syne']">
            <Crown className="w-5 h-5 text-amber-400" />
            <span>Private Patron Experiences</span>
          </h2>
          <span className="text-xs text-amber-400 font-semibold">Strict RSVP Access Only</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {patronEvents.map(event => (
            <div
              key={event.id}
              onClick={() => onSelectEvent(event)}
              className="group bg-slate-900 border border-amber-500/30 hover:border-amber-400 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer flex flex-col justify-between"
            >
              <div className="relative aspect-video overflow-hidden bg-slate-950">
                <img
                  src={event.cover_image}
                  alt={event.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                <div className="absolute top-3 left-3 bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-md">
                  Patron Only
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white font-['Syne'] group-hover:text-amber-300 transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{event.description}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300 pt-3 border-t border-slate-800">
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    {event.venue_name}, {event.city}
                  </span>
                  <button className="bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1">
                    <span>Reserve Seat</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
