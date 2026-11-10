'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PenSquare,
  Users2,
  Settings,
  Search,
  ChevronsUpDown,
  Zap,
} from 'lucide-react';
import { useApp } from '@/lib/context/app-context';

export function AppSidebar() {
  const pathname = usePathname();
  const { user, workspace } = useApp();

  const navigation = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/composer', label: 'Create Post', icon: PenSquare },
    { href: '/accounts', label: 'Connected Accounts', icon: Users2 },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-[260px] bg-[#FFFFFF] border-r border-[#EBEBE8] flex flex-col h-screen sticky top-0 select-none z-30 shrink-0 font-sans">
      {/* 1. Workspace Switcher Header */}
      <div className="p-4 border-b border-[#F0F0ED]">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F7F7F5] transition-colors cursor-pointer group">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Logo box */}
            <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-sm shrink-0">
              <Zap className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm tracking-tight truncate">
                  {workspace.name}
                </span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-slate-900 text-white leading-none">
                  Pro
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {user.email}
              </p>
            </div>
          </div>
          <ChevronsUpDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0 ml-1" />
        </div>
      </div>

      {/* 2. Quick Search Bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#F6F6F3] border border-[#EEEEEC] text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-normal">Search</span>
          </div>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#E0E0DC] text-slate-400 shadow-2xs">
            /
          </kbd>
        </div>
      </div>

      {/* 3. Minimal Core Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Menu
        </div>

        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#F4F4F0] text-slate-900 font-bold shadow-2xs border border-[#ECECE8]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#FAF9F6]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-slate-900 stroke-[2.2]' : 'text-slate-400 stroke-[1.8]'
                  }`}
                />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 4. Bottom User Profile Card */}
      <div className="p-3 border-t border-[#F0F0ED]">
        <Link
          href="/settings"
          className="flex items-center justify-between p-2 rounded-xl bg-[#F6F6F3] border border-[#EEEEEC] hover:border-slate-300 transition-all cursor-pointer block"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-lg object-cover border border-[#E0E0DC] shrink-0"
            />
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-xs truncate">
                {user.name}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {user.email}
              </div>
            </div>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
        </Link>
      </div>
    </aside>
  );
}
