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
  Crown,
  ChevronDown,
  ChevronRight,
  ArrowRight,
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
    <aside className="w-[260px] bg-white border-r border-[#EEF1F6] flex flex-col h-screen sticky top-0 select-none z-30 shrink-0 font-sans shadow-[2px_0_12px_rgba(0,0,0,0.015)]">
      {/* 1. Brand Logo Header */}
      <div className="p-5 pb-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          {/* Glowing Gradient Logo 'C' */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF007A] via-[#8B5CF6] to-[#00C2FF] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(255,0,122,0.35)] group-hover:scale-105 transition-transform">
            <span className="font-black text-lg tracking-tighter">C</span>
          </div>
          <div className="flex items-center tracking-tight">
            <span className="text-lg font-black text-slate-900">Creator</span>
            <span className="text-lg font-bold text-[#FF007A]">Flow</span>
          </div>
        </Link>
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
                className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className={hasActiveChild ? 'text-[#FF007A]' : ''}>
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
                        className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all group ${
                          isActive
                            ? 'bg-gradient-to-r from-[#FF007A] to-[#FF4E98] text-white shadow-[0_4px_14px_rgba(255,0,122,0.32)] font-bold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-[#F6F8FD]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive
                                ? 'text-white stroke-[2.2]'
                                : 'text-slate-400 group-hover:text-[#FF007A] stroke-[1.9]'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                              isActive
                                ? 'bg-white/25 text-white'
                                : item.badge.variant === 'pink'
                                ? 'bg-pink-100 text-[#FF007A]'
                                : 'bg-cyan-100 text-cyan-700'
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

        {/* 3. Upgrade to Pro Card (Exact match to screenshot) */}
        <div className="pt-2 pb-1">
          <div className="relative overflow-hidden rounded-2xl p-3.5 bg-gradient-to-br from-[#7928CA] via-[#9B2CBE] to-[#FF0080] text-white shadow-[0_8px_20px_rgba(121,40,202,0.28)] space-y-2.5">
            {/* Ambient blur glow */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/20 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center">
                <Crown className="w-3 h-3 text-amber-300 fill-amber-300" />
              </div>
              <h4 className="font-extrabold text-xs tracking-tight">Upgrade to Pro</h4>
            </div>

            <p className="text-[10px] text-white/90 leading-relaxed font-medium">
              Unlock advanced analytics, AI tools & unlimited scheduling.
            </p>

            <Link
              href="/settings?tab=billing"
              className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-[#7928CA] font-extrabold text-xs transition-all shadow flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <span>Upgrade Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Bottom User Profile (Avatar, Name, Role, Dropdown) */}
      <div className="p-3 border-t border-[#EEF1F6]">
        <Link
          href="/settings"
          className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F6F8FD] transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="Ava Morgan"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-pink-100 shrink-0"
            />
            <div className="min-w-0">
              <div className="font-extrabold text-slate-900 text-xs truncate">
                Ava Morgan
              </div>
              <div className="text-[10px] text-slate-400 font-medium truncate">
                Creator
              </div>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </Link>
      </div>
    </aside>
  );
}
