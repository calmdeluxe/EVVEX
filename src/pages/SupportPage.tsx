import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  LifeBuoy, 
  Search, 
  HelpCircle, 
  MessageSquare, 
  Mail, 
  Phone, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Coins, 
  FileText,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const DEFAULT_FAQS: FAQItem[] = [
  {
    id: '1',
    category: 'General',
    question: 'What is CalmReader and how does it work?',
    answer: 'CalmReader is an interactive digital publishing and reading platform where readers can discover engaging eBooks, answer book trivia challenges to earn rewards, and authors can publish and monetize their creative works.'
  },
  {
    id: '2',
    category: 'Reading & Purchases',
    question: 'How do I purchase and read eBooks on CalmReader?',
    answer: 'You can browse books in the Bookshelf or Discovery tab. Once you select a book, click "Buy eBook" to complete payment via Paystack or direct transfer. Unlocked books are permanently saved in your library and available in the card-based interactive reader.'
  },
  {
    id: '3',
    category: 'Trivia & Rewards',
    question: 'How do trivia rewards and wallet balance work?',
    answer: 'Each book or general challenge has a trivia game. When you achieve a score of 70% or higher, reward points (T-Points) are automatically credited to your account wallet (1 T-Point = ₦5). You can use your wallet balance for book purchases or request bank withdrawals.'
  },
  {
    id: '4',
    category: 'Writers & Authors',
    question: 'How can I become a verified author on CalmReader?',
    answer: 'Go to your Dashboard and click "Apply as Author". Fill in your writing details and submit. Once approved by our team, you gain access to the Author Studio where you can publish books, create trivia challenges, and track sales earnings.'
  },
  {
    id: '5',
    category: 'Payouts & Withdrawals',
    question: 'How do author payouts and reward withdrawals work?',
    answer: 'Earnings from book sales and trivia rewards accumulate in your wallet. You can submit a Withdrawal Request from your Earnings page or Requests page by providing your local bank details. Admin processes payouts promptly.'
  },
  {
    id: '6',
    category: 'Security & Safety',
    question: 'Is my personal and payment information safe?',
    answer: 'Yes! We use secure TLS encryption, Paystack PCIDSS-compliant payment gateways, and Supabase Row Level Security to protect your transactions and personal credentials.'
  }
];

export const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('1');
  const [faqs, setFaqs] = useState<FAQItem[]>(DEFAULT_FAQS);

  // Load custom FAQs from database if available
  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const { data, error } = await supabase
          .from('help_faqs')
          .select('*')
          .order('order_number', { ascending: true });

        if (data && data.length > 0) {
          setFaqs(data);
        }
      } catch (err) {
        console.warn("[SupportPage] Custom FAQ fetch error, using defaults:", err);
      }
    };
    fetchFaqs();
  }, []);

  const categories = ['All', 'General', 'Reading & Purchases', 'Trivia & Rewards', 'Writers & Authors', 'Payouts & Withdrawals'];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCat = selectedCategory === 'All' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#030308] font-sans text-white overflow-x-hidden">
      
      {/* 1. Navigation Header */}
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 w-full z-50 bg-[#030308]/85 backdrop-blur-xl border-b border-white/5"
      >
        <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <BookOpen className="w-7 h-7 text-[#EAB308] fill-[#EAB308]/20" />
            <span className="font-black text-2xl tracking-tighter text-white">CalmReader</span>
          </Link>

          <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-white/60">
            <Link to="/" className="hover:text-[#EAB308] transition-colors">Home</Link>
            <Link to="/discovery" className="hover:text-[#EAB308] transition-colors">Explore</Link>
            <Link to="/trivia" className="hover:text-[#EAB308] transition-colors">Trivia Hub</Link>
            <Link to="/support" className="text-[#EAB308] font-bold">Help & Support</Link>
            <Link to="/request" className="hover:text-[#EAB308] transition-colors">My Requests</Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <Button onClick={() => navigate('/request')} className="bg-[#EAB308] text-black font-bold px-6 h-11 rounded-xl">
                Submit Request
              </Button>
            ) : (
              <Button onClick={() => navigate('/login')} className="bg-[#EAB308] text-black font-bold px-6 h-11 rounded-xl">
                Sign In
              </Button>
            )}
          </div>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden p-2 text-white">
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </nav>
      </motion.div>

      {/* Hero Section with Knowledge Base Search */}
      <section className="pt-32 pb-16 px-6 max-w-5xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#EAB308] text-xs font-bold uppercase tracking-wider">
          <LifeBuoy className="w-4 h-4" /> Help Desk & Knowledge Base
        </div>

        <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight leading-none">
          How can we <span className="text-[#EAB308]">help you</span> today?
        </h1>

        <p className="text-white/60 text-base sm:text-lg max-w-2xl mx-auto font-medium">
          Search our comprehensive knowledge base for answers regarding eBook reading, trivia challenge rewards, author publishing, and payments.
        </p>

        {/* Search Input Bar */}
        <div className="max-w-2xl mx-auto relative">
          <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-white/40" />
          <Input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs, articles, payouts, trivia rules..."
            className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 text-base outline-none focus:border-[#EAB308] focus:ring-2 focus:ring-[#EAB308]/20 transition-all font-medium text-white placeholder:text-white/30"
          />
        </div>

        {/* Direct Action Quick Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 max-w-3xl mx-auto text-left">
          <div 
            onClick={() => navigate('/request')}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-[#EAB308]/50 cursor-pointer transition-all hover:scale-[1.02] group"
          >
            <div className="p-3 bg-[#EAB308]/10 text-[#EAB308] rounded-xl w-fit mb-3">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-[#EAB308] flex items-center justify-between">
              Submit Request <ArrowRight className="w-4 h-4" />
            </h3>
            <p className="text-xs text-white/40 mt-1">Submit support tickets, data reward claims, or payment verification.</p>
          </div>

          <div 
            onClick={() => window.open('https://wa.me/2348000000000', '_blank')}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/50 cursor-pointer transition-all hover:scale-[1.02] group"
          >
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit mb-3">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-emerald-400 flex items-center justify-between">
              WhatsApp Desk <ArrowRight className="w-4 h-4" />
            </h3>
            <p className="text-xs text-white/40 mt-1">Instant messaging assistance with our support team.</p>
          </div>

          <div 
            onClick={() => window.location.href = 'mailto:chukwuemekedaniella@gmail.com'}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 cursor-pointer transition-all hover:scale-[1.02] group"
          >
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit mb-3">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-indigo-400 flex items-center justify-between">
              Email Support <ArrowRight className="w-4 h-4" />
            </h3>
            <p className="text-xs text-white/40 mt-1">Direct official support email desk (24hr response time).</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 px-6 max-w-4xl mx-auto space-y-8">
        <div className="text-left border-b border-white/10 pb-6">
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-[#EAB308]" /> Frequently Asked Questions
          </h2>
          <p className="text-xs text-white/50 mt-1">Browse categorized answers below or use search above.</p>
          
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedCategory === cat 
                    ? 'bg-[#EAB308] text-black font-black' 
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => {
              const isOpen = expandedFaq === faq.id;
              return (
                <div 
                  key={faq.id}
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden text-left transition-all"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : faq.id)}
                    className="w-full p-6 flex items-center justify-between gap-4 text-left font-bold text-sm sm:text-base text-white hover:text-[#EAB308] transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-white/10 text-[#EAB308]">
                        {faq.category}
                      </span>
                      {faq.question}
                    </span>
                    {isOpen ? <ChevronUp className="w-5 h-5 text-[#EAB308] shrink-0" /> : <ChevronDown className="w-5 h-5 text-white/40 shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 text-xs sm:text-sm text-white/70 leading-relaxed border-t border-white/5 pt-4 font-medium">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-white/40 bg-white/5 rounded-2xl border border-white/10 italic">
              No matching FAQs found for "{searchQuery}". Try searching for other keywords or submit a direct support request below.
            </div>
          )}
        </div>
      </section>

      {/* Footer Support CTA */}
      <section className="py-16 px-6 max-w-4xl mx-auto text-center border-t border-white/10 my-12 space-y-6">
        <h3 className="text-2xl font-black uppercase">Still need help with your account or payment?</h3>
        <p className="text-xs text-white/60 max-w-md mx-auto">
          Our dedicated team is ready to resolve payment verifications, withdrawal requests, and technical issues.
        </p>
        <div className="flex justify-center gap-4">
          <Button onClick={() => navigate('/request')} className="bg-[#EAB308] hover:bg-[#EAB308]/90 text-black font-black px-8 h-12 rounded-xl text-xs uppercase tracking-wider">
            Open Requests Page
          </Button>
        </div>
      </section>

    </div>
  );
};
