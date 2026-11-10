'use client';

import React from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Bell,
  ChevronDown,
} from 'lucide-react';

export function AppHeader() {
  return (
    <header className="h-18 border-b border-[#EEF1F6] bg-white/80 backdrop-blur-md px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 font-sans">
      {/* Left: Global Search Input */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search content, campaigns, analytics..."
            className="w-full pl-10 pr-12 py-2 rounded-xl bg-[#F6F8FD] border border-[#E9EEF7] text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF007A] focus:bg-white transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#E2E8F0] text-slate-400 shadow-2xs">
            ⌘ K
          </kbd>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* + Create Post Hot Pink Gradient Button */}
        <Link
          href="/composer"
          className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF007A] to-[#FF2E93] hover:from-[#E6006E] hover:to-[#E62080] text-white text-xs font-bold transition-all shadow-[0_4px_14px_rgba(255,0,122,0.32)] hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Create Post</span>
          <ChevronDown className="w-3.5 h-3.5 stroke-[2.5] ml-0.5" />
        </Link>

        {/* Bell Notifications */}
        <button
          type="button"
          className="relative w-9 h-9 rounded-xl bg-white border border-[#EEF1F6] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-[#F6F8FD] transition-colors shadow-2xs"
          title="Notifications"
        >
          <Bell className="w-4 h-4 stroke-[2]" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF007A] ring-2 ring-white" />
        </button>

        {/* User Circular Avatar */}
        <Link href="/settings" className="block shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
            alt="Ava Morgan"
            className="w-9 h-9 rounded-full object-cover ring-2 ring-pink-100 hover:ring-[#FF007A] transition-all"
          />
        </Link>
      </div>
    </header>
  );
}
