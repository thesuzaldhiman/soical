'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Plus,
  Settings,
  Bell,
  Sparkles,
} from 'lucide-react';
import { useApp } from '@/lib/context/app-context';

export function AppHeader() {
  const pathname = usePathname();
  const { user, pages } = useApp();

  const getPageTitle = () => {
    if (pathname.includes('/composer')) return 'Composer';
    if (pathname.includes('/image-generator')) return 'Image Generator (SIG)';
    if (pathname.includes('/library')) return 'Post Library';
    if (pathname.includes('/accounts')) return 'Channels';
    if (pathname.includes('/categories')) return 'Categories';
    if (pathname.includes('/automations')) return 'Automations';
    if (pathname.includes('/analytics')) return 'Analytics';
    if (pathname.includes('/settings')) return 'Settings';
    return 'Overview';
  };

  return (
    <header className="h-16 border-b border-[#EBEBE8] bg-[#F8F8F6] px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 font-sans">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
        <span className="text-slate-500">Dashboard</span>
        <span>/</span>
        <span className="font-semibold text-slate-900">{getPageTitle()}</span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Avatars Stack (+4) */}
        <div className="hidden sm:flex items-center -space-x-2 mr-1">
          {pages.slice(0, 3).map((p, i) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={p.id}
              src={p.avatarUrl}
              alt={p.name}
              className="w-7 h-7 rounded-full border-2 border-[#F8F8F6] object-cover"
              title={p.name}
            />
          ))}
          <div className="w-7 h-7 rounded-full bg-[#EAEAE6] border-2 border-[#F8F8F6] text-[10px] font-bold text-slate-600 flex items-center justify-center">
            +{Math.max(1, pages.length - 3)}
          </div>
        </div>

        {/* Settings Button */}
        <Link
          href="/settings"
          className="w-9 h-9 rounded-xl bg-white border border-[#E8E8E4] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-[#FAF9F6] transition-colors shadow-2xs"
          title="Settings"
        >
          <Settings className="w-4 h-4 stroke-[1.8]" />
        </Link>

        {/* Notification Bell */}
        <button
          type="button"
          className="relative w-9 h-9 rounded-xl bg-white border border-[#E8E8E4] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-[#FAF9F6] transition-colors shadow-2xs"
          title="Notifications"
        >
          <Bell className="w-4 h-4 stroke-[1.8]" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500" />
        </button>

        {/* + Create Post Black Pill Button */}
        <Link
          href="/composer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Create Post</span>
        </Link>
      </div>
    </header>
  );
}
