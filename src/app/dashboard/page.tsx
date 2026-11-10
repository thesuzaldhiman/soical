'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import {
  Users2,
  Clock,
  CheckCircle2,
  BarChart3,
  PenSquare,
  Palette,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  Send,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Repeat,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const { user, workspace, accounts, pages, posts, categories, retryPost } = useApp();

  const activePages = pages.filter((p) => p.isActive);
  const scheduledPosts = posts.filter((p) => p.status === 'scheduled');
  const publishedPosts = posts.filter((p) => p.status === 'published');
  const failedPosts = posts.filter((p) => p.status === 'failed');

  const totalFollowers = pages.reduce((acc, curr) => acc + (curr.fanCount || 0), 0);

  const platformIcons: Record<string, string> = {
    facebook: '📘',
    instagram: '📸',
    threads: '🧵',
    telegram: '✈️',
    youtube: '▶️',
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 p-6 sm:p-8 text-white shadow-xl shadow-blue-900/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-100 border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Workspace: {workspace.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              नमस्ते, {user.name}! 👋
            </h1>
            <p className="text-sm sm:text-base text-blue-100 leading-relaxed font-normal">
              Your social distribution engine is running smoothly. 5 platforms connected,{' '}
              <strong className="text-white">{activePages.length} active channels</strong>, and{' '}
              <strong className="text-white">{scheduledPosts.length} posts queued</strong> for automated publishing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/composer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-blue-800 text-sm font-bold shadow-lg shadow-black/10 hover:bg-blue-50 transition-all hover:scale-105 active:scale-95"
            >
              <PenSquare className="w-4 h-4 text-blue-700" />
              <span>Create Post</span>
            </Link>
            <Link
              href="/image-generator"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/15 hover:bg-white/20 text-white text-sm font-semibold border border-white/20 backdrop-blur-sm transition-all"
            >
              <Palette className="w-4 h-4 text-amber-300" />
              <span>SIG Hindi Editor</span>
            </Link>
          </div>
        </div>

        {/* Subtle background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Active Channels */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Channels
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{activePages.length}</span>
            <span className="text-xs text-slate-500 font-medium">of {pages.length} total</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Across 5 Platforms</span>
          </div>
        </div>

        {/* Card 2: Scheduled in Queue */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Scheduled Posts
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{scheduledPosts.length}</span>
            <span className="text-xs text-slate-500 font-medium">in queue</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
            <span>Non-blocking intervals active</span>
          </div>
        </div>

        {/* Card 3: Published */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Published Posts
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{publishedPosts.length}</span>
            <span className="text-xs text-slate-500 font-medium">recent</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>{workspace.monthlyPostsUsed} total dispatches</span>
          </div>
        </div>

        {/* Card 4: Total Followers */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Audience
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {(totalFollowers / 1000).toFixed(1)}k
            </span>
            <span className="text-xs text-slate-500 font-medium">followers/subs</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+14.2% reach this week</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Posts & Queue (2 cols wide) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Recent Posts & Queue</h2>
                <p className="text-xs text-slate-500">Live feed of scheduled and published posts</p>
              </div>
              <Link
                href="/library"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View Full Library</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {posts.slice(0, 5).map((post) => {
                const statusStyles = {
                  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
                  failed: 'bg-rose-50 text-rose-700 border-rose-200',
                  partial: 'bg-amber-50 text-amber-700 border-amber-200',
                  draft: 'bg-slate-50 text-slate-700 border-slate-200',
                  publishing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                };

                return (
                  <div key={post.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Media Thumbnail or Type Icon */}
                      {post.mediaUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={post.mediaUrl}
                          alt="post"
                          className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs uppercase shrink-0">
                          {post.postType}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              statusStyles[post.status]
                            }`}
                          >
                            {post.status}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {post.publishedAt
                              ? `Published ${new Date(post.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : post.scheduledAt
                              ? `Scheduled for ${new Date(post.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                              : 'Draft'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium line-clamp-2 leading-relaxed">
                          {post.message}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {post.pageIds.map((pid) => {
                            const pg = pages.find((p) => p.id === pid);
                            if (!pg) return null;
                            return (
                              <span
                                key={pid}
                                className="text-xs inline-block"
                                title={pg.name}
                              >
                                {platformIcons[pg.platform] || '📢'}
                              </span>
                            );
                          })}
                          <span className="text-[11px] text-slate-400 ml-1">
                            to {post.pageIds.length} target pages
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {post.status === 'failed' && (
                        <button
                          onClick={() => retryPost(post.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry Failed</span>
                        </button>
                      )}
                      <Link
                        href={`/composer?clone=${post.id}`}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        <Repeat className="w-3.5 h-3.5" />
                        <span>Reschedule</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Platform Status & Health Monitor */}
        <div className="space-y-6">
          {/* Health Monitor Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Daily Health Monitor</h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                All Healthy
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Token vault automatically verifies Facebook Graph API, YouTube OAuth, and Threads tokens
              every 24 hours.
            </p>

            <div className="space-y-3">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{platformIcons[acc.platform] || '📢'}</span>
                    <div>
                      <div className="font-semibold text-slate-800 leading-tight">{acc.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{acc.platform} Connected</div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <Link
                href="/accounts"
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                Manage & Connect More Accounts →
              </Link>
            </div>
          </div>

          {/* Page Categories Quick Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Page Categories / Groups</h3>
              <Link href="/categories" className="text-xs text-blue-600 font-semibold hover:underline">
                Edit
              </Link>
            </div>
            <div className="space-y-2.5">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-semibold text-slate-800">{cat.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {cat.pageIds.length} pages
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
