import React, { useState } from 'react';
import { User, Transaction } from '../../types';
import { X, CreditCard, ShieldCheck, Check, Sparkles } from 'lucide-react';

interface DepositModalProps {
  currentUser: User;
  onClose: () => void;
  onDepositSuccess: (updatedUser: User, newTx: Transaction) => void;
  onToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const PRESET_AMOUNTS = [10000, 25000, 50000, 100000, 250000];

export const DepositModal: React.FC<DepositModalProps> = ({
  currentUser,
  onClose,
  onDepositSuccess,
  onToast
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [cardNumber, setCardNumber] = useState('5399 •••• •••• 8821');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('821');
  const [isProcessing, setIsProcessing] = useState(false);

  const amountToCharge = customAmount ? parseInt(customAmount, 10) || 0 : selectedAmount;

  const handlePaystackDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountToCharge < 2000) {
      onToast('Minimum top-up is ₦2,000', 'warning');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      const newBalance = currentUser.balance + amountToCharge;
      const updatedUser: User = {
        ...currentUser,
        balance: newBalance
      };

      const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        type: 'deposit',
        amount: amountToCharge,
        date: 'Today',
        status: 'completed',
        reference: `PSTK_DEP_${Date.now().toString().slice(-6)}`,
        description: `Paystack Card Top-up`
      };

      onDepositSuccess(updatedUser, newTx);
      onClose();
      onToast(`₦${amountToCharge.toLocaleString('en-NG')} added to your EVVEX Wallet!`, 'success');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-950 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer border border-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold uppercase tracking-wider">
            <CreditCard className="w-3.5 h-3.5" />
            Paystack Secured Payment
          </div>
          <h3 className="text-xl font-black text-white font-['Syne']">
            Top Up EVVEX Wallet
          </h3>
          <p className="text-xs text-slate-400">
            Instant credit to your Nigerian Naira balance for event tickets and tables.
          </p>
        </div>

        {/* Preset Amount Chips */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-semibold block">Select Amount (₦)</label>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                className={`py-2 px-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                  !customAmount && selectedAmount === amt
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                    : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                }`}
              >
                ₦{amt.toLocaleString('en-NG')}
              </button>
            ))}
          </div>

          <div className="pt-1">
            <input
              type="number"
              placeholder="Or enter custom amount in ₦"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Simulated Card form */}
        <form onSubmit={handlePaystackDeposit} className="space-y-3 border-t border-slate-800 pt-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Card Number (Debit / Credit)</label>
            <input
              type="text"
              value={cardNumber}
              onChange={e => setCardNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Expiry</label>
              <input
                type="text"
                value={cardExpiry}
                onChange={e => setCardExpiry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">CVV</label>
              <input
                type="password"
                maxLength={3}
                value={cardCvv}
                onChange={e => setCardCvv(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black py-3 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <span>Connecting to Paystack...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Pay ₦{amountToCharge.toLocaleString('en-NG')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
