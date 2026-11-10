'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users2,
  Layers,
  Tags,
  PenSquare,
  CalendarClock,
  BookmarkCheck,
  Trash2,
  Cpu,
  Palette,
  BarChart3,
  FileText,
  Settings,
  Bug,
  Search,
  ChevronsUpDown,
  Zap,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '@/lib/context/app-context';

interface NavGroup {
  id: string;
  label: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user, workspace } = useApp();

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const navGroups: NavGroup[] = [
    {
      id: 'overview',
      label: 'OVERVIEW',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      id: 'social-accounts',
      label: 'SOCIAL ACCOUNTS',
      items: [
        { href: '/accounts', label: 'Accounts', icon: Users2 },
        { href: '/pages', label: 'Pages', icon: Layers },
        { href: '/categories', label: 'Categories', icon: Tags },
      ],
    },
    {
      id: 'publishing',
      label: 'PUBLISHING',
      items: [
        { href: '/composer', label: 'Create Post', icon: PenSquare },
        { href: '/bulk-scheduler', label: 'Bulk Scheduler', icon: CalendarClock },
        { href: '/library', label: 'Post Library', icon: BookmarkCheck },
        { href: '/bulk-delete', label: 'Bulk Delete Posts', icon: Trash2 },
      ],
    },
    {
      id: 'automation-tools',
      label: 'AUTOMATION & TOOLS',
      items: [
        { href: '/automations', label: 'Blogger → FB', icon: Cpu },
        { href: '/image-generator', label: 'Image Generator', icon: Palette, badge: 'SIG' },
      ],
    },
    {
      id: 'analytics',
      label: 'ANALYTICS',
      items: [
        { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      ],
    },
    {
      id: 'system',
      label: 'SYSTEM',
      items: [
        { href: '/logs', label: 'Logs', icon: FileText },
        { href: '/settings', label: 'Settings', icon: Settings },
        { href: '/debug', label: 'Debug', icon: Bug },
      ],
    },
  ];

  return (
    <aside className="w-[260px] bg-[#FFFFFF] border-r border-[#EBEBE8] flex flex-col h-screen sticky top-0 select-none z-30 shrink-0 font-sans">
      {/* 1. Workspace Switcher Header */}
      <div className="p-3.5 border-b border-[#F0F0ED]">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F7F7F5] transition-colors cursor-pointer group">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Logo box */}
            <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-2xs shrink-0">
              <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-xs tracking-tight truncate">
                  {workspace.name}
                </span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-slate-900 text-white leading-none">
                  Pro
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                {user.email}
              </p>
            </div>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 ml-1" />
        </div>
      </div>

      {/* 2. Quick Search Bar */}
      <div className="px-3.5 pt-2.5 pb-1">
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#F6F6F3] border border-[#EEEEEC] text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-normal text-[11px]">Search</span>
          </div>
          <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#E0E0DC] text-slate-400 shadow-2xs">
            /
          </kbd>
        </div>
      </div>

      {/* 3. Grouped Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {navGroups.map((group) => {
          const isCollapsed = collapsedGroups[group.id];

          return (
            <div key={group.id} className="space-y-0.5">
              {/* Group Label / Toggle */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wider transition-colors"
              >
                <span>{group.label}</span>
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
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-[#F4F4F0] text-slate-900 font-bold shadow-2xs border border-[#ECECE8]'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-[#FAF9F6]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive
                                ? 'text-slate-900 stroke-[2.2]'
                                : 'text-slate-400 stroke-[1.8]'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-violet-100 text-violet-700 shrink-0">
                            {item.badge}
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
