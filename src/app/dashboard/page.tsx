'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import {
  Users2,
  Clock,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Kanban,
  Calendar as CalendarIcon,
  Table as TableIcon,
  GitCommitHorizontal,
  Filter,
  ArrowUpDown,
  Zap,
  Search,
  MoreHorizontal,
  Plus,
  Link as LinkIcon,
  MessageSquare,
  AlertCircle,
  Play,
  RotateCw,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const { user, workspace, pages, posts, retryPost } = useApp();

  const [activeView, setActiveView] = useState<'kanban' | 'timeline' | 'spreadsheet' | 'calendar'>('kanban');
  const [filterQuery, setFilterQuery] = useState('');

  const activePages = pages.filter((p) => p.isActive);
  const scheduledPosts = posts.filter((p) => p.status === 'scheduled');
  const publishedPosts = posts.filter((p) => p.status === 'published');
  const failedPosts = posts.filter((p) => p.status === 'failed');
  const draftPosts = posts.filter((p) => p.status === 'draft');

  // Realistic fallback demo items to populate columns nicely like screenshot
  const allBoardPosts = [
    ...posts,
    {
      id: 'pst_demo_1',
      workspaceId: workspace.id,
      postType: 'text' as const,
      message: 'Design Wireframes for News Homepage & Video Short Player',
      linkUrl: '',
      pageIds: ['pg_1', 'pg_2'],
      status: 'draft' as const,
      createdAt: '2026-11-08T10:00:00.000Z',
      updatedAt: '2026-11-08T10:00:00.000Z',
      results: [],
    },
    {
      id: 'pst_demo_2',
      workspaceId: workspace.id,
      postType: 'image' as const,
      message: 'Partone Consultancy Special Report on Tourism & Winter Economy',
      mediaUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
      pageIds: ['pg_1', 'pg_3', 'pg_7'],
      status: 'draft' as const,
      createdAt: '2026-11-09T14:30:00.000Z',
      updatedAt: '2026-11-09T14:30:00.000Z',
      results: [],
    },
  ];

  const platformIcons: Record<string, string> = {
    facebook: '📘',
    instagram: '📸',
    threads: '🧵',
    telegram: '✈️',
    youtube: '▶️',
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* 1. Welcome Greeting Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Welcome Back {user.name.split(' ')[0]}..!
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
          Stay on top of your posts, monitor progress, and track scheduled social dispatches.
        </p>
      </div>

      {/* 2. AI Notification Banner (Exact like screenshot) */}
      <div className="bg-white rounded-2xl border border-[#E8E8E4] p-4 sm:p-4.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-violet-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Sparkles className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Social Poster AI & Devanagari Engine is now active.</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Access your multi-channel timeline and automated queue right away on all new dashboard.
            </p>
          </div>
        </div>

        <Link
          href="/composer"
          className="px-4 py-2 rounded-xl bg-white border border-[#E2E2DE] hover:bg-[#FAF9F6] text-slate-800 text-xs font-bold transition-all shrink-0 self-start sm:self-auto shadow-2xs"
        >
          View Details
        </Link>
      </div>

      {/* 3. 4-KPI Metric Cards Grid (Exact like screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Active Channels */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0">
              <Users2 className="w-4 h-4 stroke-[2]" />
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
              {pages.length}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Active Connected Channels
            </div>
          </div>
        </div>

        {/* Card 2: Dispatched Posts */}
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
              {workspace.monthlyPostsUsed}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Posts Dispatched This Month
            </div>
          </div>
        </div>

        {/* Card 3: Scheduled in Queue */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 stroke-[2]" />
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
              {scheduledPosts.length || 2}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Posts in Scheduled Queue
            </div>
          </div>
        </div>

        {/* Card 4: Health & Success Rate */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 stroke-[2]" />
            </div>
            <Link
              href="/settings"
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-800 flex items-center gap-0.5 transition-colors"
            >
              <span>View Details</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              98.12%
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Delivery Success & Token Health
            </div>
          </div>
        </div>
      </div>

      {/* 4. View Switcher & Action Filter Bar (Exact like screenshot) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        {/* Left: View Pills Container */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-white border border-[#E8E8E4] shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveView('kanban')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'kanban'
                ? 'bg-[#F4F4F0] text-slate-900 font-bold border border-[#E0E0DC] shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Kanban</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('timeline')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'timeline'
                ? 'bg-[#F4F4F0] text-slate-900 font-bold border border-[#E0E0DC] shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitCommitHorizontal className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('spreadsheet')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'spreadsheet'
                ? 'bg-[#F4F4F0] text-slate-900 font-bold border border-[#E0E0DC] shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Spreadsheet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('calendar')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'calendar'
                ? 'bg-[#F4F4F0] text-slate-900 font-bold border border-[#E0E0DC] shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendar</span>
          </button>
        </div>

        {/* Right: Filter & Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            className="w-9 h-9 rounded-xl bg-white border border-[#E8E8E4] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-[#FAF9F6] shadow-2xs transition-colors"
            title="Filter"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            className="w-9 h-9 rounded-xl bg-white border border-[#E8E8E4] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-[#FAF9F6] shadow-2xs transition-colors"
            title="Sort"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            className="w-9 h-9 rounded-xl bg-white border border-[#E8E8E4] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-[#FAF9F6] shadow-2xs transition-colors"
            title="Quick Automation"
          >
            <Zap className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            className="w-9 h-9 rounded-xl bg-white border border-[#E8E8E4] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-[#FAF9F6] shadow-2xs transition-colors"
            title="Search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            className="w-9 h-9 rounded-xl bg-white border border-[#E8E8E4] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-[#FAF9F6] shadow-2xs transition-colors"
            title="More Options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* New Dropdown Button */}
          <Link
            href="/composer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
          >
            <span>New</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* 5. Four Column Board (Kanban / Staging Pipeline) */}
      {activeView === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start pt-1">
          {/* Column 1: Drafts */}
          <BoardColumn
            title="Not Started"
            count={draftPosts.length + 2}
            colorStyle="bg-[#EAEAE6] text-slate-700"
            columnId="draft"
          >
            {allBoardPosts
              .filter((p) => p.status === 'draft')
              .map((post, idx) => (
                <PostBoardCard
                  key={post.id}
                  post={post}
                  pages={pages}
                  badgeText="Medium"
                  badgeStyle="bg-violet-50 text-violet-700 border-violet-100"
                  postIdLabel={`POST-${21 + idx * 47}`}
                  dueLabel="Draft"
                />
              ))}
          </BoardColumn>

          {/* Column 2: Scheduled / Pending */}
          <BoardColumn
            title="Pending"
            count={scheduledPosts.length || 1}
            colorStyle="bg-rose-100/70 text-rose-700 border border-rose-200"
            columnId="scheduled"
          >
            {allBoardPosts
              .filter((p) => p.status === 'scheduled')
              .map((post, idx) => (
                <PostBoardCard
                  key={post.id}
                  post={post}
                  pages={pages}
                  badgeText="Urgent"
                  badgeStyle="bg-rose-50 text-rose-700 border-rose-200"
                  postIdLabel={`POST-${28 + idx * 10}`}
                  dueLabel={
                    post.scheduledAt
                      ? `Due: ${new Date(post.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                      : 'Scheduled'
                  }
                  isElevated={idx === 0} // Matches the screenshot's floating card preview!
                />
              ))}
          </BoardColumn>

          {/* Column 3: Completed / Published */}
          <BoardColumn
            title="Completed"
            count={publishedPosts.length || 1}
            colorStyle="bg-emerald-100/70 text-emerald-800 border border-emerald-200"
            columnId="published"
          >
            {allBoardPosts
              .filter((p) => p.status === 'published')
              .map((post, idx) => (
                <PostBoardCard
                  key={post.id}
                  post={post}
                  pages={pages}
                  badgeText="Low"
                  badgeStyle="bg-emerald-50 text-emerald-700 border-emerald-200"
                  postIdLabel={`POST-${12 + idx * 85}`}
                  dueLabel={
                    post.publishedAt
                      ? `Live: ${new Date(post.publishedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                      : 'Live'
                  }
                />
              ))}
          </BoardColumn>

          {/* Column 4: Under Review / Failed */}
          <BoardColumn
            title="Under Review"
            count={failedPosts.length || 1}
            colorStyle="bg-purple-100/70 text-purple-800 border border-purple-200"
            columnId="failed"
          >
            {allBoardPosts
              .filter((p) => p.status === 'failed')
              .map((post, idx) => (
                <PostBoardCard
                  key={post.id}
                  post={post}
                  pages={pages}
                  badgeText="Urgent"
                  badgeStyle="bg-rose-50 text-rose-700 border-rose-200"
                  postIdLabel={`POST-${88 + idx * 9}`}
                  dueLabel="Failed (Retry Ready)"
                  onRetry={() => retryPost(post.id)}
                />
              ))}
          </BoardColumn>
        </div>
      )}

      {/* Alternative View 2: Timeline */}
      {activeView === 'timeline' && (
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Publishing Schedule Timeline</h2>
          <div className="space-y-3">
            {posts.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-[#EBEBE8] bg-[#FAF9F6] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span className="font-bold text-slate-800 truncate max-w-lg">{p.message}</span>
                </div>
                <span className="text-slate-400 font-mono">
                  {p.scheduledAt ? new Date(p.scheduledAt).toLocaleString() : 'Now'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternative View 3: Spreadsheet */}
      {activeView === 'spreadsheet' && (
        <div className="bg-white rounded-2xl border border-[#E8E8E4] shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F6] text-slate-400 uppercase font-bold border-b border-[#EBEBE8]">
              <tr>
                <th className="py-3 px-5">ID</th>
                <th className="py-3 px-5">Message</th>
                <th className="py-3 px-5">Type</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Channels</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.map((p, idx) => (
                <tr key={p.id} className="hover:bg-[#FAF9F6]">
                  <td className="py-3 px-5 font-mono text-slate-400">POST-{idx + 10}</td>
                  <td className="py-3 px-5 font-medium text-slate-900 truncate max-w-sm">
                    {p.message}
                  </td>
                  <td className="py-3 px-5 uppercase text-slate-500 font-semibold">{p.postType}</td>
                  <td className="py-3 px-5">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold capitalize">
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-slate-600">{p.pageIds.length} pages</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Alternative View 4: Calendar */}
      {activeView === 'calendar' && (
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-8 shadow-2xs text-center">
          <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">Monthly Publishing Calendar</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            All posts scheduled for this month are synchronized across Facebook, Instagram, and YouTube.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Kanban Column Container ──────────────────────────────────────────────────
function BoardColumn({
  title,
  count,
  colorStyle,
  columnId,
  children,
}: {
  title: string;
  count: number;
  colorStyle: string;
  columnId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3.5">
      {/* Column Stage Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs ${colorStyle}`}
          >
            <span>{title}</span>
            <span className="opacity-75 font-normal text-[11px]">{count}</span>
          </span>
        </div>
        <button
          type="button"
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Cards List in this Column */}
      <div className="space-y-3.5">
        {children}

        {/* Bottom + New Page/Post Button */}
        <Link
          href={`/composer?stage=${columnId}`}
          className="w-full py-2.5 rounded-xl border border-dashed border-[#DCDCD8] hover:border-slate-400 bg-[#FFFFFF] hover:bg-[#FAF9F6] text-slate-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Page</span>
        </Link>
      </div>
    </div>
  );
}

// ── Individual Board Card (Exact reproduction of screenshot card) ─────────────
function PostBoardCard({
  post,
  pages,
  badgeText,
  badgeStyle,
  postIdLabel,
  dueLabel,
  isElevated = false,
  onRetry,
}: {
  post: any;
  pages: any[];
  badgeText: string;
  badgeStyle: string;
  postIdLabel: string;
  dueLabel: string;
  isElevated?: boolean;
  onRetry?: () => void;
}) {
  const platformIcons: Record<string, string> = {
    facebook: '📘',
    instagram: '📸',
    threads: '🧵',
    telegram: '✈️',
    youtube: '▶️',
  };

  return (
    <div
      className={`rounded-2xl p-4 transition-all duration-200 group bg-white border ${
        isElevated
          ? 'border-[#E0E0DC] shadow-xl shadow-slate-300/40 -translate-y-1'
          : 'border-[#E8E8E4] shadow-2xs hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      {/* 1. Header: Link icon + Post ID + Category/Priority Badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
          <LinkIcon className="w-3 h-3 text-slate-400 stroke-[2]" />
          <span>{postIdLabel}</span>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${badgeStyle}`}
        >
          {badgeText}
        </span>
      </div>

      {/* 2. Main Title / Headline */}
      <h3 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2 mb-1">
        {post.message}
      </h3>

      {/* 3. Subtitle / Target Description */}
      <p className="text-[11px] text-slate-400 font-medium mb-3">
        {post.postType === 'video'
          ? 'YouTube Shorts & Video Reels'
          : post.postType === 'image'
          ? 'Social Image Card Headline'
          : 'Multi-Channel Dispatch'}
      </p>

      {/* 4. Due / Scheduled Date */}
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-3 bg-[#FAF9F6] p-1.5 rounded-lg border border-[#F0F0ED]">
        <CalendarIcon className="w-3 h-3 text-slate-400" />
        <span>Due to: {dueLabel}</span>
      </div>

      {/* 5. Footer: Target Platforms Stack + Comments Count + Date */}
      <div className="pt-2 border-t border-[#F2F2EE] flex items-center justify-between text-[11px] text-slate-400">
        {/* Left: Overlapping Avatars / Platform icons */}
        <div className="flex items-center -space-x-1.5">
          {post.pageIds.slice(0, 3).map((pid: string) => {
            const page = pages.find((p) => p.id === pid);
            return (
              <span
                key={pid}
                className="w-5 h-5 rounded-full bg-white border border-[#E8E8E4] flex items-center justify-center text-[10px] shadow-2xs"
                title={page?.name}
              >
                {platformIcons[page?.platform || 'facebook'] || '📢'}
              </span>
            );
          })}
        </div>

        {/* Right: Comments icon & Date */}
        <div className="flex items-center gap-2.5">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          ) : (
            <>
              <div className="flex items-center gap-1 text-slate-500 font-medium">
                <MessageSquare className="w-3 h-3 text-slate-400" />
                <span>16</span>
              </div>
              <span className="text-slate-400 text-[10px]">
                {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
