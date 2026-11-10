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

  // Calendar View State
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(2); // Default Wednesday (index 2)

  // Recent Posts Grid Filters
  const [gridFilter, setGridFilter] = useState<'all' | 'published' | 'scheduled' | 'failed'>('all');
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);

  // Dynamic Live Statistics
  const totalAccounts = accounts.length;
  const totalPages = pages.length;
  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;
  const failedCount = posts.filter((p) => p.status === 'failed').length;
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

  // Calendar Days Definition (7 days of current week)
  const calendarDays = [
    { day: 'Mon', date: '10', full: 'Nov 10' },
    { day: 'Tue', date: '11', full: 'Nov 11' },
    { day: 'Wed', date: '12', full: 'Nov 12' },
    { day: 'Thu', date: '13', full: 'Nov 13' },
    { day: 'Fri', date: '14', full: 'Nov 14' },
    { day: 'Sat', date: '15', full: 'Nov 15' },
    { day: 'Sun', date: '16', full: 'Nov 16' },
  ];

  // Filtered posts for Recent Posts Grid
  const filteredGridPosts = useMemo(() => {
    return posts.filter((p) => {
      if (gridFilter === 'all') return true;
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

          {/* Days of Week Header with Clickable Selection */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((d, index) => {
              const isSelected = selectedDayIndex === index;
              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => setSelectedDayIndex(index)}
                  className={`flex flex-col items-center p-1.5 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-[#F8F9FD] border border-[#EEF1F6]'
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
                </button>
              );
            })}
          </div>

          {/* Calendar Grid with Real Scheduled Slots */}
          <div className="space-y-4 pt-1">
            {/* Time Slot Rows with visual scheduled cards */}
            <div className="space-y-3">
              {/* Morning Slot (9:00 AM) */}
              <div className="p-3 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-16 shrink-0 text-[10px] font-black uppercase text-slate-400">
                    09:00 AM
                  </span>
                  <div className="w-2 h-2 rounded-full bg-[#FF007A]" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">📸</span>
                      <span className="font-bold text-xs text-slate-900 truncate">
                        Instagram & Facebook Morning Story Dispatch
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      Target: Devbhoomi Today • 32,600 followers
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    Queued
                  </span>
                  <Link
                    href="/composer"
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Edit
                  </Link>
                </div>
              </div>

              {/* Noon Slot (12:30 PM) */}
              <div className="p-3 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-16 shrink-0 text-[10px] font-black uppercase text-slate-400">
                    12:30 PM
                  </span>
                  <div className="w-2 h-2 rounded-full bg-[#1877F2]" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">📘</span>
                      <span className="font-bold text-xs text-slate-900 truncate">
                        Himachal Snowfall Alert News & Travel Advisory
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      Target: Himachali Samachar Official (Facebook Page) + Auto Comment
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Published
                  </span>
                  <Link
                    href="/library"
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                  >
                    View
                  </Link>
                </div>
              </div>

              {/* Evening Slot (06:00 PM) */}
              <div className="p-3 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-16 shrink-0 text-[10px] font-black uppercase text-slate-400">
                    06:00 PM
                  </span>
                  <div className="w-2 h-2 rounded-full bg-[#FF0000]" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">▶️</span>
                      <span className="font-bold text-xs text-slate-900 truncate">
                        Rohtang Pass Snowfall Video Shorts Dispatch
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      Target: YouTube Shorts Channel (92,000 subscribers)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Scheduled
                  </span>
                  <Link
                    href="/composer"
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Reschedule
                  </Link>
                </div>
              </div>

              {/* Night Slot (09:00 PM) */}
              <div className="p-3 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-16 shrink-0 text-[10px] font-black uppercase text-slate-400">
                    09:00 PM
                  </span>
                  <div className="w-2 h-2 rounded-full bg-[#0088CC]" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">✈️</span>
                      <span className="font-bold text-xs text-slate-900 truncate">
                        Evening Breaking News Bulletin Broadcast
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      Target: Himachal News Telegram Channel (18,400 members)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    Queued
                  </span>
                  <Link
                    href="/composer"
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          </div>

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
                  className="bg-white rounded-2xl border border-[#EEF1F6] overflow-hidden shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  {/* Thumbnail / Media Header */}
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
                    <div className="absolute top-3 right-3 relative">
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
                        <div className="absolute right-0 top-8 w-36 bg-white rounded-xl border border-[#EEF1F6] shadow-lg p-1.5 z-20 space-y-1 animate-fade-in text-xs">
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
    </div>
  );
}
