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
} from 'lucide-react';

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
    <div className="space-y-7 font-sans animate-fade-in pb-8">
      {/* 1. Header: Welcome & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Welcome Back, {user.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Workspace: <strong className="text-slate-800">{workspace.name}</strong> • Multi-channel auto-dispatch active across {totalPages} pages.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Date Range Picker Pill */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#EEF1F6] shadow-2xs text-xs font-bold text-slate-700 hover:border-slate-300 transition-colors cursor-pointer">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Nov 10 – Nov 16, 2026</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </div>

          {/* + Create Post Button */}
          <Link
            href="/composer"
            className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF007A] to-[#FF2E93] hover:from-[#E6006E] hover:to-[#E62080] text-white text-xs font-bold transition-all shadow-[0_4px_14px_rgba(255,0,122,0.3)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Post</span>
          </Link>
        </div>
      </div>

      {/* 2. Top 4 Overview Metric Cards with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Published Posts */}
        <div className="bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF007A] to-[#FF4E98] flex items-center justify-center text-white shadow-[0_4px_10px_rgba(255,0,122,0.25)]">
              <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <Link
              href="/library?status=published"
              className="text-[11px] font-bold text-slate-400 hover:text-[#FF007A] flex items-center gap-0.5 transition-colors"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {publishedCount}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 mt-1">
                <span>↗ 14.2%</span>
                <span className="text-slate-400 font-normal">published posts</span>
              </div>
            </div>

            {/* Pink Sparkline SVG */}
            <div className="w-24 h-10 shrink-0">
              <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                <path
                  d="M0 32 Q 20 28, 35 34 T 65 18 T 85 24 T 100 8"
                  fill="none"
                  stroke="#FF007A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Scheduled in Queue */}
        <div className="bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7928CA] to-[#9333EA] flex items-center justify-center text-white shadow-[0_4px_10px_rgba(121,40,202,0.25)]">
              <Clock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <Link
              href="/library?status=scheduled"
              className="text-[11px] font-bold text-slate-400 hover:text-[#7928CA] flex items-center gap-0.5 transition-colors"
            >
              <span>View Queue</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {scheduledCount}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-blue-500 mt-1">
                <span>● In Queue</span>
                <span className="text-slate-400 font-normal">ready to dispatch</span>
              </div>
            </div>

            {/* Purple Sparkline SVG */}
            <div className="w-24 h-10 shrink-0">
              <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                <path
                  d="M0 35 Q 25 35, 45 22 T 75 25 T 100 6"
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 3: Active Connected Accounts */}
        <div className="bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00C2FF] to-[#0284C7] flex items-center justify-center text-white shadow-[0_4px_10px_rgba(0,194,255,0.25)]">
              <Share2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <Link
              href="/accounts"
              className="text-[11px] font-bold text-slate-400 hover:text-[#00C2FF] flex items-center gap-0.5 transition-colors"
            >
              <span>Manage</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {totalAccounts}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 mt-1">
                <span>{totalPages} Pages</span>
                <span className="text-slate-400 font-normal">across platforms</span>
              </div>
            </div>

            {/* Cyan Sparkline SVG */}
            <div className="w-24 h-10 shrink-0">
              <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                <path
                  d="M0 30 Q 30 38, 55 24 T 80 18 T 100 5"
                  fill="none"
                  stroke="#00C2FF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 4: Delivery Success Rate */}
        <div className="bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#EC4899] to-[#F43F5E] flex items-center justify-center text-white shadow-[0_4px_10px_rgba(236,72,153,0.25)]">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Anti-Ban Active
            </span>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {successRate}%
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 mt-1">
                <span>0 API blocks</span>
                <span className="text-slate-400 font-normal">this month</span>
              </div>
            </div>

            {/* Magenta Sparkline SVG */}
            <div className="w-24 h-10 shrink-0">
              <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                <path
                  d="M0 34 Q 25 30, 45 35 T 75 16 T 100 10"
                  fill="none"
                  stroke="#EC4899"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Interactive Content Calendar + Platform Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* A. Post Calendar & Scheduling Matrix (8 cols on lg) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] flex flex-col justify-between space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F2F6]">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#FF007A]" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Content Calendar & Publishing Slots
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Visual publishing schedule mapped to your connected social channels.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* Week / Month Switcher */}
              <div className="inline-flex items-center p-0.5 rounded-lg bg-[#F6F8FD] border border-[#EEF1F6]">
                <button
                  type="button"
                  onClick={() => setCalendarView('week')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    calendarView === 'week'
                      ? 'bg-gradient-to-r from-[#7928CA] to-[#9333EA] text-white shadow-xs'
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
                      ? 'bg-gradient-to-r from-[#7928CA] to-[#9333EA] text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Month
                </button>
              </div>

              {/* Schedule Post Action */}
              <Link
                href="/composer"
                className="px-2.5 py-1 rounded-lg bg-[#F6F8FD] hover:bg-[#EEF1F6] text-[11px] font-bold text-slate-700 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-[#FF007A]" />
                <span>Add Post</span>
              </Link>
            </div>
          </div>

          {/* Calendar View Switcher Content */}
          {calendarView === 'week' ? (
            <div className="space-y-4">
              {/* Days of Week Header with Clickable Selection */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {daysWithPosts.map((d, index) => {
                  const isSelected = selectedDayIndex === index;
                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => setSelectedDayIndex(index)}
                      className={`flex flex-col items-center p-2 rounded-xl transition-all relative ${
                        isSelected
                          ? 'bg-[#F8F9FD] border border-[#EEF1F6] shadow-xs'
                          : 'hover:bg-[#F6F8FD]'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{d.day}</span>
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black mt-1 transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#FF007A] to-[#FF4E98] text-white shadow-[0_2px_8px_rgba(255,0,122,0.35)]'
                            : 'text-slate-700'
                        }`}
                      >
                        {d.date}
                      </span>
                      {d.count > 0 && (
                        <span
                          className={`mt-1 w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-[#FF007A]' : 'bg-[#FF007A]/60'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Day Timeline Header */}
              <div className="flex items-center justify-between pt-1 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900">
                    Schedule for {activeDay.full}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-[#FF007A] border border-pink-100">
                    {activeDay.count} {activeDay.count === 1 ? 'Post' : 'Posts'}
                  </span>
                </div>
                <Link
                  href="/composer"
                  className="text-[11px] font-bold text-[#FF007A] hover:underline flex items-center gap-1"
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
                        className="p-3 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-16 shrink-0 text-[10px] font-black uppercase text-slate-400">
                            {timeStr}
                          </span>
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                platformColors[firstPage?.platform || 'facebook'] || '#FF007A',
                            }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">
                                {platformIcons[firstPage?.platform || 'facebook']}
                              </span>
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
                            className="text-[11px] font-bold text-slate-600 hover:text-[#FF007A] transition-colors px-2 py-1 rounded-lg hover:bg-white"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 px-4 rounded-xl bg-[#F8F9FD] border border-dashed border-[#EEF1F6] text-center flex flex-col items-center justify-center space-y-2">
                    <Calendar className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                    <p className="text-xs font-bold text-slate-700">
                      No posts scheduled for {activeDay.full}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                      Queue up breaking news updates, videos, or scheduled articles for this date.
                    </p>
                    <Link
                      href="/composer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-xl bg-gradient-to-r from-[#FF007A] to-[#FF4E98] text-white text-[11px] font-bold shadow-xs hover:scale-105 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Post for this Day</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Month Calendar Grid */
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-black text-slate-900">November 2026</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {posts.length} total posts this month
                </span>
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
                {monthDays.map((d) => (
                  <div
                    key={d.dateNum}
                    className={`h-12 p-1 rounded-xl border flex flex-col justify-between transition-all ${
                      d.hasPosts
                        ? 'bg-pink-50/40 border-pink-200'
                        : 'bg-[#F8F9FD] border-[#EEF1F6]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-700">{d.dateNum}</span>
                      {d.hasPosts && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF007A]" />
                      )}
                    </div>
                    {d.hasPosts && (
                      <span className="text-[9px] font-black text-[#FF007A] truncate">
                        {d.count} {d.count === 1 ? 'post' : 'posts'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="pt-2 border-t border-[#F0F2F6] flex items-center justify-between text-[10px] font-bold text-slate-500 flex-wrap gap-2">
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
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0F2F6]">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Platform Distribution</h3>
              <p className="text-[11px] text-slate-400">Broadcasting network status</p>
            </div>
            <Link
              href="/accounts"
              className="text-[11px] font-bold text-[#FF007A] hover:underline"
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
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6]">
              <div className="flex items-center gap-2">
                <span className="text-base">📘</span>
                <div>
                  <div className="font-bold text-slate-900 leading-tight">Facebook</div>
                  <span className="text-[10px] text-slate-400">Pages & Groups</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-900">4 Pages</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6]">
              <div className="flex items-center gap-2">
                <span className="text-base">📸</span>
                <div>
                  <div className="font-bold text-slate-900 leading-tight">Instagram</div>
                  <span className="text-[10px] text-slate-400">Creator & Business</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-900">1 Account</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6]">
              <div className="flex items-center gap-2">
                <span className="text-base">▶️</span>
                <div>
                  <div className="font-bold text-slate-900 leading-tight">YouTube</div>
                  <span className="text-[10px] text-slate-400">Shorts & Videos</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-900">1 Channel</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6]">
              <div className="flex items-center gap-2">
                <span className="text-base">✈️</span>
                <div>
                  <div className="font-bold text-slate-900 leading-tight">Telegram</div>
                  <span className="text-[10px] text-slate-400">Broadcast Channel</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-900">1 Channel</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recent Posts & Dispatch Queue (Interactive Responsive Grid) */}
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
            <div className="inline-flex items-center p-1 rounded-xl bg-white border border-[#EEF1F6] shadow-2xs">
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
                        ? 'bg-gradient-to-r from-[#FF007A] to-[#FF4E98] text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <span>{status}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        gridFilter === status
                          ? 'bg-white/25 text-white'
                          : 'bg-[#F0F2F6] text-slate-600'
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
              className="text-xs font-bold text-[#FF007A] hover:underline flex items-center gap-1 shrink-0"
            >
              <span>View Library</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 3-Column Grid on Desktop, 2 on Tablet, 1 on Mobile */}
        {filteredGridPosts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#EEF1F6] p-12 text-center shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)]">
            <Share2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No posts in this filter</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are currently no posts matching the selected status ({gridFilter}).
            </p>
            <Link
              href="/composer"
              className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 rounded-xl bg-gradient-to-r from-[#FF007A] to-[#FF4E98] text-white text-xs font-bold shadow-sm hover:scale-105 transition-all"
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
                  className="bg-white rounded-2xl border border-[#EEF1F6] overflow-hidden shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] hover:border-[#FF007A]/40 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
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
                      <div className="w-full h-full bg-gradient-to-tr from-slate-900 to-slate-800 flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-1">
                        <span className="text-2xl">{platformIcons[firstPage?.platform || 'facebook']}</span>
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
                        <div className="absolute right-0 top-8 w-36 bg-white rounded-xl border border-[#EEF1F6] shadow-xl p-1.5 z-30 space-y-1 animate-fade-in text-xs">
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
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#F8F9FD] text-slate-700 font-medium transition-colors"
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
                        <span className="text-base shrink-0">
                          {platformIcons[firstPage?.platform || 'facebook']}
                        </span>
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
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium bg-[#F8F9FD] p-1.5 rounded-lg border border-[#EEF1F6]">
                          <MessageSquare className="w-3 h-3 text-[#FF007A]" />
                          <span className="truncate">First Comment Auto-Trigger</span>
                        </div>
                      )}
                    </div>

                    {/* Publishing Date & Bottom Bar */}
                    <div className="pt-3 border-t border-[#F0F2F6] flex items-center justify-between text-[11px] text-slate-400 font-medium">
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

                      <span className="capitalize text-[10px] font-bold text-slate-600 px-2 py-0.5 rounded bg-[#F8F9FD] border border-[#EEF1F6]">
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

      {/* 5. Detailed Post Inspection Modal */}
      {selectedPostForModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => setSelectedPostForModal(null)}
        >
          <div
            className="bg-white rounded-3xl border border-[#EEF1F6] shadow-2xl max-w-2xl w-full p-6 space-y-5 overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F6]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF007A] to-[#FF4E98] flex items-center justify-center text-white shadow-xs">
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
                  className="w-8 h-8 rounded-xl bg-[#F8F9FD] hover:bg-[#EEF1F6] text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Media & Caption Preview */}
            <div className="space-y-3">
              {selectedPostForModal.mediaUrl && (
                <div className="rounded-xl overflow-hidden max-h-56 w-full bg-slate-900 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedPostForModal.mediaUrl}
                    alt="post preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] space-y-1.5">
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
                <div className="p-3 rounded-xl bg-pink-50/50 border border-pink-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FF007A]">
                    <MessageSquare className="w-3 h-3" />
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
                      className="p-2.5 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] flex items-center justify-between text-xs font-medium"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">
                          {platformIcons[pg?.platform || 'facebook']}
                        </span>
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
            <div className="pt-3 border-t border-[#F0F2F6] flex items-center justify-between flex-wrap gap-2">
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
                  className="px-3.5 py-2 rounded-xl bg-[#F6F8FD] hover:bg-[#EEF1F6] text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Reschedule / Edit</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setSelectedPostForModal(null)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF007A] to-[#FF4E98] text-white text-xs font-bold transition-all shadow-xs"
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
