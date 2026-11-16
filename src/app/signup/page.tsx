'use client';

import React from 'react';
import Link from 'next/link';
import { Radio, ArrowRight, ShieldAlert, LogIn } from 'lucide-react';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
            <Radio className="w-4 h-4 stroke-[2.4]" />
          </div>
          <span className="font-extrabold text-sm text-slate-900 tracking-tight">
            Social Auto Poster
          </span>
        </Link>

        <Link
          href="/login"
          className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </Link>
      </div>

      {/* Main Notice Box */}
      <div className="max-w-md w-full mx-auto my-12 animate-fade-in">
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-8 shadow-xs space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
              <span>Private Access System</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Registration Closed
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Public user registration is currently disabled. This platform is strictly private and reserved exclusively for the authorized administrator.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Authorized Account
            </div>
            <div className="font-mono text-slate-900 font-semibold bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs">
              me.sumitji@gmail.com
            </div>
          </div>

          <Link
            href="/login"
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <span>Go to Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto text-center text-[11px] text-slate-400 font-medium">
        &copy; 2026 Social Auto Poster Pro. Private Workspace.
      </div>
    </div>
  );
}
