'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { Platform, Post, PostStatus } from '@/types';
import {
  Users2,
  Clock,
  CheckCircle2,
  Share2,
  Plus,
  ChevronRight,
  ChevronDown,
  Calendar,
  Play,
  RotateCw,
  MoreHorizontal,
  ExternalLink,
  Layers,
  Trash2,
  Repeat,
  Columns3,
  AlignLeft,
  LayoutGrid,
  Filter,
  ArrowUpDown,
  Zap,
  Search,
  Sparkles,
  Link as LinkIcon,
  MessageSquare,
  AlertCircle,
  FolderPlus,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const { user, workspace, accounts, pages, posts, retryPost, deletePost } = useApp();

  // Active view switcher tab: 'kanban' | 'grid' | 'timeline' | 'calendar'
  const [activeTab, setActiveTab] = useState<'kanban' | 'timeline' | 'grid' | 'calendar'>('kanban');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'scheduled' | 'failed'>('all');
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Live dynamic statistics
  const totalAccounts = accounts.length;
  const totalPages = pages.length;
  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;
  const failedCount = posts.filter((p) => p.status === 'failed').length;

  const supportedPlatforms: {
    id: Platform;
    name: string;
    icon: string;
    description: string;
  }[] = [
    { id: 'facebook', name: 'Facebook', icon: '📘', description: 'Pages & Content Publishing' },
    { id: 'instagram', name: 'Instagram', icon: '📸', description: 'Business & Creator Accounts' },
    { id: 'youtube', name: 'YouTube', icon: '▶️', description: 'Shorts & Video Channels' },
    { id: 'threads', name: 'Threads', icon: '🧵', description: 'Meta Threads Profiles' },
    { id: 'telegram', name: 'Telegram', icon: '✈️', description: 'Channels & Bot Broadcasts' },
  ];

  const platformIcons: Record<string, string> = {
    facebook: '📘',
    instagram: '📸',
    threads: '🧵',
    telegram: '✈️',
    youtube: '▶️',
  };

  // Filtered posts
  const filteredPosts = posts.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return p.message.toLowerCase().includes(q) || p.postType.toLowerCase().includes(q);
    }
    return true;
  });

  // Kanban status groups
  const scheduledPosts = posts.filter((p) => p.status === 'scheduled' || p.status === 'draft');
  const pendingPosts = posts.filter((p) => p.status === 'publishing');
  const publishedPosts = posts.filter((p) => p.status === 'published');
  const reviewPosts = posts.filter((p) => p.status === 'failed' || p.status === 'partial');

  return (
    <div className="space-y-7 animate-fade-in font-sans">
      {/* 1. Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome Back {user.name.split(' ')[0]}..!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Stay on top of your social posts, monitor progress, and track status.
          </p>
        </div>

        <Link
          href="/composer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Post</span>
        </Link>
      </div>

      {/* 2. AI Feature Announcement Banner (Matching Screenshot) */}
      <div className="bg-white rounded-2xl border border-[#E8E8E4] p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Gradient Square Icon */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-violet-600 flex items-center justify-center text-white shadow-2xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-semibold text-slate-800">
              <strong className="font-bold text-slate-900">Social Auto Poster AI</strong> is now available.
              Access your multi-channel activity and timeline right away on all new dashboard.
            </div>
          </div>
        </div>

        <Link
          href="/automations"
          className="px-4 py-1.5 rounded-xl bg-white border border-[#E0E0DC] hover:bg-[#FAF9F6] text-xs font-bold text-slate-800 transition-colors shrink-0 text-center shadow-2xs"
        >
          View Details
        </Link>
      </div>

      {/* 3. Overview Statistics (4 Metric Cards matching screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Connected Accounts */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4 stroke-[2]" />
            </div>
            <Link
              href="/accounts"
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-800 flex items-center gap-0.5 transition-colors"
            >
              <span>View Details</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totalAccounts}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Active Connected Accounts
            </div>
          </div>
        </div>

        {/* Card 2: Connected Pages */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 stroke-[2]" />
            </div>
            <Link
              href="/pages"
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-800 flex items-center gap-0.5 transition-colors"
            >
              <span>View Details</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totalPages}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Active Pages & Channels
            </div>
          </div>
        </div>

        {/* Card 3: Published Posts */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 stroke-[2]" />
            </div>
            <Link
              href="/library"
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-800 flex items-center gap-0.5 transition-colors"
            >
              <span>View Details</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {publishedCount}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Published Posts
            </div>
          </div>
        </div>

        {/* Card 4: Scheduled / Success Rate */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 stroke-[2]" />
            </div>
            <Link
              href="/library?status=scheduled"
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-800 flex items-center gap-0.5 transition-colors"
            >
              <span>View Details</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {posts.length > 0 ? `${Math.round((publishedCount / posts.length) * 100)}%` : '100%'}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Target Delivery Percentage
            </div>
          </div>
        </div>
      </div>

      {/* 4. Toolbar with View Switcher & Action Icons (Exact Match to Screenshot) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
        {/* Left Segmented Tab Switcher */}
        <div className="inline-flex items-center p-1 rounded-xl bg-[#EDEDE8] border border-[#E2E2DC] shadow-2xs self-start">
          <button
            type="button"
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'kanban'
                ? 'bg-white text-slate-950 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span>Kanban</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'timeline'
                ? 'bg-white text-slate-950 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grid')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'grid'
                ? 'bg-white text-slate-950 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Media Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'calendar'
                ? 'bg-white text-slate-950 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendar</span>
          </button>
        </div>

        {/* Right Action Icons & New Dropdown */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {/* Filter icon button */}
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'all' ? 'scheduled' : 'all')}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors shadow-2xs ${
              filterStatus !== 'all'
                ? 'bg-slate-950 text-white border-slate-950'
                : 'bg-white border-[#E8E8E4] text-slate-600 hover:text-slate-900 hover:bg-[#FAF9F6]'
            }`}
            title="Filter"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>

          {/* Sort button */}
          <button
            type="button"
            className="w-8 h-8 rounded-xl bg-white border border-[#E8E8E4] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-[#FAF9F6] transition-colors shadow-2xs"
            title="Sort"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          {/* Quick Action Zap */}
          <Link
            href="/bulk-scheduler"
            className="w-8 h-8 rounded-xl bg-white border border-[#E8E8E4] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-[#FAF9F6] transition-colors shadow-2xs"
            title="Bulk Schedule"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
          </Link>

          {/* Search toggle / input */}
          <div className="relative">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search..."
              className="w-28 focus:w-44 transition-all px-2.5 py-1.5 pl-7 rounded-xl bg-white border border-[#E8E8E4] text-xs text-slate-800 placeholder-slate-400 focus:outline-none shadow-2xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
          </div>

          {/* More menu */}
          <Link
            href="/library"
            className="w-8 h-8 rounded-xl bg-white border border-[#E8E8E4] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-[#FAF9F6] transition-colors shadow-2xs"
            title="Post Library"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Link>

          {/* + New ▾ Dropdown Button */}
          <Link
            href="/composer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <span>New</span>
            <ChevronDown className="w-3 h-3 stroke-[2.5]" />
          </Link>
        </div>
      </div>

      {/* 5. Content View Section based on Active Tab */}

      {/* VIEW A: KANBAN BOARD (Exact structure from Screenshot) */}
      {activeTab === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {/* Column 1: Not Started / Scheduled */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-400 bg-transparent" />
                <span className="text-xs font-bold text-slate-800">Scheduled</span>
                <span className="text-[10px] font-bold text-slate-500 bg-[#EAEAE6] px-2 py-0.2 rounded-full">
                  {scheduledPosts.length}
                </span>
              </div>
              <MoreHorizontal className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
            </div>

            <div className="space-y-3">
              {scheduledPosts.map((post) => {
                const firstPage = pages.find((p) => post.pageIds.includes(p.id));
                return (
                  <div
                    key={post.id}
                    className="bg-white rounded-2xl border border-[#E8E8E4] p-4 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-400 flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" />
                        {post.id.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {firstPage?.name.split(' ')[0] || 'Scheduled'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                        {post.message}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">
                        {firstPage?.name || 'Multiple Destinations'}
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>
                        Due to:{' '}
                        {post.scheduledAt
                          ? new Date(post.scheduledAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Next Queue Slot'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#F2F2EE] flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center -space-x-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center">
                          {platformIcons[firstPage?.platform || 'facebook']}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{post.commentText ? '1' : '0'}</span>
                      </div>
                      <span>{post.postType}</span>
                    </div>
                  </div>
                );
              })}

              {/* + New Post Button */}
              <Link
                href="/composer"
                className="w-full py-2.5 rounded-xl border border-dashed border-[#DCDCD8] hover:border-slate-400 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 bg-[#FAF9F6] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Post</span>
              </Link>
            </div>
          </div>

          {/* Column 2: Pending / In-Queue (With Elevated Card Highlight as in Screenshot) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-slate-800">Pending</span>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.2 rounded-full border border-rose-200">
                  {Math.max(1, pendingPosts.length)}
                </span>
              </div>
              <MoreHorizontal className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
            </div>

            <div className="space-y-3">
              {/* Highlight Card Styled like the floating/dragged card in screenshot */}
              <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-lg ring-4 ring-slate-100 transform -rotate-1 space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-500 font-bold flex items-center gap-1">
                    <LinkIcon className="w-3 h-3 text-slate-400" />
                    QUE-DISPATCH
                  </span>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    Urgent
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs leading-snug">
                    Anti-Ban Delay Active (45s Interval)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Cross-posting to 4 Facebook & Telegram channels
                  </p>
                </div>

                <div className="text-[11px] text-slate-600 flex items-center gap-1.5 font-semibold">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Dispatching now...</span>
                </div>

                <div className="pt-2 border-t border-[#F2F2EE] flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center -space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                      FB
                    </div>
                    <div className="w-5 h-5 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center">
                      TG
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>Auto-Comment</span>
                  </div>
                </div>
              </div>

              {pendingPosts.map((post) => {
                const firstPage = pages.find((p) => post.pageIds.includes(p.id));
                return (
                  <div
                    key={post.id}
                    className="bg-white rounded-2xl border border-[#E8E8E4] p-4 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-400">{post.id.toUpperCase()}</span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        In Progress
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                      {post.message}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">{firstPage?.name}</p>
                  </div>
                );
              })}

              <Link
                href="/composer"
                className="w-full py-2.5 rounded-xl border border-dashed border-[#DCDCD8] hover:border-slate-400 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 bg-[#FAF9F6] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Post</span>
              </Link>
            </div>
          </div>

          {/* Column 3: Completed / Published */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-800">Completed</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                  {publishedPosts.length}
                </span>
              </div>
              <MoreHorizontal className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
            </div>

            <div className="space-y-3">
              {publishedPosts.map((post) => {
                const firstPage = pages.find((p) => post.pageIds.includes(p.id));
                return (
                  <div
                    key={post.id}
                    className="bg-white rounded-2xl border border-[#E8E8E4] p-4 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-400 flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" />
                        {post.id.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Live
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                        {post.message}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">
                        {firstPage?.name || 'Social Channels'}
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Published'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#F2F2EE] flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <span>{platformIcons[firstPage?.platform || 'facebook']}</span>
                        <span className="font-semibold text-slate-700 truncate max-w-[100px]">
                          {firstPage?.name}
                        </span>
                      </div>
                      <Link
                        href={`/composer?clone=${post.id}`}
                        className="text-slate-600 hover:text-slate-900 font-bold"
                      >
                        Reuse
                      </Link>
                    </div>
                  </div>
                );
              })}

              <Link
                href="/composer"
                className="w-full py-2.5 rounded-xl border border-dashed border-[#DCDCD8] hover:border-slate-400 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 bg-[#FAF9F6] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Post</span>
              </Link>
            </div>
          </div>

          {/* Column 4: Under Review / Failed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-xs font-bold text-slate-800">Under Review</span>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.2 rounded-full border border-purple-200">
                  {reviewPosts.length}
                </span>
              </div>
              <MoreHorizontal className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
            </div>

            <div className="space-y-3">
              {reviewPosts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E8E8E4] p-6 text-center shadow-2xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No Review Flags</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">All dispatches executing cleanly</p>
                </div>
              ) : (
                reviewPosts.map((post) => {
                  const firstPage = pages.find((p) => post.pageIds.includes(p.id));
                  return (
                    <div
                      key={post.id}
                      className="bg-white rounded-2xl border border-rose-200 p-4 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-slate-400 flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" />
                          {post.id.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          Attention
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                          {post.message}
                        </h4>
                        <p className="text-[11px] text-rose-500 mt-1 truncate">
                          {post.results.find((r) => r.status === 'failed')?.error || 'API rate limited or token expired'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#F2F2EE] flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => retryPost(post.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                        <Link
                          href="/logs"
                          className="text-slate-500 hover:text-slate-800 font-medium"
                        >
                          View Log
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}

              <Link
                href="/composer"
                className="w-full py-2.5 rounded-xl border border-dashed border-[#DCDCD8] hover:border-slate-400 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 bg-[#FAF9F6] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Post</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: MEDIA GRID (3-Column Grid requested in prompt) */}
      {activeTab === 'grid' && (
        <div className="space-y-4">
          {/* Header & Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Post Grid</h3>
              <p className="text-xs text-slate-500">
                Visual card grid of published, scheduled, and draft media updates.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center p-1 rounded-xl bg-white border border-[#E8E8E4] shadow-2xs">
                {(['all', 'published', 'scheduled', 'failed'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                      filterStatus === status
                        ? 'bg-slate-950 text-white font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <Link
                href="/library"
                className="text-xs font-bold text-slate-700 hover:text-black flex items-center gap-1"
              >
                <span>View Library</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 3-Column Responsive Grid */}
          {filteredPosts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8E8E4] p-12 text-center shadow-2xs">
              <Share2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No posts in this view</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No items match the selected filter ({filterStatus}).
              </p>
              <Link
                href="/composer"
                className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 rounded-xl bg-slate-950 text-white text-xs font-bold hover:bg-slate-800 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Post</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPosts.map((post) => {
                const firstPage = pages.find((p) => post.pageIds.includes(p.id));
                const isMenuOpen = activeMenuPostId === post.id;

                const statusBadgeStyles = {
                  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
                  failed: 'bg-rose-50 text-rose-700 border-rose-200',
                  partial: 'bg-amber-50 text-amber-700 border-amber-200',
                  draft: 'bg-slate-100 text-slate-700 border-slate-200',
                  publishing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                };

                return (
                  <div
                    key={post.id}
                    className="bg-white rounded-2xl border border-[#E8E8E4] overflow-hidden shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    {/* Card Thumbnail */}
                    <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                      {post.mediaUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={post.mediaUrl}
                          alt="thumbnail"
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-slate-900 to-slate-800 flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-1">
                          <span className="text-xl">{platformIcons[firstPage?.platform || 'facebook']}</span>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                            {post.postType} Post
                          </span>
                        </div>
                      )}

                      {/* Video Play Overlay */}
                      {post.postType === 'video' && (
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center text-white pointer-events-none">
                          <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center">
                            <Play className="w-5 h-5 fill-white" />
                          </div>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-3 left-3">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border backdrop-blur-md shadow-xs ${
                            statusBadgeStyles[post.status]
                          }`}
                        >
                          {post.status}
                        </span>
                      </div>

                      {/* Three-dot menu button */}
                      <div className="absolute top-3 right-3 relative">
                        <button
                          type="button"
                          onClick={() => setActiveMenuPostId(isMenuOpen ? null : post.id)}
                          className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-md text-slate-700 hover:text-black flex items-center justify-center shadow-xs transition-colors"
                          title="Actions"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                          <div className="absolute right-0 top-8 w-36 bg-white rounded-xl border border-[#E8E8E4] shadow-lg p-1.5 z-20 space-y-1 animate-fade-in text-xs">
                            {post.status === 'failed' && (
                              <button
                                type="button"
                                onClick={() => {
                                  retryPost(post.id);
                                  setActiveMenuPostId(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-700 font-semibold text-left transition-colors"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                                <span>Retry Post</span>
                              </button>
                            )}
                            <Link
                              href={`/composer?clone=${post.id}`}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#FAF9F6] text-slate-700 font-medium transition-colors"
                            >
                              <Repeat className="w-3.5 h-3.5 text-slate-400" />
                              <span>Reschedule</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                deletePost(post.id);
                                setActiveMenuPostId(null);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 font-medium text-left transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4.5 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                          <span className="text-base shrink-0">
                            {platformIcons[firstPage?.platform || 'facebook']}
                          </span>
                          <span className="font-bold text-slate-800 truncate">
                            {firstPage?.name || 'Multiple Destinations'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-900 font-medium leading-relaxed line-clamp-2">
                          {post.message}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#F2F2EE] flex items-center justify-between text-[11px] text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {post.publishedAt
                              ? new Date(post.publishedAt).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : post.scheduledAt
                              ? new Date(post.scheduledAt).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Draft'}
                          </span>
                        </div>

                        <span className="capitalize text-[10px] font-bold text-slate-600 px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#EEEEEC]">
                          {post.postType}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW C: TIMELINE VIEW */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F0F0ED] pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Chronological Activity Timeline</h3>
            <span className="text-xs text-slate-400 font-medium">{posts.length} Dispatches Recorded</span>
          </div>

          <div className="relative pl-6 border-l-2 border-[#EBEBE8] space-y-6 my-2">
            {posts.map((post) => {
              const firstPage = pages.find((p) => post.pageIds.includes(p.id));
              return (
                <div key={post.id} className="relative group">
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-white ring-4 ring-[#F8F8F6]" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-900">{firstPage?.name}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleString()
                          : post.scheduledAt
                          ? new Date(post.scheduledAt).toLocaleString()
                          : 'Draft'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">{post.message}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-[#F4F4F0] px-2 py-0.5 rounded">
                        {post.status}
                      </span>
                      {post.results.length > 0 && (
                        <span className="text-[10px] text-emerald-600 font-bold">
                          {post.results.filter((r) => r.status === 'success').length} destination(s) verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW D: CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F0F0ED] pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Upcoming Scheduled Queue</h3>
            <Link
              href="/composer"
              className="text-xs font-bold text-slate-800 hover:text-black flex items-center gap-1"
            >
              <span>+ Schedule Post</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 text-center text-xs">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="font-bold text-slate-400 uppercase py-1 text-[11px]">
                {day}
              </div>
            ))}
            {Array.from({ length: 14 }).map((_, i) => {
              const dayNum = 10 + i;
              const hasPost = scheduledPosts.length > 0 && i % 2 === 0;

              return (
                <div
                  key={i}
                  className={`min-h-[80px] p-2 rounded-xl border text-left transition-colors flex flex-col justify-between ${
                    hasPost ? 'bg-blue-50/40 border-blue-200' : 'bg-[#FAF9F6] border-[#EEEEEC]'
                  }`}
                >
                  <span className="font-bold text-slate-700 text-[11px]">{dayNum} Nov</span>
                  {hasPost && (
                    <div className="text-[10px] font-bold text-blue-700 bg-white p-1 rounded-md border border-blue-200 truncate shadow-2xs">
                      🕒 Scheduled Post
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Connected Accounts Grid Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Connected Accounts</h2>
            <p className="text-xs text-slate-500">
              Overview of connected social platforms and available destinations.
            </p>
          </div>
          <Link
            href="/accounts"
            className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1"
          >
            <span>Manage Accounts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {supportedPlatforms.map((plat) => {
            const platformPages = pages.filter((p) => p.platform === plat.id);
            const isConnected = platformPages.length > 0;

            return (
              <div
                key={plat.id}
                className="bg-white rounded-2xl border border-[#E8E8E4] p-4.5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{plat.icon}</span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">
                        {plat.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {isConnected
                          ? plat.id === 'facebook'
                            ? `${platformPages.length} Pages`
                            : `${platformPages.length} Destination`
                          : 'Not connected'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#F2F2EE]">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isConnected
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isConnected ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {isConnected ? 'Connected' : 'Offline'}
                  </span>

                  <Link
                    href={`/accounts?platform=${plat.id}`}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-0.5 transition-colors"
                  >
                    <span>View Details</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
