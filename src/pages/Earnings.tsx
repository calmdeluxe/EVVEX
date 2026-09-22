import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Coins, ArrowUpRight, History, Wallet, Shield, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAppUrl, getReferralCode } from '../lib/utils';

export const Earnings: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchEarningsData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = { Authorization: `Bearer ${session?.access_token}` };
        
        const [balanceRes, transRes, withRes] = await Promise.all([
          axios.get('/api/user/balance', { headers }),
          axios.get('/api/user/transactions', { headers }),
          supabase.from('withdrawals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        ]);

        // REWARD UI: display wallet balance and points
        // BAN DUMMY: filter out test/mock data
        setBalance(balanceRes.data.balance || 0);
        setTotalEarned(balanceRes.data.totalEarned || 0);
        setTotalWithdrawn(balanceRes.data.totalWithdrawn || 0);
        setPendingWithdrawals(balanceRes.data.pendingWithdrawals || 0);
        
        const rawTrans = transRes.data.transactions || [];
        const cleanTrans = rawTrans.filter((t: any) => {
          if (!t.user_id) return false;
          if (t.buyer_email === 'No Email') return false;
          if (t.type === 'mock' || t.type === 'test') return false;
          
          const ref = (t.paystack_reference || "").toLowerCase();
          if (ref.includes("mock") || ref.includes("test")) return false;
          if (t.amount === 100 && (ref.includes("free") || ref.startsWith("manual-"))) return false;
          return true;
        });
        setTransactions(cleanTrans);
        setWithdrawals(withRes.data || []);
      } catch (err) {
        console.error('Error fetching earnings data:', err);
      }
    };

    fetchEarningsData();
  }, [user]);

  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  
  // Withdrawal Form State
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    bank_name: '',
    account_number: '',
    account_name: ''
  });

  useEffect(() => {
    if (profile) {
      setWithdrawalForm(prev => ({
        ...prev,
        bank_name: profile.bank_name || '',
        account_number: profile.account_number || '',
        account_name: profile.account_name || ''
      }));
    }
  }, [profile]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(withdrawalForm.amount);
    const MIN_WITHDRAWAL = 5000;
    
    if (isNaN(val) || val < MIN_WITHDRAWAL) {
      alert(`Minimum withdrawal is ₦${MIN_WITHDRAWAL}`);
      return;
    }
    if (val > balance) {
      alert('Insufficient balance');
      return;
    }

    if (!withdrawalForm.bank_name || !withdrawalForm.account_number || !withdrawalForm.account_name) {
      alert('Please fill in all bank details');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await axios.post('/api/withdrawal/request', 
        { 
          amount: val, 
          bank_name: withdrawalForm.bank_name, 
          account_number: withdrawalForm.account_number, 
          account_name: withdrawalForm.account_name 
        },
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      
      if (response.data.success) {
        setWithdrawalForm(prev => ({ ...prev, amount: '' }));
        alert('Withdrawal request submitted successfully!');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit withdrawal request');
    } finally {
      setLoading(false);
    }
  };

  const affiliateCommissions = transactions
    .filter((t: any) => t.type === 'affiliate_commission')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const triviaRewards = transactions
    .filter((t: any) => t.type === 'trivia_win' || t.type === 'trivia_reward' || t.type === 'trivia')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const referralsCount = transactions
    .filter((t: any) => t.type === 'affiliate_commission' || t.type === 'referral_bonus')
    .length;

  // Combine transactions and withdrawals for a comprehensive recent activity list
  const combinedActivity = [
    ...transactions.map((t: any) => ({
      id: t.id,
      type: 'transaction',
      txType: t.type,
      title: t.type === 'affiliate_commission' ? 'Affiliate Commission' :
             t.type === 'referral_bonus' ? 'Referral Signup Bonus' :
             t.type === 'trivia_win' ? 'Trivia Challenge Reward' :
             t.type === 'author_earning' ? 'Book Sale Royalty' : 'Premium Upgrade Reward',
      date: t.created_at,
      amount: t.amount,
      status: t.status || 'completed'
    })),
    ...withdrawals.map((w: any) => ({
      id: w.id,
      type: 'withdrawal',
      txType: 'withdrawal',
      title: 'Withdrawal Request',
      date: w.created_at,
      amount: w.amount,
      status: w.status
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-900 text-white border-none shadow-xl shadow-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] uppercase font-black tracking-widest opacity-60">Available Balance</CardTitle>
              <CardDescription className="text-4xl font-black text-white">₦{balance.toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-[10px] font-bold opacity-60 flex items-center gap-1">
                <Coins className="w-3 h-3" /> Total Lifetime: ₦{totalEarned.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Processing</CardTitle>
              <CardDescription className="text-3xl font-black text-slate-900">₦{pendingWithdrawals.toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <Shield className="w-3 h-3" /> Paid Out: ₦{totalWithdrawn.toLocaleString()}
               </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-indigo-50/30 ring-1 ring-indigo-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] uppercase font-black tracking-widest text-indigo-600">Commission Tier</CardTitle>
              <CardDescription className="text-3xl font-black text-indigo-900">
                 {profile?.account_tier === 'author' ? '80%' : profile?.account_tier === 'premium' ? '50%' : '10%'}
              </CardDescription>
            </CardHeader>
            <CardContent>
               <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  Status: {profile?.account_tier || 'Free'} Member
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Referral & Affiliate Program Card */}
        <Card className="border-none shadow-md bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 text-white rounded-[24px] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Coins className="w-40 h-40 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl text-left">
              <Badge className="bg-amber-500 text-slate-950 hover:bg-amber-400 border-none font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5 h-5">Referral & Affiliate Program</Badge>
              <h3 className="text-xl font-black">Invite Friends, Earn Commissions</h3>
              <p className="text-xs text-emerald-100/95 leading-relaxed font-medium">
                Share CalmReader with your network. You'll earn <strong className="text-amber-300">₦100</strong> for every referral signup, and a <strong className="text-amber-300">10% - 15% recurring affiliate commission</strong> whenever they purchase books or upgrade to Premium!
              </p>
            </div>
            <div className="w-full md:w-auto shrink-0 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-3 text-left">
              <p className="text-[10px] font-black uppercase text-emerald-300 tracking-wider">Your Personal Referral Link</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-emerald-100 bg-black/20 px-3 py-2 rounded-xl border border-white/5 truncate max-w-[200px] md:max-w-[250px]">
                  {getAppUrl()}/?ref={getReferralCode(user?.id)}
                </span>
                <Button
                  onClick={() => {
                    const link = `${getAppUrl()}/?ref={getReferralCode(user?.id)}`;
                    navigator.clipboard.writeText(link);
                    alert("Your personalized referral link has been copied!");
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 h-9 rounded-xl border-none transition-all active:scale-95 cursor-pointer"
                >
                  Copy Link
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* REWARD UI: display wallet balance and points */}
        {/* BAN DUMMY: filter out test/mock data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-md bg-white rounded-2xl p-4">
            <CardHeader className="pb-2 p-0">
              <CardTitle className="text-[10px] uppercase font-black tracking-widest text-indigo-600 mb-1">Affiliate Statistics</CardTitle>
              <CardDescription className="text-2xl font-black text-slate-900">₦{affiliateCommissions.toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent className="p-0 mt-3">
              <div className="space-y-2 text-xs font-bold text-slate-500">
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span>Total Referrals:</span>
                  <span className="text-slate-800 font-black">{referralsCount} users</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span>Commissions Earned:</span>
                  <span className="text-emerald-600 font-black">₦{affiliateCommissions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>Paid Commissions:</span>
                  <span className="text-slate-800 font-black">₦{(transactions.filter(t => t.type === 'affiliate_commission' && t.status === 'completed').reduce((sum, t) => sum + (t.amount || 0), 0)).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white rounded-2xl p-4">
            <CardHeader className="pb-2 p-0">
              <CardTitle className="text-[10px] uppercase font-black tracking-widest text-indigo-600 mb-1">Trivia & Rewards</CardTitle>
              <CardDescription className="text-2xl font-black text-slate-900">₦{triviaRewards.toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent className="p-0 mt-3">
              <div className="space-y-2 text-xs font-bold text-slate-500">
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span>Trivia Win Earnings:</span>
                  <span className="text-emerald-600 font-black">₦{triviaRewards.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span>Current T-Points:</span>
                  <span className="text-indigo-600 font-black">{(profile?.t_points || 0).toLocaleString()} TP</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>Points Value equivalent:</span>
                  <span className="text-emerald-600 font-black">₦{((profile?.t_points || 0) * 5).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Withdrawal Form */}
          {isAdmin ? (
            <Card className="rounded-[32px] border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Shield className="w-40 h-40" />
               </div>
               <CardHeader className="relative z-10 pt-10 px-10">
                  <Badge className="bg-amber-500 text-white border-none font-black text-[10px] uppercase tracking-widest mb-4 w-fit">CEO Account Status</Badge>
                  <CardTitle className="text-3xl font-black mb-2">Direct Settlement Active</CardTitle>
                  <CardDescription className="text-slate-400 font-medium text-sm leading-relaxed">
                    As the platform owner, your earnings from transaction commissions and platform fees are processed directly via the core settlement engine.
                  </CardDescription>
               </CardHeader>
               <CardContent className="relative z-10 px-10 pb-10 mt-6">
                  <div className="space-y-6">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                       <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Platform Policy</p>
                       <p className="text-sm font-medium text-slate-200">Manual withdrawal requests are disabled for administrative personnel to ensure direct financial audit compliance. Your share is credited instantly to your designated bank account on file.</p>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                       <CheckCircle2 className="w-6 h-6 text-amber-500" />
                       <span className="text-xs font-bold text-amber-100">Settlement Verification: 24/7 Real-time</span>
                    </div>
                  </div>
               </CardContent>
            </Card>
          ) : (
            <Card className="rounded-[32px] border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-black">
                <Wallet className="w-6 h-6 text-indigo-600" />
                <span>Request Payout</span>
              </CardTitle>
              <CardDescription className="font-medium">Funds will be deposited to your verified account.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleWithdraw} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Withdrawal Amount (₦)</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder="Min ₦5,000" 
                      value={withdrawalForm.amount}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                      max={balance || 0}
                      min={5000}
                      className="rounded-2xl h-14 pl-12 font-black text-xl border-slate-100 bg-slate-50"
                    />
                    <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                   <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Recipient Bank Information</Label>
                   <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-500">Bank Name</Label>
                        <Input 
                          placeholder="e.g. Access Bank"
                          value={withdrawalForm.bank_name}
                          onChange={(e) => setWithdrawalForm({ ...withdrawalForm, bank_name: e.target.value })}
                          className="h-11 rounded-xl bg-white border-slate-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-500">Account Number</Label>
                        <Input 
                          placeholder="10 Digits"
                          value={withdrawalForm.account_number}
                          onChange={(e) => setWithdrawalForm({ ...withdrawalForm, account_number: e.target.value })}
                          className="h-11 rounded-xl bg-white border-slate-200 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-500">Account Holder Name</Label>
                        <Input 
                          placeholder="Beneficiary Name"
                          value={withdrawalForm.account_name}
                          onChange={(e) => setWithdrawalForm({ ...withdrawalForm, account_name: e.target.value })}
                          className="h-11 rounded-xl bg-white border-slate-200 uppercase text-[10px] font-black"
                        />
                      </div>
                   </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading || !withdrawalForm.amount || parseInt(withdrawalForm.amount) > balance}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 rounded-2xl text-lg font-black shadow-lg shadow-indigo-100 transition-all active:scale-95"
                >
                  {loading ? 'Processing...' : 'Confirm Withdrawal Request'}
                </Button>
              </form>
            </CardContent>
          </Card>
          )}

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-gray-500" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-left">
              <div className="divide-y max-h-[400px] overflow-auto">
                {combinedActivity.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm">No activity yet</div>
                )}
                {combinedActivity.map((item: any) => {
                  const isWithdrawal = item.type === 'withdrawal';
                  const isUpgrade = item.txType === 'premium_upgrade';
                  const isPositive = !isWithdrawal && !isUpgrade;

                  return (
                    <div key={item.id} className="p-4 flex items-center justify-between border-b border-slate-50 last:border-b-0">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          isWithdrawal ? 'bg-orange-100 text-orange-600' :
                          isUpgrade ? 'bg-slate-100 text-slate-600' :
                          item.txType === 'referral_bonus' ? 'bg-emerald-100 text-emerald-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {isWithdrawal ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <Coins className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-950">{item.title}</p>
                          <p className="text-[10px] text-slate-400 font-extrabold">{new Date(item.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${
                          isPositive ? 'text-emerald-600' : 'text-slate-900'
                        }`}>
                          {isPositive ? '+' : '-'}₦{item.amount.toLocaleString()}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={`text-[9px] h-4 px-1.5 font-bold uppercase tracking-wider ${
                            item.status === 'completed' || item.status === 'approved' || item.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
