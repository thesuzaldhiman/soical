'use client';

import React from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Bell,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '@/lib/context/app-context';

export function AppHeader() {
  const { user, workspace } = useApp();

  return (
    <header className="h-16 border-b border-[#E2E8F0] bg-white px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 font-sans">
      {/* Left: Tasklify Style Breadcrumb Path */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/dashboard" className="hover:text-slate-900 transition-colors">
            Dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold">Overview</span>
        </div>

        {/* Search input in header */}
        <div className="hidden md:block relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search content, posts..."
            className="w-full pl-8 pr-10 py-1.5 rounded-lg bg-[#F8F9FA] border border-[#E2E8F0] text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono px-1 py-0.2 rounded bg-white border border-[#E2E8F0] text-slate-400">
            /
          </kbd>
        </div>
      </div>

      {/* Right: Tasklify Action Controls (Avatars, Settings, Bell, Dark + Create Post) */}
      <div className="flex items-center gap-3">
        {/* Workspace Team Avatar Stack */}
        <div className="hidden sm:flex items-center -space-x-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80"
            alt="Team member"
            className="w-7 h-7 rounded-full object-cover ring-2 ring-white"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80"
            alt="Team member"
            className="w-7 h-7 rounded-full object-cover ring-2 ring-white"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=60&auto=format&fit=crop&q=80"
            alt="Team member"
            className="w-7 h-7 rounded-full object-cover ring-2 ring-white"
          />
          <span className="w-7 h-7 rounded-full bg-slate-100 ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-slate-600">
            +4
          </span>
        </div>

        {/* Settings Button */}
        <Link
          href="/settings"
          className="w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8F9FA] flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
          title="Settings"
        >
          <Settings className="w-4 h-4 stroke-[1.8]" />
        </Link>

        {/* Bell Notifications */}
        <button
          type="button"
          className="relative w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8F9FA] flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
          title="Notifications"
        >
          <Bell className="w-4 h-4 stroke-[1.8]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* Solid Dark Obsidian + Create Post Button (Tasklify style) */}
        <Link
          href="/composer"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Create Post</span>
        </Link>
      </div>
    </header>
  );
}
