'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Plus,
  Bell,
  Settings,
  ChevronDown,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useApp } from '@/lib/context/app-context';

export function AppHeader() {
  const { user, workspace, logout } = useApp();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Dynamic route-aware breadcrumb mapping
  const breadcrumbs: Record<string, { group: string; label: string; groupHref: string }> = {
    '/dashboard': { group: 'Dashboard', label: 'Overview', groupHref: '/dashboard' },
    '/accounts': { group: 'Social Accounts', label: 'Accounts', groupHref: '/accounts' },
    '/pages': { group: 'Social Accounts', label: 'Pages & Channels', groupHref: '/pages' },
    '/categories': { group: 'Social Accounts', label: 'Categories', groupHref: '/categories' },
    '/composer': { group: 'Publishing', label: 'Create Post', groupHref: '/composer' },
    '/bulk-scheduler': { group: 'Publishing', label: 'Bulk Scheduler', groupHref: '/bulk-scheduler' },
    '/library': { group: 'Publishing', label: 'Post Library', groupHref: '/library' },
    '/bulk-delete': { group: 'Publishing', label: 'Bulk Delete Posts', groupHref: '/bulk-delete' },
    '/automations': { group: 'Automation & Tools', label: 'Blogger → FB', groupHref: '/automations' },
    '/image-generator': { group: 'Automation & Tools', label: 'Image Generator', groupHref: '/image-generator' },
    '/analytics': { group: 'Analytics', label: 'Analytics Overview', groupHref: '/analytics' },
    '/monetization': { group: 'Analytics', label: 'Monetization & Integrity', groupHref: '/monetization' },
    '/logs': { group: 'System', label: 'Logs', groupHref: '/logs' },
    '/settings': { group: 'System', label: 'Settings', groupHref: '/settings' },
    '/debug': { group: 'System', label: 'Debug & Status', groupHref: '/debug' },
  };

  const currentCrumb = breadcrumbs[pathname] || {
    group: 'Dashboard',
    label: pathname.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Overview',
    groupHref: '/dashboard',
  };

  return (
    <header className="h-16 border-b border-[#E2E8F0] bg-white px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 font-sans">
      {/* Left: Dynamic Tasklify Breadcrumb Path */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href={currentCrumb.groupHref} className="hover:text-slate-900 transition-colors">
            {currentCrumb.group}
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold">{currentCrumb.label}</span>
        </div>

        {/* Search input in header */}
        <div className="hidden md:flex items-center relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search content, posts..."
            className="pl-8 pr-7 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all w-56 lg:w-72"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono px-1 rounded bg-white border border-[#E2E8F0] text-slate-400">
            /
          </kbd>
        </div>
      </div>

      {/* Right: Tasklify Action Controls (Avatars, Settings, Bell, Dark + Create Post) */}
      <div className="flex items-center gap-3">
        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#F8F9FA] transition-colors"
            title="User Profile"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80'}
              alt={user.name}
              className="w-7 h-7 rounded-full object-cover ring-2 ring-slate-200"
            />
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-10 w-56 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl p-2 z-30 space-y-1 animate-scale-up text-xs">
              <div className="p-2 border-b border-[#E2E8F0]">
                <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                  <span>{user.name}</span>
                  {user.provider === 'google' && (
                    <span className="text-[9px] font-black px-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      Google
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</div>
              </div>

              <Link
                href="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#F8F9FA] text-slate-700 font-medium transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Account Settings</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  logout();
                  setUserMenuOpen(false);
                  window.location.href = '/login';
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 font-medium transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
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

        {/* Solid Dark Obsidian + Create Post Button */}
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
