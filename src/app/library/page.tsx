'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { Post, PostStatus } from '@/types';
import {
  Layers,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Repeat,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Play,
} from 'lucide-react';

export default function LibraryPage() {
  return (
    <AppShell>
      <LibraryContent />
    </AppShell>
  );
}

function LibraryContent() {
  const router = useRouter();
  const { posts, pages, retryPost, deletePost } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | PostStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    const matchesTab = activeTab === 'all' || post.status === activeTab;
    const matchesSearch =
      post.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.postType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const tabCounts = {
    all: posts.length,
    scheduled: posts.filter((p) => p.status === 'scheduled').length,
    published: posts.filter((p) => p.status === 'published').length,
    failed: posts.filter((p) => p.status === 'failed').length,
    draft: posts.filter((p) => p.status === 'draft').length,
  };

  const statusBadge = (status: PostStatus) => {
    switch (status) {
      case 'published':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'scheduled':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'failed':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'partial':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const platformIcons: Record<string, string> = {
    facebook: '📘',
    instagram: '📸',
    threads: '🧵',
    telegram: '✈️',
    youtube: '▶️',
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EEF1F6]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Post Library & Queue</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Track scheduled posts, review publish logs, retry failed pages, and duplicate content.
          </p>
        </div>

        <Link
          href="/composer"
          className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF007A] to-[#FF2E93] hover:from-[#E6006E] hover:to-[#E62080] text-white text-xs font-bold transition-all shadow-[0_4px_14px_rgba(255,0,122,0.3)] hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto"
        >
          <span>+ Create New Post</span>
        </Link>
      </div>

      {/* Tabs and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'scheduled', 'published', 'failed', 'draft'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {tabCounts[tab] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by caption..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-sm">No posts found</h3>
            <p className="text-xs text-slate-400 mt-1">
              There are no posts matching your current tab or search filter.
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isExpanded = expandedLogId === post.id;

            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Thumbnail & Message */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {post.mediaUrl ? (
                      <div className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.mediaUrl}
                          alt="media"
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-xs"
                        />
                        {post.postType === 'video' && (
                          <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center text-white">
                            <Play className="w-5 h-5 fill-white" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400 uppercase shrink-0">
                        {post.postType}
                      </div>
                    )}

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge(
                            post.status
                          )}`}
                        >
                          {post.status}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase">
                          {post.postType} Post
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {post.publishedAt
                            ? `Published ${new Date(post.publishedAt).toLocaleString()}`
                            : post.scheduledAt
                            ? `Scheduled ${new Date(post.scheduledAt).toLocaleString()}`
                            : `Created ${new Date(post.createdAt).toLocaleDateString()}`}
                        </span>
                      </div>

                      <p className="text-sm text-slate-900 font-medium leading-relaxed whitespace-pre-line">
                        {post.message}
                      </p>

                      {post.commentText && (
                        <div className="flex items-center gap-1.5 text-xs text-blue-700 font-medium bg-blue-50/70 px-2.5 py-1 rounded-lg border border-blue-100/60 max-w-fit">
                          <MessageSquare className="w-3 h-3 text-blue-600" />
                          <span className="truncate max-w-md">{post.commentText}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                    {post.status === 'failed' && (
                      <button
                        type="button"
                        onClick={() => retryPost(post.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 border border-rose-200 transition-all"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retry Failed</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : post.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <span>Logs</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePost(post.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all"
                      title="Delete post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Target Channels Chips */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Targets:
                  </span>
                  {post.pageIds.map((pid) => {
                    const page = pages.find((p) => p.id === pid);
                    const result = post.results.find((r) => r.pageId === pid);

                    return (
                      <div
                        key={pid}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${
                          result?.status === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : result?.status === 'failed'
                            ? 'bg-rose-50 border-rose-200 text-rose-800'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{platformIcons[page?.platform || 'facebook'] || '📢'}</span>
                        <span>{page?.name || 'Target Page'}</span>
                        {result?.status === 'success' && (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-0.5" />
                        )}
                        {result?.status === 'failed' && (
                          <AlertTriangle className="w-3 h-3 text-rose-600 ml-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Expanded Logs Drawer */}
                {isExpanded && (
                  <div className="p-4 rounded-xl bg-slate-900 text-white text-xs font-mono space-y-2 animate-fade-in border border-slate-800">
                    <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider mb-2">
                      API Dispatch Logs (Per-Page Response)
                    </div>
                    {post.results.length === 0 ? (
                      <div className="text-slate-500">Post is queued. Awaiting dispatch execution.</div>
                    ) : (
                      post.results.map((r, i) => (
                        <div
                          key={i}
                          className="p-2 rounded bg-slate-800/80 border border-slate-700/60 flex items-start justify-between gap-4"
                        >
                          <div>
                            <div className="font-bold text-slate-200">
                              {r.platform.toUpperCase()} → {r.pageName}
                            </div>
                            {r.externalPostId && (
                              <div className="text-emerald-400 text-[11px]">
                                ID: {r.externalPostId}
                              </div>
                            )}
                            {r.commentId && (
                              <div className="text-blue-400 text-[11px]">
                                Comment ID: {r.commentId}
                              </div>
                            )}
                            {r.error && (
                              <div className="text-rose-400 text-[11px]">Error: {r.error}</div>
                            )}
                          </div>
                          <div className="text-right text-[10px] text-slate-400">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                                r.status === 'success'
                                  ? 'bg-emerald-900/60 text-emerald-300'
                                  : 'bg-rose-900/60 text-rose-300'
                              }`}
                            >
                              {r.status}
                            </span>
                            <div className="mt-1">
                              {new Date(r.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
