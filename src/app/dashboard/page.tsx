'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { Platform, Post } from '@/types';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Share2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  RotateCw,
  Trash2,
  Repeat,
  Play,
  Plus,
  ExternalLink,
  AlertCircle,
  TrendingUp,
  Filter,
  ArrowUpRight,
  Send,
  MessageSquare,
  X,
  Copy,
  Check,
  Kanban,
  Table,
  Zap,
  ArrowUpDown,
  Search,
  Users,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { SocialIcon } from '@/components/ui/SocialIcon';

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const { user, workspace, posts, pages, accounts, retryPost, deletePost } = useApp();

  // Selected Post for detail modal
  const [selectedPostForModal, setSelectedPostForModal] = useState<Post | null>(null);

  // Tasklify Multi-View Mode State
  const [activeViewMode, setActiveViewMode] = useState<'calendar' | 'kanban' | 'timeline' | 'spreadsheet'>('calendar');

  // Calendar View State
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0); // Default Mon Nov 10

  // Recent Posts Grid Filters
  const [gridFilter, setGridFilter] = useState<'all' | 'published' | 'scheduled' | 'failed'>('all');
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);

  // Dynamic Live Statistics
  const totalAccounts = accounts.length;
  const totalPages = pages.length;
  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;
  const failedCount = posts.filter((p) => p.status === 'failed' || p.status === 'partial').length;
  const successRate = posts.length > 0 ? Math.round((publishedCount / posts.length) * 100) : 100;

  // Platform icon mappings
  const platformIcons: Record<string, string> = {
    facebook: '📘',
    instagram: '📸',
    threads: '🧵',
    telegram: '✈️',
    youtube: '▶️',
  };

  const platformColors: Record<string, string> = {
    facebook: '#1877F2',
    instagram: '#FF007A',
    threads: '#00C2FF',
    telegram: '#0088CC',
    youtube: '#FF0000',
  };

  // Calendar Days Definition (7 days of current week, Nov 10 - Nov 16)
  const calendarDays = useMemo(
    () => [
      { day: 'Mon', date: '10', full: 'Nov 10, 2026' },
      { day: 'Tue', date: '11', full: 'Nov 11, 2026' },
      { day: 'Wed', date: '12', full: 'Nov 12, 2026' },
      { day: 'Thu', date: '13', full: 'Nov 13, 2026' },
      { day: 'Fri', date: '14', full: 'Nov 14, 2026' },
      { day: 'Sat', date: '15', full: 'Nov 15, 2026' },
      { day: 'Sun', date: '16', full: 'Nov 16, 2026' },
    ],
    []
  );

  // Map real posts to calendar days
  const daysWithPosts = useMemo(() => {
    return calendarDays.map((d) => {
      const dayPosts = posts.filter((p) => {
        const dateStr = p.scheduledAt || p.publishedAt || p.createdAt;
        if (!dateStr) return false;
        const dObj = new Date(dateStr);
        return dObj.getDate().toString() === d.date;
      });
      return {
        ...d,
        count: dayPosts.length,
        posts: dayPosts,
      };
    });
  }, [posts, calendarDays]);

  const activeDay = daysWithPosts[selectedDayIndex] || daysWithPosts[0];

  // Active day statistics breakdown
  const activeDayStats = useMemo(() => {
    const dayPosts = activeDay?.posts || [];
    const published = dayPosts.filter((p) => p.status === 'published').length;
    const scheduled = dayPosts.filter((p) => p.status === 'scheduled' || p.status === 'publishing').length;
    const failed = dayPosts.filter((p) => p.status === 'failed' || p.status === 'partial').length;
    return {
      total: dayPosts.length,
      published,
      scheduled,
      failed,
    };
  }, [activeDay]);

  // Selected date for month view
  const [selectedMonthDate, setSelectedMonthDate] = useState<string>('10');

  // Month view selected date posts
  const monthSelectedPosts = useMemo(() => {
    return posts.filter((p) => {
      const dateStr = p.scheduledAt || p.publishedAt || p.createdAt;
      if (!dateStr) return false;
      const dObj = new Date(dateStr);
      return dObj.getDate().toString() === selectedMonthDate;
    });
  }, [posts, selectedMonthDate]);

  // Month days for month view (November 2026)
  const monthDays = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const dateNum = (i + 1).toString();
      const dayPosts = posts.filter((p) => {
        const dateStr = p.scheduledAt || p.publishedAt || p.createdAt;
        if (!dateStr) return false;
        const dObj = new Date(dateStr);
        return dObj.getDate().toString() === dateNum;
      });
      return {
        dateNum,
        hasPosts: dayPosts.length > 0,
        count: dayPosts.length,
      };
    });
  }, [posts]);

  // Filtered posts for Recent Posts Grid
  const filteredGridPosts = useMemo(() => {
    return posts.filter((p) => {
      if (gridFilter === 'all') return true;
      if (gridFilter === 'failed') return p.status === 'failed' || p.status === 'partial';
      return p.status === gridFilter;
    });
  }, [posts, gridFilter]);

  // Scheduled posts for calendar
  const scheduledPosts = useMemo(() => {
    return posts.filter((p) => p.status === 'scheduled' || p.status === 'publishing');
  }, [posts]);

  return (
    <div className="space-y-5 font-sans animate-fade-in pb-8">
      {/* 1. Header: Welcome & Quick Action (Compact Modern Studio) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
            Welcome Back, {user.name.split(' ')[0]}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">
            Stay on top of scheduled dispatches, monitor queue health, and manage multi-platform posts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {/* Date Range Picker Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0] shadow-2xs text-xs font-bold text-slate-700 hover:border-slate-300 transition-colors cursor-pointer">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Nov 10 – Nov 16, 2026</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
          </div>

          {/* + Create Post Button */}
          <Link
            href="/composer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Post</span>
          </Link>
        </div>
      </div>

      {/* Tasklify Style Alert Banner */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">
              Anti-Ban Automated Protection is Active
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-medium">
              Zero-width space obfuscation and first-comment link triggers are enabled for all connected channels.
            </p>
          </div>
        </div>

        <Link
          href="/settings?tab=antiban"
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors shrink-0"
        >
          View Details
        </Link>
      </div>

      {/* 2. Top 4 Overview Metric Cards (Exact Tasklify Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Active Accounts */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4 stroke-[2.2]" />
            </div>
            <Link
              href="/accounts"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-0.5 transition-colors"
            >
              <span>View Details</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>

          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totalAccounts}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Active Connected Accounts
            </div>
          </div>
        </div>

        {/* Card 2: Connected Pages */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4 stroke-[2.2]" />
            </div>
            <Link
              href="/pages"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-0.5 transition-colors"
            >
              <span>View Details</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>

          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totalPages}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Active Connected Pages & Channels
            </div>
          </div>
        </div>

        {/* Card 3: Published Posts */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <Link
              href="/library?status=published"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-0.5 transition-colors"
            >
              <span>View Details</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>

          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {publishedCount}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Total Published Posts
            </div>
          </div>
        </div>

        {/* Card 4: Delivery Success Rate */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4 stroke-[2.2]" />
            </div>
            <Link
              href="/debug"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-0.5 transition-colors"
            >
              <span>View Details</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>

          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {successRate}%
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Target Percentage Completed
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tasklify Signature Multi-View Switcher Bar */}
      <div className="p-2 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: View Tabs */}
        <div className="inline-flex items-center p-1 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveViewMode('kanban')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeViewMode === 'kanban'
                ? 'bg-white text-slate-900 shadow-xs border border-[#E2E8F0]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Kanban className="w-3.5 h-3.5 stroke-[2]" />
            <span>Kanban</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode('timeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeViewMode === 'timeline'
                ? 'bg-white text-slate-900 shadow-xs border border-[#E2E8F0]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 stroke-[2]" />
            <span>Timeline</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode('spreadsheet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeViewMode === 'spreadsheet'
                ? 'bg-white text-slate-900 shadow-xs border border-[#E2E8F0]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5 stroke-[2]" />
            <span>Spreadsheet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode('calendar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeViewMode === 'calendar'
                ? 'bg-white text-slate-900 shadow-xs border border-[#E2E8F0]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 stroke-[2]" />
            <span>Calendar</span>
          </button>
        </div>

        {/* Right: Tools & New Dropdown */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setGridFilter('all')}
            className="w-8 h-8 rounded-lg bg-[#F8F9FA] hover:bg-slate-100 border border-[#E2E8F0] flex items-center justify-center text-slate-600 transition-colors"
            title="Filter"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            className="w-8 h-8 rounded-lg bg-[#F8F9FA] hover:bg-slate-100 border border-[#E2E8F0] flex items-center justify-center text-slate-600 transition-colors"
            title="Sort"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          <Link
            href="/automations"
            className="w-8 h-8 rounded-lg bg-[#F8F9FA] hover:bg-slate-100 border border-[#E2E8F0] flex items-center justify-center text-slate-600 transition-colors"
            title="Automations"
          >
            <Zap className="w-3.5 h-3.5" />
          </Link>

          <Link
            href="/composer"
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1 shadow-2xs ml-1"
          >
            <span>New</span>
            <ChevronDown className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* 4. Multi-View Area: Kanban | Timeline | Spreadsheet | Calendar */}
      {activeViewMode === 'kanban' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Kanban Dispatch Board
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Drag, drop, and track social dispatches across life-cycle stages.
              </p>
            </div>
            <Link
              href="/composer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Dispatch</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Column 1: Not Started (Scheduled) */}
            <div className="bg-[#F8F9FA] rounded-2xl border border-[#E2E8F0] p-3.5 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span className="text-xs font-bold text-slate-800">Not Started</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white border border-[#E2E8F0] text-slate-600">
                      {scheduledCount}
                    </span>
                  </div>
                  <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="space-y-2.5 min-h-[320px]">
                  {posts
                    .filter((p) => p.status === 'scheduled' || p.status === 'draft')
                    .slice(0, 4)
                    .map((post) => {
                      const firstPage = pages.find((p) => post.pageIds.includes(p.id));
                      return (
                        <div
                          key={post.id}
                          onClick={() => setSelectedPostForModal(post)}
                          className="bg-white rounded-xl border border-[#E2E8F0] p-3 shadow-2xs hover:shadow-xs hover:border-slate-400 transition-all cursor-pointer space-y-2.5"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-slate-500 font-mono">
                              #{post.id.slice(-6).toUpperCase()}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Scheduled
                            </span>
                          </div>

                          <div>
                            <div className="text-xs font-bold text-slate-900 line-clamp-2">
                              {post.message}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                              <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-3.5 h-3.5 rounded-xs" />
                              <span className="truncate">{firstPage?.name || 'All Pages'}</span>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-500 flex items-center gap-1 font-medium bg-[#F8F9FA] px-2 py-1 rounded-lg border border-[#E2E8F0]">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>
                              Due:{' '}
                              {post.scheduledAt
                                ? new Date(post.scheduledAt).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : 'Pending'}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-[#F0F2F6] flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-bold text-slate-600 uppercase">
                              {post.postType}
                            </span>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              <span>{post.commentText ? '1 comment' : '0'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {scheduledCount === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No scheduled posts
                    </div>
                  )}
                </div>
              </div>

              <Link
                href="/composer"
                className="w-full py-2 rounded-xl border border-dashed border-[#CBD5E1] hover:border-slate-900 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Post</span>
              </Link>
            </div>

            {/* Column 2: Pending (Publishing / Ready) */}
            <div className="bg-[#F8F9FA] rounded-2xl border border-[#E2E8F0] p-3.5 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-xs font-bold text-slate-800">Pending</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white border border-[#E2E8F0] text-slate-600">
                      {posts.filter((p) => p.status === 'publishing').length || 1}
                    </span>
                  </div>
                  <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="space-y-2.5 min-h-[320px]">
                  {posts
                    .filter((p) => p.status === 'publishing')
                    .map((post) => {
                      const firstPage = pages.find((p) => post.pageIds.includes(p.id));
                      return (
                        <div
                          key={post.id}
                          onClick={() => setSelectedPostForModal(post)}
                          className="bg-white rounded-xl border border-blue-200 p-3 shadow-2xs space-y-2.5 cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-slate-500 font-mono">
                              #{post.id.slice(-6).toUpperCase()}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              In Queue
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-900 line-clamp-2">
                            {post.message}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                            <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-3.5 h-3.5 rounded-xs" />
                            <span className="truncate">{firstPage?.name}</span>
                          </div>
                        </div>
                      );
                    })}

                  {posts.filter((p) => p.status === 'publishing').length === 0 && (
                    <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-500 font-mono">#PST-ACTIVE</span>
                        <span className="px-1.5 py-0.5 rounded-md font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Ready
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        Zero-width anti-ban sanitization pipeline ready for next run
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 bg-[#F8F9FA] px-2 py-1 rounded-lg border border-[#E2E8F0]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Next trigger: in 14 minutes</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Link
                href="/composer"
                className="w-full py-2 rounded-xl border border-dashed border-[#CBD5E1] hover:border-slate-900 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Post</span>
              </Link>
            </div>

            {/* Column 3: Completed (Published) */}
            <div className="bg-[#F8F9FA] rounded-2xl border border-[#E2E8F0] p-3.5 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-800">Completed</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white border border-[#E2E8F0] text-slate-600">
                      {publishedCount}
                    </span>
                  </div>
                  <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="space-y-2.5 min-h-[320px]">
                  {posts
                    .filter((p) => p.status === 'published')
                    .slice(0, 4)
                    .map((post) => {
                      const firstPage = pages.find((p) => post.pageIds.includes(p.id));
                      return (
                        <div
                          key={post.id}
                          onClick={() => setSelectedPostForModal(post)}
                          className="bg-white rounded-xl border border-[#E2E8F0] p-3 shadow-2xs hover:shadow-xs hover:border-slate-400 transition-all cursor-pointer space-y-2.5"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-slate-500 font-mono">
                              #{post.id.slice(-6).toUpperCase()}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Published
                            </span>
                          </div>

                          <div>
                            <div className="text-xs font-bold text-slate-900 line-clamp-2">
                              {post.message}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                              <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-3.5 h-3.5 rounded-xs" />
                              <span className="truncate">{firstPage?.name || 'All Pages'}</span>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-500 flex items-center gap-1 font-medium bg-[#F8F9FA] px-2 py-1 rounded-lg border border-[#E2E8F0]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>
                              Dispatched:{' '}
                              {post.publishedAt
                                ? new Date(post.publishedAt).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : 'Live'}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-[#F0F2F6] flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-bold text-slate-600 uppercase">
                              {post.postType}
                            </span>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              <span>{post.commentText ? '1 auto-comment' : '0'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <Link
                href="/composer"
                className="w-full py-2 rounded-xl border border-dashed border-[#CBD5E1] hover:border-slate-900 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Post</span>
              </Link>
            </div>

            {/* Column 4: Under Review / Failed */}
            <div className="bg-[#F8F9FA] rounded-2xl border border-[#E2E8F0] p-3.5 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-xs font-bold text-slate-800">Under Review</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white border border-[#E2E8F0] text-slate-600">
                      {failedCount}
                    </span>
                  </div>
                  <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="space-y-2.5 min-h-[320px]">
                  {posts
                    .filter((p) => p.status === 'failed' || p.status === 'partial')
                    .map((post) => {
                      const firstPage = pages.find((p) => post.pageIds.includes(p.id));
                      return (
                        <div
                          key={post.id}
                          onClick={() => setSelectedPostForModal(post)}
                          className="bg-white rounded-xl border border-rose-200 p-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-2.5"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-slate-500 font-mono">
                              #{post.id.slice(-6).toUpperCase()}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Error
                            </span>
                          </div>

                          <div>
                            <div className="text-xs font-bold text-slate-900 line-clamp-2">
                              {post.message}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                              <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-3.5 h-3.5 rounded-xs" />
                              <span className="truncate">{firstPage?.name}</span>
                            </div>
                          </div>

                          <div className="text-[10px] text-rose-600 flex items-center gap-1 font-medium bg-rose-50/50 px-2 py-1 rounded-lg border border-rose-100">
                            <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span className="truncate">Token reauth recommended</span>
                          </div>

                          <div className="pt-2 border-t border-[#F0F2F6] flex items-center justify-between text-[10px]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                retryPost(post.id);
                              }}
                              className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1"
                            >
                              <RotateCw className="w-3 h-3" />
                              <span>Retry</span>
                            </button>
                            <span className="text-slate-400">Needs Action</span>
                          </div>
                        </div>
                      );
                    })}

                  {failedCount === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400">
                      All dispatches healthy!
                    </div>
                  )}
                </div>
              </div>

              <Link
                href="/composer"
                className="w-full py-2 rounded-xl border border-dashed border-[#CBD5E1] hover:border-slate-900 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Post</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Timeline View */}
      {activeViewMode === 'timeline' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs space-y-5 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Dispatch Queue Timeline
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Real-time chronological log of past dispatches and future scheduled items.
              </p>
            </div>
            <Link
              href="/composer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Next</span>
            </Link>
          </div>

          <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2E8F0]">
            {posts.map((post) => {
              const firstPage = pages.find((p) => post.pageIds.includes(p.id));
              const dateVal = post.publishedAt || post.scheduledAt || post.createdAt;
              return (
                <div key={post.id} className="relative group">
                  {/* Status Indicator Dot */}
                  <div
                    className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full ring-4 ring-white ${
                      post.status === 'published'
                        ? 'bg-emerald-500'
                        : post.status === 'scheduled'
                        ? 'bg-blue-500'
                        : 'bg-rose-500'
                    }`}
                  />

                  <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] hover:border-slate-400 hover:bg-white transition-all space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-4 h-4 rounded-xs" />
                        <span className="font-bold text-slate-900">
                          {firstPage?.name || 'All Connected Channels'}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          #{post.id.slice(-6).toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border ${
                            post.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : post.status === 'scheduled'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {post.status}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {new Date(dateVal).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-800 leading-relaxed font-medium">
                      {post.message}
                    </p>

                    <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px]">
                      <span className="uppercase font-bold text-slate-400 text-[10px]">
                        {post.postType} Post
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedPostForModal(post)}
                        className="font-bold text-slate-900 hover:text-black hover:underline"
                      >
                        Inspect Details →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spreadsheet View */}
      {activeViewMode === 'spreadsheet' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-2xs space-y-4 animate-fade-in">
          <div className="p-4 sm:p-5 pb-0 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Data Grid & Dispatches Table
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Structured spreadsheet view of all post campaigns, platforms, and delivery status.
              </p>
            </div>
            <Link
              href="/composer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Record</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-y border-[#E2E8F0] bg-[#F8F9FA] text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">Post ID</th>
                  <th className="py-2.5 px-4">Message / Caption</th>
                  <th className="py-2.5 px-4">Platform</th>
                  <th className="py-2.5 px-4">Destination Page</th>
                  <th className="py-2.5 px-4">Schedule / Date</th>
                  <th className="py-2.5 px-4">Format</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {posts.map((post) => {
                  const firstPage = pages.find((p) => post.pageIds.includes(p.id));
                  const dateVal = post.publishedAt || post.scheduledAt || post.createdAt;
                  return (
                    <tr
                      key={post.id}
                      onClick={() => setSelectedPostForModal(post)}
                      className="hover:bg-[#F8F9FA] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">
                        #{post.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">
                        {post.message}
                      </td>
                      <td className="py-3 px-4">
                        <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-4 h-4 rounded-xs" />
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {firstPage?.name || 'Multiple Pages'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium whitespace-nowrap">
                        {new Date(dateVal).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500">
                        {post.postType}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border ${
                            post.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : post.status === 'scheduled'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {post.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPostForModal(post);
                          }}
                          className="font-bold text-slate-700 hover:text-black hover:underline"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Calendar View (Interactive Content Calendar + Platform Breakdown) */}
      {activeViewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in">
          {/* A. Post Calendar & Scheduling Matrix (8 cols on lg) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                    <Calendar className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Content Calendar & Publishing Slots
                  </h3>

                  {/* Selected Date & Total Posts Pill */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#F8F9FA] text-slate-900 border border-[#E2E8F0] shadow-2xs">
                    <span className="text-slate-500 font-semibold">Selected:</span>
                    <span className="font-black text-slate-900">
                      {calendarView === 'week' ? activeDay.full : `Nov ${selectedMonthDate}, 2026`}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-slate-900 font-black">
                      {calendarView === 'week' ? activeDay.count : monthSelectedPosts.length}{' '}
                      {(calendarView === 'week' ? activeDay.count : monthSelectedPosts.length) === 1
                        ? 'Total Post'
                        : 'Total Posts'}
                    </span>
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  Visual publishing schedule mapped to your connected social channels •{' '}
                  <span className="text-slate-700 font-bold">
                    {calendarView === 'week' ? `${activeDay.day}, ${activeDay.full}` : `Nov ${selectedMonthDate}, 2026`}
                  </span>{' '}
                  has{' '}
                  <span className="text-slate-900 font-extrabold">
                    {calendarView === 'week' ? activeDay.count : monthSelectedPosts.length}{' '}
                    {(calendarView === 'week' ? activeDay.count : monthSelectedPosts.length) === 1 ? 'post' : 'posts'}
                  </span>{' '}
                  ({calendarView === 'week' ? activeDayStats.published : monthSelectedPosts.filter((p) => p.status === 'published').length} published,{' '}
                  {calendarView === 'week' ? activeDayStats.scheduled : monthSelectedPosts.filter((p) => p.status === 'scheduled' || p.status === 'publishing').length} scheduled
                  {(calendarView === 'week' ? activeDayStats.failed : monthSelectedPosts.filter((p) => p.status === 'failed' || p.status === 'partial').length) > 0
                    ? `, ${calendarView === 'week' ? activeDayStats.failed : monthSelectedPosts.filter((p) => p.status === 'failed' || p.status === 'partial').length} failed`
                    : ''})
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                {/* Week / Month Switcher */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-[#F8F9FA] border border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setCalendarView('week')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      calendarView === 'week'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarView('month')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      calendarView === 'month'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Month
                  </button>
                </div>

                {/* Schedule Post Action */}
                <Link
                  href="/composer"
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-black text-[11px] font-bold text-white transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Post</span>
                </Link>
              </div>
            </div>

            {/* Calendar View Switcher Content */}
            {calendarView === 'week' ? (
              <div className="space-y-4">
                {/* Days of Week Header with Clickable Selection and Post Counts */}
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {daysWithPosts.map((d, index) => {
                    const isSelected = selectedDayIndex === index;
                    return (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => setSelectedDayIndex(index)}
                        className={`flex flex-col items-center p-2 rounded-xl transition-all relative ${
                          isSelected
                            ? 'bg-[#F8F9FA] border-2 border-slate-900 shadow-xs'
                            : 'hover:bg-[#F8F9FA] border border-transparent'
                        }`}
                      >
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{d.day}</span>
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black mt-1 transition-all ${
                            isSelected
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'text-slate-700'
                          }`}
                        >
                          {d.date}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold mt-1 px-1.5 py-0.5 rounded-full transition-colors ${
                            isSelected
                              ? 'bg-slate-900 text-white'
                              : d.count > 0
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-slate-50 text-slate-400'
                          }`}
                        >
                          {d.count} {d.count === 1 ? 'post' : 'posts'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Dynamic Day Timeline Header with Total Posts & Breakdown */}
                <div className="flex items-center justify-between pt-1 px-1 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-900">
                      Schedule for {activeDay.full}
                    </span>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#F8F9FA] text-slate-900 border border-[#E2E8F0]">
                      Total: {activeDay.count} {activeDay.count === 1 ? 'Post' : 'Posts'}
                    </span>
                    {activeDayStats.published > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ✓ {activeDayStats.published} Published
                      </span>
                    )}
                    {activeDayStats.scheduled > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        ● {activeDayStats.scheduled} Scheduled
                      </span>
                    )}
                    {activeDayStats.failed > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        ✕ {activeDayStats.failed} Failed
                      </span>
                    )}
                  </div>
                  <Link
                    href="/composer"
                    className="text-[11px] font-bold text-slate-900 hover:underline flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Schedule for this Day</span>
                  </Link>
                </div>

                {/* Day Time Slots or Empty State */}
                <div className="space-y-2.5 min-h-[220px]">
                  {activeDay.posts.length > 0 ? (
                    activeDay.posts.map((post) => {
                      const firstPage = pages.find((p) => post.pageIds.includes(p.id));
                      const timeStr = post.scheduledAt
                        ? new Date(post.scheduledAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : post.publishedAt
                        ? new Date(post.publishedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '09:00 AM';

                      const statusColor =
                        post.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : post.status === 'scheduled'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200';

                      return (
                        <div
                          key={post.id}
                          className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] hover:border-slate-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-16 shrink-0 text-[10px] font-black uppercase text-slate-400 font-mono">
                              {timeStr}
                            </span>
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  platformColors[firstPage?.platform || 'facebook'] || '#0F172A',
                              }}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-4 h-4 rounded-xs" />
                                <span className="font-bold text-xs text-slate-900 truncate">
                                  {post.message}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                Destination: {firstPage?.name || 'All Connected Pages'} •{' '}
                                <span className="uppercase font-semibold">{post.postType}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            <span
                              className={`text-[10px] font-bold capitalize px-2 py-0.5 rounded-md border ${statusColor}`}
                            >
                              {post.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedPostForModal(post)}
                              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 transition-colors px-2 py-1 rounded-lg hover:bg-white"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-10 px-4 rounded-xl bg-[#F8F9FA] border border-dashed border-[#E2E8F0] text-center flex flex-col items-center justify-center space-y-2">
                      <Calendar className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                      <p className="text-xs font-bold text-slate-700">
                        No posts scheduled for {activeDay.full}
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-xs">
                        Queue up cross-platform updates, articles, or scheduled media for this date.
                      </p>
                      <Link
                        href="/composer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-xl bg-slate-900 hover:bg-black text-white text-[11px] font-bold shadow-2xs transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Post for this Day</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Month Calendar Grid with Day Click & Post List */
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                  <div>
                    <span className="text-xs font-black text-slate-900">November 2026</span>
                    <span className="text-[11px] text-slate-500 font-medium ml-2">
                      Click any day to view scheduled posts
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#F8F9FA] text-slate-900 border border-[#E2E8F0]">
                      Selected Nov {selectedMonthDate}: {monthSelectedPosts.length}{' '}
                      {monthSelectedPosts.length === 1 ? 'Total Post' : 'Total Posts'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {posts.length} total posts this month
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-slate-400 pb-1">
                  <span>MON</span>
                  <span>TUE</span>
                  <span>WED</span>
                  <span>THU</span>
                  <span>FRI</span>
                  <span>SAT</span>
                  <span>SUN</span>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {monthDays.map((d) => {
                    const isSelected = selectedMonthDate === d.dateNum;
                    return (
                      <button
                        key={d.dateNum}
                        type="button"
                        onClick={() => setSelectedMonthDate(d.dateNum)}
                        className={`h-13 p-1.5 rounded-xl border flex flex-col justify-between transition-all text-left ${
                          isSelected
                            ? 'bg-slate-100 border-slate-900 shadow-xs ring-1 ring-slate-900'
                            : d.hasPosts
                            ? 'bg-[#F8F9FA] border-slate-300 hover:border-slate-400'
                            : 'bg-white border-[#E2E8F0] hover:bg-[#F8F9FA]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-[10px] font-bold ${
                              isSelected ? 'text-slate-900 font-black' : 'text-slate-700'
                            }`}
                          >
                            {d.dateNum}
                          </span>
                          {d.hasPosts && (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                          )}
                        </div>
                        {d.hasPosts ? (
                          <span className="text-[9px] font-black text-slate-900 truncate">
                            {d.count} {d.count === 1 ? 'post' : 'posts'}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-300 font-medium">0</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Month View Selected Day Posts List */}
                <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">
                        Dispatches for Nov {selectedMonthDate}, 2026
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#F8F9FA] text-slate-900 border border-[#E2E8F0]">
                        {monthSelectedPosts.length} {monthSelectedPosts.length === 1 ? 'Post' : 'Posts'}
                      </span>
                    </div>
                    <Link
                      href="/composer"
                      className="text-[11px] font-bold text-slate-900 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Post for this Date</span>
                    </Link>
                  </div>

                  {monthSelectedPosts.length > 0 ? (
                    <div className="space-y-2">
                      {monthSelectedPosts.map((post) => {
                        const firstPage = pages.find((p) => post.pageIds.includes(p.id));
                        return (
                          <div
                            key={post.id}
                            className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-4 h-4 rounded-xs" />
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 truncate block">
                                  {post.message}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {firstPage?.name} • <span className="uppercase font-semibold">{post.postType}</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[9px] font-bold capitalize px-2 py-0.5 rounded-md border ${
                                  post.status === 'published'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : post.status === 'scheduled'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {post.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedPostForModal(post)}
                                className="text-[11px] font-bold text-slate-600 hover:text-slate-900"
                              >
                                Details
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-4 px-3 rounded-xl bg-[#F8F9FA] border border-dashed border-[#E2E8F0] text-center text-[11px] text-slate-400">
                      No posts scheduled on Nov {selectedMonthDate}, 2026. Click &quot;Add Post for this Date&quot; to queue content.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] font-bold text-slate-500 flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1877F2]" /> Facebook
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF007A]" /> Instagram
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF0000]" /> YouTube
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0088CC]" /> Telegram
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00C2FF]" /> Threads
              </span>
            </div>
          </div>

          {/* B. Platform Distribution & Channel Health (4 cols on lg) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Platform Distribution</h3>
                <p className="text-[11px] text-slate-400">Broadcasting network status</p>
              </div>
              <Link
                href="/accounts"
                className="text-[11px] font-bold text-slate-900 hover:underline"
              >
                Manage
              </Link>
            </div>

            {/* SVG Donut Chart */}
            <div className="relative w-36 h-36 mx-auto my-1 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* Facebook (45%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#1877F2"
                  strokeWidth="12"
                  strokeDasharray="108 239"
                  strokeDashoffset="0"
                />
                {/* Instagram (25%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#FF007A"
                  strokeWidth="12"
                  strokeDasharray="60 239"
                  strokeDashoffset="-108"
                />
                {/* YouTube (15%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#FF0000"
                  strokeWidth="12"
                  strokeDasharray="36 239"
                  strokeDashoffset="-168"
                />
                {/* Telegram (10%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#0088CC"
                  strokeWidth="12"
                  strokeDasharray="24 239"
                  strokeDashoffset="-204"
                />
                {/* Threads (5%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#00C2FF"
                  strokeWidth="12"
                  strokeDasharray="11 239"
                  strokeDashoffset="-228"
                />
              </svg>

              {/* Inner Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                  Destinations
                </span>
                <span className="text-base font-black text-slate-900 leading-tight">
                  {totalPages} Pages
                </span>
              </div>
            </div>

            {/* Connected Platform List with Page Counts */}
            <div className="space-y-2 text-xs font-semibold text-slate-700">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <SocialIcon platform="facebook" className="w-6 h-6 rounded-md shadow-2xs" />
                  <div>
                    <div className="font-bold text-slate-900 leading-tight">Facebook</div>
                    <span className="text-[10px] text-slate-400">Pages & Groups</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0]">4 Pages</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <SocialIcon platform="instagram" className="w-6 h-6 rounded-md shadow-2xs" />
                  <div>
                    <div className="font-bold text-slate-900 leading-tight">Instagram</div>
                    <span className="text-[10px] text-slate-400">Creator & Business</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0]">1 Account</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <SocialIcon platform="youtube" className="w-6 h-6 rounded-md shadow-2xs" />
                  <div>
                    <div className="font-bold text-slate-900 leading-tight">YouTube</div>
                    <span className="text-[10px] text-slate-400">Shorts & Videos</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0]">1 Channel</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <SocialIcon platform="telegram" className="w-6 h-6 rounded-md shadow-2xs" />
                  <div>
                    <div className="font-bold text-slate-900 leading-tight">Telegram</div>
                    <span className="text-[10px] text-slate-400">Broadcast Channel</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0]">1 Channel</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Recent Posts & Dispatch Queue (Tasklify Responsive Grid) */}
      <div className="space-y-4">
        {/* Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Recent Posts & Dispatch Queue
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Review published updates, scheduled posts, and manage cross-platform dispatches.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filter Pills */}
            <div className="inline-flex items-center p-1 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs">
              {(['all', 'published', 'scheduled', 'failed'] as const).map((status) => {
                const count =
                  status === 'all'
                    ? posts.length
                    : status === 'published'
                    ? publishedCount
                    : status === 'scheduled'
                    ? scheduledCount
                    : failedCount;

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setGridFilter(status)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all flex items-center gap-1.5 ${
                      gridFilter === status
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{status}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        gridFilter === status
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

            {/* View All link to library */}
            <Link
              href="/library"
              className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 shrink-0"
            >
              <span>View Library</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 3-Column Grid on Desktop, 2 on Tablet, 1 on Mobile */}
        {filteredGridPosts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center shadow-2xs">
            <Share2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No posts in this filter</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are currently no posts matching the selected status ({gridFilter}).
            </p>
            <Link
              href="/composer"
              className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs hover:scale-102 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Post</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGridPosts.map((post) => {
              const firstPage = pages.find((p) => post.pageIds.includes(p.id));
              const isMenuOpen = activeMenuPostId === post.id;

              const statusBadgeStyles = {
                published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
                failed: 'bg-rose-50 text-rose-700 border-rose-200',
                partial: 'bg-amber-50 text-amber-700 border-amber-200',
                draft: 'bg-slate-100 text-slate-700 border-slate-200',
                publishing: 'bg-purple-50 text-purple-700 border-purple-200',
              };

              return (
                <div
                  key={post.id}
                  onClick={() => setSelectedPostForModal(post)}
                  className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-2xs hover:border-slate-400 hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer group"
                >
                  {/* Thumbnail / Media Header */}
                  <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                    {post.mediaUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={post.mediaUrl}
                        alt="thumbnail"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#0F172A] flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-2">
                        <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-10 h-10 rounded-xl shadow-xs" />
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

                    {/* Status Badge Floating Top Left */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border backdrop-blur-md shadow-xs ${
                          statusBadgeStyles[post.status]
                        }`}
                      >
                        {post.status}
                      </span>
                    </div>

                    {/* Action Menu Floating Top Right */}
                    <div
                      className="absolute top-3 right-3 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveMenuPostId(isMenuOpen ? null : post.id)
                        }
                        className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-md text-slate-700 hover:text-black flex items-center justify-center shadow-xs transition-colors"
                        title="Actions"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div className="absolute right-0 top-8 w-36 bg-white rounded-xl border border-[#E2E8F0] shadow-xl p-1.5 z-30 space-y-1 animate-fade-in text-xs">
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
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#F8F9FA] text-slate-700 font-medium transition-colors"
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
                      {/* Platform & Target Page Name */}
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                        <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-4 h-4 rounded-xs" />
                        <span className="font-bold text-slate-800 truncate">
                          {firstPage?.name || 'Multiple Destinations'}
                        </span>
                        {post.pageIds.length > 1 && (
                          <span className="text-[10px] font-bold text-slate-400">
                            +{post.pageIds.length - 1} more
                          </span>
                        )}
                      </div>

                      {/* Post Caption with proper truncation */}
                      <p className="text-xs text-slate-900 font-medium leading-relaxed line-clamp-2">
                        {post.message}
                      </p>

                      {/* Auto-comment flag */}
                      {post.commentText && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium bg-[#F8F9FA] p-1.5 rounded-lg border border-[#E2E8F0]">
                          <MessageSquare className="w-3 h-3 text-slate-900" />
                          <span className="truncate">First Comment Auto-Trigger</span>
                        </div>
                      )}
                    </div>

                    {/* Publishing Date & Bottom Bar */}
                    <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-slate-400 font-medium">
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

                      <span className="capitalize text-[10px] font-bold text-slate-600 px-2 py-0.5 rounded bg-[#F8F9FA] border border-[#E2E8F0]">
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

      {/* 6. Detailed Post Inspection Modal (Tasklify Clean Neutral Studio) */}
      {selectedPostForModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => setSelectedPostForModal(null)}
        >
          <div
            className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl max-w-2xl w-full p-6 space-y-5 overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
                  <Share2 className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Post Dispatch Details
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    ID: {selectedPostForModal.id} • Type:{' '}
                    <span className="capitalize font-bold text-slate-700">
                      {selectedPostForModal.postType}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    selectedPostForModal.status === 'published'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : selectedPostForModal.status === 'scheduled'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {selectedPostForModal.status}
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedPostForModal(null)}
                  className="w-8 h-8 rounded-xl bg-[#F8F9FA] hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Media & Caption Preview */}
            <div className="space-y-3">
              {selectedPostForModal.mediaUrl && (
                <div className="rounded-2xl overflow-hidden max-h-72 w-full bg-slate-950/5 border border-[#E2E8F0] flex items-center justify-center p-2">
                  {selectedPostForModal.postType === 'video' ? (
                    <video
                      src={selectedPostForModal.mediaUrl}
                      controls
                      className="max-h-68 w-auto rounded-xl object-contain"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={selectedPostForModal.mediaUrl}
                      alt="post preview"
                      className="max-h-68 w-auto rounded-xl object-contain"
                    />
                  )}
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                  <span>Caption Message</span>
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(selectedPostForModal.message)
                    }
                    className="hover:text-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>
                <p className="text-xs text-slate-900 leading-relaxed font-medium whitespace-pre-wrap">
                  {selectedPostForModal.message}
                </p>
              </div>

              {selectedPostForModal.commentText && (
                <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-900">
                    <MessageSquare className="w-3 h-3 text-slate-900" />
                    <span>First Comment Auto-Trigger (Link Cloaked)</span>
                  </div>
                  <p className="text-xs text-slate-800 font-medium">
                    {selectedPostForModal.commentText}
                  </p>
                </div>
              )}
            </div>

            {/* Destination Channels Dispatch Results */}
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-900">
                Destination Pages & Results
              </span>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {selectedPostForModal.pageIds.map((pgId) => {
                  const pg = pages.find((p) => p.id === pgId);
                  const res = selectedPostForModal.results?.find((r) => r.pageId === pgId);

                  return (
                    <div
                      key={pgId}
                      className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] flex items-center justify-between text-xs font-medium"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <SocialIcon platform={pg?.platform || 'facebook'} className="w-4 h-4 rounded-xs" />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate">
                            {pg?.name || pgId}
                          </div>
                          {res?.error && (
                            <div className="text-[10px] text-rose-600 font-semibold truncate mt-0.5">
                              {res.error}
                            </div>
                          )}
                          {res?.externalPostId && (
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              ID: {res.externalPostId}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            res?.status === 'success' || selectedPostForModal.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800'
                              : res?.status === 'failed' || selectedPostForModal.status === 'failed'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {res?.status || selectedPostForModal.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  deletePost(selectedPostForModal.id);
                  setSelectedPostForModal(null);
                }}
                className="px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Post</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedPostForModal.status === 'failed' && (
                  <button
                    type="button"
                    onClick={() => {
                      retryPost(selectedPostForModal.id);
                      setSelectedPostForModal(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Retry Dispatch</span>
                  </button>
                )}

                <Link
                  href={`/composer?clone=${selectedPostForModal.id}`}
                  className="px-3.5 py-2 rounded-xl bg-[#F8F9FA] hover:bg-slate-200 border border-[#E2E8F0] text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Reschedule / Edit</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setSelectedPostForModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
