import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Shield, ShieldCheck, Lock, ArrowLeft, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../AuthContext';

export const PrivacyPage: React.FC = () => {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#030308] font-sans text-white overflow-x-hidden">
      {/* 1. HEADER */}
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 w-full z-50 bg-[#030308]/80 backdrop-blur-xl border-b border-white/5"
      >
        <nav className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <BookOpen className="w-8 h-8 text-[#EAB308] fill-[#EAB308]/20" />
            <span className="font-sans font-black text-2xl tracking-tighter text-white">CalmReader</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-10 text-sm font-medium text-white/60">
            <Link to="/" className="hover:text-[#EAB308] transition-colors">Home</Link>
            <Link to="/bookshelf" className="hover:text-[#EAB308] transition-colors">Explore</Link>
            <Link to="/dashboard" className="hover:text-[#EAB308] transition-colors">For Writers</Link>
            <Link to="/support" className="hover:text-[#EAB308] transition-colors">Support</Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {!user ? (
              <div className="flex items-center gap-4">
                <Link to="/login" className="px-6 h-12 flex items-center justify-center text-sm font-bold text-white hover:bg-white/5 rounded-xl transition-colors">Login</Link>
                <Button asChild className="bg-[#EAB308] text-black hover:bg-[#EAB308]/90 font-bold px-8 h-12 rounded-xl shadow-xl transition-transform hover:scale-105 active:scale-95">
                  <Link to="/signup">Get Started</Link>
                </Button>
              </div>
            ) : (
              <Button asChild className="bg-[#EAB308] text-black hover:bg-[#EAB308]/90 font-bold px-8 h-12 rounded-xl shadow-xl transition-transform hover:scale-105 active:scale-95">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden p-2 text-white">
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </nav>
      </motion.div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] bg-[#030308]/95 backdrop-blur-2xl flex flex-col p-10 lg:hidden text-white"
          >
            <div className="flex justify-end mb-10">
              <button onClick={() => setIsMenuOpen(false)} className="p-2 text-white">
                <X className="w-8 h-8" />
              </button>
            </div>
            <div className="flex flex-col gap-8 text-2xl font-bold mb-10">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="hover:text-[#EAB308] transition-colors">Home</Link>
              <Link to="/bookshelf" onClick={() => setIsMenuOpen(false)} className="hover:text-[#EAB308] transition-colors">Explore</Link>
              <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="hover:text-[#EAB308] transition-colors">Dashboard</Link>
              <Link to="/support" onClick={() => setIsMenuOpen(false)} className="hover:text-[#EAB308] transition-colors">Support</Link>
            </div>
            {!user ? (
              <div className="flex flex-col gap-4">
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="w-full h-14 border border-white/10 rounded-2xl flex items-center justify-center font-bold text-white hover:bg-white/5 transition-colors">Login</Link>
                <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="w-full h-14 bg-[#EAB308] text-black rounded-2xl flex items-center justify-center font-bold hover:bg-[#EAB308]/90 transition-colors">Get Started</Link>
              </div>
            ) : (
              <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="w-full h-14 bg-[#EAB308] text-black rounded-2xl flex items-center justify-center font-bold hover:bg-[#EAB308]/90 transition-colors">Dashboard</Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. BODY CONTENT */}
      <main className="pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-12"
        >
          {/* Page Title */}
          <div className="space-y-4 border-b border-white/5 pb-8">
            <div className="flex items-center gap-3 text-[#EAB308]">
              <Shield className="w-6 h-6" />
              <span className="text-xs font-bold uppercase tracking-widest">Trust & Security</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase">Privacy Policy</h1>
            <p className="text-white/40 text-sm font-medium">Last updated: June 2026</p>
          </div>

          {/* Policy Sections */}
          <div className="space-y-8 text-white/70 leading-relaxed font-medium text-base">
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#EAB308] rounded-full inline-block"></span>
                1. What Data We Collect
              </h2>
              <p>
                At CalmReader, we respect your privacy and only collect data essential to providing a smooth, safe, and personalized reading experience. This includes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-white/60 text-sm">
                <li><strong className="text-white/80">Personal Identification:</strong> Name, username, and email address when you sign up for an account.</li>
                <li><strong className="text-white/80">Reading Progress:</strong> Current position, completion statuses, bookmarks, and quiz statistics to preserve your experience across devices.</li>
                <li><strong className="text-white/80">Purchase History:</strong> Information regarding books bought, point balances, transaction histories, and token redemptions.</li>
                <li><strong className="text-white/80">Account Metadata:</strong> Account tier, roles (reader, author, admin), and profile pictures.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#EAB308] rounded-full inline-block"></span>
                2. How We Use Your Data
              </h2>
              <p>
                The information we gather is used to power the core functionality of the CalmReader ecosystem:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-white/60 text-sm">
                <li>Providing seamless access to purchased books, trivia participation, and authors' writing environments.</li>
                <li>Facilitating secure peer-to-peer and administrative transaction verifications and payments.</li>
                <li>Continually improving our applications, ebook rendering speeds, support experiences, and community features.</li>
                <li>Communicating critical service updates, support responses, or administrative announcements.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#EAB308] rounded-full inline-block"></span>
                3. Data Security and Infrastructure
              </h2>
              <p>
                We partner with world-class cloud providers to keep your personal data strictly secure. 
                Our backend infrastructure is built on <strong className="text-white/90">Supabase</strong>. All authentication details, credentials, and stored content are heavily protected using advanced industry-standard encryption standards, strict Row-Level Security (RLS) configurations, and SSL protocols.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#EAB308] rounded-full inline-block"></span>
                4. Your Rights and Account Deletion
              </h2>
              <p>
                You retain absolute rights over your personal data. You are entitled to review, update, or request the complete deletion of your account and all associated reading histories and purchases.
              </p>
              <p className="text-white/60 text-sm">
                To submit an account deletion request or request a personal data audit, you can contact our security and support desk at any time via the <Link to="/support" className="text-[#EAB308] underline hover:text-[#EAB308]/80 transition-colors">Support Page</Link>. All standard account deletion requests are processed in compliance with global standards within 72 hours.
              </p>
            </section>
          </div>

          {/* Call to Action banner */}
          <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#EAB308]/10 text-[#EAB308] rounded-2xl flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Have privacy concerns?</h3>
                <p className="text-white/40 text-sm">Our security experts are happy to clarify any questions.</p>
              </div>
            </div>
            <Button asChild className="bg-white text-black hover:bg-white/90 font-bold rounded-xl h-12 px-6">
              <Link to="/support">Contact Support</Link>
            </Button>
          </div>
        </motion.div>
      </main>

      {/* 3. FOOTER */}
      <footer className="py-12 border-t border-white/5 font-sans relative z-10 w-full bg-[#030308]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#EAB308]" />
              <span className="font-sans font-black text-xl tracking-tighter text-white">CalmReader</span>
            </Link>
            
            <div className="flex gap-8 text-xs font-semibold text-white/40">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/support" className="hover:text-white transition-colors">Support</Link>
            </div>

            <div className="text-[10px] font-bold uppercase tracking-widest text-white/20">
              <p>© 2026 CalmReader. All Rights Reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
