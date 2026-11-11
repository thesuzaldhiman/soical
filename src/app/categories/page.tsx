'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { PageCategory, SocialPage } from '@/types';
import { SocialIcon } from '@/components/ui/SocialIcon';
import {
  Tags,
  Plus,
  Trash2,
  Edit2,
  Hash,
  CheckCircle2,
  Layers,
  Search,
  ChevronRight,
  Copy,
  Check,
  X,
  Download,
  ArrowRight,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

const COLOR_PRESETS = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#475569', // Slate
];

export default function CategoriesPage() {
  return (
    <AppShell>
      <CategoriesContent />
    </AppShell>
  );
}

function CategoriesContent() {
  const { categories, pages, createCategory, updateCategory, deleteCategory } = useApp();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PageCategory | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [channelSearch, setChannelSearch] = useState('');

  // Statistics
  const totalCategories = categories.length;
  const mappedPageIds = useMemo(() => {
    const ids = new Set<string>();
    categories.forEach((c) => c.pageIds.forEach((pid) => ids.add(pid)));
    return ids;
  }, [categories]);

  const totalMappedChannels = mappedPageIds.size;
  const totalHashtags = useMemo(() => {
    const tags = new Set<string>();
    categories.forEach((c) => c.tags.forEach((t) => tags.add(t)));
    return tags.size;
  }, [categories]);

  const coveragePercent = pages.length > 0 ? Math.round((totalMappedChannels / pages.length) * 100) : 0;

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPlatform =
        platformFilter === 'all' ||
        cat.pageIds.some((pid) => {
          const pg = pages.find((p) => p.id === pid);
          return pg?.platform === platformFilter;
        });

      return matchesSearch && matchesPlatform;
    });
  }, [categories, searchQuery, platformFilter, pages]);

  // Modal Handlers
  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setColor('#3B82F6');
    setTagsInput('');
    setSelectedPages([]);
    setChannelSearch('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (cat: PageCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setColor(cat.color);
    setTagsInput(cat.tags.join(' '));
    setSelectedPages([...cat.pageIds]);
    setChannelSearch('');
    setModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tagsArray = tagsInput
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));

    if (editingCategory) {
      updateCategory({
        ...editingCategory,
        name: name.trim(),
        color,
        pageIds: selectedPages,
        tags: tagsArray,
      });
    } else {
      createCategory(name.trim(), color, selectedPages, tagsArray);
    }

    setModalOpen(false);
  };

  const togglePageInModal = (pid: string) => {
    setSelectedPages((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  const handleSelectAllPages = () => {
    setSelectedPages(pages.map((p) => p.id));
  };

  const handleClearPages = () => {
    setSelectedPages([]);
  };

  const handleCopyTags = (catId: string, tags: string[]) => {
    navigator.clipboard.writeText(tags.join(' '));
    setCopiedId(catId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    const headers = ['Category Name', 'Accent Color', 'Mapped Channels Count', 'Default Hashtags'];
    const rows = categories.map((c) => [
      `"${c.name}"`,
      c.color,
      c.pageIds.length,
      `"${c.tags.join(' ')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `categories_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered pages in modal
  const modalFilteredPages = useMemo(() => {
    return pages.filter((p) =>
      p.name.toLowerCase().includes(channelSearch.toLowerCase()) ||
      p.platform.toLowerCase().includes(channelSearch.toLowerCase())
    );
  }, [pages, channelSearch]);

  return (
    <div className="space-y-5 font-sans animate-fade-in pb-10">
      {/* 1. Header (Compact Modern Studio) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
            Page Groups & Category Tags
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">
            Organize broadcasting destinations by editorial topics and associate default hashtag pools.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Export categories data"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Data</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Tasklify Studio KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Tags className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-[#E2E8F0]">
              Groups
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totalCategories}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Active Category Groups
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4 stroke-[2.2]" />
            </div>
            <Link
              href="/pages"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-0.5 transition-colors"
            >
              <span>View Pages</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totalMappedChannels}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Mapped Broadcasting Targets
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Hash className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Composer
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totalHashtags}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Ready Hashtag Pool
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Coverage
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {coveragePercent}%
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Destinations Categorized
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Platform Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Tier 1: Platform Filter Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'facebook', 'instagram', 'youtube', 'threads', 'telegram'] as const).map((plat) => {
              const count =
                plat === 'all'
                  ? categories.length
                  : categories.filter((c) =>
                      c.pageIds.some((pid) => pages.find((p) => p.id === pid)?.platform === plat)
                    ).length;

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
            Showing <strong className="text-slate-900">{filteredCategories.length}</strong> of {categories.length} groups
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#E2E8F0]" />

        {/* Tier 2: Search Input */}
        <div className="relative w-full sm:w-96">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search category by name or hashtag..."
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
      </div>

      {/* 4. Categories Grid (Tasklify Clean Neutral Studio Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {filteredCategories.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center shadow-2xs">
            <Tags className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No categories match your search</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your filters or create a new group.</p>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const mappedPagesList = cat.pageIds
              .map((pid) => pages.find((p) => p.id === pid))
              .filter((p): p is SocialPage => Boolean(p));

            return (
              <div
                key={cat.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  {/* Card Header: Color Tag + Name + Action Buttons */}
                  <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shadow-2xs shrink-0 ring-2 ring-white"
                        style={{ backgroundColor: cat.color }}
                      />
                      <h3 className="font-bold text-slate-900 text-sm truncate" title={cat.name}>
                        {cat.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-[#F8F9FA] transition-colors"
                        title="Edit Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCategory(cat.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Section 1: Mapped Channels with Studio Logos */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Mapped Channels ({mappedPagesList.length})</span>
                      <Link
                        href="/pages"
                        className="text-slate-400 hover:text-slate-700 normal-case font-semibold text-[10px] flex items-center gap-0.5"
                      >
                        <span>Pages</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                      </Link>
                    </div>

                    {mappedPagesList.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic py-1">
                        No destinations mapped yet.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {mappedPagesList.slice(0, 4).map((pg) => (
                          <span
                            key={pg.id}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#F8F9FA] border border-[#E2E8F0] text-[11px] font-semibold text-slate-700 shadow-2xs"
                            title={pg.name}
                          >
                            <SocialIcon platform={pg.platform} className="w-3.5 h-3.5 rounded-xs" />
                            <span className="truncate max-w-[120px]">{pg.name}</span>
                          </span>
                        ))}
                        {mappedPagesList.length > 4 && (
                          <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold">
                            +{mappedPagesList.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section 2: Default Hashtag Pool with Quick Copy */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3 text-slate-400" />
                        <span>Default Hashtags ({cat.tags.length})</span>
                      </span>
                      {cat.tags.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleCopyTags(cat.id, cat.tags)}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
                          title="Copy all hashtags"
                        >
                          {copiedId === cat.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy All</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {cat.tags.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic py-1">
                        No default hashtags attached.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {cat.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-[#F8F9FA] text-slate-700 border border-[#E2E8F0] text-[10px] font-semibold font-mono"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Composer Shortcut */}
                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Auto-append in Composer
                  </span>
                  <Link
                    href="/composer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-black group/link"
                  >
                    <span>Use in Post</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover/link:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Create / Edit Category Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl border border-[#E2E8F0] max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-bold text-slate-900 text-base leading-tight">
                  {editingCategory ? 'Edit Page Category' : 'Create New Category'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Group social pages and specify automatic hashtag templates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-[#F8F9FA] text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              {/* Category Name */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Breaking News & Weather Alerts"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-400 transition-all font-medium"
                />
              </div>

              {/* Accent Color Palette */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Badge Accent Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        color === c ? 'scale-125 ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-[#E2E8F0]">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-[11px] font-mono font-medium text-slate-500">{color}</span>
                  </div>
                </div>
              </div>

              {/* Default Hashtags */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Default Hashtag Pool (Space or comma separated)
                </label>
                <textarea
                  rows={2}
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="#HimachalNews #Shimla #BreakingNews"
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] text-xs text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-400 transition-all font-medium placeholder:text-slate-400"
                />
              </div>

              {/* Channel Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Select Channels ({selectedPages.length} selected)
                  </label>
                  <div className="flex items-center gap-2 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={handleSelectAllPages}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleClearPages}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Channel search within modal */}
                <div className="relative mb-2">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={channelSearch}
                    onChange={(e) => setChannelSearch(e.target.value)}
                    placeholder="Filter channels..."
                    className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[11px] text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1 max-h-40 overflow-y-auto pr-1 border border-[#E2E8F0] rounded-xl p-2 bg-[#F8F9FA]">
                  {modalFilteredPages.length === 0 ? (
                    <div className="text-xs text-slate-400 p-2 text-center">No channels found</div>
                  ) : (
                    modalFilteredPages.map((p) => {
                      const isChecked = selectedPages.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => togglePageInModal(p.id)}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                            isChecked ? 'bg-white shadow-2xs border border-[#E2E8F0]' : 'hover:bg-white/60'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 text-slate-900 rounded accent-slate-900"
                            />
                            <SocialIcon platform={p.platform} className="w-3.5 h-3.5 rounded-xs shrink-0" />
                            <span className="font-semibold text-slate-800 truncate">{p.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {p.fanCount.toLocaleString()} fans
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-[#F8F9FA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-colors"
                >
                  {editingCategory ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
