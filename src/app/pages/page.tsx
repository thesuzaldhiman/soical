'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { SocialPage, Platform } from '@/types';
import {
  Layers,
  Search,
  Users2,
  Trash2,
  Plus,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  X,
  Radio,
  Download,
  Eye,
  Lock,
  ExternalLink,
  BarChart3,
  BookmarkCheck,
  PenTool,
} from 'lucide-react';

export default function PagesManagementPage() {
  return (
    <AppShell>
      <PagesContent />
    </AppShell>
  );
}

const DEFAULT_SCOPES = [
  { key: 'pages_manage_posts', label: 'Manage & Publish Posts', desc: 'Allows publishing, scheduling, and updating posts and videos' },
  { key: 'pages_read_engagement', label: 'Read Engagement Metrics', desc: 'Allows reading follower counts, reactions, and interaction stats' },
  { key: 'pages_read_user_content', label: 'Read User Content', desc: 'Allows inspecting published media assets and captions' },
  { key: 'pages_manage_engagement', label: 'Manage Comment Replies', desc: 'Enables auto-commenting and managing interaction responses' },
  { key: 'pages_manage_metadata', label: 'Webhook & Subscriptions', desc: 'Permits subscribing to real-time feed update webhooks' },
  { key: 'read_insights', label: 'Audience & Page Insights', desc: 'Enables deep performance, reach, and demographic reporting' },
  { key: 'pages_show_list', label: 'Enumerate Pages List', desc: 'Permits listing verified business pages linked to the account' },
];

function isPageForPlatform(p: SocialPage, targetPlat: string): boolean {
  if (targetPlat === 'all') return true;
  const plat = targetPlat.toLowerCase();
  const pagePlat = (p.platform || '').toLowerCase();
  if (pagePlat === plat) return true;
  if (plat === 'facebook' && (pagePlat.includes('fb') || p.id?.includes('fb') || p.targetUrl?.includes('facebook') || (p.category || '').toLowerCase().includes('facebook') || p.fanCount !== undefined)) return true;
  if (plat === 'youtube' && (pagePlat.includes('yt') || p.id?.includes('yt') || p.targetUrl?.includes('youtube'))) return true;
  if (plat === 'telegram' && (pagePlat.includes('tg') || p.id?.includes('tg') || p.targetUrl?.includes('t.me') || p.botToken || p.chatId)) return true;
  if (plat === 'wordpress' && (pagePlat.includes('wp') || p.id?.includes('wp') || p.siteUrl)) return true;
  if (plat === 'instagram' && (pagePlat.includes('ig') || p.id?.includes('ig') || p.targetUrl?.includes('instagram'))) return true;
  return false;
}

function PagesContent() {
  const { pages, togglePageActive, disconnectPage } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [selectedPageForModal, setSelectedPageForModal] = useState<SocialPage | null>(null);
  const [selectedPermissionsPage, setSelectedPermissionsPage] = useState<SocialPage | null>(null);

  // Filtered pages based on platform, status, and search query
  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      const matchesPlatform = isPageForPlatform(page, platformFilter);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && page.isActive) ||
        (statusFilter === 'disabled' && !page.isActive);
      const matchesSearch =
        page.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.pageId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (page.category || '').toLowerCase().includes(searchQuery.toLowerCase());

      return matchesPlatform && matchesStatus && matchesSearch;
    });
  }, [pages, platformFilter, statusFilter, searchQuery]);

  // Statistics
  const totalPages = pages.length;
  const activePages = pages.filter((p) => p.isActive).length;
  const disabledPages = pages.filter((p) => !p.isActive).length;
  const totalAudience = pages.reduce((acc, p) => acc + (p.followersCount ?? p.fanCount ?? 0), 0);

  // Bulk actions
  const handleActivateAll = () => {
    filteredPages.forEach((p) => {
      if (!p.isActive) togglePageActive(p.id);
    });
  };

  const handleDisableAll = () => {
    filteredPages.forEach((p) => {
      if (p.isActive) togglePageActive(p.id);
    });
  };

  const handleExportCSV = () => {
    const headers = ['Page Name', 'Platform', 'Page ID', 'Audience', 'Category', 'Status'];
    const rows = filteredPages.map((p) => [
      `"${p.name}"`,
      p.platform,
      p.pageId,
      p.followersCount ?? p.fanCount ?? 0,
      `"${p.category || 'General'}"`,
      p.isActive ? 'Active' : 'Disabled',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pages_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 font-sans animate-fade-in pb-10">
      {/* 1. Header (Compact Modern Studio) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
            Pages & Channels
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">
            Manage Facebook Pages, Instagram profiles, YouTube channels, and Telegram targets.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <Link
            href="/accounts"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Connect Platform</span>
          </Link>
        </div>
      </div>

      {/* 2. Top 4 Tasklify Studio KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4 stroke-[2.2]" />
            </div>
            <Link
              href="/accounts"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-0.5 transition-colors"
            >
              <span>Manage</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totalPages}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Total Broadcasting Destinations
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {activePages}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Active Publishing Channels
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Radio className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-[#E2E8F0]">
              Muted
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {disabledPages}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Disabled / Paused Pages
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Users2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Audience
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {(totalAudience / 1000000).toFixed(1)}M
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Total Combined Reach
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Platform Filter Bar (Re-architected with Clean Hierarchy & Spacing) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Tier 1: Platform Filter Badges (Full width, no horizontal crowding, ample space) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'facebook', 'instagram', 'youtube', 'threads', 'telegram', 'wordpress'] as const).map((plat) => {
              const count =
                plat === 'all' ? pages.length : pages.filter((p) => isPageForPlatform(p, plat)).length;

              return (
                <button
                  key={plat}
                  type="button"
                  onClick={() => setPlatformFilter(plat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all shrink-0 flex items-center gap-2 ${
                    platformFilter === plat
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-[#F8F9FA] border border-transparent hover:border-[#E2E8F0]'
                  }`}
                >
                  {plat !== 'all' && (
                    <SocialIcon platform={plat} className="w-3.5 h-3.5 rounded-xs" />
                  )}
                  <span>{plat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      platformFilter === plat
                        ? 'bg-white/20 text-white font-bold'
                        : 'bg-[#F8F9FA] text-slate-600 border border-[#E2E8F0]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-xs font-semibold text-slate-500 self-end sm:self-center">
            Showing <strong className="text-slate-900">{filteredPages.length}</strong> of {pages.length} destinations
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#E2E8F0]" />

        {/* Tier 2: Search Input + Repositioned Status Filter + Bulk Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Left: Search input + Status Filter cleanly grouped */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by page name, category, ID..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-400 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>

            {/* Repositioned Status Filter: Dedicated segmented button with distinct styling */}
            <div className="inline-flex items-center p-1 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-xs font-bold text-slate-600 shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('disabled')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === 'disabled'
                    ? 'bg-slate-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Disabled
              </button>
            </div>
          </div>

          {/* Right: Bulk Action Controls */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            <button
              type="button"
              onClick={handleActivateAll}
              className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Activate All</span>
            </button>
            <button
              type="button"
              onClick={handleDisableAll}
              className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
              <span>Disable All</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Pages Table (Tasklify Clean Layout with Show Permissions Trigger) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FA] text-slate-500 uppercase tracking-wider font-extrabold text-[10px] border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3.5 px-5">Page / Destination Name</th>
                <th className="py-3.5 px-5">Platform</th>
                <th className="py-3.5 px-5">Category</th>
                <th className="py-3.5 px-5">Audience / Followers</th>
                <th className="py-3.5 px-5">Tools &amp; Permissions</th>
                <th className="py-3.5 px-5 text-right">Status &amp; Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No destinations match your filters</p>
                    <p className="text-[11px] mt-0.5">Try adjusting your search query or platform filter.</p>
                  </td>
                </tr>
              ) : (
                filteredPages.map((page) => (
                  <tr
                    key={page.id}
                    onClick={() => setSelectedPageForModal(page)}
                    className="hover:bg-[#F8F9FA] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        {/* Profile Image with Fallback */}
                        {page.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={page.avatarUrl}
                            alt={page.name}
                            className="w-9 h-9 rounded-xl object-cover border border-[#E2E8F0] shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {page.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate max-w-[200px]">
                            {page.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: {page.pageId}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-5">
                      <span className="capitalize font-semibold text-slate-800 flex items-center gap-2">
                        <SocialIcon platform={page.platform || (page.id?.includes('fb') ? 'facebook' : 'facebook')} className="w-4 h-4 rounded-xs shadow-2xs" />
                        <span>{page.platform || (page.id?.includes('fb') ? 'facebook' : 'facebook')}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-slate-600 font-medium">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#F8F9FA] border border-[#E2E8F0] text-[10px] font-bold text-slate-700">
                        {page.category || 'General'}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 font-bold text-slate-900">
                      {(page.followersCount ?? page.fanCount ?? 0).toLocaleString()}
                    </td>

                    {/* Tools, Post Library & Permissions */}
                    <td className="py-3.5 px-5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {/* New Post for this Page */}
                        <Link
                          href={`/composer?pageId=${page.id}`}
                          className="inline-flex items-center justify-center p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all shadow-2xs cursor-pointer"
                          title={`Create new post for ${page.name}`}
                          aria-label="Create Post"
                        >
                          <PenTool className="w-3.5 h-3.5 text-blue-600" />
                        </Link>

                        {/* View Post Library for this Page */}
                        <Link
                          href={`/library?search=${encodeURIComponent(page.name)}`}
                          className="inline-flex items-center justify-center p-2 rounded-xl bg-[#F8F9FA] hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-[#E2E8F0] hover:border-blue-200 transition-all shadow-2xs cursor-pointer"
                          title={`View Post Library history for ${page.name}`}
                          aria-label="View Post Library"
                        >
                          <BookmarkCheck className="w-3.5 h-3.5 text-slate-600" />
                        </Link>

                        <Link
                          href={`/analytics?pageId=${page.id}`}
                          className="inline-flex items-center justify-center p-2 rounded-xl bg-[#F8F9FA] hover:bg-pink-50 text-slate-600 hover:text-[#FF007A] border border-[#E2E8F0] hover:border-pink-200 transition-all group/ana shadow-2xs cursor-pointer"
                          title={`Open Deep-Dive Analytics for ${page.name}`}
                          aria-label="View Page Analytics"
                        >
                          <BarChart3 className="w-4 h-4 text-slate-600 group-hover/ana:text-[#FF007A] group-hover/ana:scale-110 transition-transform" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setSelectedPermissionsPage(page)}
                          className="inline-flex items-center justify-center p-2 rounded-xl bg-[#F8F9FA] hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-[#E2E8F0] transition-all group/perm shadow-2xs cursor-pointer"
                          title={`View granted Graph API scopes (${(page.permissions || DEFAULT_SCOPES.map((s) => s.key)).length})`}
                          aria-label="View API Permissions"
                        >
                          <Eye className="w-4 h-4 text-slate-600 group-hover/perm:text-slate-900 group-hover/perm:scale-110 transition-transform" />
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
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
                          title="Disconnect destination"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Dedicated API Permissions Inspector Modal */}
      {selectedPermissionsPage && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedPermissionsPage(null)}
        >
          <div
            className="bg-white rounded-3xl border border-[#E2E8F0] max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <SocialIcon platform={selectedPermissionsPage.platform} className="w-10 h-10 rounded-xl shadow-xs" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    API Permissions & Scopes
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {selectedPermissionsPage.name} • <span className="font-mono text-[11px] text-slate-400">ID: {selectedPermissionsPage.pageId}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPermissionsPage(null)}
                className="w-8 h-8 rounded-xl bg-[#F8F9FA] text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Token Status Badge */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-emerald-950">OAuth 2.0 Token Active & Verified</div>
                  <div className="text-[11px] text-emerald-700">Permanent Page Access Token with full broadcasting clearance</div>
                </div>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                Valid
              </span>
            </div>

            {/* Granted Scopes List */}
            <div className="space-y-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Granted Capabilities ({(selectedPermissionsPage.permissions || DEFAULT_SCOPES.map((s) => s.key)).length})
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(selectedPermissionsPage.permissions || DEFAULT_SCOPES.map((s) => s.key)).map((permKey) => {
                  const scopeMeta = DEFAULT_SCOPES.find((s) => s.key === permKey);
                  return (
                    <div
                      key={permKey}
                      className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] flex items-start gap-2.5"
                    >
                      <div className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        ✓
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            {scopeMeta?.label || permKey}
                          </span>
                          <code className="text-[10px] text-slate-500 bg-white px-1.5 py-0.2 rounded border border-[#E2E8F0] font-mono shrink-0">
                            {permKey}
                          </code>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {scopeMeta?.desc || 'Authorized during social account connection handshake.'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedPermissionsPage(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Destination Details Inspect Modal */}
      {selectedPageForModal && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedPageForModal(null)}
        >
          <div
            className="bg-white rounded-3xl border border-[#E2E8F0] max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <SocialIcon platform={selectedPageForModal.platform} className="w-10 h-10 rounded-xl shadow-xs" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    {selectedPageForModal.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Platform: <span className="capitalize font-bold text-slate-700">{selectedPageForModal.platform}</span> • ID: {selectedPageForModal.pageId}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPageForModal(null)}
                className="w-8 h-8 rounded-xl bg-[#F8F9FA] text-slate-500 hover:text-slate-900 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile & Audience Stats */}
            <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Broadcast Status</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    selectedPageForModal.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {selectedPageForModal.isActive ? 'Active for Auto-Posting' : 'Disabled / Paused'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Audience / Followers</span>
                <span className="font-bold text-slate-900">
                  {(selectedPageForModal.followersCount ?? selectedPageForModal.fanCount ?? 0).toLocaleString()}{' '}
                  {selectedPageForModal.platform === 'youtube'
                    ? 'Subscribers'
                    : selectedPageForModal.platform === 'telegram'
                    ? 'Members'
                    : selectedPageForModal.platform === 'wordpress'
                    ? 'Monthly Readers'
                    : 'Followers'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Content Category</span>
                <span className="font-bold text-slate-900">
                  {selectedPageForModal.category || 'General News'}
                </span>
              </div>
            </div>

            {/* Permissions Summary with Open Inspector action */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  API Permissions
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const page = selectedPageForModal;
                    setSelectedPageForModal(null);
                    setSelectedPermissionsPage(page);
                  }}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Full Scopes</span>
                </button>
              </div>
              <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-xs text-slate-600 flex items-center justify-between">
                <span>{(selectedPageForModal.permissions || DEFAULT_SCOPES.map((s) => s.key)).length} verified OAuth permissions granted</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2 flex-wrap">
              <Link
                href={`/analytics?pageId=${selectedPageForModal.id}`}
                className="px-3.5 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 text-[#FF007A] border border-pink-200 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Open Deep Analytics</span>
              </Link>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    togglePageActive(selectedPageForModal.id);
                    setSelectedPageForModal(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedPageForModal.isActive
                      ? 'border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  }`}
                >
                  {selectedPageForModal.isActive ? 'Pause / Disable' : 'Activate Channel'}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPageForModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
