'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { SocialIcon } from '@/components/ui/SocialIcon';
import {
  Layers,
  Search,
  Users2,
  Trash2,
  Plus,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Filter,
} from 'lucide-react';

export default function PagesManagementPage() {
  return (
    <AppShell>
      <PagesContent />
    </AppShell>
  );
}

function PagesContent() {
  const { pages, togglePageActive, disconnectPage } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  const filteredPages = pages.filter((page) => {
    const matchesPlatform = platformFilter === 'all' || page.platform === platformFilter;
    const matchesSearch =
      page.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.pageId.includes(searchQuery);
    return matchesPlatform && matchesSearch;
  });

  return (
    <div className="space-y-7 font-sans animate-fade-in pb-10">
      {/* 1. Header (Tasklify Clean Neutral Studio) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Pages & Channels
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Manage individual Facebook Pages, Instagram profiles, YouTube channels, and Telegram target destinations.
          </p>
        </div>

        <Link
          href="/accounts"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Connect New Platform</span>
        </Link>
      </div>

      {/* 2. Search & Platform Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Platform Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'facebook', 'instagram', 'youtube', 'threads', 'telegram'] as const).map((plat) => {
            const count =
              plat === 'all' ? pages.length : pages.filter((p) => p.platform === plat).length;

            return (
              <button
                key={plat}
                type="button"
                onClick={() => setPlatformFilter(plat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all shrink-0 flex items-center gap-2 ${
                  platformFilter === plat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#F8F9FA]'
                }`}
              >
                {plat !== 'all' && (
                  <SocialIcon platform={plat} className="w-3.5 h-3.5 rounded-xs" />
                )}
                <span>{plat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    platformFilter === plat
                      ? 'bg-white/20 text-white'
                      : 'bg-[#F8F9FA] text-slate-600 border border-[#E2E8F0]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pages by name or ID..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E2E8F0] text-xs text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-400 transition-all"
          />
        </div>
      </div>

      {/* 3. Pages Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FA] text-slate-500 uppercase tracking-wider font-extrabold text-[10px] border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-5">Page / Channel Name</th>
                <th className="py-3 px-5">Platform</th>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-5">Audience / Fans</th>
                <th className="py-3 px-5">Permissions</th>
                <th className="py-3 px-5 text-right">Status & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredPages.map((page) => (
                <tr key={page.id} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={page.avatarUrl}
                        alt={page.name}
                        className="w-9 h-9 rounded-xl object-cover border border-[#E2E8F0] shrink-0"
                      />
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{page.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {page.pageId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="capitalize font-semibold text-slate-800 flex items-center gap-2">
                      <SocialIcon platform={page.platform} className="w-4 h-4 rounded-xs shadow-2xs" />
                      <span>{page.platform}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-600 font-medium">
                    {page.category || 'General News'}
                  </td>
                  <td className="py-3.5 px-5 font-bold text-slate-900">
                    {page.fanCount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-1 flex-wrap">
                      {(page.permissions || ['pages_manage_posts', 'pages_read_engagement']).map((p, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded bg-[#F8F9FA] text-slate-600 font-mono text-[9px] border border-[#E2E8F0]"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => togglePageActive(page.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          page.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 hover:text-slate-700'
                        }`}
                      >
                        {page.isActive ? 'Active' : 'Disabled'}
                      </button>
                      <button
                        type="button"
                        onClick={() => disconnectPage(page.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Disconnect page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
