import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, FileText, Award, AlertTriangle, ArrowLeft, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../AuthContext';

export const TermsPage: React.FC = () => {
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
              <FileText className="w-6 h-6" />
              <span className="text-xs font-bold uppercase tracking-widest">Platform Agreement</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase">Terms of Service</h1>
            <p className="text-white/40 text-sm font-medium">Last updated: June 2026</p>
          </div>

          {/* Agreement Sections */}
          <div className="space-y-8 text-white/70 leading-relaxed font-medium text-base">
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#EAB308] rounded-full inline-block"></span>
                1. Age Restrictions
              </h2>
              <p>
                To create an account, purchase digital eBooks, or use any features of the CalmReader application, you must be at least <strong className="text-white/90">18 years of age</strong> or the legal age of majority in your jurisdiction. By registering, you confirm you meet these eligibility criteria.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#EAB308] rounded-full inline-block"></span>
                2. Copyright and IP Ownership
              </h2>
              <p>
                All materials, ebook content, trivia formats, source code, images, layouts, brand logos, audio clips, and interface structures hosted or provided within the CalmReader platform are protected by copyright laws and are <strong className="text-white/90">owned exclusively by CalmReader</strong> or their respective licensed authors.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#EAB308] rounded-full inline-block"></span>
                3. Permitted User Conduct
              </h2>
              <p>
                Your registration grants you a limited, non-exclusive, non-transferable personal license to view, read, and enjoy purchased books inside the official CalmReader applications. 
              </p>
              <div className="bg-[#0a0a0f] border border-red-950/40 p-5 rounded-2xl flex gap-3 text-sm text-red-200/80">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-red-400">Strictly Prohibited:</strong> You are strictly forbidden from copying, downloading, modifying, recording, translating, distributing, republishing, sharing, or commercially exploiting any part of our hosted eBook catalogs or services outside our platform. Any violation constitutes immediate copyright infringement.
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#EAB308] rounded-full inline-block"></span>
                4. Account Suspension and Termination
              </h2>
              <p>
                CalmReader reserves the absolute right to suspend, terminate, or restrict user profiles, writer privileges, or overall platform access at any time, with or without prior warning, if we detect any suspicious behavior, payment disputes, copyright violation attempts, harassment, or other breaches of these terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#EAB308] rounded-full inline-block"></span>
                5. Complete No-Refund Policy
              </h2>
              <p>
                All financial transactions made on the CalmReader platform—including eBook purchases, token purchases, author upgrades, and administrative verification fees—represent instantaneous digital content deliveries. Consequently, <strong className="text-white/90">all sales are final, non-reversible, and fully subject to a strict no-refund policy</strong>. 
              </p>
            </section>
          </div>

          {/* Legal statement Footer */}
          <div className="text-white/40 text-xs italic text-center pt-8 border-t border-white/5">
            By browsing or interacting with CalmReader, you acknowledge that you have read, understood, and agreed to be bound by these legal terms.
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
