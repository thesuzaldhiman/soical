'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Share2,
  Layers,
  Tags,
  PenTool,
  CalendarClock,
  BookmarkCheck,
  Trash2,
  Rss,
  Palette,
  BarChart3,
  DollarSign,
  FileText,
  Settings,
  Bug,
  ChevronDown,
  ChevronRight,
  Search,
  Sparkles,
  HelpCircle,
  ChevronsUpDown,
} from 'lucide-react';
import { useApp } from '@/lib/context/app-context';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: {
    text: string;
    variant: 'pink' | 'cyan';
  };
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user, workspace, pages } = useApp();
  const integrityAlertCount = pages.filter(
    (p) => p.platform === 'facebook' && p.integrityStatus && p.integrityStatus !== 'ok'
  ).length;

  const navGroups: NavGroup[] = [
    {
      id: 'overview',
      title: 'OVERVIEW',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      id: 'social-accounts',
      title: 'SOCIAL ACCOUNTS',
      items: [
        { href: '/accounts', label: 'Accounts', icon: Share2 },
        {
          href: '/pages',
          label: 'Pages',
          icon: Layers,
          badge: { text: `${pages.length || 18}`, variant: 'pink' },
        },
        { href: '/categories', label: 'Categories', icon: Tags },
      ],
    },
    {
      id: 'publishing',
      title: 'PUBLISHING',
      items: [
        { href: '/composer', label: 'Create Post', icon: PenTool },
        { href: '/bulk-scheduler', label: 'Bulk Scheduler', icon: CalendarClock },
        { href: '/library', label: 'Post Library', icon: BookmarkCheck },
        { href: '/bulk-delete', label: 'Bulk Delete Posts', icon: Trash2 },
      ],
    },
    {
      id: 'automation-tools',
      title: 'AUTOMATION & TOOLS',
      items: [
        { href: '/automations', label: 'Blogger → FB', icon: Rss },
        { href: '/image-generator', label: 'Image Generator', icon: Palette },
      ],
    },
    {
      id: 'analytics',
      title: 'ANALYTICS',
      items: [
        { href: '/analytics', label: 'Analytics', icon: BarChart3 },
        {
          href: '/monetization',
          label: 'Monetization',
          icon: DollarSign,
          badge:
            integrityAlertCount > 0
              ? { text: `${integrityAlertCount} alert`, variant: 'pink' }
              : { text: '100P', variant: 'cyan' },
        },
      ],
    },
    {
      id: 'system',
      title: 'SYSTEM',
      items: [
        { href: '/logs', label: 'Logs', icon: FileText },
        { href: '/settings', label: 'Settings', icon: Settings },
        { href: '/debug', label: 'Debug', icon: Bug },
      ],
    },
  ];

  // State to manage collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  return (
    <aside className="w-[260px] bg-white border-r border-[#E2E8F0] flex flex-col h-screen sticky top-0 select-none z-30 shrink-0 font-sans shadow-2xs">
      {/* 1. Brand Logo Header (Tasklify Style Workspace Selector) */}
      <div className="p-4 pb-3">
        <Link
          href="/dashboard"
          className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F8F9FA] transition-colors group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-slate-900 truncate">
                  AutoPoster
                </span>
                <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-[9px] font-bold text-slate-700 border border-[#E2E8F0]">
                  Pro
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium truncate">
                {workspace.name || 'landerstudio@gmail.com'}
              </div>
            </div>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </Link>

        {/* Tasklify Search Input */}
        <div className="mt-2 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono px-1 rounded bg-white border border-[#E2E8F0] text-slate-400">
            /
          </kbd>
        </div>
      </div>

      {/* 2. Navigation Items (Grouped & Collapsible) */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-3 custom-scrollbar">
        {navGroups.map((group) => {
          const isCollapsed = collapsedGroups[group.id];
          const hasActiveChild = group.items.some((i) => pathname === i.href);

          return (
            <div key={group.id} className="space-y-0.5">
              {/* Group Title with subtle expand/collapse trigger */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className={hasActiveChild ? 'text-slate-900 font-black' : ''}>
                  {group.title}
                </span>
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                )}
              </button>

              {/* Group Items */}
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-[#F8F9FA]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive
                                ? 'text-white stroke-[2.2]'
                                : 'text-slate-400 group-hover:text-slate-900 stroke-[1.9]'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-700 border border-[#E2E8F0]'
                            }`}
                          >
                            {item.badge.text}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Bottom Links & User Profile (Tasklify David Johnson Style) */}
      <div className="p-3 border-t border-[#E2E8F0] space-y-2">
        <Link
          href="/debug"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-[#F8F9FA] transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-slate-400" />
          <span>Help Center</span>
        </Link>

        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-[#F8F9FA] transition-colors"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>Settings</span>
        </Link>

        <div className="pt-2 border-t border-[#E2E8F0]">
          <Link
            href="/settings"
            className="flex items-center justify-between p-2 rounded-xl bg-[#F8F9FA] hover:bg-slate-100 border border-[#E2E8F0] transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                alt={user.name}
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 shrink-0"
              />
              <div className="min-w-0">
                <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-1.5">
                  <span>{user.name}</span>
                  {user.provider === 'google' && (
                    <span className="text-[9px] font-extrabold px-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      G
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate">
                  {user.email}
                </div>
              </div>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
