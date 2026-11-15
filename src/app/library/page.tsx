'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { Post, PostStatus, Platform } from '@/types';
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
  Eye,
  X,
  Copy,
  RotateCw,
  Globe,
  Loader2,
  Sparkles,
  Zap,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';
import { SocialIcon } from '@/components/ui/SocialIcon';

export default function LibraryPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400 font-bold">Loading Post Library...</div>}>
        <LibraryContent />
      </Suspense>
    </AppShell>
  );
}

function LibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlatform = (searchParams?.get('platform') as 'all' | 'facebook' | Platform) || 'all';
  const initialSearch = searchParams?.get('search') || '';
  const initialStatus = (searchParams?.get('status') as 'all' | PostStatus) || 'all';

  const {
    posts,
    pages,
    postPerformances,
    retryPost,
    approvePost,
    deletePost,
    refreshPosts,
    isQueueProcessing,
    processScheduledQueueNow,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | PostStatus>(initialStatus);
  const [platformFilter, setPlatformFilter] = useState<'all' | 'facebook' | Platform>(initialPlatform);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // View Mode: 'list' (Vertical) vs 'grid' (Card Grid)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isRefreshingCloud, setIsRefreshingCloud] = useState<boolean>(false);

  // Inspection Modal State (Full image review before approval)
  const [selectedPostForModal, setSelectedPostForModal] = useState<Post | null>(null);

  // Deletion Confirmation Modal State (Facebook vs Library options)
  const [postPendingDelete, setPostPendingDelete] = useState<Post | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [approvingPostId, setApprovingPostId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Hydrate view mode from localStorage
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const savedMode = localStorage.getItem('sap_library_view_mode') as 'list' | 'grid';
      if (savedMode === 'list' || savedMode === 'grid') {
        setViewMode(savedMode);
      }
    }
  }, []);

  const handleToggleViewMode = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sap_library_view_mode', mode);
    }
  };

  // Auto-refresh posts from cloud on mount to capture any background WordPress webhook posts
  useEffect(() => {
    refreshPosts();
  }, [refreshPosts]);

  const handleManualRefresh = async () => {
    setIsRefreshingCloud(true);
    try {
      await refreshPosts();
      setActionSuccessMessage('Post Library synchronized with cloud database!');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch {
      setActionSuccessMessage('Failed to sync from cloud.');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } finally {
      setIsRefreshingCloud(false);
    }
  };

  const fbCount = posts.filter(
    (p) =>
      p.pageIds.some((pid) => pages.find((page) => page.id === pid)?.platform === 'facebook') ||
      p.results.some((r) => r.platform === 'facebook')
  ).length;

  const handleRunQueue = async () => {
    try {
      const res = await processScheduledQueueNow();
      if (res.dispatched > 0) {
        setActionSuccessMessage(`Successfully published ${res.dispatched} scheduled post${res.dispatched > 1 ? 's' : ''} to destination channels!`);
      } else {
        setActionSuccessMessage('Auto-Scheduler checked: No scheduled posts are currently due.');
      }
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch {
      setActionSuccessMessage('Error processing scheduled queue.');
      setTimeout(() => setActionSuccessMessage(null), 4000);
    }
  };

  // Helper to format arrival / created time with exact clock time
  const formatArrivalTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (diffMins < 1) return `Just now (${timeStr})`;
    if (diffMins < 60) return `${diffMins}m ago (${timeStr})`;
    if (diffHours < 24 && now.getDate() === date.getDate()) {
      return `Today at ${timeStr} (${diffHours}h ago)`;
    }
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${dateStr} at ${timeStr}`;
  };

  // Helper to get direct live destination link (Facebook / Telegram / WordPress)
  const getPostLiveLink = (post: Post) => {
    // 1. Try postPerformances permalinkUrl
    const perf = postPerformances?.find(
      (p) => p.postId === post.id || post.results.some((r) => r.externalPostId && r.externalPostId === p.externalPostId)
    );
    if (perf?.permalinkUrl) {
      return { url: perf.permalinkUrl, platform: 'facebook', label: 'View on Facebook' };
    }

    // 2. Try Facebook post result with externalPostId or postUrl
    const fbResult = post.results.find((r) => r.platform === 'facebook' && (r.postUrl || r.externalPostId));
    if (fbResult) {
      const url = fbResult.postUrl || `https://www.facebook.com/${fbResult.externalPostId}`;
      return { url, platform: 'facebook', label: 'View on Facebook' };
    }

    // 3. Try Telegram
    const tgPage = pages.find((p) => post.pageIds.includes(p.id) && p.platform === 'telegram');
    if (tgPage?.targetUrl) {
      return { url: tgPage.targetUrl, platform: 'telegram', label: 'View on Telegram' };
    }

    // 4. Try WordPress
    const wpPage = pages.find((p) => post.pageIds.includes(p.id) && p.platform === 'wordpress');
    if (wpPage?.siteUrl) {
      return { url: wpPage.siteUrl, platform: 'wordpress', label: 'View on WordPress' };
    }

    // 5. Fallback: Facebook page URL if this post targeted Facebook
    const fbPage = pages.find((p) => post.pageIds.includes(p.id) && (p.platform === 'facebook' || p.targetUrl?.includes('facebook')));
    if (fbPage?.targetUrl) {
      return { url: fbPage.targetUrl, platform: 'facebook', label: 'View on Facebook' };
    }
    if (fbPage?.pageId) {
      return { url: `https://www.facebook.com/${fbPage.pageId}`, platform: 'facebook', label: 'View on Facebook' };
    }

    return null;
  };

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    const matchesTab = activeTab === 'all' || post.status === activeTab;
    const matchesPlatform =
      platformFilter === 'all'
        ? true
        : post.pageIds.some((pid) => {
            const page = pages.find((p) => p.id === pid);
            return (page?.platform || '').toLowerCase() === platformFilter;
          }) ||
          post.results.some((r) => (r.platform || '').toLowerCase() === platformFilter) ||
          (platformFilter === 'facebook' && post.pageIds.some((pid) => String(pid).toLowerCase().includes('fb')));

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      post.message.toLowerCase().includes(q) ||
      (post.title || '').toLowerCase().includes(q) ||
      post.postType.toLowerCase().includes(q) ||
      post.pageIds.some((pid) => {
        const page = pages.find((p) => p.id === pid);
        return page?.name.toLowerCase().includes(q);
      });

    return matchesTab && matchesPlatform && matchesSearch;
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
      case 'draft':
        return 'bg-amber-50 text-amber-800 border-amber-300 font-black';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Handle Live Approval & Broadcasting
  const handleApprove = async (postId: string) => {
    setApprovingPostId(postId);
    try {
      await approvePost(postId);
      setActionSuccessMessage('Post successfully approved and broadcasted live to connected pages!');
      setTimeout(() => setActionSuccessMessage(null), 5000);
      if (selectedPostForModal?.id === postId) {
        setSelectedPostForModal(null);
      }
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setApprovingPostId(null);
    }
  };

  // Handle Post Deletion (Library vs Facebook Graph API)
  const handleDeleteConfirm = async (deleteFromFacebook: boolean) => {
    if (!postPendingDelete) return;
    setIsDeleting(true);
    try {
      await deletePost(postPendingDelete.id, { deleteFromFacebook });
      if (deleteFromFacebook) {
        setActionSuccessMessage('Post permanently deleted from Facebook page and Post Library!');
      } else {
        setActionSuccessMessage('Post removed from Post Library.');
      }
      setTimeout(() => setActionSuccessMessage(null), 5000);
      if (selectedPostForModal?.id === postPendingDelete.id) {
        setSelectedPostForModal(null);
      }
      setPostPendingDelete(null);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 font-sans animate-fade-in pb-12">
      {/* Action Notification Banner */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EEF1F6]">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#FF007A]" />
            <span>Post Library &amp; Queue</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
            Review card images, open published posts directly on Facebook, approve draft stories, or view target channels.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            <span className={`w-2 h-2 rounded-full ${isQueueProcessing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
            <span className="hidden sm:inline">{isQueueProcessing ? 'Publishing Due Posts...' : 'Auto-Scheduler Active'}</span>
            <span className="sm:hidden">{isQueueProcessing ? 'Publishing...' : 'Active'}</span>
          </div>

          <button
            type="button"
            onClick={handleRunQueue}
            disabled={isQueueProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            title="Instantly process any scheduled posts that have reached their target time"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-500 ${isQueueProcessing ? 'animate-spin' : ''}`} />
            <span>{isQueueProcessing ? 'Running...' : `⚡ Run Due (${tabCounts.scheduled})`}</span>
          </button>

          <Link
            href="/composer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>+ Create New Post</span>
          </Link>
        </div>
      </div>

      {/* Tabs, View Switcher, Platform Filter, and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#EEF1F6] p-4 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'draft', 'scheduled', 'published', 'failed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-[#F8F9FD] text-slate-600 hover:bg-slate-100 border border-[#EEF1F6]'
                }`}
              >
                <span>{tab === 'draft' ? 'Drafts / Approvals' : tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tabCounts[tab] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search Input & View Mode Controls */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative min-w-[200px] flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search captions or targets..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#EEF1F6] text-xs text-slate-800 bg-[#F8F9FD] focus:outline-none focus:border-[#FF007A]"
              />
            </div>

            {/* View Mode Toggle: List (Vertical) vs Grid */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => handleToggleViewMode('list')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vertical Detailed List View"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode('grid')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>

            {/* Sync from Cloud Button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshingCloud}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#EEF1F6] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
              title="Fetch latest posts from cloud database"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isRefreshingCloud ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshingCloud ? 'Syncing...' : 'Sync Cloud'}</span>
            </button>
          </div>
        </div>

        {/* Platform Quick Filter Row (Facebook vs All Platforms) */}
        <div className="pt-2 border-t border-[#EEF1F6] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Filter by Platform:
            </span>
            <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] text-xs font-bold">
              <button
                type="button"
                onClick={() => setPlatformFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  platformFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Platforms ({posts.length})
              </button>
              <button
                type="button"
                onClick={() => setPlatformFilter('facebook')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  platformFilter === 'facebook'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SocialIcon platform="facebook" className="w-3 h-3 rounded-xs" />
                <span>Facebook Only ({fbCount})</span>
              </button>
            </div>
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            Showing {filteredPosts.length} posts • Mode: <strong className="text-slate-700 uppercase">{viewMode}</strong>
          </span>
        </div>
      </div>

      {/* Main Posts Display: List View vs Grid View */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EEF1F6] p-12 text-center space-y-2">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-700 text-sm">No posts found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            There are no posts matching your current tab ({activeTab}) or search filter.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ========================================================================= */
        /* GRID VIEW (Modern Card Grid with 3 Columns)                               */
        /* ========================================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredPosts.map((post) => {
            const isApproving = approvingPostId === post.id;
            const liveLink = getPostLiveLink(post);

            return (
              <div
                key={post.id}
                onClick={() => setSelectedPostForModal(post)}
                className="bg-white rounded-2xl border border-[#EEF1F6] overflow-hidden shadow-2xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Top: Media Container */}
                  <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-100">
                    {post.mediaUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.thumbnailUrl || post.mediaUrl}
                          alt="Post media preview"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {post.postType === 'video' && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-xs border border-white/40 flex items-center justify-center text-white shadow-md">
                              <Play className="w-4 h-4 fill-white ml-0.5" />
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-4">
                        <FileText className="w-8 h-8 text-slate-300 mb-1" />
                        <span className="text-[10px] uppercase font-bold text-slate-500">Text Only</span>
                      </div>
                    )}

                    {/* Status Badge in Top Left */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-xs backdrop-blur-md ${statusBadge(
                          post.status
                        )}`}
                      >
                        {post.status === 'draft' ? '⏳ Awaiting Review' : post.status}
                      </span>
                    </div>

                    {/* Inspect Overlay in Bottom Right */}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1 shadow-xs group-hover:bg-black transition-colors">
                      <Eye className="w-3 h-3" />
                      <span>Inspect</span>
                    </div>
                  </div>

                  {/* Middle: Content & Metadata */}
                  <div className="p-4 space-y-3">
                    {/* Arrival / Creation Time Callout */}
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">
                          {post.status === 'draft' ? 'Arrived: ' : post.status === 'published' ? 'Published: ' : 'Time: '}
                          <strong className="text-slate-900">{formatArrivalTime(post.createdAt)}</strong>
                        </span>
                      </div>
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-700 shrink-0">
                        {post.postType}
                      </span>
                    </div>

                    {/* Post Title / Message Caption */}
                    <p className="text-xs text-slate-900 font-bold leading-snug line-clamp-3">
                      {post.message}
                    </p>

                    {/* First Comment Snippet */}
                    {post.commentText && (
                      <div className="flex items-start gap-1.5 text-[10px] text-blue-800 bg-blue-50/80 p-2 rounded-lg border border-blue-100">
                        <MessageSquare className="w-3 h-3 text-blue-600 shrink-0 mt-0.5" />
                        <span className="truncate">1st Comment: {post.commentText}</span>
                      </div>
                    )}

                    {/* Target Channels Chips */}
                    <div className="pt-2 border-t border-[#EEF1F6] space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Targets ({post.pageIds.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {post.pageIds.map((pid) => {
                          const page = pages.find((p) => p.id === pid);
                          const result = post.results.find((r) => r.pageId === pid || r.pageId === page?.pageId);
                          const platform = (page?.platform || result?.platform || 'facebook') as Platform;

                          return (
                            <span
                              key={pid}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F8F9FD] border border-[#EEF1F6] text-[10px] font-semibold text-slate-700"
                            >
                              <SocialIcon platform={platform} className="w-2.5 h-2.5 rounded-xs shrink-0" />
                              <span className="truncate max-w-[110px]">{page?.name || 'Channel'}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div
                  className="p-3 bg-[#F8F9FD] border-t border-[#EEF1F6] flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1.5">
                    {post.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(post.id)}
                        disabled={isApproving}
                        className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isApproving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        <span>{isApproving ? 'Publishing...' : 'Approve'}</span>
                      </button>
                    )}

                    {post.status === 'published' && liveLink && (
                      <a
                        href={liveLink.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <SocialIcon platform={liveLink.platform as any} className="w-3 h-3 rounded-xs" />
                        <span>View</span>
                        <ExternalLink className="w-2.5 h-2.5 text-blue-500" />
                      </a>
                    )}

                    <Link
                      href={`/composer?clone=${post.id}&mode=reschedule`}
                      className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-[#EEF1F6] text-xs font-semibold"
                      title="Reschedule / Edit"
                    >
                      <Repeat className="w-3.5 h-3.5 text-blue-600" />
                    </Link>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPostPendingDelete(post)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Delete post"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ========================================================================= */
        /* LIST VIEW (Vertical Detailed Row Layout)                                 */
        /* ========================================================================= */
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const isExpanded = expandedLogId === post.id;
            const isApproving = approvingPostId === post.id;
            const liveLink = getPostLiveLink(post);

            return (
              <div
                key={post.id}
                onClick={() => setSelectedPostForModal(post)}
                className="bg-white rounded-2xl border border-[#EEF1F6] p-4 sm:p-5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all space-y-3 cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Enhanced Thumbnail & Compact Message */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Media Thumbnail Container */}
                    {post.mediaUrl ? (
                      <div className="w-28 h-20 sm:w-32 sm:h-22 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 relative group/media shrink-0 flex items-center justify-center shadow-2xs">
                        {post.postType === 'video' ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={post.thumbnailUrl || post.mediaUrl}
                              alt="Video preview"
                              className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-xs border border-white/40 flex items-center justify-center text-white shadow-md group-hover/media:scale-110 transition-transform">
                                <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                              </div>
                            </div>
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[8px] font-black uppercase tracking-wider text-white">
                              Video
                            </div>
                          </>
                        ) : (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={post.mediaUrl}
                              alt="Post media"
                              className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-300"
                            />
                          </>
                        )}
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[9px] font-bold text-white flex items-center gap-0.5">
                          <Eye className="w-2.5 h-2.5" />
                          <span>Inspect</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-28 h-20 sm:w-32 sm:h-22 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] flex flex-col items-center justify-center text-xs font-bold text-slate-400 shrink-0 p-2 text-center">
                        <FileText className="w-5 h-5 text-slate-300 mb-1" />
                        <span className="text-[10px] uppercase font-bold text-slate-500">Text Post</span>
                      </div>
                    )}

                    {/* Post Content & Meta */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge(
                            post.status
                          )}`}
                        >
                          {post.status === 'draft' ? 'Awaiting Review' : post.status}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400 capitalize">
                          {post.postType}
                        </span>

                        {/* ARRIVAL / SCHEDULED / PUBLISHED TIME */}
                        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
                          <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                          <span>
                            {post.status === 'draft' ? 'Arrived: ' : post.status === 'published' ? 'Published: ' : 'Time: '}
                            <strong className="text-slate-800 font-bold">{formatArrivalTime(post.createdAt)}</strong>
                          </span>
                        </div>

                        {post.status === 'scheduled' && post.scheduledAt && new Date(post.scheduledAt).getTime() <= Date.now() && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            ⚡ Due Now (Publishing...)
                          </span>
                        )}
                      </div>

                      {/* Shortened Caption (line-clamp-2 to optimize space) */}
                      <p className="text-xs text-slate-800 font-bold leading-snug line-clamp-2">
                        {post.message}
                      </p>

                      {/* First Comment Compact Tag */}
                      {post.commentText && (
                        <div className="inline-flex items-center gap-1.5 text-[11px] text-blue-700 font-medium bg-blue-50/70 px-2 py-0.5 rounded-md border border-blue-100/60 max-w-fit">
                          <MessageSquare className="w-3 h-3 text-blue-600 shrink-0" />
                          <span className="truncate max-w-xs sm:max-w-md">1st Comment: {post.commentText}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions Bar */}
                  <div
                    className="flex items-center gap-2 self-end sm:self-start shrink-0 flex-wrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* DIRECT FACEBOOK / LIVE PLATFORM LINK BUTTON */}
                    {post.status === 'published' && liveLink && (
                      <a
                        href={liveLink.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all shadow-2xs hover:scale-[1.02] cursor-pointer"
                        title="Directly view this post on Facebook"
                      >
                        <SocialIcon platform={liveLink.platform as any} className="w-3.5 h-3.5 rounded-xs shrink-0" />
                        <span>{liveLink.label}</span>
                        <ExternalLink className="w-3 h-3 text-blue-500 shrink-0" />
                      </a>
                    )}

                    {/* Reschedule / Edit Button */}
                    <Link
                      href={`/composer?clone=${post.id}&mode=reschedule`}
                      className="px-2.5 py-1.5 rounded-xl bg-[#F8F9FD] hover:bg-slate-100 text-slate-700 border border-[#EEF1F6] text-xs font-bold flex items-center gap-1 transition-all shadow-2xs"
                      title="Reschedule or edit this post in Composer"
                    >
                      <Repeat className="w-3.5 h-3.5 text-blue-600" />
                      <span>Reschedule</span>
                    </Link>

                    {/* Approve & Publish Button for Drafts */}
                    {post.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(post.id)}
                        disabled={isApproving}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
                        title="Approve this draft and publish live immediately"
                      >
                        {isApproving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>{isApproving ? 'Publishing...' : 'Approve & Publish'}</span>
                      </button>
                    )}

                    {/* Publish Now for Scheduled Posts */}
                    {post.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(post.id)}
                        disabled={isApproving}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
                        title="Publish this scheduled post live immediately without waiting"
                      >
                        {isApproving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Zap className="w-3.5 h-3.5 text-amber-300" />
                        )}
                        <span>{isApproving ? 'Publishing...' : 'Publish Now'}</span>
                      </button>
                    )}

                    {/* Inspect Full Preview Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedPostForModal(post)}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#EEF1F6] text-xs font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                      title="Inspect full image and post details"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>Inspect</span>
                    </button>

                    {post.status === 'failed' && (
                      <button
                        type="button"
                        onClick={() => retryPost(post.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 border border-rose-200 transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                    )}

                    {/* Logs Toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : post.id)}
                      className="px-2 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#EEF1F6] text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      title="View dispatch logs"
                    >
                      <span>Logs</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Delete Post Button */}
                    <button
                      type="button"
                      onClick={() => setPostPendingDelete(post)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                      title="Delete post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Target Channels Chips */}
                <div className="pt-2 border-t border-[#EEF1F6] flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Targets ({post.pageIds.length}):
                  </span>
                  {post.pageIds.map((pid) => {
                    const page = pages.find((p) => p.id === pid);
                    const result = post.results.find((r) => r.pageId === pid || r.pageId === page?.pageId);
                    const platform = (page?.platform || result?.platform || 'facebook') as Platform;

                    return (
                      <div
                        key={pid}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-medium ${
                          result?.status === 'success' || post.status === 'published'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : result?.status === 'failed'
                            ? 'bg-rose-50 border-rose-200 text-rose-800'
                            : post.status === 'draft'
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : 'bg-[#F8F9FD] border-[#EEF1F6] text-slate-700'
                        }`}
                      >
                        <SocialIcon platform={platform} className="w-3 h-3 rounded-xs shrink-0" />
                        <span className="text-[11px] font-bold">{page?.name || 'Target Channel'}</span>
                        {(result?.status === 'success' || post.status === 'published') && (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-0.5" />
                        )}
                        {result?.status === 'failed' && (
                          <AlertTriangle className="w-3 h-3 text-rose-600 ml-0.5" />
                        )}
                        {post.status === 'draft' && (
                          <span className="text-[9px] font-bold px-1 rounded bg-amber-200/60 text-amber-900 ml-0.5">
                            Draft
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Expanded Logs Drawer */}
                {isExpanded && (
                  <div className="p-4 rounded-2xl bg-slate-900 text-white text-xs font-mono space-y-2 animate-fade-in border border-slate-800">
                    <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider mb-1">
                      API Dispatch Logs (Per-Page Response)
                    </div>
                    {post.results.length === 0 ? (
                      <div className="text-slate-500 text-[11px]">
                        {post.status === 'draft'
                          ? 'Post is currently saved as Draft for review and approval.'
                          : 'Post is queued. Awaiting dispatch execution.'}
                      </div>
                    ) : (
                      post.results.map((r, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-start justify-between gap-4"
                        >
                          <div>
                            <div className="font-bold text-slate-200 text-xs">
                              {r.platform.toUpperCase()} → {r.pageName}
                            </div>
                            {r.externalPostId && (
                              <div className="text-emerald-400 text-[11px] mt-0.5">
                                Post ID: {r.externalPostId}
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
                                  : r.status === 'draft'
                                  ? 'bg-amber-900/60 text-amber-300'
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
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Full High-Resolution Post & Image Inspection Modal              */}
      {/* ========================================================================= */}
      {selectedPostForModal && (() => {
        const liveModalLink = getPostLiveLink(selectedPostForModal);

        return (
          <div
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
            onClick={() => setSelectedPostForModal(null)}
          >
            <div
              className="bg-white rounded-3xl border border-[#EEF1F6] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Sticky Header */}
              <div className="p-4 sm:p-5 border-b border-[#EEF1F6] flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Post Inspection &amp; Preview
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
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusBadge(
                      selectedPostForModal.status
                    )}`}
                  >
                    {selectedPostForModal.status === 'draft'
                      ? 'Awaiting Approval'
                      : selectedPostForModal.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedPostForModal(null)}
                    className="w-8 h-8 rounded-xl bg-[#F8F9FA] hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                {/* Arrival / Scheduled Time Banner */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                      selectedPostForModal.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {selectedPostForModal.status === 'draft' ? 'Arrival Time (Draft Awaiting Approval)' : selectedPostForModal.status === 'published' ? 'Published At' : 'Scheduled / Created Time'}
                      </div>
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {formatArrivalTime(selectedPostForModal.createdAt)}
                        <span className="text-[11px] font-normal text-slate-500 ml-1.5">
                          ({new Date(selectedPostForModal.createdAt).toLocaleString()})
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shrink-0 ${statusBadge(selectedPostForModal.status)}`}>
                    {selectedPostForModal.status === 'draft' ? '⏳ Ready for Review' : selectedPostForModal.status}
                  </span>
                </div>

                {/* Full-Resolution Media Preview */}
                {selectedPostForModal.mediaUrl ? (
                  <div className="rounded-2xl overflow-hidden max-h-60 sm:max-h-64 w-full bg-slate-950 flex flex-col items-center justify-center p-2 relative group border border-slate-800">
                    {selectedPostForModal.postType === 'video' ? (
                      <video
                        src={selectedPostForModal.mediaUrl}
                        controls
                        className="max-h-56 sm:max-h-60 w-auto rounded-xl object-contain shadow-2xl"
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={selectedPostForModal.mediaUrl}
                        alt="Full card preview"
                        className="max-h-56 sm:max-h-60 w-auto rounded-xl object-contain shadow-2xl"
                      />
                    )}

                    <a
                      href={selectedPostForModal.mediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-black/75 hover:bg-black text-white text-[11px] font-bold flex items-center gap-1 shadow-md backdrop-blur-md transition-all border border-white/20"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Full Image</span>
                    </a>
                  </div>
                ) : (
                  <div className="py-6 px-4 rounded-2xl bg-[#F8F9FD] border border-dashed border-slate-200 text-center text-slate-500 text-xs">
                    This post contains text content only without attached image or video.
                  </div>
                )}

                {/* Caption & Message Box */}
                <div className="p-3.5 rounded-2xl bg-[#F8F9FD] border border-[#EEF1F6] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>Post Caption</span>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard.writeText(selectedPostForModal.message)
                      }
                      className="hover:text-slate-700 flex items-center gap-1 transition-colors cursor-pointer text-[10px]"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Text</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-900 leading-relaxed font-bold whitespace-pre-wrap">
                    {selectedPostForModal.message}
                  </p>
                </div>

                {/* First Comment Trigger Callout */}
                {selectedPostForModal.commentText && (
                  <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-900 uppercase">
                      <MessageSquare className="w-3 h-3 text-blue-700" />
                      <span>First Comment Auto-Trigger (Source Link)</span>
                    </div>
                    <p className="text-xs text-blue-900 font-medium whitespace-pre-wrap">
                      {selectedPostForModal.commentText}
                    </p>
                  </div>
                )}

                {/* Destination Channels Dispatch Results with Logos */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>Target Destination Channels ({selectedPostForModal.pageIds.length})</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {selectedPostForModal.status === 'draft' ? 'Pages mapped for live publishing on approval' : 'Status & External IDs'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {selectedPostForModal.pageIds.map((pgId) => {
                      const pg = pages.find((p) => p.id === pgId);
                      const res = selectedPostForModal.results?.find((r) => r.pageId === pgId || r.pageId === pg?.pageId);
                      const platform = (pg?.platform || res?.platform || 'facebook') as Platform;
                      const isSuccess = res?.status === 'success' || selectedPostForModal.status === 'published';
                      const isFailed = res?.status === 'failed';
                      const isDraft = selectedPostForModal.status === 'draft';
                      const liveUrl = res?.postUrl || (res?.externalPostId ? `https://www.facebook.com/${res.externalPostId}` : pg?.targetUrl);

                      return (
                        <div
                          key={pgId}
                          className="p-3 rounded-2xl bg-[#F8F9FD] border border-[#EEF1F6] flex items-center justify-between gap-3 text-xs shadow-2xs hover:border-slate-300 transition-all"
                        >
                          {/* Target Logo & Name */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              {pg?.avatarUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={pg.avatarUrl}
                                  alt={pg.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                                  {pg?.name ? pg.name.charAt(0).toUpperCase() : 'C'}
                                </div>
                              )}
                              {/* Platform mini badge */}
                              <div className="absolute -bottom-1 -right-1 rounded-full p-0.5 bg-white shadow-2xs border border-slate-200">
                                <SocialIcon platform={platform} className="w-3.5 h-3.5 rounded-full" />
                              </div>
                            </div>

                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate text-xs">
                                {pg?.name || pgId}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium capitalize flex items-center gap-1 mt-0.5">
                                <span className="font-semibold text-slate-700">{platform} Page</span>
                                {pg?.fanCount ? <span>• {pg.fanCount.toLocaleString()} followers</span> : null}
                              </div>
                              {res?.externalPostId && (
                                <div className="text-[9px] text-slate-400 font-mono truncate mt-0.5">
                                  ID: {res.externalPostId}
                                </div>
                              )}
                              {res?.error && (
                                <div className="text-[10px] text-rose-600 font-medium truncate mt-0.5">
                                  Error: {res.error}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Status & Live Link */}
                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isSuccess
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : isDraft
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : isFailed
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}
                            >
                              {isDraft ? '⏳ Ready for Approval' : isSuccess ? '✓ Published Live' : isFailed ? '✕ Failed' : '⚡ Scheduled'}
                            </span>

                            {isSuccess && liveUrl && (
                              <a
                                href={liveUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 underline cursor-pointer"
                              >
                                <span>View Live</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Sticky Footer */}
              <div className="p-4 sm:p-5 border-t border-[#EEF1F6] flex items-center justify-between flex-wrap gap-2 shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setPostPendingDelete(selectedPostForModal);
                  }}
                  className="px-3.5 py-2 rounded-xl hover:bg-rose-50 text-rose-600 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Post</span>
                </button>

                <div className="flex items-center gap-2 flex-wrap ml-auto">
                  {/* DIRECT FACEBOOK VIEW LINK BUTTON */}
                  {selectedPostForModal.status === 'published' && liveModalLink && (
                    <a
                      href={liveModalLink.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                    >
                      <SocialIcon platform={liveModalLink.platform as any} className="w-3.5 h-3.5 rounded-xs" />
                      <span>{liveModalLink.label}</span>
                      <ExternalLink className="w-3 h-3 text-blue-500" />
                    </a>
                  )}

                  {/* Reschedule / Edit Button */}
                  <Link
                    href={`/composer?clone=${selectedPostForModal.id}&mode=reschedule`}
                    className="px-3.5 py-2 rounded-xl bg-[#F8F9FD] hover:bg-slate-100 border border-[#EEF1F6] text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <Repeat className="w-3.5 h-3.5 text-blue-600" />
                    <span>Reschedule / Edit</span>
                  </Link>

                  {/* Approve Button for Drafts */}
                  {selectedPostForModal.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedPostForModal.id)}
                      disabled={approvingPostId === selectedPostForModal.id}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
                    >
                      {approvingPostId === selectedPostForModal.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {approvingPostId === selectedPostForModal.id
                          ? 'Publishing...'
                          : 'Approve & Publish Live'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 2: Enhanced Deletion Confirmation Modal                             */}
      {/* ========================================================================= */}
      {postPendingDelete && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => setPostPendingDelete(null)}
        >
          <div
            className="bg-white rounded-3xl border border-[#EEF1F6] shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-slate-900">
                Delete Post
              </h3>
              <p className="text-xs text-slate-500">
                Choose how you want to delete this post.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 font-medium line-clamp-2 italic">
              &quot;{postPendingDelete.message}&quot;
            </div>

            <div className="space-y-2 pt-2">
              {/* Option A: Delete from Facebook & Library */}
              {postPendingDelete.status === 'published' &&
                postPendingDelete.results.some((r) => r.platform === 'facebook' && r.externalPostId) && (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDeleteConfirm(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span>Delete from Facebook Page &amp; Library</span>
                  </button>
                )}

              {/* Option B: Remove from Library Only */}
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteConfirm(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
              >
                <span>Remove from Post Library Only</span>
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPostPendingDelete(null)}
                className="w-full py-2 px-4 rounded-xl bg-[#F8F9FD] hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
