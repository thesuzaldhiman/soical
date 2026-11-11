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
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Filter,
  Check,
  X,
  Radio,
  SlidersHorizontal,
  Download,
  AlertCircle,
  Eye,
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [selectedPageForModal, setSelectedPageForModal] = useState<SocialPage | null>(null);

  // Filtered pages based on platform, status, and search query
  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      const matchesPlatform = platformFilter === 'all' || page.platform === platformFilter;
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
  const totalAudience = pages.reduce((acc, p) => acc + (p.fanCount || 0), 0);

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
      p.fanCount,
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
    <div className="space-y-7 font-sans animate-fade-in pb-12">
      {/* 1. Header (Tasklify Clean Neutral Studio) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Pages & Channels
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Manage individual Facebook Pages, Instagram business profiles, YouTube channels, and Telegram targets.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-slate-700 text-xs font-bold transition-all shadow-2xs"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <Link
            href="/accounts"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
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

      {/* 3. Search & Platform Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Platform Filter Buttons with User's Monochrome Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
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

          {/* Right: Search & Status Filter */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Status Filter */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-xs font-bold text-slate-600 shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs border border-[#E2E8F0]'
                    : 'hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === 'active'
                    ? 'bg-white text-emerald-700 shadow-2xs border border-[#E2E8F0]'
                    : 'hover:text-slate-900'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('disabled')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === 'disabled'
                    ? 'bg-white text-slate-700 shadow-2xs border border-[#E2E8F0]'
                    : 'hover:text-slate-900'
                }`}
              >
                Disabled
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#E2E8F0] text-xs text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-400 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Bulk Action Controls */}
        <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span>Showing <strong className="text-slate-900">{filteredPages.length}</strong> of {pages.length} destinations</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleActivateAll}
              className="text-xs font-bold text-slate-700 hover:text-black transition-colors"
            >
              Activate All Filtered
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={handleDisableAll}
              className="text-xs font-bold text-slate-700 hover:text-black transition-colors"
            >
              Disable All Filtered
            </button>
          </div>
        </div>
      </div>

      {/* 4. Pages Table (Tasklify Clean Layout) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FA] text-slate-500 uppercase tracking-wider font-extrabold text-[10px] border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-5">Page / Destination Name</th>
                <th className="py-3 px-5">Platform</th>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-5">Audience / Followers</th>
                <th className="py-3 px-5">API Permissions</th>
                <th className="py-3 px-5 text-right">Status & Actions</th>
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
                        <SocialIcon platform={page.platform} className="w-4 h-4 rounded-xs shadow-2xs" />
                        <span>{page.platform}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-slate-600 font-medium">
                      <span className="px-2 py-0.5 rounded-md bg-[#F8F9FA] border border-[#E2E8F0] text-[10px] font-bold text-slate-700">
                        {page.category || 'General'}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 font-bold text-slate-900">
                      {page.fanCount.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1 flex-wrap max-w-xs">
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

      {/* 5. Detailed Destination Inspect Modal */}
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
                  {selectedPageForModal.fanCount.toLocaleString()} Fans
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Content Category</span>
                <span className="font-bold text-slate-900">
                  {selectedPageForModal.category || 'General News'}
                </span>
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Granted OAuth Scopes
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(selectedPageForModal.permissions || ['pages_manage_posts', 'pages_read_engagement']).map((p, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded-lg bg-[#F8F9FA] text-slate-700 font-mono text-[10px] border border-[#E2E8F0]"
                  >
                    ✓ {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
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
      )}
    </div>
  );
}
