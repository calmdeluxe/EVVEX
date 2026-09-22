import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center space-y-8 border border-red-100"
      >
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-12 h-12 text-red-600" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Access Denied</h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            You do not have the required permissions to view this secure administrative area.
          </p>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <Button 
            onClick={() => navigate('/dashboard')} 
            className="h-14 bg-slate-950 hover:bg-black text-white font-black uppercase tracking-widest text-xs rounded-2xl gap-2 shadow-xl"
          >
            <Home className="w-4 h-4" /> Go to Dashboard
          </Button>
          <Button 
            variant="ghost"
            onClick={() => navigate(-1)} 
            className="h-14 text-slate-400 font-black uppercase tracking-widest text-xs rounded-2xl gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Button>
        </div>
        
        <div className="pt-8 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">
            Security Audit: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </motion.div>
    </div>
  );
};
