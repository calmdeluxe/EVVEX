import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../AuthContext';
import { 
  RefreshCw, 
  CheckCircle2, 
  CreditCard, 
  XCircle, 
  ExternalLink, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  SlidersHorizontal, 
  Sparkles, 
  BookOpen, 
  Trash2, 
  Grid, 
  CheckSquare, 
  Square,
  AlertCircle,
  FolderLock,
  Lock,
  ChevronDown,
  Info,
  Maximize2
} from 'lucide-react';
import axios from 'axios';
import { supabase } from '../supabase';

export const AdminPaymentVerifications: React.FC = () => {
  const { isAdmin, isAuthReady, user } = useAuth();
  const navigate = useNavigate();

  // State Management
  const [verifications, setVerifications] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, pending, approved, rejected
  const [typeFilter, setTypeFilter] = useState<string>('all'); // all, ebook, premium_upgrade, author_upgrade

  // Detail Modal State
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [modalAdminNote, setModalAdminNote] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [isAmountConfirmed, setIsAmountConfirmed] = useState(false);
  const [isReceiptZoomed, setIsReceiptZoomed] = useState(false);

  useEffect(() => {
    if (isAuthReady && !isAdmin) {
      navigate('/dashboard');
    } else if (isAuthReady && isAdmin) {
      fetchData();
    }
  }, [isAuthReady, isAdmin, navigate]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([
        fetchVerifications(),
        fetchPublishedBooks()
      ]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerifications = async () => {
    try {
      const { data: directVers, error: directErr } = await supabase
        .from('payment_verifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (directErr) throw directErr;

      let allVerifications = [];
      if (directVers) {
        const userIds = [...new Set(directVers.map((v: any) => v.user_id))].filter(Boolean);
        let userMap: Record<string, any> = {};
        if (userIds.length > 0) {
          let usersData = null;
          const { data: viewData, error: viewErr } = await supabase
            .from('user_profiles_public')
            .select('id, email, full_name')
            .in('id', userIds);
          
          if (!viewErr && viewData) {
            usersData = viewData;
          } else {
            const { data: fbData } = await supabase
              .from('users')
              .select('id, email, full_name')
              .in('id', userIds);
            usersData = fbData;
          }
          
          if (usersData) {
            userMap = usersData.reduce((acc: any, u: any) => {
              acc[u.id] = u;
              return acc;
            }, {});
          }
        }
        
        allVerifications = directVers.map((v: any) => ({
          ...v,
          users: userMap[v.user_id] || { email: 'Unknown', full_name: 'Deleted User' }
        }));
      }

      setVerifications(allVerifications);
    } catch (err: any) {
      setError('Unable to fetch proof submissions.');
      console.error(err);
    }
  };

  const fetchPublishedBooks = async () => {
    try {
      const { data, error: bError } = await supabase
        .from('books')
        .select('id, title, price')
        .not("publish_status", "eq", "-1");
        
      if (!bError && data) {
        setBooks(data);
      }
    } catch (err: any) {
      console.error("Error retrieving eBooks list:", err);
    }
  };

  // Helper to resolve an individual record
  const resolveVerification = async (
    id: string, 
    action: 'approve' | 'reject', 
    note: string,
    overrideType?: string,
    overrideRef?: string
  ) => {
    const session = await supabase.auth.getSession();
    const adminUserId = session.data.session?.user?.id;
    const status = action === 'approve' ? 'approved' : 'rejected';
    const resolvedNote = note || (action === 'approve' ? 'Manual bank payment approved.' : 'Proof of payment rejected.');

    // 1. Fetch current verification
    const { data: pv, error: fetchErr } = await supabase
      .from("payment_verifications")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !pv) throw new Error(fetchErr?.message || "Verification record not found");

    const finalType = overrideType || pv.transaction_type;
    const finalRef = overrideRef || pv.reference_id;

    // 2. Update payment_verifications
    const { error: updateErr } = await supabase
      .from("payment_verifications")
      .update({
        status,
        admin_note: resolvedNote,
        approved_by: action === 'approve' ? adminUserId : null,
        approved_at: action === 'approve' ? new Date().toISOString() : null,
        transaction_type: finalType,
        reference_id: finalRef
      })
      .eq("id", id);

    if (updateErr) throw updateErr;

    // 3. If approved, apply consequences
    if (action === "approve") {
      const { data: user } = await supabase
        .from("users")
        .select("email")
        .eq("id", pv.user_id)
        .maybeSingle();

      if (user) {
        if (finalType === "premium_upgrade" || finalType === "premium") {
          await supabase.rpc("admin_set_user_tier", {
            p_email: user.email,
            p_new_tier: "premium",
          });
        } else if (finalType === "author_upgrade" || finalType === "author") {
          await supabase.rpc("admin_set_user_tier", {
            p_email: user.email,
            p_new_tier: "author",
          });
        } else if ((finalType === "ebook_purchase" || finalType === "purchase") && finalRef) {
          await supabase.from("transactions").insert({
            user_id: pv.user_id,
            book_id: finalRef,
            buyer_email: user.email,
            amount: Math.round(pv.amount || 0),
            type: "purchase",
            status: "successful",
            paystack_reference: pv.transaction_ref || `MANUAL-${pv.id}`,
          });

          try {
            const { data: existingEpic } = await supabase
              .from("ebook_purchases")
              .select("*")
              .eq("user_id", pv.user_id)
              .eq("ebook_id", finalRef)
              .maybeSingle();

            if (!existingEpic) {
              await supabase.from("ebook_purchases").insert({
                user_id: pv.user_id,
                ebook_id: finalRef
              });
            }
          } catch (e: any) {
            console.warn("ebook_purchases insert failed in verify:", e);
          }
        }
      }
    }
  };

  const handleResolveSingle = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;
    
    if (action === 'approve' && !isAmountConfirmed) {
      alert("Please confirm the payment matches and is correct first by checking the verification checkbox.");
      return;
    }

    setResolvingId(selectedRequest.id);
    try {
      let finalType = selectedRequest.transaction_type || selectedRequest.content_type;
      let finalRef = selectedRequest.reference_id || selectedRequest.content_id;

      // If they explicitly selected a different book from our dropdown
      if (finalType === 'ebook_purchase' && selectedBookId) {
        finalRef = selectedBookId;
      }

      await resolveVerification(
        selectedRequest.id, 
        action, 
        modalAdminNote,
        finalType,
        finalRef
      );

      setSuccess(`Record successfully ${action === 'approve' ? 'approved & unlocked' : 'rejected'}!`);
      setSelectedRequest(null);
      setModalAdminNote('');
      setIsAmountConfirmed(false);
      setSelectedBookId('');
      await fetchVerifications();
    } catch (err: any) {
      setError('Payment action failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setResolvingId(null);
    }
  };

  // Manual force unlock without modifying status
  const handleManualUnlock = async () => {
    if (!selectedRequest) return;
    
    let targetBook = selectedRequest.reference_id || selectedRequest.content_id;
    if (!targetBook && selectedBookId) {
      targetBook = selectedBookId;
    }

    if (!targetBook) {
      alert("Please specify or select which eBook to manually unlock.");
      return;
    }

    setResolvingId(selectedRequest.id);
    try {
      const email = selectedRequest.users?.email || selectedRequest.profiles?.email;
      if (!email) throw new Error("No user email is associated with this inquiry.");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, email, full_name")
        .eq("email", email)
        .maybeSingle();
      if (userError || !userData) {
        throw new Error("User not found: " + email);
      }

      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .select("id, title, price")
        .eq("id", targetBook)
        .maybeSingle();
      if (bookError || !bookData) {
        throw new Error("Book not found.");
      }

      const saleAmount = bookData.price || 0;

      const { data: existingTx } = await supabase
        .from("transactions")
        .select("id")
        .eq("user_id", userData.id)
        .eq("book_id", targetBook)
        .eq("type", "purchase")
        .eq("status", "successful")
        .maybeSingle();

      if (existingTx) {
        throw new Error("User already has access to/purchased this book!");
      }

      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: userData.id,
        book_id: targetBook,
        buyer_email: userData.email,
        amount: Math.round(saleAmount),
        type: "purchase",
        status: "successful",
        paystack_reference: `MANUAL-ADMIN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      });

      if (txErr) throw txErr;

      try {
        const { data: existingEpic } = await supabase
          .from("ebook_purchases")
          .select("*")
          .eq("user_id", userData.id)
          .eq("ebook_id", targetBook)
          .maybeSingle();

        if (!existingEpic) {
          await supabase.from("ebook_purchases").insert({
            user_id: userData.id,
            ebook_id: targetBook
          });
        }
      } catch (e: any) {
        console.warn("ebook_purchases insert failed:", e);
      }

      setSuccess(`Directly granted user ${email} access to eBook successfully!`);
      setSelectedRequest(null);
      await fetchVerifications();
    } catch (err: any) {
      setError('Manual unlock action failed: ' + err.message);
    } finally {
      setResolvingId(null);
    }
  };

  // Bulk Actions
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to approve and unlock all ${selectedIds.length} selected manual payments?`)) return;

    setBulkActionLoading(true);
    setError('');
    let successCount = 0;
    let failedCount = 0;

    try {
      for (const id of selectedIds) {
        try {
          const req = verifications.find(v => v.id === id);
          if (req && req.status === 'pending') {
            await resolveVerification(
              id, 
              'approve', 
              'Approved via bulk action queue'
            );
            successCount++;
          }
        } catch (singleErr) {
          failedCount++;
        }
      }
      setSuccess(`Bulk action completed! ${successCount} payments approved and unlocked. ${failedCount > 0 ? `${failedCount} issues encountered.` : ''}`);
      setSelectedIds([]);
      await fetchVerifications();
    } catch (err: any) {
      setError('An error occurred during bulk approvals.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`DANGER! Are you sure you want to delete the ${selectedIds.length} selected payment records permanently? This cannot be undone.`)) return;

    setBulkActionLoading(true);
    setError('');
    try {
      const { error } = await supabase
        .from('payment_verifications')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      setSuccess(`Successfully deleted ${selectedIds.length} records from databases!`);
      setSelectedIds([]);
      await fetchVerifications();
    } catch (err: any) {
      setError('Failed to bulk delete records: ' + err.message);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const toggleSelectAll = (filteredItems: any[]) => {
    const filterIds = filteredItems.map(v => v.id);
    const allSelectedInFiltered = filterIds.every(id => selectedIds.includes(id));
    
    if (allSelectedInFiltered) {
      setSelectedIds(selectedIds.filter(id => !filterIds.includes(id)));
    } else {
      setSelectedIds([...new Set([...selectedIds, ...filterIds])]);
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Filter and search computation
  const filteredVerifications = verifications.filter((v) => {
    const userEmail = (v.profiles?.email || v.users?.email || '').toLowerCase();
    const userName = (v.profiles?.full_name || v.users?.full_name || '').toLowerCase();
    const refText = (v.transaction_ref || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    // Search query check
    const matchesSearch = userEmail.includes(query) || userName.includes(query) || refText.includes(query);

    // Status check
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;

    // Type check
    const actualType = v.transaction_type || v.content_type || '';
    let matchesType = true;
    if (typeFilter !== 'all') {
      if (typeFilter === 'ebook') {
        matchesType = actualType === 'ebook_purchase';
      } else {
        matchesType = actualType === typeFilter;
      }
    }

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <AdminLayout>
      <div className="space-y-8 pb-16">
        
        {/* Navigation & Alerts */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => navigate('/admin')}
              variant="ghost" 
              className="rounded-xl h-10 px-3 flex items-center gap-2 text-slate-500 hover:text-green-700 transition-all font-black"
            >
              <ChevronLeft className="w-5 h-5" /> Back to Dashboard
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              onClick={() => navigate('/admin/payments')}
              variant="outline" 
              className="rounded-2xl h-12 px-6 font-bold flex items-center gap-2 border-slate-200 text-slate-700 hover:text-green-700 hover:border-green-600 transition-all"
            >
              Old Finance Queue
            </Button>
            <Button 
              onClick={() => navigate('/admin/payments/history')}
              variant="outline" 
              className="rounded-2xl h-12 px-6 font-bold flex items-center gap-2 border-slate-200 text-slate-700 hover:text-green-700 hover:border-green-600 transition-all"
            >
              Resolution History
            </Button>
          </div>
        </div>

        {/* Brand Banner */}
        <div className="bg-slate-900 rounded-[32px] p-8 md:p-12 relative overflow-hidden text-white shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-500/10 mix-blend-multiply pointer-events-none" />
          <div className="relative z-10 space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 px-4 py-1.5 rounded-full text-xs font-black tracking-widest text-emerald-400 uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Finance Desk Specialist
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Payment Verification Studio
            </h1>
            <p className="text-slate-300 text-sm md:text-base font-medium">
              Validate receipt images, manually credit accounts, bulk audit user registrations, and instantly unlock customer eBooks.
            </p>
          </div>
        </div>

        {/* Message HUD */}
        {error && (
          <div className="p-5 bg-red-50 border-l-4 border-red-500 rounded-r-3xl flex items-center gap-4 text-red-800 font-extrabold text-sm shadow-sm animate-pulse">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-5 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-3xl flex items-center gap-4 text-emerald-800 font-extrabold text-sm shadow-sm">
            <CheckCircle2 className="w-6 h-6 shrink-0 animation-bounce" />
            <span>{success}</span>
          </div>
        )}

        {/* Filter Controls Widget */}
        <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-2 text-slate-800 font-black text-lg">
              <SlidersHorizontal className="w-5 h-5 text-green-700" />
              <span>Filter Proof Database & System Queries</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Search Bar */}
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search Target Email / Tx Ref</Label>
                <div className="relative">
                  <Input 
                    type="text"
                    placeholder="Enter email identifier or Paystack ref..."
                    className="pl-11 h-12 rounded-xl focus:ring-green-700 border-slate-200 font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Review Status</Label>
                <div className="relative">
                  <select 
                    className="w-full h-12 rounded-xl border border-slate-200 px-4 bg-transparent outline-none font-bold text-sm text-slate-700 focus:ring-green-700 focus:border-green-700 appearance-none cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">⏳ Pending Verification</option>
                    <option value="approved">✅ Approved</option>
                    <option value="rejected">❌ Rejected</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none absolute right-4 top-4" />
                </div>
              </div>

              {/* Type Selector */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Content Class</Label>
                <div className="relative">
                  <select 
                    className="w-full h-12 rounded-xl border border-slate-200 px-4 bg-transparent outline-none font-bold text-sm text-slate-700 focus:ring-green-700 focus:border-green-700 appearance-none cursor-pointer"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">All Content</option>
                    <option value="ebook">📚 eBook Deliveries</option>
                    <option value="premium_upgrade">⭐ Premium Upgrade</option>
                    <option value="author_upgrade">✍️ Author Privilege</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none absolute right-4 top-4" />
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Bulk Action Floating Overlay / Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-800 px-10 animate-fade-in z-30 sticky top-20">
            <div className="flex items-center gap-4">
              <span className="w-10 h-10 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center font-black animate-pulse">
                {selectedIds.length}
              </span>
              <div>
                <p className="font-extrabold text-sm">Bulk Action Selection Engaged</p>
                <p className="text-xs text-slate-400">Perform mass verification checks or cleanup operations.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button
                onClick={handleBulkApprove}
                disabled={bulkActionLoading}
                className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold h-11 px-6 rounded-xl flex items-center gap-2"
              >
                {bulkActionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4.5 h-4.5" />}
                Approve & Unlock All
              </Button>
              <Button
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white font-bold h-11 px-6 rounded-xl flex items-center gap-2"
              >
                {bulkActionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4.5 h-4.5" />}
                Delete Selected
              </Button>
              <Button
                onClick={() => setSelectedIds([])}
                variant="ghost"
                className="text-slate-400 hover:text-white font-bold h-11 px-4"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Main List Queue */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-300 gap-4">
            <RefreshCw className="w-12 h-12 animate-spin text-green-700" />
            <p className="font-bold text-xs uppercase tracking-widest text-slate-400">Syncing database registers...</p>
          </div>
        ) : filteredVerifications.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-200 p-20 rounded-[32px] text-center max-w-4xl mx-auto bg-white">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Clear queue ahead</h3>
            <p className="text-slate-400 font-medium text-sm mt-1">No payment verifications matching your criteria are present.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <button 
                onClick={() => toggleSelectAll(filteredVerifications)}
                className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-green-700 transition-colors uppercase tracking-wider pl-1"
              >
                {filteredVerifications.every(v => selectedIds.includes(v.id)) ? (
                  <CheckSquare className="w-4.5 h-4.5 text-green-700" />
                ) : (
                  <Square className="w-4.5 h-4.5" />
                )}
                Toggle Selection (Showing {filteredVerifications.length} records)
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {filteredVerifications.map((pv) => {
                const userEmail = pv.profiles?.email || pv.users?.email || 'Unknown User';
                const userName = pv.profiles?.full_name || pv.users?.full_name || 'CalmReader User';
                const isSelected = selectedIds.includes(pv.id);

                return (
                  <Card 
                    key={pv.id} 
                    className={`border-none shadow-xl rounded-[32px] overflow-hidden bg-white transition-all ${
                      isSelected ? 'ring-2 ring-green-600/50 shadow-green-100' : 'hover:shadow-2xl'
                    }`}
                  >
                    <CardContent className="p-0 flex flex-col lg:flex-row min-h-[220px]">
                      
                      {/* Checkbox selector widget */}
                      <div className="bg-slate-50 flex lg:flex-col items-center justify-center p-4 lg:px-6 cursor-pointer hover:bg-slate-100/50 border-r border-slate-100 gap-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectOne(pv.id);
                        }}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-green-700 scale-110 transition-transform" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300 hover:text-slate-400 transition-colors" />
                        )}
                        <span className="lg:hidden text-xs font-extrabold text-slate-500">SELECT RECORD</span>
                      </div>

                      {/* Receipt preview box */}
                      <div className="lg:w-44 bg-slate-50/50 p-6 flex items-center justify-center border-r border-slate-100 relative group shrink-0">
                        {pv.proof_image_url ? (
                          <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-md relative bg-white">
                            <img 
                              src={pv.proof_image_url} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                              alt="Receipt Thumbnail" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                              onClick={() => {
                                setSelectedRequest(pv);
                                setIsReceiptZoomed(true);
                              }}
                            >
                              <Maximize2 className="w-5 h-5" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-1 bg-white">
                            <CreditCard className="w-6 h-6 opacity-30" />
                            <span className="text-[9px] font-black uppercase">No proof</span>
                          </div>
                        )}
                      </div>

                      {/* Info Panel block */}
                      <div className="flex-1 p-6 flex flex-col justify-between gap-6">
                        <div className="space-y-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge className={`uppercase text-[10px] font-black tracking-widest px-3 py-1 rounded-full ${
                                  pv.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                                  pv.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {pv.status || 'Pending'}
                                </Badge>
                                <span className="text-xs font-bold text-slate-400">
                                  Inbound ID: #{pv.id.substring(0, 8).toUpperCase()}
                                </span>
                              </div>
                              <h3 className="text-xl font-black text-slate-800 leading-snug mt-1.5">
                                {pv.transaction_type?.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || pv.content_type?.toUpperCase()}
                              </h3>
                            </div>

                            <div className="text-right">
                              <p className="text-xs font-bold text-slate-400">SUBMITTED</p>
                              <p className="font-extrabold text-sm text-slate-700">
                                {pv.created_at ? new Date(pv.created_at).toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-xs font-medium text-slate-600">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">User Profile</p>
                              <p className="font-black text-slate-900 leading-none truncate">{userName}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{userEmail}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Paid</p>
                              <p className="font-black text-slate-950 text-sm">₦{Number(pv.amount || 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Payment Reference</p>
                              <p className="font-bold text-slate-700 truncate font-mono">{pv.transaction_ref || 'None'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Audit Details */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-2 self-start sm:self-center">
                            <Info className="w-4 h-4 text-slate-400 shrink-0" />
                            <p className="text-xs font-semibold text-slate-500 line-clamp-1 italic">
                              {pv.bank_name || pv.payment_method ? `Cleared via ${pv.bank_name || pv.payment_method}` : "No bank info provided"}
                            </p>
                          </div>

                          <Button
                            onClick={() => {
                              setSelectedRequest(pv);
                              setModalAdminNote(pv.admin_note || '');
                              setIsAmountConfirmed(pv.status === 'approved');
                              setSelectedBookId(pv.reference_id || pv.content_id || '');
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg font-black h-11 px-6 rounded-xl flex items-center gap-2 w-full sm:w-auto transition-all"
                          >
                            <span>Inspect & Audit Record</span>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Main Single Auditing Dialog/Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          
          <div className="bg-white rounded-[32px] shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row relative">
            <button 
              onClick={() => setSelectedRequest(null)}
              className="absolute top-4 right-4 w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-full flex items-center justify-center transition-colors z-20"
            >
              ✕
            </button>

            {/* Left Column: Image/Screen */}
            <div className={`md:w-1/2 p-8 bg-slate-50 flex flex-col items-center justify-center border-r border-slate-100 min-h-[350px] relative ${
              isReceiptZoomed ? 'md:w-full' : ''
            }`}>
              <div className="space-y-4 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Inbound Receipt Proof</span>
                  {selectedRequest.proof_image_url && (
                    <button 
                      onClick={() => setIsReceiptZoomed(!isReceiptZoomed)}
                      className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Maximize2 className="w-3.5 h-3.5" /> {isReceiptZoomed ? 'Contract view' : 'Zoom image'}
                    </button>
                  )}
                </div>

                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-md">
                  {selectedRequest.proof_image_url ? (
                    <div className="relative group overflow-hidden rounded-2xl bg-slate-100 aspect-[4/5] flex items-center justify-center">
                      <img 
                        src={selectedRequest.proof_image_url} 
                        className={`w-full h-full object-contain max-h-[480px] transition-transform ${
                          isReceiptZoomed ? 'scale-110' : ''
                        }`} 
                        alt="Audited Receipt Screenshot" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="py-24 text-center text-slate-400 italic font-bold text-sm bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      No screenshot provided by users.
                    </div>
                  )}
                </div>

                {selectedRequest.proof_image_url && (
                  <a 
                    href={selectedRequest.proof_image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-extrabold text-slate-500 hover:text-green-700 flex items-center justify-center gap-1.5"
                  >
                    Open raw image in secondary tab <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Right Column: Controls */}
            {!isReceiptZoomed && (
              <div className="flex-1 p-8 md:p-10 flex flex-col justify-between min-h-[550px]">
                <div className="space-y-6">
                  
                  {/* Account detail and status */}
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                      Verify User Payment
                    </h2>
                    <p className="text-xs font-semibold text-slate-400 mt-1">
                      Submitted by {selectedRequest.profiles?.email || selectedRequest.users?.email || 'Unknown User'}
                    </p>
                  </div>

                  {/* Payment Meta Block */}
                  <div className="space-y-3 p-5 bg-slate-50 rounded-2xl border border-slate-150">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-400 uppercase tracking-widest">Type Requested</span>
                      <span className="font-black text-slate-800 uppercase">
                        {selectedRequest.transaction_type || selectedRequest.content_type}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-400 uppercase tracking-widest">Amount Cleared</span>
                      <span className="font-black text-slate-950 text-base">
                        ₦{Number(selectedRequest.amount || 0).toLocaleString()}
                      </span>
                    </div>
                    {selectedRequest.transaction_ref && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-400 uppercase tracking-widest">Bank reference</span>
                        <span className="font-mono text-slate-700 truncate max-w-[180px]">
                          {selectedRequest.transaction_ref}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pre-populated eBook Selector */}
                  {(selectedRequest.transaction_type === 'ebook_purchase' || selectedRequest.content_type === 'ebook') && (
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                        Pre-populated Target eBook to Unlock
                      </Label>
                      <div className="relative">
                        <select
                          className="w-full h-11 rounded-xl border border-slate-200 px-4 bg-white outline-none font-bold text-sm text-slate-700 focus:ring-green-700 focus:border-green-700 appearance-none cursor-pointer"
                          value={selectedBookId}
                          onChange={(e) => setSelectedBookId(e.target.value)}
                        >
                          <option value="">-- Let default target handle --</option>
                          {books.map((b) => (
                            <option key={b.id} value={b.id}>
                              📚 {b.title} (₦{b.price?.toLocaleString()})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-4 top-3.5 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* Checkbox to confirm */}
                  {selectedRequest.status === 'pending' && (
                    <label className="flex items-start gap-3 p-4 bg-amber-50/50 border border-amber-100 rounded-2xl cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        className="mt-1 w-4.5 h-4.5"
                        checked={isAmountConfirmed}
                        onChange={(e) => setIsAmountConfirmed(e.target.checked)}
                      />
                      <div className="text-xs">
                        <p className="font-black text-amber-900">Confirm payment match</p>
                        <p className="text-amber-700 font-medium">I have checked the transaction image and confirm the amount paid matches.</p>
                      </div>
                    </label>
                  )}

                  {/* Notes info */}
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      Internal Admin / Resolution Note (Optional)
                    </Label>
                    <textarea
                      placeholder="Enter resolution comment to log with this record..."
                      className="w-full h-20 rounded-2xl border border-slate-200 p-4 outline-none font-semibold text-sm focus:ring-green-700 focus:border-green-700 shrink-0"
                      value={modalAdminNote}
                      onChange={(e) => setModalAdminNote(e.target.value)}
                    />
                  </div>

                </div>

                {/* Audit trigger buttons */}
                <div className="space-y-3 pt-6 border-t border-slate-100 shrink-0">
                  {selectedRequest.status === 'pending' ? (
                    <div className="flex gap-4">
                      <Button
                        onClick={() => handleResolveSingle('reject')}
                        disabled={resolvingId === selectedRequest.id}
                        className="flex-1 h-12 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-black rounded-xl"
                      >
                        {resolvingId === selectedRequest.id ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'REJECT'}
                      </Button>
                      <Button
                        onClick={() => handleResolveSingle('approve')}
                        disabled={resolvingId === selectedRequest.id}
                        className="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-100"
                      >
                        {resolvingId === selectedRequest.id ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'APPROVE & UNLOCK'}
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-slate-50 text-slate-500 rounded-xl p-4 text-center font-bold text-xs italic">
                      This payment record has already been updated to {selectedRequest.status}.
                    </div>
                  )}

                  {/* Mark as paid / direct force unlock helper */}
                  <div className="pt-2">
                    <button
                      onClick={handleManualUnlock}
                      disabled={resolvingId === selectedRequest.id}
                      className="w-full h-11 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-colors uppercase tracking-wider italic"
                    >
                      <Lock className="w-4 h-4 text-amber-400" />
                      Mark as Paid (Direct Manual Unlock)
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

    </AdminLayout>
  );
};
