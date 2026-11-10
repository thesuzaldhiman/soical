'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PenSquare,
  Palette,
  Layers,
  Users2,
  Tags,
  Cpu,
  BarChart3,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useApp } from '@/lib/context/app-context';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/composer', label: 'Create Post', icon: PenSquare, badge: 'New' },
  { href: '/image-generator', label: 'Image Generator (SIG)', icon: Palette, highlight: true },
  { href: '/library', label: 'Post Library & Queue', icon: Layers },
  { href: '/accounts', label: 'Accounts & Pages', icon: Users2 },
  { href: '/categories', label: 'Categories & Tags', icon: Tags },
  { href: '/automations', label: 'Automations (WP/Blogger)', icon: Cpu },
  { href: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings & API Keys', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { workspace } = useApp();

  const usagePercent = Math.min(
    100,
    Math.round((workspace.monthlyPostsUsed / workspace.monthlyPostsLimit) * 100)
  );

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Zap className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 tracking-tight text-base">Social Poster</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Multi-Platform Suite</p>
          </div>
        </Link>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Core Workflows
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.highlight && !isActive && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">
                  <Sparkles className="w-2.5 h-2.5" />
                  Hindi
                </span>
              )}
              {item.badge && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Workspace Usage Widget */}
      <div className="p-3 border-t border-slate-100 m-2 rounded-xl bg-slate-50 border">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
          <span>{workspace.name}</span>
          <span className="capitalize text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
            {workspace.plan} Plan
          </span>
        </div>
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1.5 font-medium">
          <span>Monthly Posts</span>
          <span>
            {workspace.monthlyPostsUsed} / {workspace.monthlyPostsLimit}
          </span>
        </div>
      </div>
    </aside>
  );
}
