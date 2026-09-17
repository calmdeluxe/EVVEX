import React, { useState } from 'react';
import { 
  Briefcase, CheckCircle2, Star, MapPin, DollarSign, Sparkles, 
  Clock, Plus, ShieldCheck, Mail, Phone, FileText, Image as ImageIcon
} from 'lucide-react';
import { 
  VendorProfile, VendorOpportunity, VendorAgreement, User 
} from '../../types';

interface VendorDashboardProps {
  currentUser: User;
  vendorProfile: VendorProfile;
  opportunities: VendorOpportunity[];
  agreements: VendorAgreement[];
  onUpdateProfile: (updated: Partial<VendorProfile>) => void;
  onApplyOpportunity: (oppId: string, quoteKobo: number, proposal: string) => void;
}

export const VendorDashboard: React.FC<VendorDashboardProps> = ({
  currentUser,
  vendorProfile,
  opportunities,
  agreements,
  onUpdateProfile,
  onApplyOpportunity
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'opportunities' | 'agreements'>('home');
  const [isAvailable, setIsAvailable] = useState(vendorProfile.is_available);
  const [selectedOppForApply, setSelectedOppForApply] = useState<VendorOpportunity | null>(null);
  const [quoteNaira, setQuoteNaira] = useState('');
  const [proposalNotes, setProposalNotes] = useState('');
  const [appliedSuccessMsg, setAppliedSuccessMsg] = useState('');

  const handleToggleAvailability = () => {
    const nextState = !isAvailable;
    setIsAvailable(nextState);
    onUpdateProfile({ is_available: nextState });
  };

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOppForApply) return;
    const quoteKobo = (parseFloat(quoteNaira) || 0) * 100;
    onApplyOpportunity(selectedOppForApply.id, quoteKobo, proposalNotes);
    setAppliedSuccessMsg(`Your proposal for ${selectedOppForApply.event_title} has been submitted to the creator!`);
    setSelectedOppForApply(null);
    setQuoteNaira('');
    setProposalNotes('');
    setTimeout(() => setAppliedSuccessMsg(''), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* Top Header Banner */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 pt-6 pb-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                <span>LAYER 4 • VENDOR BUSINESS PORTAL</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  {vendorProfile.business_name}
                </h1>
                {vendorProfile.is_verified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> Verified Vendor
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {vendorProfile.tagline}
              </p>
            </div>

            {/* Availability Toggle */}
            <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-800 self-start sm:self-auto">
              <span className="text-xs text-slate-300 font-medium pl-2">
                Taking Bookings:
              </span>
              <button
                onClick={handleToggleAvailability}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  isAvailable ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isAvailable ? 'AVAILABLE ●' : 'BUSY / PAUSED'}
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-6 pb-1 scrollbar-none border-t border-slate-800/80 mt-6">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'home' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Vendor Dashboard
            </button>

            <button
              onClick={() => setActiveTab('opportunities')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'opportunities' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Event Opportunities ({opportunities.length})
            </button>

            <button
              onClick={() => setActiveTab('agreements')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'agreements' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Contracts & Escrow ({agreements.length})
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'profile' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Business Profile
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {appliedSuccessMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{appliedSuccessMsg}</span>
          </div>
        )}

        {/* TAB 1: VENDOR HOME */}
        {activeTab === 'home' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Service Rating</span>
                <p className="text-2xl font-black text-amber-400 flex items-center gap-1">
                  ★ {vendorProfile.rating || '5.0'}
                </p>
                <span className="text-[10px] text-slate-400">Based on {vendorProfile.completed_events_count} completed events</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Open Opportunities</span>
                <p className="text-2xl font-black text-white">{opportunities.length}</p>
                <span className="text-[10px] text-slate-400">Calls for {vendorProfile.category}s</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Active Contracts</span>
                <p className="text-2xl font-black text-emerald-400">{agreements.length}</p>
                <span className="text-[10px] text-slate-400">In escrow protection</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Base Price Range</span>
                <p className="text-sm font-bold text-white mt-1 line-clamp-1">{vendorProfile.price_range_text}</p>
                <span className="text-[10px] text-slate-400">{vendorProfile.service_area}</span>
              </div>
            </div>

            {/* Quick Actions & Recent Calls */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">Latest Event Calls Matching Your Category</h3>
                <button onClick={() => setActiveTab('opportunities')} className="text-xs font-semibold text-amber-400 hover:underline">
                  View all
                </button>
              </div>

              <div className="space-y-3">
                {opportunities.slice(0, 2).map(opp => (
                  <div key={opp.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        Budget: ₦{(opp.budget_kobo / 100).toLocaleString('en-NG')}
                      </span>
                      <h4 className="text-sm font-bold text-white">{opp.event_title}</h4>
                      <p className="text-xs text-slate-400">{opp.description}</p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedOppForApply(opp);
                        setActiveTab('opportunities');
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs shadow self-start sm:self-auto"
                    >
                      Send Quote
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EVENT OPPORTUNITIES */}
        {activeTab === 'opportunities' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Open Event Opportunities</h2>
            <p className="text-xs text-slate-400 -mt-4">
              Apply directly to event creators looking for professional caterers, lighting, sound, and security.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {opportunities.map(opp => (
                <div key={opp.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider bg-amber-400/10 px-2.5 py-0.5 rounded-full">
                        {opp.category_needed.toUpperCase()} NEEDED
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        Budget: ₦{(opp.budget_kobo / 100).toLocaleString('en-NG')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1">{opp.event_title}</h3>
                    <p className="text-xs text-slate-400 mb-3">{opp.event_date} • {opp.event_city}</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{opp.description}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {opp.applicant_count} other vendors applied
                    </span>
                    <button
                      onClick={() => setSelectedOppForApply(opp)}
                      className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow"
                    >
                      Apply with Quote
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Application Modal/Drawer if selected */}
            {selectedOppForApply && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Apply with Official Quote</h3>
                    <button onClick={() => setSelectedOppForApply(null)} className="text-slate-400 hover:text-white">✕</button>
                  </div>
                  <p className="text-xs text-slate-300">
                    Applying for: <strong className="text-white">{selectedOppForApply.event_title}</strong>
                  </p>

                  <form onSubmit={handleApplySubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Your Proposed Fee (₦) *</label>
                      <input
                        type="number"
                        placeholder="e.g. 750000"
                        value={quoteNaira}
                        onChange={e => setQuoteNaira(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Deliverables & Proposal Summary *</label>
                      <textarea
                        rows={4}
                        placeholder="Outline what you will provide (equipment, staff, timing, guarantees)..."
                        value={proposalNotes}
                        onChange={e => setProposalNotes(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs shadow"
                    >
                      Submit Official Proposal
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CONTRACTS & ESCROW */}
        {activeTab === 'agreements' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Active Contracts & Escrow</h2>
            <p className="text-xs text-slate-400 -mt-4">
              All vendor payouts are held securely in EVEX Escrow and disbursed immediately following completed milestones.
            </p>

            <div className="space-y-4">
              {agreements.map(agr => (
                <div key={agr.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        Contract Ref: {agr.id.toUpperCase()}
                      </span>
                      <h3 className="text-base font-bold text-white">{agr.event_title}</h3>
                      <p className="text-xs text-slate-400">{agr.event_date} • Category: {agr.category}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Agreed Total Fee</span>
                      <span className="text-lg font-black font-mono text-amber-400">
                        ₦{(agr.agreed_fee_kobo / 100).toLocaleString('en-NG')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Paid Deposit</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        ₦{(agr.paid_amount_kobo / 100).toLocaleString('en-NG')}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Pending in Escrow</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        ₦{(agr.pending_amount_kobo / 100).toLocaleString('en-NG')}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Contract Status</span>
                      <span className="font-bold text-emerald-400 capitalize">
                        {agr.contract_status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-300 mb-2">Agreed Deliverables:</h4>
                    <ul className="space-y-1 text-xs text-slate-400">
                      {agr.deliverables.map((del, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{del}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: BUSINESS PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5">
            <h2 className="text-xl font-bold text-white">Vendor Business Profile</h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Business Name</span>
                <span className="font-bold text-white text-sm">{vendorProfile.business_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Description</span>
                <p className="text-slate-300 leading-relaxed">{vendorProfile.description}</p>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Services Offered</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {vendorProfile.services.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-200">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Direct Contact</span>
                <p className="text-slate-300">{vendorProfile.contact_email} • {vendorProfile.contact_phone}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
