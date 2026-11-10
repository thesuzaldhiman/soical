'use client';

import React from 'react';
import Link from 'next/link';
import {
  PenSquare,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '@/lib/context/app-context';

export function AppHeader() {
  const { user, accounts, pages } = useApp();

  const activePagesCount = pages.filter((p) => p.isActive).length;
  const activeAccountsCount = accounts.filter((a) => a.status === 'active').length;

  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Platform Status Indicator Pills */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-semibold text-slate-800">Token Vault:</span>
          <span className="flex items-center gap-1 font-medium text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            AES-256 Protected
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{activeAccountsCount} Accounts</span>
          <span>•</span>
          <span className="font-medium text-slate-700">{activePagesCount} Active Channels</span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Quick Link to Composer */}
        <Link
          href="/composer"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
        >
          <PenSquare className="w-3.5 h-3.5" />
          <span>New Post</span>
        </Link>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.avatar}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20"
          />
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-slate-900 leading-tight flex items-center gap-1">
              <span>{user.name}</span>
              <CheckCircle2 className="w-3 h-3 text-blue-500" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-tight">{user.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
