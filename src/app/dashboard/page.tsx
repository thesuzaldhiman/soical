'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import {
  TrendingUp,
  Users,
  Play,
  Heart,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Copy,
  Bookmark,
  Sparkles,
  Share2,
  ExternalLink,
  Check,
  CheckCircle2,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const { user, posts, pages, accounts } = useApp();

  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [copiedCaptionId, setCopiedCaptionId] = useState<string | null>(null);
  const [savedCaptionIds, setSavedCaptionIds] = useState<string[]>([]);

  const handleCopyCaption = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCaptionId(id);
    setTimeout(() => setCopiedCaptionId(null), 2000);
  };

  const handleToggleSave = (id: string) => {
    setSavedCaptionIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-4">
      {/* 1. Header: Welcome & Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Hey Ava! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Here&apos;s what&apos;s happening with your social channels today.
          </p>
        </div>

        {/* Date Range Selector Pill */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#EEF1F6] shadow-2xs self-start sm:self-auto text-xs font-bold text-slate-700 hover:border-slate-300 transition-colors cursor-pointer">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>May 12 – May 18, 2026</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
        </div>
      </div>

      {/* 2. Top 4 Overview Metric Cards with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Engagement */}
        <div className="bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF007A] to-[#FF4E98] flex items-center justify-center text-white shadow-[0_4px_10px_rgba(255,0,122,0.25)]">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-bold text-slate-400">Total Engagement</span>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                24.8K
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 mt-1">
                <span>↗ 18.6%</span>
                <span className="text-slate-400 font-normal">vs May 5 - May 11</span>
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

        {/* Card 2: Followers */}
        <div className="bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7928CA] to-[#9333EA] flex items-center justify-center text-white shadow-[0_4px_10px_rgba(121,40,202,0.25)]">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-bold text-slate-400">Followers</span>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                128.7K
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 mt-1">
                <span>↗ 12.3%</span>
                <span className="text-slate-400 font-normal">vs May 5 - May 11</span>
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

        {/* Card 3: Impressions */}
        <div className="bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00C2FF] to-[#0284C7] flex items-center justify-center text-white shadow-[0_4px_10px_rgba(0,194,255,0.25)]">
              <Play className="w-5 h-5 fill-white stroke-none ml-0.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-400">Impressions</span>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                1.3M
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 mt-1">
                <span>↗ 22.1%</span>
                <span className="text-slate-400 font-normal">vs May 5 - May 11</span>
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

        {/* Card 4: Avg. Engagement Rate */}
        <div className="bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#EC4899] to-[#F43F5E] flex items-center justify-center text-white shadow-[0_4px_10px_rgba(236,72,153,0.25)]">
              <Heart className="w-5 h-5 fill-white stroke-none" />
            </div>
            <span className="text-[11px] font-bold text-slate-400">Avg. Engagement Rate</span>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                5.2%
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 mt-1">
                <span>↗ 8.7%</span>
                <span className="text-slate-400 font-normal">vs May 5 - May 11</span>
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

      {/* 3. Middle Section: Post Calendar (Wide) + Follower Growth + Platform Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* A. Post Calendar (Spans 5 cols on lg) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] flex flex-col justify-between space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F6]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#FF007A]" />
              <h3 className="font-extrabold text-sm text-slate-900">Post Calendar</h3>
            </div>

            <div className="flex items-center gap-2">
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

              {/* Today and Nav Arrows */}
              <button
                type="button"
                className="px-2.5 py-1 rounded-lg bg-[#F6F8FD] hover:bg-[#EEF1F6] text-[11px] font-bold text-slate-700 transition-colors"
              >
                Today
              </button>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  className="w-6 h-6 rounded-md hover:bg-[#F6F8FD] flex items-center justify-center text-slate-500"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="w-6 h-6 rounded-md hover:bg-[#F6F8FD] flex items-center justify-center text-slate-500"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Days of Week Row */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {[
              { day: 'Mon', date: '12', active: false },
              { day: 'Tue', date: '13', active: false },
              { day: 'Wed', date: '14', active: true },
              { day: 'Thu', date: '15', active: false },
              { day: 'Fri', date: '16', active: false },
              { day: 'Sat', date: '17', active: false },
              { day: 'Sun', date: '18', active: false },
            ].map((d, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{d.day}</span>
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black mt-1 ${
                    d.active
                      ? 'bg-[#7928CA] text-white shadow-[0_2px_8px_rgba(121,40,202,0.4)]'
                      : 'text-slate-700 hover:bg-[#F6F8FD]'
                  }`}
                >
                  {d.date}
                </span>
              </div>
            ))}
          </div>

          {/* Calendar Grid with Scheduled Posts */}
          <div className="space-y-3 relative min-h-[190px]">
            {/* Time slot rows */}
            {['9 AM', '12 PM', '3 PM', '6 PM'].map((time) => (
              <div key={time} className="flex items-center gap-2 text-[10px] text-slate-300 font-semibold">
                <span className="w-8 shrink-0">{time}</span>
                <div className="flex-1 border-t border-[#F0F2F6]" />
              </div>
            ))}

            {/* Floating Scheduled Post Badges (Positioned like the screenshot) */}
            <div className="absolute inset-x-8 inset-y-0 grid grid-cols-7 gap-1 pointer-events-auto">
              {/* Mon 9:30 AM (Instagram) */}
              <div className="col-start-1 pt-1">
                <div className="rounded-xl bg-white border border-[#EEF1F6] p-1 shadow-md hover:scale-105 transition-all cursor-pointer">
                  <div className="flex items-center gap-1 text-[9px] font-extrabold text-[#FF007A]">
                    <span>📸</span> 9:30 AM
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=120&auto=format&fit=crop&q=80"
                    alt="post"
                    className="w-full h-9 object-cover rounded-lg mt-1"
                  />
                </div>
              </div>

              {/* Tue 12:00 PM (TikTok) */}
              <div className="col-start-2 pt-10">
                <div className="rounded-xl bg-white border border-[#EEF1F6] p-1 shadow-md hover:scale-105 transition-all cursor-pointer">
                  <div className="flex items-center gap-1 text-[9px] font-extrabold text-slate-900">
                    <span>🎵</span> 12:00 PM
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=120&auto=format&fit=crop&q=80"
                    alt="post"
                    className="w-full h-9 object-cover rounded-lg mt-1"
                  />
                </div>
              </div>

              {/* Thu 9:15 AM (Twitter) */}
              <div className="col-start-4 pt-1">
                <div className="rounded-xl bg-white border border-[#EEF1F6] p-1 shadow-md hover:scale-105 transition-all cursor-pointer">
                  <div className="flex items-center gap-1 text-[9px] font-extrabold text-[#00C2FF]">
                    <span>🐦</span> 9:15 AM
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=120&auto=format&fit=crop&q=80"
                    alt="post"
                    className="w-full h-9 object-cover rounded-lg mt-1"
                  />
                </div>
              </div>

              {/* Fri 12:30 PM (Facebook) */}
              <div className="col-start-5 pt-11">
                <div className="rounded-xl bg-white border border-[#EEF1F6] p-1 shadow-md hover:scale-105 transition-all cursor-pointer">
                  <div className="flex items-center gap-1 text-[9px] font-extrabold text-[#1877F2]">
                    <span>📘</span> 12:30 PM
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=120&auto=format&fit=crop&q=80"
                    alt="post"
                    className="w-full h-8 object-cover rounded-lg mt-1"
                  />
                </div>
              </div>

              {/* Fri 3:45 PM (Instagram) */}
              <div className="col-start-5 pt-28">
                <div className="rounded-xl bg-white border border-[#EEF1F6] p-1 shadow-md hover:scale-105 transition-all cursor-pointer">
                  <div className="flex items-center gap-1 text-[9px] font-extrabold text-[#FF007A]">
                    <span>📸</span> 3:45 PM
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80"
                    alt="post"
                    className="w-full h-8 object-cover rounded-lg mt-1"
                  />
                </div>
              </div>

              {/* Sat 12:15 PM (TikTok) */}
              <div className="col-start-6 pt-10">
                <div className="rounded-xl bg-white border border-[#EEF1F6] p-1 shadow-md hover:scale-105 transition-all cursor-pointer">
                  <div className="flex items-center gap-1 text-[9px] font-extrabold text-slate-900">
                    <span>🎵</span> 12:15 PM
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
                    alt="post"
                    className="w-full h-9 object-cover rounded-lg mt-1"
                  />
                </div>
              </div>

              {/* Sun 6:00 PM (YouTube) */}
              <div className="col-start-7 pt-28">
                <div className="rounded-xl bg-white border border-[#EEF1F6] p-1 shadow-md hover:scale-105 transition-all cursor-pointer">
                  <div className="flex items-center gap-1 text-[9px] font-extrabold text-[#FF0000]">
                    <span>▶️</span> 6:00 PM
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=120&auto=format&fit=crop&q=80"
                    alt="post"
                    className="w-full h-8 object-cover rounded-lg mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="pt-2 border-t border-[#F0F2F6] flex items-center justify-between text-[10px] font-bold text-slate-500 flex-wrap gap-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF007A]" /> Instagram
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-900" /> TikTok
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00C2FF]" /> Twitter
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1877F2]" /> Facebook
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF0000]" /> YouTube
            </span>
          </div>
        </div>

        {/* B. Follower Growth Area Chart (Spans 4 cols on lg) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Follower Growth</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-black text-slate-900">128.7K</span>
                <span className="text-[11px] font-bold text-emerald-500">↗ 12.3%</span>
              </div>
              <span className="text-[10px] text-slate-400">vs Apr 12 – May 11</span>
            </div>

            <Link
              href="/analytics"
              className="text-[11px] font-bold text-slate-700 hover:text-[#FF007A] px-2.5 py-1 rounded-lg border border-[#EEF1F6] hover:bg-[#F6F8FD] transition-colors"
            >
              View Details
            </Link>
          </div>

          {/* SVG Area Chart */}
          <div className="relative h-44 w-full">
            <svg viewBox="0 0 300 160" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="30" y1="20" x2="290" y2="20" stroke="#F1F5F9" strokeDasharray="3 3" />
              <line x1="30" y1="60" x2="290" y2="60" stroke="#F1F5F9" strokeDasharray="3 3" />
              <line x1="30" y1="100" x2="290" y2="100" stroke="#F1F5F9" strokeDasharray="3 3" />
              <line x1="30" y1="140" x2="290" y2="140" stroke="#F1F5F9" />

              {/* Y Axis Labels */}
              <text x="5" y="24" fill="#94A3B8" fontSize="9" fontWeight="bold">140K</text>
              <text x="5" y="64" fill="#94A3B8" fontSize="9" fontWeight="bold">120K</text>
              <text x="5" y="104" fill="#94A3B8" fontSize="9" fontWeight="bold">100K</text>
              <text x="8" y="144" fill="#94A3B8" fontSize="9" fontWeight="bold">80K</text>

              {/* Area */}
              <path
                d="M 35 130 Q 80 120, 110 95 T 180 80 T 240 50 T 285 30 L 285 140 L 35 140 Z"
                fill="url(#growthGrad)"
              />

              {/* Line */}
              <path
                d="M 35 130 Q 80 120, 110 95 T 180 80 T 240 50 T 285 30"
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Active data point circle */}
              <circle cx="285" cy="30" r="4.5" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="2.5" />
            </svg>

            {/* Badge callout on top point */}
            <div className="absolute right-0 top-0 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[9px] font-bold shadow-xs">
              128.7K May 11
            </div>

            {/* X Axis Labels */}
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-1 px-8">
              <span>Apr 12</span>
              <span>Apr 26</span>
              <span>May 10</span>
            </div>
          </div>
        </div>

        {/* C. Platform Breakdown Donut Chart (Spans 3 cols on lg) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] flex flex-col justify-between space-y-4">
          <div className="pb-2 border-b border-[#F0F2F6]">
            <h3 className="font-extrabold text-sm text-slate-900">Platform Breakdown</h3>
          </div>

          {/* SVG Donut Chart with Center Text */}
          <div className="relative w-36 h-36 mx-auto my-1 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {/* Instagram (45.6%) */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#FF007A"
                strokeWidth="13"
                strokeDasharray="109 239"
                strokeDashoffset="0"
              />
              {/* TikTok (25.8%) */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#0F172A"
                strokeWidth="13"
                strokeDasharray="62 239"
                strokeDashoffset="-109"
              />
              {/* Facebook (15.4%) */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#1877F2"
                strokeWidth="13"
                strokeDasharray="37 239"
                strokeDashoffset="-171"
              />
              {/* Twitter / Threads (8.7%) */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#00C2FF"
                strokeWidth="13"
                strokeDasharray="21 239"
                strokeDashoffset="-208"
              />
              {/* YouTube (4.5%) */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#FF0000"
                strokeWidth="13"
                strokeDasharray="10 239"
                strokeDashoffset="-229"
              />
            </svg>

            {/* Inner Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                Total Engagement
              </span>
              <span className="text-base font-black text-slate-900 leading-tight">
                24.8K
              </span>
            </div>
          </div>

          {/* Platform Percentages List */}
          <div className="space-y-1.5 text-xs font-semibold text-slate-700">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF007A]" /> Instagram
              </span>
              <span className="font-bold text-slate-900">45.6% <span className="text-slate-400 font-normal text-[10px]">11.3K</span></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-900" /> TikTok
              </span>
              <span className="font-bold text-slate-900">25.8% <span className="text-slate-400 font-normal text-[10px]">6.4K</span></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1877F2]" /> Facebook
              </span>
              <span className="font-bold text-slate-900">15.4% <span className="text-slate-400 font-normal text-[10px]">3.8K</span></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00C2FF]" /> Twitter
              </span>
              <span className="font-bold text-slate-900">8.7% <span className="text-slate-400 font-normal text-[10px]">2.1K</span></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF0000]" /> YouTube
              </span>
              <span className="font-bold text-slate-900">4.5% <span className="text-slate-400 font-normal text-[10px]">1.1K</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Campaign Performance + Top Content + AI Caption Ideas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* A. Campaign Performance */}
        <div className="bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0F2F6]">
            <h3 className="font-extrabold text-sm text-slate-900">Campaign Performance</h3>
            <Link
              href="/automations"
              className="text-[11px] font-bold text-slate-500 hover:text-[#FF007A]"
            >
              View All
            </Link>
          </div>

          {/* Featured Campaign Card */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=120&auto=format&fit=crop&q=80"
                alt="campaign"
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-pink-100 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-extrabold text-xs text-slate-900 truncate">
                    Summer Glow Collection
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-200">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  May 1 – May 31, 2026
                </p>
              </div>
            </div>

            {/* 4 Campaign Metrics */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#F0F2F6] text-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Reach</span>
                <div className="font-black text-slate-900 text-xs mt-0.5">320.7K</div>
                <div className="text-[9px] font-bold text-emerald-500">↗ 23.4%</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Engagement</span>
                <div className="font-black text-slate-900 text-xs mt-0.5">18.6K</div>
                <div className="text-[9px] font-bold text-emerald-500">↗ 18.7%</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Clicks</span>
                <div className="font-black text-slate-900 text-xs mt-0.5">7.2K</div>
                <div className="text-[9px] font-bold text-emerald-500">↗ 35.1%</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Conversions</span>
                <div className="font-black text-slate-900 text-xs mt-0.5">1.3K</div>
                <div className="text-[9px] font-bold text-emerald-500">↗ 28.6%</div>
              </div>
            </div>

            {/* Budget Progress Bar */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500 font-medium">Budget Used</span>
                <span className="font-black text-slate-900">72%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#F0F2F6] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7928CA] to-[#FF007A]"
                  style={{ width: '72%' }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 text-right">
            <Link
              href="/analytics"
              className="text-xs font-bold text-[#7928CA] hover:text-[#FF007A] transition-colors"
            >
              View Report →
            </Link>
          </div>
        </div>

        {/* B. Top Content */}
        <div className="bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0F2F6]">
            <h3 className="font-extrabold text-sm text-slate-900">Top Content</h3>
            <Link
              href="/library"
              className="text-[11px] font-bold text-slate-500 hover:text-[#FF007A]"
            >
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {/* Rank 1 */}
            <div className="flex items-center gap-3 group">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black flex items-center justify-center shrink-0">
                1
              </span>
              <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1512290900672-1f41d926efb8?w=120&auto=format&fit=crop&q=80"
                  alt="top-1"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <span className="absolute bottom-0.5 right-0.5 text-[9px]">📸</span>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs text-slate-900 truncate">
                  5 Skincare Tips for Glowing Skin ✨
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">May 8, 2026</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-black text-slate-900">9.8K</div>
                <div className="text-[10px] font-bold text-emerald-500">↗ 24.5%</div>
              </div>
            </div>

            {/* Rank 2 */}
            <div className="flex items-center gap-3 group">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center shrink-0">
                2
              </span>
              <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80"
                  alt="top-2"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <span className="absolute bottom-0.5 right-0.5 text-[9px]">🎵</span>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs text-slate-900 truncate">
                  Morning Routine in 60 Sec ⚡
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">May 6, 2026</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-black text-slate-900">7.6K</div>
                <div className="text-[10px] font-bold text-emerald-500">↗ 18.2%</div>
              </div>
            </div>

            {/* Rank 3 */}
            <div className="flex items-center gap-3 group">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black flex items-center justify-center shrink-0">
                3
              </span>
              <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=120&auto=format&fit=crop&q=80"
                  alt="top-3"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <span className="absolute bottom-0.5 right-0.5 text-[9px]">🐦</span>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs text-slate-900 truncate">
                  Productivity Hacks You Must Try 🚀
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">May 4, 2026</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-black text-slate-900">6.3K</div>
                <div className="text-[10px] font-bold text-emerald-500">↗ 15.7%</div>
              </div>
            </div>
          </div>

          <div className="pt-2 text-center border-t border-[#F0F2F6]">
            <Link
              href="/library"
              className="text-xs font-bold text-slate-600 hover:text-[#FF007A] transition-colors"
            >
              Browse 42+ Posts
            </Link>
          </div>
        </div>

        {/* C. AI Caption Ideas */}
        <div className="bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0F2F6]">
            <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-sm">
              <Sparkles className="w-4 h-4 text-[#7928CA]" />
              <span>AI Caption Ideas</span>
            </div>

            <button
              type="button"
              className="px-2.5 py-1 rounded-lg border border-[#EEF1F6] hover:bg-[#F6F8FD] text-[11px] font-bold text-[#7928CA] transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Generate More</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {[
              {
                id: 'cap_1',
                text: '“Sunshine, good vibes, and glowing skin. That’s the mood today. 💖✨”',
                chips: [
                  { label: 'Friendly', color: 'bg-pink-50 text-pink-700' },
                  { label: 'Bright', color: 'bg-amber-50 text-amber-700' },
                  { label: 'Popular', color: 'bg-purple-50 text-purple-700' },
                ],
              },
              {
                id: 'cap_2',
                text: '“Confidence is the best glow. Wear it daily. ✨”',
                chips: [
                  { label: 'Motivational', color: 'bg-blue-50 text-blue-700' },
                  { label: 'Short', color: 'bg-slate-100 text-slate-700' },
                ],
              },
              {
                id: 'cap_3',
                text: '“Skincare isn’t a trend, it’s a lifestyle. Invest in your skin, it will thank you.”',
                chips: [
                  { label: 'Warm', color: 'bg-rose-50 text-rose-700' },
                  { label: 'Engaging', color: 'bg-emerald-50 text-emerald-700' },
                ],
              },
            ].map((cap) => {
              const isCopied = copiedCaptionId === cap.id;
              const isSaved = savedCaptionIds.includes(cap.id);

              return (
                <div
                  key={cap.id}
                  className="p-3 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] space-y-2 hover:border-[#FF007A]/40 transition-all"
                >
                  <p className="text-xs text-slate-800 font-medium leading-relaxed italic">
                    {cap.text}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {cap.chips.map((chip, idx) => (
                        <span
                          key={idx}
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${chip.color}`}
                        >
                          {chip.label}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyCaption(cap.id, cap.text)}
                        className="w-6 h-6 rounded-md hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors"
                        title="Copy"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSave(cap.id)}
                        className={`w-6 h-6 rounded-md hover:bg-white flex items-center justify-center transition-colors ${
                          isSaved
                            ? 'text-[#FF007A]'
                            : 'text-slate-400 hover:text-slate-800'
                        }`}
                        title="Save"
                      >
                        <Bookmark
                          className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#FF007A]' : ''}`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Sticky / Bottom Full-Width AI Assistant Banner (Exact Match to Screenshot) */}
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-[#FF007A] via-[#7928CA] to-[#00C2FF] text-white shadow-[0_8px_25px_rgba(255,0,122,0.22)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
            <Sparkles className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-tight">AI Assistant</span>
            </div>
            <p className="text-xs text-white/90 font-medium mt-0.5">
              Need help with content ideas, captions, or strategy?
            </p>
          </div>
        </div>

        <Link
          href="/composer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 font-extrabold text-xs shadow-md hover:bg-slate-50 transition-all active:scale-[0.98] shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#FF007A]" />
          <span>Ask AI Assistant</span>
        </Link>
      </div>
    </div>
  );
}
