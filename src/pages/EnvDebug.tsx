import React from 'react';

export default function EnvDebug() {
  return (
    <div className="p-8 max-w-xl mx-auto mt-10 bg-slate-900 text-white rounded-3xl border border-white/15">
      <h1 className="text-2xl font-black mb-6 tracking-tight">Environment Variables Check</h1>
      <div className="space-y-4 font-mono text-sm">
        <p className="flex justify-between border-b border-white/5 pb-2">
          <span>VITE_SUPABASE_URL:</span>
          <span className={import.meta.env.VITE_SUPABASE_URL ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
            {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
          </span>
        </p>
        <p className="flex justify-between border-b border-white/5 pb-2">
          <span>VITE_SUPABASE_ANON_KEY:</span>
          <span className={import.meta.env.VITE_SUPABASE_ANON_KEY ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
            {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
          </span>
        </p>
        <p className="flex justify-between border-b border-white/5 pb-2">
          <span>VITE_API_BASE_URL:</span>
          <span className="text-blue-400">{import.meta.env.VITE_API_BASE_URL || '(empty)'}</span>
        </p>
      </div>
    </div>
  );
}
