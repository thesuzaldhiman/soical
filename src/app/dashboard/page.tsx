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
  Image as ImageIcon,
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
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Helper to format Date to YYYY-MM-DD
  const getIsoDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to get matching ISO date key from a Post
  const getPostIsoDate = (p: Post) => {
    const dateStr = p.scheduledAt || p.publishedAt || p.createdAt;
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return getIsoDateStr(d);
  };

  // Calendar Days Definition (Dynamic 7 days of current week, aligned Monday -> Sunday)
  const calendarDays = useMemo(() => {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);

    // Find Monday of this week (0 is Sunday, 1 is Monday)
    const dayOfWeek = baseDate.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + diffToMon);

    const todayIso = getIsoDateStr(new Date());

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isoDate = getIsoDateStr(d);
      return {
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.getDate().toString(),
        isoDate,
        full: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        isToday: isoDate === todayIso,
      };
    });
  }, [weekOffset]);

  // Default selected day index to Today if in current week, else 0
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  });

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

  // Map real posts to dynamic calendar days
  const daysWithPosts = useMemo(() => {
    return calendarDays.map((d) => {
      const dayPosts = posts.filter((p) => {
        const postIso = getPostIsoDate(p);
        return postIso === d.isoDate;
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

  // Selected date for month view (defaults to today's date)
  const [selectedMonthDate, setSelectedMonthDate] = useState<string>(() => new Date().getDate().toString());

  // Month view selected date posts
  const monthSelectedPosts = useMemo(() => {
    return posts.filter((p) => {
      const dateStr = p.scheduledAt || p.publishedAt || p.createdAt;
      if (!dateStr) return false;
      const dObj = new Date(dateStr);
      if (isNaN(dObj.getTime())) return false;
      return dObj.getDate().toString() === selectedMonthDate;
    });
  }, [posts, selectedMonthDate]);

  // Month days for month view (November 2026)
  const monthDays = useMemo(() => {
    const todayNum = new Date().getDate().toString();
    return Array.from({ length: 30 }, (_, i) => {
      const dateNum = (i + 1).toString();
      const dayPosts = posts.filter((p) => {
        const dateStr = p.scheduledAt || p.publishedAt || p.createdAt;
        if (!dateStr) return false;
        const dObj = new Date(dateStr);
        if (isNaN(dObj.getTime())) return false;
        return dObj.getDate().toString() === dateNum;
      });
      return {
        dateNum,
        isToday: dateNum === todayNum,
        hasPosts: dayPosts.length > 0,
        count: dayPosts.length,
      };
    });
  }, [posts]);

  // Day Dispatch Queue Filter in Calendar Inspector
  const [dayQueueFilter, setDayQueueFilter] = useState<'all' | 'scheduled' | 'published' | 'failed'>('all');

  const filteredDayQueuePosts = useMemo(() => {
    const dayPosts = activeDay?.posts || [];
    return dayPosts.filter((p) => {
      if (dayQueueFilter === 'all') return true;
      if (dayQueueFilter === 'failed') return p.status === 'failed' || p.status === 'partial';
      return p.status === dayQueueFilter;
    });
  }, [activeDay, dayQueueFilter]);

  // Timeline Filter & Search State
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'published' | 'scheduled' | 'failed'>('all');
  const [timelineSearch, setTimelineSearch] = useState<string>('');

  const filteredTimelinePosts = useMemo(() => {
    return posts.filter((p) => {
      if (timelineFilter !== 'all') {
        if (timelineFilter === 'failed') {
          if (p.status !== 'failed' && p.status !== 'partial') return false;
        } else if (p.status !== timelineFilter) {
          return false;
        }
      }
      if (timelineSearch.trim()) {
        const q = timelineSearch.toLowerCase();
        const firstPage = pages.find((page) => p.pageIds.includes(page.id));
        const matchMsg = p.message?.toLowerCase().includes(q);
        const matchPage = firstPage?.name?.toLowerCase().includes(q);
        const matchId = p.id.toLowerCase().includes(q);
        if (!matchMsg && !matchPage && !matchId) return false;
      }
      return true;
    });
  }, [posts, pages, timelineFilter, timelineSearch]);

  // Spreadsheet Filter & Search State
  const [spreadsheetFilter, setSpreadsheetFilter] = useState<'all' | 'published' | 'scheduled' | 'failed'>('all');
  const [spreadsheetSearch, setSpreadsheetSearch] = useState<string>('');

  const filteredSpreadsheetPosts = useMemo(() => {
    return posts.filter((p) => {
      if (spreadsheetFilter !== 'all') {
        if (spreadsheetFilter === 'failed') {
          if (p.status !== 'failed' && p.status !== 'partial') return false;
        } else if (p.status !== spreadsheetFilter) {
          return false;
        }
      }
      if (spreadsheetSearch.trim()) {
        const q = spreadsheetSearch.toLowerCase();
        const firstPage = pages.find((page) => p.pageIds.includes(page.id));
        const matchMsg = p.message?.toLowerCase().includes(q);
        const matchPage = firstPage?.name?.toLowerCase().includes(q);
        const matchId = p.id.toLowerCase().includes(q);
        if (!matchMsg && !matchPage && !matchId) return false;
      }
      return true;
    });
  }, [posts, pages, spreadsheetFilter, spreadsheetSearch]);

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

      {/* Timeline View (Minimal & Scalable Feed) */}
      {activeViewMode === 'timeline' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6 shadow-2xs space-y-4 animate-fade-in">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-900">
                  Dispatch Queue Timeline
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {filteredTimelinePosts.length} {filteredTimelinePosts.length === 1 ? 'dispatch' : 'dispatches'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Minimal real-time chronological log of queued and published items.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={timelineSearch}
                  onChange={(e) => setTimelineSearch(e.target.value)}
                  placeholder="Filter timeline..."
                  className="pl-8 pr-3 py-1 text-xs rounded-xl border border-[#CBD5E1] bg-[#F8F9FA] focus:bg-white focus:border-slate-900 focus:outline-hidden w-36 sm:w-44 font-medium"
                />
                {timelineSearch && (
                  <button
                    type="button"
                    onClick={() => setTimelineSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status filter chips */}
              <div className="flex items-center p-0.5 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0] text-[10px] font-bold">
                {(['all', 'scheduled', 'published', 'failed'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setTimelineFilter(filterKey)}
                    className={`px-2 py-1 rounded-lg capitalize transition-all ${
                      timelineFilter === filterKey
                        ? 'bg-slate-900 text-white shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {filterKey}
                  </button>
                ))}
              </div>

              <Link
                href="/composer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New</span>
              </Link>
            </div>
          </div>

          {/* Minimal Timeline List */}
          <div className="relative pl-6 space-y-3 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#E2E8F0]">
            {filteredTimelinePosts.length > 0 ? (
              filteredTimelinePosts.map((post) => {
                const firstPage = pages.find((p) => post.pageIds.includes(p.id));
                const dateVal = post.publishedAt || post.scheduledAt || post.createdAt;
                return (
                  <div key={post.id} className="relative group">
                    {/* Status Indicator Dot on Rail */}
                    <div
                      className={`absolute -left-6 top-3 w-3 h-3 rounded-full ring-4 ring-white ${
                        post.status === 'published'
                          ? 'bg-emerald-500'
                          : post.status === 'scheduled'
                          ? 'bg-blue-500'
                          : 'bg-rose-500'
                      }`}
                    />

                    {/* Compact Minimal Row */}
                    <div
                      onClick={() => setSelectedPostForModal(post)}
                      className="p-2.5 sm:p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] hover:border-slate-400 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Time Stamp */}
                        <span className="w-24 sm:w-28 shrink-0 text-[10px] font-mono font-bold text-slate-500">
                          {new Date(dateVal).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        {/* Thumbnail / Type Icon */}
                        {post.mediaUrl ? (
                          <img
                            src={post.mediaUrl}
                            alt="thumb"
                            className="w-9 h-9 rounded-lg object-cover border border-[#E2E8F0] bg-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-200/70 border border-[#E2E8F0] shrink-0 flex items-center justify-center text-slate-400">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}

                        {/* Message Preview (clamped to 1 line for clean minimal view) */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-[#E2E8F0] text-[10px] font-bold text-slate-700">
                              <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-3 h-3 rounded-xs" />
                              <span className="truncate max-w-[120px]">{firstPage?.name || 'All Pages'}</span>
                            </div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">
                              #{post.id.slice(-6).toUpperCase()}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-slate-800 truncate mt-1 line-clamp-1 group-hover:text-slate-900">
                            {post.message}
                          </p>
                        </div>
                      </div>

                      {/* Right: Format + Status + Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <span className="text-[9px] uppercase font-bold text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-100">
                          {post.postType}
                        </span>

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

                        {post.status === 'failed' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              retryPost(post.id);
                            }}
                            className="px-2 py-1 rounded-md text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center gap-1"
                          >
                            <RotateCw className="w-2.5 h-2.5" />
                            <span>Retry</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPostForModal(post);
                          }}
                          className="px-2 py-1 rounded-md text-[11px] font-bold text-slate-700 hover:text-black hover:bg-slate-100 transition-colors"
                        >
                          Details →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-xs text-slate-400 space-y-2 bg-[#F8F9FA] rounded-xl border border-dashed border-[#CBD5E1]">
                <Clock className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No dispatches match the selected filter</p>
                <p className="text-[11px] text-slate-400">Try changing status or clearing the search query.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spreadsheet View (Enhanced Data Grid & Table) */}
      {activeViewMode === 'spreadsheet' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-2xs space-y-4 animate-fade-in">
          {/* Header & Controls */}
          <div className="p-4 sm:p-5 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-900">
                  Data Grid & Dispatches Table
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {filteredSpreadsheetPosts.length} of {posts.length} Posts
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Structured spreadsheet view of all post campaigns, platforms, media, and delivery status.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={spreadsheetSearch}
                  onChange={(e) => setSpreadsheetSearch(e.target.value)}
                  placeholder="Search table..."
                  className="pl-8 pr-3 py-1 text-xs rounded-xl border border-[#CBD5E1] bg-[#F8F9FA] focus:bg-white focus:border-slate-900 focus:outline-hidden w-36 sm:w-48 font-medium"
                />
                {spreadsheetSearch && (
                  <button
                    type="button"
                    onClick={() => setSpreadsheetSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status filter chips */}
              <div className="flex items-center p-0.5 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0] text-[10px] font-bold">
                {(['all', 'scheduled', 'published', 'failed'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setSpreadsheetFilter(filterKey)}
                    className={`px-2 py-1 rounded-lg capitalize transition-all ${
                      spreadsheetFilter === filterKey
                        ? 'bg-slate-900 text-white shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {filterKey}
                  </button>
                ))}
              </div>

              <Link
                href="/composer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Record</span>
              </Link>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-y border-[#E2E8F0] bg-[#F8F9FA] text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4 w-12 text-center">Media</th>
                  <th className="py-2.5 px-4">Post ID</th>
                  <th className="py-2.5 px-4 min-w-[200px]">Message / Caption</th>
                  <th className="py-2.5 px-4">Platform</th>
                  <th className="py-2.5 px-4">Destination Page</th>
                  <th className="py-2.5 px-4">Date & Time</th>
                  <th className="py-2.5 px-4">Format</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredSpreadsheetPosts.length > 0 ? (
                  filteredSpreadsheetPosts.map((post) => {
                    const firstPage = pages.find((p) => post.pageIds.includes(p.id));
                    const dateVal = post.publishedAt || post.scheduledAt || post.createdAt;
                    return (
                      <tr
                        key={post.id}
                        onClick={() => setSelectedPostForModal(post)}
                        className="hover:bg-[#F8F9FA] transition-colors cursor-pointer group"
                      >
                        {/* Thumbnail / Media */}
                        <td className="py-2.5 px-4 text-center">
                          {post.mediaUrl ? (
                            <img
                              src={post.mediaUrl}
                              alt="thumb"
                              className="w-8 h-8 rounded-lg object-cover border border-[#E2E8F0] mx-auto bg-slate-100"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-[#E2E8F0] mx-auto flex items-center justify-center text-slate-400">
                              <ImageIcon className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </td>

                        {/* ID */}
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-600">
                          #{post.id.slice(-6).toUpperCase()}
                        </td>

                        {/* Message */}
                        <td className="py-2.5 px-4 font-medium text-slate-900 max-w-xs truncate">
                          {post.message}
                        </td>

                        {/* Platform */}
                        <td className="py-2.5 px-4">
                          <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-4 h-4 rounded-xs" />
                        </td>

                        {/* Destination */}
                        <td className="py-2.5 px-4 text-slate-600 font-medium">
                          {firstPage?.name || 'Multiple Pages'}
                        </td>

                        {/* Schedule / Date */}
                        <td className="py-2.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                          {new Date(dateVal).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(dateVal).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>

                        {/* Format */}
                        <td className="py-2.5 px-4 uppercase text-[10px] font-bold text-slate-500">
                          {post.postType}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-4">
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

                        {/* Actions */}
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {post.status === 'failed' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  retryPost(post.id);
                                }}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200"
                              >
                                Retry
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPostForModal(post);
                              }}
                              className="px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-700 hover:text-black hover:bg-slate-100"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-xs text-slate-400">
                      No posts match the search or filter query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-3 bg-[#F8F9FA] border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>
              Showing {filteredSpreadsheetPosts.length} of {posts.length} dispatches
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Click any row to inspect complete details</span>
            </div>
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

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                {/* Week Navigation (Prev / Today / Next) */}
                {calendarView === 'week' && (
                  <div className="flex items-center gap-0.5 bg-[#F8F9FA] p-0.5 rounded-lg border border-[#E2E8F0]">
                    <button
                      type="button"
                      onClick={() => setWeekOffset((w) => w - 1)}
                      className="p-1 rounded-md hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
                      title="Previous Week"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWeekOffset(0);
                        const now = new Date();
                        const dayOfWeek = now.getDay();
                        setSelectedDayIndex(dayOfWeek === 0 ? 6 : dayOfWeek - 1);
                      }}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-700 hover:bg-white hover:text-slate-900 transition-colors"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeekOffset((w) => w + 1)}
                      className="p-1 rounded-md hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
                      title="Next Week"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

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
                {/* Days of Week Header with Clickable Selection, Today Highlight, and Post Counts */}
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {daysWithPosts.map((d, index) => {
                    const isSelected = selectedDayIndex === index;
                    return (
                      <button
                        key={d.isoDate}
                        type="button"
                        onClick={() => setSelectedDayIndex(index)}
                        className={`flex flex-col items-center p-2 rounded-xl transition-all relative ${
                          isSelected
                            ? 'bg-[#F8F9FA] border-2 border-slate-900 shadow-xs ring-1 ring-slate-900'
                            : d.isToday
                            ? 'bg-emerald-50/40 border border-emerald-300 hover:bg-emerald-50'
                            : 'hover:bg-[#F8F9FA] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[10px] font-bold uppercase ${
                              isSelected ? 'text-slate-900 font-black' : 'text-slate-400'
                            }`}
                          >
                            {d.day}
                          </span>
                          {d.isToday && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Today" />
                          )}
                        </div>
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black mt-1 transition-all ${
                            isSelected
                              ? 'bg-slate-900 text-white shadow-xs'
                              : d.isToday
                              ? 'bg-emerald-500 text-white shadow-2xs font-black'
                              : 'text-slate-700'
                          }`}
                        >
                          {d.date}
                        </span>
                        {d.isToday && (
                          <span className="text-[8px] font-black uppercase text-emerald-600 tracking-wider">
                            Today
                          </span>
                        )}
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

          {/* B. Live Day Dispatch Queue & Inspector (4 cols on lg) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm text-slate-900">
                      {activeDay.isToday ? "Today's Dispatch Queue" : "Day Dispatch Queue"}
                    </h3>
                    {activeDay.isToday && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Live Today
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {activeDay.full} • {activeDay.count} {activeDay.count === 1 ? 'post' : 'posts'}
                  </p>
                </div>
                <Link
                  href="/composer"
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-black text-[11px] font-bold text-white transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule</span>
                </Link>
              </div>

              {/* Status Breakdown Bar */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100">
                  <div className="text-[10px] font-bold text-blue-600 uppercase">Scheduled</div>
                  <div className="text-sm font-black text-blue-900 mt-0.5">{activeDayStats.scheduled}</div>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <div className="text-[10px] font-bold text-emerald-600 uppercase">Published</div>
                  <div className="text-sm font-black text-emerald-900 mt-0.5">{activeDayStats.published}</div>
                </div>
                <div className="p-2 rounded-xl bg-rose-50/60 border border-rose-100">
                  <div className="text-[10px] font-bold text-rose-600 uppercase">Failed</div>
                  <div className="text-sm font-black text-rose-900 mt-0.5">{activeDayStats.failed}</div>
                </div>
              </div>

              {/* Queue Filter Chips */}
              <div className="flex items-center gap-1 p-1 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0] overflow-x-auto text-[10px] font-bold">
                {(['all', 'scheduled', 'published', 'failed'] as const).map((filterKey) => {
                  const count =
                    filterKey === 'all'
                      ? activeDay.posts.length
                      : filterKey === 'scheduled'
                      ? activeDayStats.scheduled
                      : filterKey === 'published'
                      ? activeDayStats.published
                      : activeDayStats.failed;
                  const isActive = dayQueueFilter === filterKey;
                  return (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => setDayQueueFilter(filterKey)}
                      className={`flex-1 py-1 px-1.5 rounded-lg capitalize transition-all whitespace-nowrap text-center ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-2xs font-black'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                      }`}
                    >
                      {filterKey} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Scrollable Day Queue Post Cards */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5">
                {filteredDayQueuePosts.length > 0 ? (
                  filteredDayQueuePosts.map((post) => {
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

                    return (
                      <div
                        key={post.id}
                        onClick={() => setSelectedPostForModal(post)}
                        className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] hover:border-slate-400 hover:bg-white transition-all space-y-2 cursor-pointer group shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-500">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{timeStr}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full capitalize font-bold border ${
                              post.status === 'published'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : post.status === 'scheduled'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {post.status}
                          </span>
                        </div>

                        <div className="flex items-start gap-2.5">
                          {post.mediaUrl ? (
                            <img
                              src={post.mediaUrl}
                              alt="thumbnail"
                              className="w-10 h-10 rounded-lg object-cover border border-[#E2E8F0] shrink-0 bg-slate-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-200/60 border border-[#E2E8F0] shrink-0 flex items-center justify-center text-slate-400">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                              {post.message}
                            </p>
                            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5">
                              <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-3.5 h-3.5 rounded-xs" />
                              <span className="truncate font-medium">{firstPage?.name || 'All Pages'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[10px]">
                          <span className="uppercase font-bold text-slate-400 font-mono">
                            {post.postType}
                          </span>
                          <div className="flex items-center gap-2">
                            {post.status === 'failed' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  retryPost(post.id);
                                }}
                                className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 hover:underline"
                              >
                                <RotateCw className="w-2.5 h-2.5" />
                                <span>Retry</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPostForModal(post);
                              }}
                              className="text-slate-700 hover:text-black font-bold hover:underline"
                            >
                              Inspect Details →
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 px-3 rounded-xl bg-[#F8F9FA] border border-dashed border-[#CBD5E1] text-center space-y-2">
                    <Calendar className="w-7 h-7 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">No dispatches in this filter</p>
                    <p className="text-[11px] text-slate-400">
                      Schedule a cross-platform post for {activeDay.day}, {activeDay.date}.
                    </p>
                    <Link
                      href="/composer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 mt-1 rounded-xl bg-slate-900 hover:bg-black text-white text-[11px] font-bold shadow-2xs transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Schedule for this Day</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Engine Health Footer */}
            <div className="pt-3 border-t border-[#E2E8F0] space-y-2 text-[10px] font-medium text-slate-500">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-slate-700">Dispatcher Engine</span>
                </span>
                <span className="font-mono text-emerald-600 font-bold">Active • Anti-Ban On</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Active Targets:</span>
                <span className="font-bold text-slate-700">{totalPages} Connected Pages</span>
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
