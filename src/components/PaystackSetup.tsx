import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export const PaystackSetup: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { isAdmin } = useAuth();
  const [secretKey, setSecretKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await axios.get('/api/config/paystack-status');
        if (res.data && res.data.configured) {
          setIsConfigured(true);
          onComplete();
        }
      } catch (e) {
        console.error("Failed to check Paystack status:", e);
      }
    };
    checkConfig();
  }, [onComplete]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKey || !publicKey) {
      setError('Both keys are required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await Promise.all([
        supabase.from('config').upsert({ key: 'paystack_secret_key', value: secretKey }),
        supabase.from('config').upsert({ key: 'paystack_public_key', value: publicKey }),
      ]);
      setSuccess(true);
      setTimeout(() => onComplete(), 1500);
    } catch (err) {
      setError('Failed to save configuration. Check permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([
        supabase.from('config').upsert({ key: 'paystack_secret_key', value: 'sk_test_mock_skipped' }),
        supabase.from('config').upsert({ key: 'paystack_public_key', value: 'pk_test_mock_skipped' }),
      ]);
      setSuccess(true);
      setTimeout(() => onComplete(), 800);
    } catch (err) {
      console.warn("Failed to write skip setup keys, dismissing anyway:", err);
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  if (isConfigured) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md relative">
        <button 
          onClick={onComplete}
          className="absolute right-4 top-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
          title="Dismiss"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-green-800">Paystack Setup</CardTitle>
          <CardDescription>
            Configure your Paystack keys to enable payments. This is required on first launch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="secretKey">Paystack Secret Key</Label>
              <Input
                id="secretKey"
                type="password"
                placeholder="sk_test_..."
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publicKey">Paystack Public Key</Label>
              <Input
                id="publicKey"
                placeholder="pk_test_..."
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-md">
                <CheckCircle2 className="w-4 h-4" />
                <span>Configuration saved successfully!</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full bg-green-700 hover:bg-green-800 text-white"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Configuration'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={handleSkip}
              >
                Skip Setup (Don't Ask Again)
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
