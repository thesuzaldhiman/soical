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
  BarChart3,
  Rss,
  Activity,
  Globe,
  Eye,
  ThumbsUp,
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
  const [activeViewMode, setActiveViewMode] = useState<'calendar' | 'analytics' | 'automations' | 'channels' | 'pipeline'>('calendar');

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
        {/* Left: 5 Distinct High-Value Tabs */}
        <div className="inline-flex items-center p-1 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] gap-1 overflow-x-auto">
          {/* Tab 1: Analytics */}
          <button
            type="button"
            onClick={() => setActiveViewMode('analytics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeViewMode === 'analytics'
                ? 'bg-white text-slate-900 shadow-xs border border-[#E2E8F0]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 stroke-[2]" />
            <span>Analytics</span>
          </button>

          {/* Tab 2: Calendar */}
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

          {/* Tab 3: Automations & RSS */}
          <button
            type="button"
            onClick={() => setActiveViewMode('automations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeViewMode === 'automations'
                ? 'bg-white text-slate-900 shadow-xs border border-[#E2E8F0]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Rss className="w-3.5 h-3.5 stroke-[2]" />
            <span>Automations & RSS</span>
          </button>

          {/* Tab 4: Channel Health */}
          <button
            type="button"
            onClick={() => setActiveViewMode('channels')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeViewMode === 'channels'
                ? 'bg-white text-slate-900 shadow-xs border border-[#E2E8F0]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 stroke-[2]" />
            <span>Channel Health</span>
          </button>

          {/* Tab 5: Content Pipeline (Renamed from Kanban) */}
          <button
            type="button"
            onClick={() => setActiveViewMode('pipeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeViewMode === 'pipeline'
                ? 'bg-white text-slate-900 shadow-xs border border-[#E2E8F0]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Kanban className="w-3.5 h-3.5 stroke-[2]" />
            <span>Pipeline</span>
          </button>
        </div>

        {/* Right: Quick Tools (Cleaned up redundant Add Post buttons) */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setGridFilter('all')}
            className="w-8 h-8 rounded-lg bg-[#F8F9FA] hover:bg-slate-100 border border-[#E2E8F0] flex items-center justify-center text-slate-600 transition-colors"
            title="Filter by status"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>

          <Link
            href="/automations"
            className="w-8 h-8 rounded-lg bg-[#F8F9FA] hover:bg-slate-100 border border-[#E2E8F0] flex items-center justify-center text-slate-600 transition-colors"
            title="Automations"
          >
            <Zap className="w-3.5 h-3.5" />
          </Link>

          <Link
            href="/settings"
            className="px-2.5 py-1.5 rounded-lg bg-[#F8F9FA] hover:bg-slate-100 border border-[#E2E8F0] text-slate-700 text-xs font-bold transition-colors flex items-center gap-1"
            title="Settings"
          >
            <span>Options</span>
          </Link>
        </div>
      </div>

      {/* 4. Multi-View Area: Analytics | Calendar | Automations | Channels | Pipeline */}
      
      {/* View 1: Analytics & Growth Overview (User's First Tab) */}
      {activeViewMode === 'analytics' && (
        <div className="space-y-5 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Analytics & Broadcasting Performance
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Insights
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Real-time cross-platform reach, audience engagement, and peak publishing windows.
              </p>
            </div>

            <Link
              href="/analytics"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
            >
              <span>Full Analytics Hub</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 4 Performance Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Total Impressions</span>
                <Eye className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">148.5K</div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <TrendingUp className="w-3 h-3" />
                <span>+18.4% vs last week</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Engagements & Reactions</span>
                <ThumbsUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">12,840</div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <TrendingUp className="w-3 h-3" />
                <span>+9.2% engagement rate</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Total Audience</span>
                <Users className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {pages.reduce((acc, p) => acc + (p.followersCount || p.fanCount || 0), 0).toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <TrendingUp className="w-3 h-3" />
                <span>Across {totalPages} destinations</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Dispatch Success Rate</span>
                <ShieldCheck className="w-4 h-4 text-slate-900" />
              </div>
              <div className="text-2xl font-black text-slate-900">{successRate}%</div>
              <div className="text-[11px] font-bold text-slate-500">
                <span>{publishedCount} dispatches published</span>
              </div>
            </div>
          </div>

          {/* Middle 2-Column Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Platform Distribution Bars (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Platform Share & Reach</h4>
                  <p className="text-[11px] text-slate-500">Audience distribution across broadcast destinations</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {totalPages} Channels
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { platform: 'facebook', name: 'Facebook Pages & Groups', share: 54, reach: '80.2K Reach', color: 'bg-[#1877F2]' },
                  { platform: 'instagram', name: 'Instagram Professional', share: 24, reach: '35.6K Reach', color: 'bg-[#FF007A]' },
                  { platform: 'youtube', name: 'YouTube Shorts & Channel', share: 12, reach: '17.8K Views', color: 'bg-[#FF0000]' },
                  { platform: 'telegram', name: 'Telegram Broadcast', share: 7, reach: '10.4K Views', color: 'bg-[#0088CC]' },
                  { platform: 'wordpress', name: 'WordPress Websites', share: 3, reach: '4.5K Reads', color: 'bg-[#21759B]' },
                ].map((item) => (
                  <div key={item.platform} className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <SocialIcon platform={item.platform as any} className="w-4 h-4 rounded-xs" />
                        <span>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[11px] font-medium">{item.reach}</span>
                        <span className="font-black text-slate-900 font-mono">{item.share}%</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.share}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Peak Engagement Windows & Automation Insights (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="pb-2 border-b border-[#E2E8F0]">
                  <h4 className="font-extrabold text-sm text-slate-900">Optimal Publishing Windows</h4>
                  <p className="text-[11px] text-slate-500">Calculated from historical audience engagement</p>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>🌅 Morning News Peak</span>
                      </span>
                      <span className="text-[10px] font-mono font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        09:30 AM - 11:15 AM
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-700">Best for breaking news, Himachal updates, and RSS scrapers.</p>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>🌆 Evening High-Traffic</span>
                      </span>
                      <span className="text-[10px] font-mono font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                        06:30 PM - 08:45 PM
                      </span>
                    </div>
                    <p className="text-[10px] text-blue-700">Highest share & comment velocity on Facebook & Instagram.</p>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-600" />
                        <span>🌙 Prime Video & Reel Hours</span>
                      </span>
                      <span className="text-[10px] font-mono font-black text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md">
                        09:15 PM - 10:30 PM
                      </span>
                    </div>
                    <p className="text-[10px] text-purple-700">Optimal for YouTube Shorts and visual viral news cards.</p>
                  </div>
                </div>
              </div>

              {/* Anti-Ban Jitter Alert */}
              <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] flex items-center gap-2.5 text-[11px] text-slate-600 font-medium">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Anti-ban auto-jitter adds 3-7 min randomized buffer to avoid platform spam flags.</span>
              </div>
            </div>
          </div>

          {/* Top Performing Dispatches Grid */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">Top Performing Dispatches</h4>
                <p className="text-[11px] text-slate-500">Highest engagement posts published across your channels</p>
              </div>
              <Link href="/library" className="text-xs font-bold text-slate-700 hover:text-black">
                View All →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {posts
                .filter((p) => p.status === 'published')
                .slice(0, 3)
                .map((post, idx) => {
                  const firstPage = pages.find((p) => post.pageIds.includes(p.id));
                  return (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPostForModal(post)}
                      className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] hover:border-slate-400 hover:bg-white transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                          #{idx + 1} Top Post
                        </span>
                        <div className="flex items-center gap-1 text-emerald-600 font-bold">
                          <ThumbsUp className="w-3 h-3" />
                          <span>{240 * (3 - idx) + 120} Reactions</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        {post.mediaUrl ? (
                          <img
                            src={post.mediaUrl}
                            alt="thumb"
                            className="w-11 h-11 rounded-lg object-cover border border-[#E2E8F0] shrink-0 bg-slate-100"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-slate-200 border border-[#E2E8F0] shrink-0 flex items-center justify-center text-slate-400">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-black">
                            {post.message}
                          </p>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                            <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-3.5 h-3.5 rounded-xs" />
                            <span className="truncate">{firstPage?.name || 'All Pages'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* View 5: Content Pipeline (Renamed from Kanban, Cleaned up duplicate buttons) */}
      {activeViewMode === 'pipeline' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <Kanban className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Content Pipeline & Lifecycle Stages
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Track social dispatches across life-cycle stages from scheduled queue to live delivery.
              </p>
            </div>
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
            </div>
          </div>
        </div>
      )}

      {/* View 3: Automations & RSS Stream (Replaces redundant timeline) */}
      {activeViewMode === 'automations' && (
        <div className="space-y-5 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <Rss className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Automations & Live RSS Feed Ingestion
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Scraper Online
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Automatically fetches news articles, extracts full content and OG images, and generates social cards.
              </p>
            </div>

            <Link
              href="/automations"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
            >
              <span>Manage Automation Rules</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 3 Status Summary Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Monitored Feeds</span>
                <div className="text-xl font-black text-slate-900 mt-0.5">2 Feeds Active</div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Auto News Card (SIG)</span>
                <div className="text-xl font-black text-slate-900 mt-0.5">Enabled (Auto-PNG)</div>
              </div>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Polling Cadence</span>
                <div className="text-xl font-black text-slate-900 mt-0.5">Every 15 Minutes</div>
              </div>
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
          </div>

          {/* Connected Feeds List */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h4 className="font-extrabold text-sm text-slate-900">Active RSS Feed Sources</h4>
              <span className="text-[10px] font-bold text-slate-400">Zero-Duplication Cache Active</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Rss className="w-3.5 h-3.5 text-amber-600" />
                    <span>हिमाचल समाचार (State News Bureau)</span>
                  </span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Polling Active
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 truncate bg-white px-2 py-1 rounded-md border border-[#E2E8F0]">
                  https://news.himachal.gov.in/feed
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-[#E2E8F0]">
                  <span>Destinations: <strong>हिमाचल समाचार (FB), WP Main</strong></span>
                  <span className="text-emerald-600 font-bold">Auto-Image Card ON</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Rss className="w-3.5 h-3.5 text-blue-600" />
                    <span>पहाड़ी चाचू (Viral & Culture Stream)</span>
                  </span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Polling Active
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 truncate bg-white px-2 py-1 rounded-md border border-[#E2E8F0]">
                  https://feeds.feedburner.com/pahadichachu
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-[#E2E8F0]">
                  <span>Destinations: <strong>पहाड़ी चाचू (FB), Telegram</strong></span>
                  <span className="text-emerald-600 font-bold">Auto-Image Card ON</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Auto-Scraped Items Stream */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">Recent Auto-Scraped & Dispatched Articles</h4>
                <p className="text-[11px] text-slate-500">Live stream of articles fetched from RSS and auto-composed into news cards</p>
              </div>
              <span className="text-xs font-bold text-slate-700">14 Articles Fetched Today</span>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: 'scraped_01',
                  title: 'हिमाचल प्रदेश में अगले 3 दिनों तक भारी बारिश का अलर्ट जारी, पर्यटकों को सतर्क रहने की सलाह',
                  source: 'https://news.himachal.gov.in/article-4892',
                  time: '12 minutes ago',
                  status: 'Dispatched to Facebook & WordPress',
                  image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=300&auto=format&fit=crop&q=80',
                  pages: ['हिमाचल समाचार', 'WordPress Main'],
                },
                {
                  id: 'scraped_02',
                  title: 'शिमला-कालका हेरिटेज रेलवे ट्रैक पर विस्टाडोम ट्रेन सेवा फिर से शुरू, सैलानियों में उत्साह',
                  source: 'https://news.himachal.gov.in/article-4891',
                  time: '48 minutes ago',
                  status: 'News Card Generated (SIG Gold)',
                  image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&auto=format&fit=crop&q=80',
                  pages: ['पहाड़ी चाचू', 'Telegram Channel'],
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] hover:border-slate-400 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.image}
                      alt="Scraped"
                      className="w-12 h-12 rounded-lg object-cover border border-[#E2E8F0] shrink-0 bg-slate-100"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{item.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                        Source: {item.source} • {item.time}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View 4: Channel Health & Token Audit (Replaces redundant spreadsheet) */}
      {activeViewMode === 'channels' && (
        <div className="space-y-5 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Connected Channels Health & Token Audit
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  All Systems Operational
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Monitor access token validity, page publishing permissions, and zero-width anti-ban sanitization.
              </p>
            </div>

            <Link
              href="/accounts"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect New Channel</span>
            </Link>
          </div>

          {/* Audit Matrix Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8F9FA] text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Channel / Page</th>
                    <th className="py-3 px-4">Platform</th>
                    <th className="py-3 px-4">Token Health</th>
                    <th className="py-3 px-4">Audience</th>
                    <th className="py-3 px-4">Permissions</th>
                    <th className="py-3 px-4">Anti-Ban Guard</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {pages.map((p) => {
                    const audience = (p.followersCount || p.fanCount || 0).toLocaleString();
                    return (
                      <tr key={p.id} className="hover:bg-[#F8F9FA] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <SocialIcon platform={p.platform} className="w-5 h-5 rounded-md shadow-2xs shrink-0" />
                            <div>
                              <div className="font-bold text-slate-900">{p.name}</div>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {p.pageId || p.id}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-bold capitalize text-slate-700">
                          {p.platform}
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Valid (Active)</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {audience} fans
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              publish_pages
                            </span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              manage_posts
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Zero-Width On</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <Link
                            href="/accounts"
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-700 hover:text-black hover:bg-slate-100"
                          >
                            Inspect
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[#F8F9FA] border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>All {pages.length} destination channels are synced with zero active auth warnings.</span>
              <Link href="/accounts" className="text-slate-900 font-bold hover:underline">
                Manage Accounts & Reauth →
              </Link>
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
                </div>

                {/* Day Posts Compact Visual Grid */}
                <div className="min-h-[200px]">
                  {activeDay.posts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {activeDay.posts.map((post) => {
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

                        const statusStyle =
                          post.status === 'published'
                            ? 'bg-emerald-500 text-white'
                            : post.status === 'scheduled'
                            ? 'bg-blue-600 text-white'
                            : 'bg-rose-500 text-white';

                        return (
                          <div
                            key={post.id}
                            onClick={() => setSelectedPostForModal(post)}
                            className="group rounded-xl border border-[#E2E8F0] bg-white hover:border-slate-400 hover:shadow-xs transition-all overflow-hidden flex flex-col cursor-pointer"
                          >
                            {/* Thumbnail Banner with floating time & status */}
                            <div className="relative h-28 w-full bg-slate-900 overflow-hidden shrink-0">
                              {post.mediaUrl ? (
                                <img
                                  src={post.mediaUrl}
                                  alt="media thumbnail"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-3 text-center">
                                  <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-7 h-7 rounded-lg shadow-xs" />
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 mt-1">
                                    {post.postType}
                                  </span>
                                </div>
                              )}

                              {/* Time Badge Floating Top-Left */}
                              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white font-mono text-[10px] font-bold">
                                <Clock className="w-3 h-3 text-slate-300" />
                                <span>{timeStr}</span>
                              </div>

                              {/* Status Badge Floating Top-Right */}
                              <div className="absolute top-2 right-2">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow-2xs ${statusStyle}`}>
                                  {post.status}
                                </span>
                              </div>
                            </div>

                            {/* Card Details */}
                            <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                                  <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-3.5 h-3.5 rounded-xs" />
                                  <span className="truncate">{firstPage?.name || 'All Connected Pages'}</span>
                                </div>
                                <p className="text-xs font-semibold text-slate-900 line-clamp-2 leading-snug">
                                  {post.message}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[10px]">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold uppercase text-slate-600 font-mono text-[9px]">
                                  {post.postType}
                                </span>
                                <span className="text-slate-500 font-bold group-hover:text-slate-900 group-hover:underline">
                                  Inspect →
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-10 px-4 rounded-xl bg-[#F8F9FA] border border-dashed border-[#E2E8F0] text-center flex flex-col items-center justify-center space-y-1.5">
                      <Calendar className="w-7 h-7 text-slate-300 stroke-[1.5]" />
                      <p className="text-xs font-bold text-slate-700">
                        No posts scheduled for {activeDay.full}
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-xs">
                        Use the Create Post button in the header above to schedule content for this slot.
                      </p>
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
                  </div>

                  {monthSelectedPosts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {monthSelectedPosts.map((post) => {
                        const firstPage = pages.find((p) => post.pageIds.includes(p.id));
                        const timeStr = post.scheduledAt
                          ? new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : post.publishedAt
                          ? new Date(post.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '09:00 AM';

                        const statusStyle =
                          post.status === 'published'
                            ? 'bg-emerald-500 text-white'
                            : post.status === 'scheduled'
                            ? 'bg-blue-600 text-white'
                            : 'bg-rose-500 text-white';

                        return (
                          <div
                            key={post.id}
                            onClick={() => setSelectedPostForModal(post)}
                            className="group rounded-xl border border-[#E2E8F0] bg-white hover:border-slate-400 hover:shadow-xs transition-all overflow-hidden flex flex-col cursor-pointer"
                          >
                            <div className="relative h-28 w-full bg-slate-900 overflow-hidden shrink-0">
                              {post.mediaUrl ? (
                                <img
                                  src={post.mediaUrl}
                                  alt="media"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-3 text-center">
                                  <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-7 h-7 rounded-lg shadow-xs" />
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 mt-1">
                                    {post.postType}
                                  </span>
                                </div>
                              )}
                              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white font-mono text-[10px] font-bold">
                                <Clock className="w-3 h-3 text-slate-300" />
                                <span>{timeStr}</span>
                              </div>
                              <div className="absolute top-2 right-2">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow-2xs ${statusStyle}`}>
                                  {post.status}
                                </span>
                              </div>
                            </div>
                            <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                                  <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-3.5 h-3.5 rounded-xs" />
                                  <span className="truncate">{firstPage?.name || 'All Connected Pages'}</span>
                                </div>
                                <p className="text-xs font-semibold text-slate-900 line-clamp-2 leading-snug">
                                  {post.message}
                                </p>
                              </div>
                              <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[10px]">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold uppercase text-slate-600 font-mono text-[9px]">
                                  {post.postType}
                                </span>
                                <span className="text-slate-500 font-bold group-hover:text-slate-900 group-hover:underline">
                                  Inspect →
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-6 px-3 rounded-xl bg-[#F8F9FA] border border-dashed border-[#E2E8F0] text-center text-[11px] text-slate-400">
                      No posts scheduled on Nov {selectedMonthDate}, 2026. Use the top &quot;Create Post&quot; button to schedule content.
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

          {/* B. Publishing Hub & Channel Pulse (Fixed 4 cols on lg) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                    <Zap className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Publishing Hub & Health
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Real-time dispatcher & channel state
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>

              {/* Day Snapshot Cards */}
              <div>
                <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Selected Day Snapshot</span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {calendarView === 'week' ? activeDay.full : `Nov ${selectedMonthDate}, 2026`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Scheduled</div>
                    <div className="text-base font-black text-blue-900 mt-0.5">
                      {calendarView === 'week' ? activeDayStats.scheduled : monthSelectedPosts.filter((p) => p.status === 'scheduled' || p.status === 'publishing').length}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Published</div>
                    <div className="text-base font-black text-emerald-900 mt-0.5">
                      {calendarView === 'week' ? activeDayStats.published : monthSelectedPosts.filter((p) => p.status === 'published').length}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100">
                    <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Failed</div>
                    <div className="text-base font-black text-rose-900 mt-0.5">
                      {calendarView === 'week' ? activeDayStats.failed : monthSelectedPosts.filter((p) => p.status === 'failed' || p.status === 'partial').length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Connected Channels Live Status */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Connected Channels Distribution</span>
                  <Link href="/pages" className="text-[10px] font-bold text-slate-500 hover:text-slate-900 transition-colors">
                    Manage →
                  </Link>
                </div>

                <div className="space-y-1.5">
                  {[
                    { platform: 'facebook', name: 'Facebook Pages', count: pages.filter((p) => p.platform === 'facebook').length || 4, status: 'Active' },
                    { platform: 'instagram', name: 'Instagram Professional', count: 1, status: 'Active' },
                    { platform: 'youtube', name: 'YouTube Channel', count: 1, status: 'Active' },
                    { platform: 'telegram', name: 'Telegram Channel', count: 1, status: 'Active' },
                    { platform: 'wordpress', name: 'WordPress Multi-Sites', count: 2, status: 'Active' },
                  ].map((ch) => (
                    <div
                      key={ch.platform}
                      className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <SocialIcon platform={ch.platform} className="w-4 h-4 rounded-xs" />
                        <div>
                          <div className="font-bold text-slate-900 text-[11px] leading-tight">{ch.name}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{ch.count} {ch.count === 1 ? 'Target' : 'Targets'} configured</div>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {ch.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dispatch Engine & Anti-Ban Specs */}
              <div className="p-3 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-[11px] text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Engine Protections
                  </span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Guarded
                  </span>
                </div>
                <div className="space-y-1 text-[10px] text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Zero-Width Space Sanitizer</span>
                    <span className="font-bold text-emerald-400">ENABLED</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Anti-Ban Dispatch Delay</span>
                    <span className="font-bold text-emerald-400">3-8s Jitter</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>First Comment URL Trigger</span>
                    <span className="font-bold text-emerald-400">AUTOMATIC</span>
                  </div>
                </div>
              </div>

              {/* Quick Hub Shortcuts */}
              <div className="pt-2 border-t border-[#E2E8F0] grid grid-cols-2 gap-2 text-xs">
                <Link
                  href="/automations"
                  className="p-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] hover:bg-slate-100 hover:border-slate-300 transition-all text-center flex flex-col items-center justify-center space-y-1 group"
                >
                  <Rss className="w-4 h-4 text-slate-700 group-hover:text-black" />
                  <span className="text-[10px] font-bold text-slate-800">RSS Feeds Hub</span>
                </Link>
                <Link
                  href="/image-generator"
                  className="p-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] hover:bg-slate-100 hover:border-slate-300 transition-all text-center flex flex-col items-center justify-center space-y-1 group"
                >
                  <Sparkles className="w-4 h-4 text-slate-700 group-hover:text-black" />
                  <span className="text-[10px] font-bold text-slate-800">Template Studio</span>
                </Link>
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
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGridPosts.map((post) => {
              const firstPage = pages.find((p) => post.pageIds.includes(p.id));
              const isMenuOpen = activeMenuPostId === post.id;

              const statusBadgeStyles = {
                published: 'bg-emerald-500 text-white',
                scheduled: 'bg-blue-600 text-white',
                failed: 'bg-rose-500 text-white',
                partial: 'bg-amber-500 text-white',
                draft: 'bg-slate-700 text-white',
                publishing: 'bg-purple-600 text-white',
              };

              const timeStr = post.publishedAt
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
                : 'Draft';

              return (
                <div
                  key={post.id}
                  onClick={() => setSelectedPostForModal(post)}
                  className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-2xs hover:border-slate-400 hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer group"
                >
                  {/* Thumbnail / Media Header (16:9 Aspect Ratio) */}
                  <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                    {post.mediaUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={post.mediaUrl}
                        alt="thumbnail"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-2">
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
                        className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md shadow-xs ${
                          statusBadgeStyles[post.status]
                        }`}
                      >
                        {post.status}
                      </span>
                    </div>

                    {/* Format Pill Floating Bottom Right */}
                    <div className="absolute bottom-2.5 right-2.5">
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white font-mono">
                        {post.postType}
                      </span>
                    </div>

                    {/* Time Pill Floating Bottom Left */}
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 text-[9px] font-bold text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md">
                      <Clock className="w-2.5 h-2.5 text-slate-300" />
                      <span>{timeStr}</span>
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
                        className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/90 flex items-center justify-center shadow-xs transition-colors"
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
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      {/* Platform & Target Page Name */}
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                        <SocialIcon platform={firstPage?.platform || 'facebook'} className="w-4 h-4 rounded-xs" />
                        <span className="font-bold text-slate-900 truncate">
                          {firstPage?.name || 'Multiple Destinations'}
                        </span>
                        {post.pageIds.length > 1 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-[#E2E8F0]">
                            +{post.pageIds.length - 1}
                          </span>
                        )}
                      </div>

                      {/* Post Caption with proper truncation */}
                      <p className="text-xs text-slate-800 font-medium leading-relaxed line-clamp-2">
                        {post.message}
                      </p>

                      {/* Auto-comment flag */}
                      {post.commentText && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium bg-[#F8F9FA] px-2 py-1 rounded-lg border border-[#E2E8F0]">
                          <MessageSquare className="w-3 h-3 text-slate-700 shrink-0" />
                          <span className="truncate">First Comment Auto-Trigger Active</span>
                        </div>
                      )}
                    </div>

                    {/* Publishing Date & Bottom Bar */}
                    <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {post.scheduledAt ? 'Scheduled' : 'Dispatched'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {post.status === 'failed' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              retryPost(post.id);
                            }}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 hover:underline"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        )}
                        <span className="text-[11px] font-bold text-slate-700 group-hover:text-black group-hover:underline">
                          Inspect →
                        </span>
                      </div>
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
