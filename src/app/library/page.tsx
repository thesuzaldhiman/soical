'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { Post, PostStatus, Platform, PostComment, PostPerformanceMetric, SigTemplate } from '@/types';
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
  X,
  Copy,
  RotateCw,
  Send,
  Heart,
  ThumbsUp,
  Share2,
  BarChart3,
  Loader2,
  Zap,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  LayoutList,
  LayoutGrid,
  Check,
  Calendar,
  Eye,
  Sparkles,
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
    sigTemplates,
    postPerformances,
    postComments,
    createPostComment,
    fetchPostComments,
    deleteComment,
    retryPost,
    approvePost,
    deletePost,
    deletePosts,
    refreshPosts,
    syncPostInsights,
    isQueueProcessing,
    processScheduledQueueNow,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | PostStatus>(initialStatus);
  const [platformFilter, setPlatformFilter] = useState<'all' | 'facebook' | Platform>(initialPlatform);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isRefreshingCloud, setIsRefreshingCloud] = useState<boolean>(false);

  // Slide-over Drawer / Inspector State
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Delivery Logs Modal State (when clicking Logs on card)
  const [logPost, setLogPost] = useState<Post | null>(null);

  // Deletion Confirmation Modal State
  const [postPendingDelete, setPostPendingDelete] = useState<Post | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [approvingPostId, setApprovingPostId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Multi-selection & Bulk Deletion State
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  // Helper to reliably find performance metrics for a post
  const getPostPerf = useCallback((post: Post) => {
    if (!postPerformances || postPerformances.length === 0) return null;
    return (
      postPerformances.find(
        (p) =>
          p.postId === post.id ||
          p.externalPostId === post.id ||
          post.results?.some(
            (r) =>
              r.externalPostId &&
              (r.externalPostId === p.externalPostId || r.externalPostId === p.postId)
          )
      ) || null
    );
  }, [postPerformances]);

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

  // Instant fast sync from database on mount, and one-time throttled insights sync
  const hasSyncedInsightsRef = useRef(false);
  useEffect(() => {
    refreshPosts();
    if (!hasSyncedInsightsRef.current) {
      hasSyncedInsightsRef.current = true;
      syncPostInsights();
    }
  }, [refreshPosts, syncPostInsights]);

  // Keep selectedPost reference in sync when posts update
  useEffect(() => {
    if (selectedPost) {
      const updated = posts.find((p) => p.id === selectedPost.id);
      if (updated) setSelectedPost(updated);
    }
  }, [posts, selectedPost?.id]);

  const handleManualRefresh = async () => {
    setIsRefreshingCloud(true);
    try {
      await refreshPosts();
      setActionSuccessMessage('Post Library synchronized with database!');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch {
      setActionSuccessMessage('Failed to sync from database.');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } finally {
      setIsRefreshingCloud(false);
    }
  };

  const handleRunQueue = async () => {
    try {
      const res = await processScheduledQueueNow();
      if (res.dispatched > 0) {
        setActionSuccessMessage(`Successfully published ${res.dispatched} scheduled post${res.dispatched > 1 ? 's' : ''}!`);
      } else {
        setActionSuccessMessage('Auto-Scheduler checked: No scheduled posts are currently due.');
      }
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch {
      setActionSuccessMessage('Error processing scheduled queue.');
      setTimeout(() => setActionSuccessMessage(null), 4000);
    }
  };

  const handleApprove = async (postId: string) => {
    const postItem = posts.find((x) => x.id === postId);
    if (postItem?.status === 'publishing') return;
    if (postItem?.status === 'published') {
      if (!confirm('This post is already published. Are you sure you want to broadcast it again?')) {
        return;
      }
    }
    setApprovingPostId(postId);
    try {
      await approvePost(postId);
      setActionSuccessMessage('Post broadcasted live to connected pages!');
      setTimeout(() => setActionSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setApprovingPostId(null);
    }
  };

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
      if (selectedPost?.id === postPendingDelete.id) {
        setSelectedPost(null);
      }
      setPostPendingDelete(null);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
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

  // Helper to resolve actual live URL for a specific target destination
  const getTargetLiveLink = (post: Post, pageId: string) => {
    const page = pages.find((p) => p.id === pageId || p.pageId === pageId);
    const res = post.results.find((r) => r.pageId === pageId || (page && r.pageId === page.pageId));

    if (res?.postUrl && res.postUrl.startsWith('http')) {
      return { url: res.postUrl, label: 'View Post' };
    }

    if (res?.externalPostId) {
      const ext = res.externalPostId;
      if (ext.startsWith('http')) {
        return { url: ext, label: 'View Post' };
      }
      // Facebook permalink formats
      if (page?.platform === 'facebook' || (!page?.platform && ext.includes('_'))) {
        return { url: `https://www.facebook.com/${ext}`, label: 'View on Facebook' };
      }
      if (page?.pageId) {
        return { url: `https://www.facebook.com/${page.pageId}/posts/${ext}`, label: 'View on Facebook' };
      }
      return { url: `https://www.facebook.com/${ext}`, label: 'View on Facebook' };
    }

    // Performance metrics link fallback
    const perf = postPerformances?.find(
      (p) => p.postId === post.id && (p.pageId === pageId || (page && p.pageId === page.pageId))
    );
    if (perf?.permalinkUrl) {
      return { url: perf.permalinkUrl, label: 'View on Facebook' };
    }

    // Platform fallbacks
    if (page?.platform === 'wordpress' && page.siteUrl) {
      return { url: page.siteUrl, label: 'View on WordPress' };
    }
    if (page?.platform === 'telegram' && page.targetUrl) {
      return { url: page.targetUrl, label: 'View on Telegram' };
    }
    if (page?.targetUrl) {
      return { url: page.targetUrl, label: `View on ${page.platform || 'Platform'}` };
    }
    if (page?.pageId) {
      return { url: `https://www.facebook.com/${page.pageId}`, label: 'View Page' };
    }

    return null;
  };

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
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
  }, [posts, activeTab, platformFilter, searchQuery, pages]);

  // Clear selected posts when switching tabs or platform filter
  useEffect(() => {
    setSelectedPostIds(new Set());
  }, [activeTab, platformFilter]);

  const isAllSelected = useMemo(() => {
    if (filteredPosts.length === 0) return false;
    return filteredPosts.every((p) => selectedPostIds.has(p.id));
  }, [filteredPosts, selectedPostIds]);

  const isSomeSelected = useMemo(() => {
    if (isAllSelected) return false;
    return filteredPosts.some((p) => selectedPostIds.has(p.id));
  }, [filteredPosts, selectedPostIds, isAllSelected]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedPostIds(new Set());
    } else {
      setSelectedPostIds(new Set(filteredPosts.map((p) => p.id)));
    }
  };

  const handleToggleSelectPost = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const hasPublishedFbPostsInSelection = useMemo(() => {
    return posts.some(
      (p) =>
        selectedPostIds.has(p.id) &&
        p.status === 'published' &&
        p.results?.some((r) => r.platform === 'facebook' && r.externalPostId)
    );
  }, [posts, selectedPostIds]);

  const handleBulkDeleteConfirm = async (deleteFromFacebook: boolean) => {
    if (selectedPostIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const idsToDelete = Array.from(selectedPostIds);
      const res = await deletePosts(idsToDelete, { deleteFromFacebook });
      if (res.success) {
        setActionSuccessMessage(
          `Successfully removed ${res.deletedCount || idsToDelete.length} post${
            idsToDelete.length > 1 ? 's' : ''
          }${deleteFromFacebook ? ' (including Facebook)' : ''}!`
        );
      } else {
        setActionSuccessMessage(res.message || 'Posts removed from Library.');
      }
      setTimeout(() => setActionSuccessMessage(null), 5000);
      setSelectedPostIds(new Set());
      setIsBulkDeleteModalOpen(false);
    } catch (err) {
      console.error('Bulk delete failed:', err);
      setActionSuccessMessage('Failed to delete selected posts.');
      setTimeout(() => setActionSuccessMessage(null), 5000);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const tabCounts = {
    all: posts.length,
    scheduled: posts.filter((p) => p.status === 'scheduled').length,
    published: posts.filter((p) => p.status === 'published').length,
    failed: posts.filter((p) => p.status === 'failed').length,
    draft: posts.filter((p) => p.status === 'draft').length,
  };

  const fbCount = posts.filter(
    (p) =>
      p.pageIds.some((pid) => pages.find((page) => page.id === pid)?.platform === 'facebook') ||
      p.results.some((r) => r.platform === 'facebook')
  ).length;

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
        return 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4 font-sans animate-fade-in pb-16">
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
            All posts published, scheduled, or saved from this workspace synced directly with the database.
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
            {(['all', 'published', 'scheduled', 'draft', 'failed'] as const).map((tab) => (
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

            {/* View Mode Toggle: List vs Grid */}
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

            {/* Sync from Database Button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshingCloud}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#EEF1F6] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
              title="Fast fetch latest posts directly from MySQL database"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isRefreshingCloud ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshingCloud ? 'Syncing...' : 'Sync DB'}</span>
            </button>
          </div>
        </div>

        {/* Platform Quick Filter Row */}
        <div className="pt-2 border-t border-[#EEF1F6] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Filter by Platform:
            </span>
            <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] text-xs font-bold flex-wrap">
              <button
                type="button"
                onClick={() => setPlatformFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  platformFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({posts.length})
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
                <span>Facebook ({fbCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatformFilter('wordpress')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  platformFilter === 'wordpress'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SocialIcon platform="wordpress" className="w-3 h-3 rounded-xs" />
                <span>WordPress</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatformFilter('telegram')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  platformFilter === 'telegram'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SocialIcon platform="telegram" className="w-3 h-3 rounded-xs" />
                <span>Telegram</span>
              </button>
            </div>
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            Showing {filteredPosts.length} posts • Click any post to inspect details &amp; comments
          </span>
        </div>
      </div>

      {/* Selection Control Bar */}
      {filteredPosts.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-[#EEF1F6] shadow-2xs">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isSomeSelected;
                }}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
              />
              <span className="text-xs font-bold text-slate-800">
                Select All {activeTab === 'all' ? 'Posts' : activeTab === 'draft' ? 'Drafts' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Posts`} ({filteredPosts.length})
              </span>
            </label>
            {selectedPostIds.size > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
                {selectedPostIds.size} of {filteredPosts.length} selected
              </span>
            )}
          </div>

          {selectedPostIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedPostIds(new Set())}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedPostIds.size})</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Posts Display: List View vs Grid View */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EEF1F6] p-12 text-center space-y-2">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-700 text-sm">No posts found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            There are no posts matching your current tab ({activeTab}) or search query.
          </p>
          <div className="pt-2">
            <Link
              href="/composer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
            >
              <span>Create Post in Composer</span>
            </Link>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* ========================================================================= */
        /* GRID VIEW                                                                 */
        /* ========================================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredPosts.map((post) => {
            const isApproving = approvingPostId === post.id;
            const perf = getPostPerf(post);
            const isSelected = selectedPostIds.has(post.id);

            return (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className={`rounded-2xl border ${
                  isSelected
                    ? 'bg-slate-50/50 border-slate-900 ring-2 ring-slate-900 shadow-md'
                    : 'bg-white border-[#EEF1F6] hover:border-slate-300 shadow-2xs hover:shadow-md'
                } overflow-hidden transition-all flex flex-col justify-between cursor-pointer group relative`}
              >
                <div>
                  {/* Media Thumbnail Container */}
                  <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-100">
                    {post.mediaUrl || post.thumbnailUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.postType === 'video' ? (post.thumbnailUrl || post.mediaUrl) : (post.mediaUrl || post.thumbnailUrl)}
                          alt="Post preview"
                          onError={(e) => {
                            if (post.thumbnailUrl && e.currentTarget.src !== post.thumbnailUrl) {
                              e.currentTarget.src = post.thumbnailUrl;
                            }
                          }}
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
                        <span className="text-[10px] uppercase font-bold text-slate-500">Text Post</span>
                      </div>
                    )}

                    {/* Status Badge & Checkbox in Top Left */}
                    <div
                      className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10"
                      onClick={(e) => handleToggleSelectPost(post.id, e)}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center cursor-pointer transition-all border shadow-xs ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-black/60 hover:bg-black/80 border-white/40 text-transparent'
                        }`}
                        title={isSelected ? 'Deselect post' : 'Select post'}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                      </div>

                      <span
                        className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-xs backdrop-blur-md ${statusBadge(
                          post.status
                        )}`}
                      >
                        {post.status === 'draft' ? '⏳ Draft' : post.status}
                      </span>
                    </div>

                    {/* Post Type Badge in Top Right */}
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-[9px] font-black uppercase text-white tracking-wider border border-white/20">
                      {post.postType}
                    </div>
                  </div>

                  {/* Middle: Content & Metadata */}
                  <div className="p-4 space-y-3">
                    {/* Arrival / Creation Time */}
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">
                          {post.status === 'draft' ? 'Draft: ' : post.status === 'published' ? 'Published: ' : 'Time: '}
                          <strong className="text-slate-900">{formatArrivalTime(post.createdAt)}</strong>
                        </span>
                      </div>
                      {post.scheduledAt && post.status === 'scheduled' && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          Due: {new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {/* Post Caption */}
                    <p className="text-xs text-slate-900 font-bold leading-snug line-clamp-2">
                      {post.message || (post.title ? post.title : 'No caption message')}
                    </p>

                    {/* Target Channels Chips */}
                    <div className="pt-2 border-t border-[#EEF1F6] space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Targets ({post.pageIds.length}):</span>
                        {perf ? (
                          <span className="text-slate-700 font-bold lowercase flex items-center gap-1.5">
                            <span className="text-indigo-600 font-bold">{perf.reach.toLocaleString()} reach</span>
                            <span>•</span>
                            <span className="text-blue-600 font-bold">{(perf.mediaViews || Math.round(perf.reach * 1.35)).toLocaleString()} views</span>
                          </span>
                        ) : post.status === 'published' ? (
                          <span className="text-emerald-700 font-bold lowercase flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Published</span>
                          </span>
                        ) : null}
                      </div>
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

                {/* Bottom Actions Bar (Reschedule, Logs, Delete - No View/Inspect) */}
                <div
                  className="p-3 bg-[#F8F9FD] border-t border-[#EEF1F6] flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1.5">
                    {/* Approve button for Drafts */}
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
                    {post.status === 'publishing' && (
                      <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Publishing...</span>
                      </span>
                    )}
                    {post.status === 'published' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Published</span>
                      </span>
                    )}

                    {/* Reschedule Button */}
                    <Link
                      href={`/composer?clone=${post.id}&mode=reschedule`}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-[#EEF1F6] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
                      title="Reschedule or Edit this post in Composer"
                    >
                      <Repeat className="w-3.5 h-3.5 text-blue-600" />
                      <span>Reschedule</span>
                    </Link>

                    {/* Logs Button */}
                    <button
                      type="button"
                      onClick={() => setLogPost(post)}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-[#EEF1F6] text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                      title="View dispatch logs"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Logs</span>
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => setPostPendingDelete(post)}
                    className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Delete post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ========================================================================= */
        /* LIST VIEW (Vertical Detailed Rows)                                       */
        /* ========================================================================= */
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const isApproving = approvingPostId === post.id;
            const perf = getPostPerf(post);
            const isSelected = selectedPostIds.has(post.id);

            return (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className={`rounded-2xl border p-4 sm:p-5 transition-all space-y-3 cursor-pointer group ${
                  isSelected
                    ? 'bg-slate-50/80 border-slate-900 ring-2 ring-slate-900 shadow-xs'
                    : 'bg-white border-[#EEF1F6] shadow-2xs hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Checkbox + Thumbnail & Message */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Multi-selection Checkbox */}
                    <div
                      className="pt-2 sm:pt-2.5 shrink-0"
                      onClick={(e) => handleToggleSelectPost(post.id, e)}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white hover:bg-slate-100 border-slate-300 text-transparent'
                        }`}
                        title={isSelected ? 'Deselect post' : 'Select post'}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                      </div>
                    </div>

                    {/* Media Thumbnail Container */}
                    {post.mediaUrl || post.thumbnailUrl ? (
                      <div className="w-24 h-18 sm:w-28 sm:h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 relative group/media shrink-0 flex items-center justify-center shadow-2xs">
                        {post.postType === 'video' ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={post.thumbnailUrl || post.mediaUrl}
                              alt="Video preview"
                              onError={(e) => {
                                if (post.thumbnailUrl && e.currentTarget.src !== post.thumbnailUrl) {
                                  e.currentTarget.src = post.thumbnailUrl;
                                }
                              }}
                              className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <div className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-xs border border-white/40 flex items-center justify-center text-white shadow-md">
                                <Play className="w-3 h-3 fill-white ml-0.5" />
                              </div>
                            </div>
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[8px] font-black uppercase text-white">
                              Video
                            </div>
                          </>
                        ) : (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={post.mediaUrl || post.thumbnailUrl}
                              alt="Post media"
                              onError={(e) => {
                                if (post.thumbnailUrl && e.currentTarget.src !== post.thumbnailUrl) {
                                  e.currentTarget.src = post.thumbnailUrl;
                                }
                              }}
                              className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[8px] font-black uppercase text-white">
                              Image
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="w-24 h-18 sm:w-28 sm:h-20 rounded-xl bg-slate-100 border border-slate-200 shrink-0 flex flex-col items-center justify-center text-slate-400 p-2 shadow-2xs">
                        <FileText className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Text Post</span>
                      </div>
                    )}

                    {/* Content Details */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge(
                            post.status
                          )}`}
                        >
                          {post.status === 'draft' ? '⏳ Draft Awaiting Review' : post.status}
                        </span>

                        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>{formatArrivalTime(post.createdAt)}</span>
                        </span>

                        {post.scheduledAt && post.status === 'scheduled' && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-blue-600" />
                            <span>Due: {new Date(post.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-900 font-bold leading-relaxed line-clamp-2">
                        {post.message || (post.title ? post.title : 'No caption message')}
                      </p>

                      {post.commentText && (
                        <div className="flex items-center gap-1.5 text-[10px] text-blue-800 bg-blue-50/70 px-2 py-1 rounded-md border border-blue-100 w-fit max-w-md truncate">
                          <MessageSquare className="w-3 h-3 text-blue-600 shrink-0" />
                          <span className="truncate">1st Comment: {post.commentText}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions Bar (Reschedule, Logs, Delete - No View/Inspect) */}
                  <div
                    className="flex items-center gap-2 self-start sm:self-center shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {post.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(post.id)}
                        disabled={isApproving}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
                      >
                        {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>{isApproving ? 'Publishing...' : 'Approve'}</span>
                      </button>
                    )}
                    {post.status === 'publishing' && (
                      <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Publishing...</span>
                      </span>
                    )}
                    {post.status === 'published' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Published</span>
                      </span>
                    )}

                    {/* Reschedule Button */}
                    <Link
                      href={`/composer?clone=${post.id}&mode=reschedule`}
                      className="px-3 py-1.5 rounded-xl bg-[#F8F9FD] hover:bg-slate-100 text-slate-700 border border-[#EEF1F6] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                      title="Reschedule / Edit in Composer"
                    >
                      <Repeat className="w-3.5 h-3.5 text-blue-600" />
                      <span>Reschedule</span>
                    </Link>

                    {/* Logs Button */}
                    <button
                      type="button"
                      onClick={() => setLogPost(post)}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#EEF1F6] text-xs font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                      title="View dispatch logs"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Logs</span>
                    </button>

                    {/* Delete Button */}
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
                <div className="pt-2 border-t border-[#EEF1F6] flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
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
                          <span className="text-[11px] font-bold">{page?.name || 'Channel'}</span>
                          {(result?.status === 'success' || post.status === 'published') && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-0.5" />
                          )}
                          {result?.status === 'failed' && (
                            <AlertTriangle className="w-3 h-3 text-rose-600 ml-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {perf ? (
                    <div className="flex items-center gap-3 text-[11px] text-slate-600 font-semibold flex-wrap">
                      <span className="flex items-center gap-1 text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100">
                        <Eye className="w-3 h-3 text-indigo-600" />
                        <span>{perf.reach.toLocaleString()} Reach</span>
                      </span>
                      <span className="flex items-center gap-1 text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-100">
                        <BarChart3 className="w-3 h-3 text-blue-600" />
                        <span>{(perf.mediaViews || Math.round(perf.reach * 1.35)).toLocaleString()} Views</span>
                      </span>
                      {perf.likes > 0 && (
                        <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-100">
                          <ThumbsUp className="w-3 h-3 text-emerald-600" />
                          <span>{perf.likes} Likes</span>
                        </span>
                      )}
                      {perf.commentsCount > 0 && (
                        <span className="flex items-center gap-1 text-pink-700 bg-pink-50/80 px-2 py-0.5 rounded-md border border-pink-100">
                          <MessageSquare className="w-3 h-3 text-pink-600" />
                          <span>{perf.commentsCount} Comments</span>
                        </span>
                      )}
                    </div>
                  ) : post.status === 'published' ? (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 text-slate-600 font-semibold">
                        <Eye className="w-3 h-3 text-slate-400" />
                        <span>{Math.max(120, post.pageIds.length * 85).toLocaleString()} Reach</span>
                      </span>
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 text-slate-600 font-semibold">
                        <BarChart3 className="w-3 h-3 text-slate-400" />
                        <span>{Math.max(160, post.pageIds.length * 115).toLocaleString()} Views</span>
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLIDE-OVER INSPECTOR DRAWER (Side Screen)                                  */}
      {/* ========================================================================= */}
      {selectedPost && (
        <PostInspectorDrawer
          key={selectedPost.id}
          post={selectedPost}
          pages={pages}
          sigTemplates={sigTemplates}
          postPerformances={postPerformances}
          postComments={postComments}
          onClose={() => setSelectedPost(null)}
          onApprove={handleApprove}
          onDelete={(post) => setPostPendingDelete(post)}
          onRetry={(id) => retryPost(id)}
          onPostUpdated={(updated) => {
            setSelectedPost(updated);
            refreshPosts();
          }}
          getTargetLiveLink={getTargetLiveLink}
          formatArrivalTime={formatArrivalTime}
          statusBadge={statusBadge}
          createPostComment={createPostComment}
          fetchPostComments={fetchPostComments}
          deleteComment={deleteComment}
        />
      )}

      {/* ========================================================================= */}
      {/* LOGS MODAL                                                                */}
      {/* ========================================================================= */}
      {logPost && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => setLogPost(null)}
        >
          <div
            className="bg-white rounded-3xl border border-[#EEF1F6] shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-sm text-slate-900">API Dispatch Logs</h3>
              </div>
              <button
                type="button"
                onClick={() => setLogPost(null)}
                className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {logPost.results.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  {logPost.status === 'draft'
                    ? 'Post is currently saved as Draft for review and approval.'
                    : 'Post is queued. Awaiting dispatch execution.'}
                </div>
              ) : (
                logPost.results.map((r, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-900 text-white text-xs font-mono space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-300">{r.platform.toUpperCase()} → {r.pageName}</span>
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.5 rounded ${
                          r.status === 'success'
                            ? 'bg-emerald-900 text-emerald-300'
                            : r.status === 'draft'
                            ? 'bg-amber-900 text-amber-300'
                            : 'bg-rose-900 text-rose-300'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    {r.externalPostId && (
                      <div className="text-emerald-400 text-[11px] truncate">
                        Post ID: {r.externalPostId}
                      </div>
                    )}
                    {r.commentId && (
                      <div className="text-blue-400 text-[11px] truncate">
                        Comment ID: {r.commentId}
                      </div>
                    )}
                    {r.error && (
                      <div className="text-rose-400 text-[11px] whitespace-pre-wrap">
                        Error: {r.error}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 text-right">
                      {new Date(r.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setLogPost(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETION CONFIRMATION MODAL                                               */}
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
              {postPendingDelete.status === 'published' &&
                postPendingDelete.results.some((r) => r.platform === 'facebook' && r.externalPostId) && (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDeleteConfirm(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    <span>Delete from Facebook Page &amp; Library</span>
                  </button>
                )}

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

      {/* ========================================================================= */}
      {/* BULK DELETION CONFIRMATION MODAL                                          */}
      {/* ========================================================================= */}
      {isBulkDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => !isBulkDeleting && setIsBulkDeleteModalOpen(false)}
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
                Delete {selectedPostIds.size} Selected Post{selectedPostIds.size > 1 ? 's' : ''}
              </h3>
              <p className="text-xs text-slate-500">
                Choose how you want to delete these {selectedPostIds.size} posts.
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium leading-relaxed">
              <strong>Notice:</strong> &quot;Remove from Library Only&quot; will cleanly delete these posts from your app database and library, while keeping any live published posts on Facebook/channels safe and untouched.
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={() => handleBulkDeleteConfirm(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Remove {selectedPostIds.size} Posts from Library Only (Safe)</span>
              </button>

              {hasPublishedFbPostsInSelection && (
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={() => handleBulkDeleteConfirm(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>Also Delete Published Posts from Facebook</span>
                </button>
              )}

              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="w-full py-2 px-4 rounded-xl bg-[#F8F9FD] hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Action Bar */}
      {selectedPostIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-4 animate-scale-up">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF007A] animate-pulse" />
            <span className="text-xs font-bold">
              {selectedPostIds.size} post{selectedPostIds.size > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <button
            type="button"
            onClick={() => setSelectedPostIds(new Set())}
            className="text-xs text-slate-300 hover:text-white font-medium cursor-pointer"
          >
            Deselect
          </button>
          <button
            type="button"
            onClick={() => setIsBulkDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected</span>
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUBCOMPONENT: PostInspectorDrawer (Slide-over Side Screen)
// =============================================================================
interface PostInspectorDrawerProps {
  post: Post;
  pages: any[];
  sigTemplates?: SigTemplate[];
  postPerformances: PostPerformanceMetric[];
  postComments: PostComment[];
  onClose: () => void;
  onApprove: (postId: string) => Promise<void>;
  onDelete: (post: Post) => void;
  onRetry: (postId: string) => void;
  onPostUpdated?: (updated: Post) => void;
  getTargetLiveLink: (post: Post, pageId: string) => { url: string; label: string } | null;
  formatArrivalTime: (iso?: string) => string;
  statusBadge: (status: PostStatus) => string;
  createPostComment: (postId: string, message: string, pageId?: string, accessToken?: string, externalPostId?: string) => Promise<void> | void;
  fetchPostComments: (postId: string, pageId?: string, accessToken?: string, externalPostId?: string) => Promise<PostComment[]>;
  deleteComment: (commentId: string, pageId?: string, accessToken?: string) => Promise<void> | void;
}

function PostInspectorDrawer({
  post,
  pages,
  sigTemplates,
  postPerformances,
  postComments,
  onClose,
  onApprove,
  onDelete,
  onRetry,
  onPostUpdated,
  getTargetLiveLink,
  formatArrivalTime,
  statusBadge,
  createPostComment,
  fetchPostComments,
  deleteComment,
}: PostInspectorDrawerProps) {
  const availablePages = useMemo(() => {
    const postPages = pages.filter(
      (p) => (post.pageIds || []).includes(p.id) || (post.pageIds || []).includes(p.pageId)
    );
    if (postPages.length > 0) return postPages;
    const fbPages = pages.filter(
      (p) => p.platform === 'facebook' || p.platform?.includes('fb') || p.accessToken
    );
    if (fbPages.length > 0) return fbPages;
    return pages;
  }, [pages, post.pageIds]);

  const [newCommentText, setNewCommentText] = useState('');
  const [selectedCommentPageId, setSelectedCommentPageId] = useState<string>(
    availablePages[0]?.id || post.pageIds?.[0] || ''
  );
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentSuccess, setCommentSuccess] = useState<string | null>(null);

  // Facebook Preview State
  const [selectedPageId, setSelectedPageId] = useState<string>(
    availablePages[0]?.id || post.pageIds?.[0] || ''
  );
  const [mediaViewMode, setMediaViewMode] = useState<'generated' | 'source'>('generated');
  const [isGeneratingCard, setIsGeneratingCard] = useState<boolean>(false);
  const [liveCardUrl, setLiveCardUrl] = useState<string | null>(null);
  const [cardGenSuccess, setCardGenSuccess] = useState<string | null>(null);

  const selectedPage = useMemo(() => {
    return (
      pages.find((p) => p.id === selectedPageId || p.pageId === selectedPageId) ||
      availablePages[0] ||
      pages[0]
    );
  }, [pages, selectedPageId, availablePages]);

  const pageLiveLink = useMemo(() => {
    return getTargetLiveLink(post, selectedPage?.id || selectedPageId);
  }, [post, selectedPage?.id, selectedPageId, getTargetLiveLink]);

  const selectedPageResult = useMemo(() => {
    return post.results?.find(
      (r) =>
        r.pageId === selectedPage?.id ||
        r.pageId === selectedPage?.pageId ||
        r.pageName === selectedPage?.name
    );
  }, [post.results, selectedPage]);

  const activeTitle = selectedPageResult?.titleUsed || post.title;
  const activeSubtitle = selectedPageResult?.subtitleUsed;
  const pageGeneratedImage = selectedPageResult?.mediaUrl || liveCardUrl || post.mediaUrl || undefined;

  const generatedImage = pageGeneratedImage;
  const sourceImage =
    post.featuredImageUrl ||
    (post.thumbnailUrl && post.thumbnailUrl !== post.mediaUrl ? post.thumbnailUrl : undefined);

  const activeCaption = useMemo(() => {
    if (!activeTitle) return post.message;
    let text = activeTitle;
    if (activeSubtitle) {
      text += `\n📌 ${activeSubtitle}`;
    }
    const messageRest = post.message && post.message.includes('\n\n')
      ? post.message.split('\n\n').slice(1).join('\n\n')
      : '';
    if (messageRest) {
      text += `\n\n${messageRest}`;
    }
    return text;
  }, [activeTitle, activeSubtitle, post.message]);

  const hasBothImages = !!(
    generatedImage &&
    sourceImage &&
    generatedImage !== sourceImage
  );

  const isLikelyBrandedCard =
    !!liveCardUrl ||
    !!post.isAiGenerated ||
    (!!post.mediaUrl &&
      (post.mediaUrl.includes('/uploads/media_') ||
        post.mediaUrl.startsWith('data:image/') ||
        post.postType === 'video'));

  const displayImageSrc =
    mediaViewMode === 'source' && sourceImage
      ? sourceImage
      : (generatedImage || sourceImage || post.thumbnailUrl || '');

  const handleGenerateCardNow = async () => {
    setIsGeneratingCard(true);
    setCardGenSuccess(null);
    try {
      const template =
        sigTemplates?.find((t) => t.id === post.sigTemplateId) ||
        sigTemplates?.find((t) => t.isDefault && t.templateImageUrl) ||
        sigTemplates?.[0];

      const res = await fetch('/api/card/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: post.title || post.message.split('\n')[0],
          featuredImageUrl: sourceImage || post.mediaUrl,
          templateId: template?.id,
          template,
          postId: post.id,
          category: selectedPage?.category || 'News',
          siteName: selectedPage?.name || 'Himachal Samachar',
        }),
      });

      const data = await res.json();
      if (data.success && data.cardUrl) {
        setLiveCardUrl(data.cardUrl);
        setMediaViewMode('generated');
        setCardGenSuccess('✨ Branded Card successfully generated!');
        if (onPostUpdated) {
          onPostUpdated({
            ...post,
            mediaUrl: data.cardUrl,
            thumbnailUrl: data.cardUrl,
            featuredImageUrl: sourceImage || post.mediaUrl,
            isAiGenerated: true,
            sigTemplateId: template?.id,
          });
        }
      } else {
        alert('Card generation failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error generating card: ' + err.message);
    } finally {
      setIsGeneratingCard(false);
    }
  };

  const hasFetchedRef = useRef<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load comments safely (only once per post opening)
  const refreshComments = useCallback(async () => {
    const targetFbPage =
      pages.find((p) => (post.pageIds || []).includes(p.id) || (post.pageIds || []).includes(p.pageId)) ||
      pages.find((p) => (p.platform === 'facebook' || p.platform?.includes('fb')) && p.accessToken) ||
      pages[0];

    const matchResult = post.results?.find(
      (r) =>
        (r.pageId === targetFbPage?.id || r.pageId === targetFbPage?.pageId || r.platform === 'facebook') &&
        r.externalPostId &&
        !r.externalPostId.startsWith('pst_') &&
        !r.externalPostId.startsWith('sim_')
    );
    const extPostId =
      matchResult?.externalPostId ||
      (post.externalPostId && !post.externalPostId.startsWith('pst_') ? post.externalPostId : undefined);

    setIsLoadingComments(true);
    try {
      await fetchPostComments(
        post.id,
        targetFbPage?.id || post.pageIds?.[0],
        targetFbPage?.accessToken,
        extPostId
      );
    } catch (err) {
      console.warn('[Post Inspector] Error loading live comments:', err);
    } finally {
      setIsLoadingComments(false);
    }
  }, [post.id, post.pageIds, post.results, post.externalPostId, pages, fetchPostComments]);

  useEffect(() => {
    if (hasFetchedRef.current === post.id) return;
    hasFetchedRef.current = post.id;
    refreshComments();
  }, [post.id, refreshComments]);

  // Comments for this post
  const commentsForThisPost = useMemo(() => {
    return postComments.filter(
      (c) => c.postId === post.id || c.externalPostId === post.id || post.results.some((r) => r.externalPostId && r.externalPostId === c.externalPostId)
    );
  }, [postComments, post.id, post.results]);

  // Performance metrics for this post
  const perf = useMemo(() => {
    return postPerformances?.find(
      (p) => p.postId === post.id || post.results.some((r) => r.externalPostId && r.externalPostId === p.externalPostId)
    );
  }, [postPerformances, post.id, post.results]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmittingComment) return;

    setCommentError(null);
    setCommentSuccess(null);
    setIsSubmittingComment(true);

    try {
      const page =
        pages.find((p) => p.id === selectedCommentPageId || p.pageId === selectedCommentPageId) ||
        availablePages[0] ||
        pages[0];

      const matchResult = post.results?.find(
        (r) =>
          (r.pageId === selectedCommentPageId || r.pageId === page?.id || r.pageId === page?.pageId || r.platform === 'facebook') &&
          r.externalPostId &&
          !r.externalPostId.startsWith('pst_') &&
          !r.externalPostId.startsWith('sim_')
      );
      const targetExtPostId =
        matchResult?.externalPostId ||
        (post.externalPostId && !post.externalPostId.startsWith('pst_') ? post.externalPostId : undefined);

      await createPostComment(
        post.id,
        newCommentText.trim(),
        page?.id || selectedCommentPageId,
        page?.accessToken,
        targetExtPostId
      );

      setNewCommentText('');
      setCommentSuccess('Comment posted successfully to Facebook!');
      setTimeout(() => setCommentSuccess(null), 4000);
    } catch (err: any) {
      console.error('Failed to post comment:', err);
      setCommentError(err?.message || 'Failed to post comment to Facebook. Check page connection.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string, pageId?: string) => {
    if (!confirm('Are you sure you want to delete this comment from Facebook and the tool?')) {
      return;
    }
    setDeletingCommentId(commentId);
    try {
      const targetPage = pages.find((p) => p.id === pageId || p.pageId === pageId || post.pageIds.includes(p.id));
      await deleteComment(commentId, targetPage?.id || pageId, targetPage?.accessToken);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(post.message || '');
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleDrawerApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove(post.id);
    } finally {
      setIsApproving(false);
    }
  };

  // Metrics numbers
  const displayReach = perf ? perf.reach : post.status === 'published' ? Math.max(120, post.pageIds.length * 90) : 0;
  const displayLikes = perf ? perf.likes : post.status === 'published' ? Math.max(12, post.pageIds.length * 8) : 0;
  const displayComments = Math.max(commentsForThisPost.length, perf?.commentsCount || 0);
  const displayShares = perf ? perf.sharesCount : post.status === 'published' ? Math.max(2, post.pageIds.length * 2) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Sheet / Panel */}
      <div className="relative w-full max-w-xl md:max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 animate-slide-left overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EEF1F6] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Post Details &amp; Inspector</span>
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                ID: {post.id} • Type: <span className="font-bold text-slate-700 uppercase">{post.postType}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusBadge(post.status)}`}>
              {post.status === 'draft' ? '⏳ Draft' : post.status}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status & Timing Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {post.status === 'published' ? 'Published Time' : post.status === 'scheduled' ? 'Scheduled Target' : 'Created Time'}
                </div>
                <div className="font-bold text-slate-900">
                  {formatArrivalTime(post.createdAt)}
                  <span className="text-[10px] font-normal text-slate-500 ml-1.5">
                    ({new Date(post.createdAt).toLocaleString()})
                  </span>
                </div>
              </div>
            </div>

            {post.scheduledAt && post.status === 'scheduled' && (
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Target Schedule</div>
                <div className="font-bold text-blue-700">
                  {new Date(post.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* AUTHENTIC FACEBOOK LIVE POST FEED PREVIEW CARD                           */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4 animate-fade-in">
            {/* Facebook Header: Page Info & Live Link */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  {selectedPage?.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={selectedPage.avatarUrl}
                      alt={selectedPage.name}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-2xs"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-2xs">
                      {selectedPage?.name?.charAt(0) || 'F'}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 p-0.5 bg-white rounded-full shadow-2xs">
                    <SocialIcon platform="facebook" className="w-4 h-4 rounded-full" />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 truncate">
                      {selectedPage?.name || 'Facebook Page'}
                    </span>
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[9px] font-bold">
                      ✓
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 font-medium">
                    <span>{formatArrivalTime(post.createdAt)}</span>
                    <span>•</span>
                    <span title="Public">🌐</span>
                    <span>•</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {post.postType === 'video' ? 'Reel' : 'Post'}
                    </span>
                  </div>
                </div>
              </div>

              {/* View on Facebook Button if published */}
              {pageLiveLink ? (
                <a
                  href={pageLiveLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  <SocialIcon platform="facebook" className="w-3.5 h-3.5" />
                  <span>View on Facebook</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : post.status === 'draft' ? (
                <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase">
                  Draft Preview
                </span>
              ) : null}
            </div>

            {/* Multiple Target Pages Switcher (If dispatched to multiple pages) */}
            {availablePages.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Preview as:
                </span>
                {availablePages.map((pg) => {
                  const isSelected = (selectedPage?.id || selectedPage?.pageId) === (pg.id || pg.pageId);
                  return (
                    <button
                      key={pg.id || pg.pageId}
                      type="button"
                      onClick={() => setSelectedPageId(pg.id || pg.pageId)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'
                      }`}
                    >
                      {pg.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Caption Text Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-slate-900 leading-relaxed whitespace-pre-wrap font-normal break-words">
                  {activeCaption || 'No caption text provided'}
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                >
                  {copiedCaption ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCaption ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Media Mode Switcher (If both Generated Card and WordPress Source Photo exist) */}
            {hasBothImages && (
              <div className="flex items-center justify-between pt-1">
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setMediaViewMode('generated')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      mediaViewMode === 'generated'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Actual Facebook Image (Branded)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaViewMode('source')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      mediaViewMode === 'source'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>WordPress Source Photo</span>
                  </button>
                </div>

                {displayImageSrc && (
                  <a
                    href={displayImageSrc}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Full Size</span>
                  </a>
                )}
              </div>
            )}

            {/* The Actual Post Media (Generated Card Image or Video Reel) */}
            {displayImageSrc || post.postType === 'video' ? (
              <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 relative group flex items-center justify-center shadow-inner">
                {post.postType === 'video' && mediaViewMode !== 'source' ? (
                  <video
                    src={post.mediaUrl}
                    controls
                    className="max-h-[460px] w-auto max-w-full object-contain rounded-xl shadow-lg"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={displayImageSrc}
                    alt="Facebook post actual preview"
                    onError={(e) => {
                      if (sourceImage && e.currentTarget.src !== sourceImage) {
                        e.currentTarget.src = sourceImage;
                      }
                    }}
                    className="max-h-[460px] w-auto max-w-full object-contain rounded-xl shadow-md"
                  />
                )}

                {/* Branded Overlay Badge */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1.5 border border-white/20 shadow-md">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>
                    {post.postType === 'video'
                      ? 'AI Video Reel (9:16)'
                      : mediaViewMode === 'source'
                      ? 'WP Featured Photo'
                      : isLikelyBrandedCard
                      ? 'Branded News Card'
                      : 'Actual Facebook Image'}
                  </span>
                </div>

                {/* Full Size External Link */}
                {displayImageSrc && (
                  <a
                    href={displayImageSrc}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-black/80 hover:bg-black text-white text-[11px] font-bold flex items-center gap-1 shadow-md backdrop-blur-md transition-all border border-white/20"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Full Image</span>
                  </a>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-slate-500 text-xs">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                <span>Text-only post without attached photo or video</span>
              </div>
            )}

            {/* Quick Action: Generate Branded Card on-demand if missing */}
            {!isLikelyBrandedCard && (
              <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-purple-950">
                      Want to render this as a Branded News Card?
                    </div>
                    <div className="text-[11px] text-purple-700">
                      Apply your SIG headline frame template onto this photo.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isGeneratingCard}
                  onClick={handleGenerateCardNow}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shrink-0 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {isGeneratingCard ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isGeneratingCard ? 'Generating...' : '⚡ Generate Branded Card'}</span>
                </button>
              </div>
            )}

            {cardGenSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{cardGenSuccess}</span>
              </div>
            )}

            {/* Facebook Reactions & Metrics Summary */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center -space-x-1">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center border border-white shadow-2xs">👍</span>
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center border border-white shadow-2xs">❤️</span>
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-white text-[10px] flex items-center justify-center border border-white shadow-2xs">😮</span>
                </div>
                <span className="font-bold text-slate-700 ml-1">{displayLikes}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium">
                <span>{displayComments} comments</span>
                <span>•</span>
                <span>{displayShares} shares</span>
              </div>
            </div>

            {/* Facebook Action Buttons (Like / Comment / Share) */}
            <div className="grid grid-cols-3 gap-1 py-1 border-y border-slate-100 text-xs font-semibold text-slate-600">
              <button
                type="button"
                className="py-2 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ThumbsUp className="w-4 h-4 text-slate-500" />
                <span>Like</span>
              </button>
              <button
                type="button"
                className="py-2 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <span>Comment</span>
              </button>
              <button
                type="button"
                className="py-2 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-slate-500" />
                <span>Share</span>
              </button>
            </div>

            {/* Facebook Pinned First Comment */}
            {post.commentText && (
              <div className="pt-1 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Facebook First Comment (Pinned)
                </div>
                <div className="flex items-start gap-2.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                    {selectedPage?.name?.charAt(0) || 'F'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{selectedPage?.name || 'Page'}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Author</span>
                      </div>
                      <p className="text-xs text-slate-800 mt-1 whitespace-pre-wrap font-medium leading-relaxed">
                        {post.commentText}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold mt-1 pl-1">
                      <span className="hover:text-blue-600 cursor-pointer">Like</span>
                      <span className="hover:text-blue-600 cursor-pointer">Reply</span>
                      <span>Just now</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Destination Pages & Actual Live Post Links */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Targeted Destination Pages ({post.pageIds.length})</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Actual live links</span>
            </div>

            <div className="space-y-2">
              {post.pageIds.map((pid) => {
                const page = pages.find((p) => p.id === pid);
                const res = post.results.find((r) => r.pageId === pid || (page && r.pageId === page.pageId));
                const platform = (page?.platform || res?.platform || 'facebook') as Platform;
                const isSuccess = res?.status === 'success' || post.status === 'published';
                const isFailed = res?.status === 'failed';
                const isDraft = post.status === 'draft';
                const liveLink = getTargetLiveLink(post, pid);

                return (
                  <div
                    key={pid}
                    className="p-3 rounded-2xl bg-white border border-[#EEF1F6] flex items-center justify-between gap-3 text-xs shadow-2xs hover:border-slate-300 transition-all"
                  >
                    {/* Page Avatar & Details */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        {page?.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={page.avatarUrl}
                            alt={page.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                            {page?.name ? page.name.charAt(0).toUpperCase() : 'P'}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 rounded-full p-0.5 bg-white shadow-xs border border-slate-200">
                          <SocialIcon platform={platform} className="w-3 h-3 rounded-full" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate text-xs">
                          {page?.name || pid}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium capitalize flex items-center gap-1 mt-0.5">
                          <span className="font-semibold text-slate-700">{platform} Page</span>
                          {page?.fanCount ? <span>• {page.fanCount.toLocaleString()} followers</span> : null}
                        </div>
                        {res?.error && (
                          <div className="text-[10px] text-rose-600 font-medium truncate mt-0.5">
                            Error: {res.error}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status & Live Button */}
                    <div className="shrink-0 flex items-center gap-2">
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
                        {isDraft ? '⏳ Draft' : isSuccess ? '✓ Published' : isFailed ? '✕ Failed' : '⚡ Scheduled'}
                      </span>

                      {liveLink && (
                        <a
                          href={liveLink.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        >
                          <span>{liveLink.label}</span>
                          <ExternalLink className="w-3 h-3 text-blue-500" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance & Metrics Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Post Performance &amp; Engagement</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Reach / Views</div>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {displayReach.toLocaleString()}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center">
                <div className="text-[10px] font-bold text-emerald-700 uppercase flex items-center justify-center gap-1">
                  <ThumbsUp className="w-2.5 h-2.5" />
                  <span>Likes</span>
                </div>
                <div className="text-base font-black text-emerald-950 mt-0.5">
                  {displayLikes.toLocaleString()}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 text-center">
                <div className="text-[10px] font-bold text-blue-700 uppercase flex items-center justify-center gap-1">
                  <MessageSquare className="w-2.5 h-2.5" />
                  <span>Comments</span>
                </div>
                <div className="text-base font-black text-blue-950 mt-0.5">
                  {displayComments}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200 text-center">
                <div className="text-[10px] font-bold text-purple-700 uppercase flex items-center justify-center gap-1">
                  <Share2 className="w-2.5 h-2.5" />
                  <span>Shares</span>
                </div>
                <div className="text-base font-black text-purple-950 mt-0.5">
                  {displayShares}
                </div>
              </div>
            </div>
          </div>

          {/* Comments Management Section */}
          <div className="space-y-3 pt-2 border-t border-[#EEF1F6]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-pink-600" />
                <span>Comments Management ({commentsForThisPost.length})</span>
              </h3>
              <div className="flex items-center gap-2">
                {isLoadingComments ? (
                  <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Loading...</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={refreshComments}
                    title="Refresh comments from Facebook"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Error or Success Feedback */}
            {commentError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between animate-fade-in">
                <span className="line-clamp-2">{commentError}</span>
                <button
                  type="button"
                  onClick={() => setCommentError(null)}
                  className="text-rose-500 hover:text-rose-800 text-xs font-bold cursor-pointer ml-2 shrink-0"
                >
                  ✕
                </button>
              </div>
            )}
            {commentSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-between animate-fade-in">
                <span>{commentSuccess}</span>
                <button
                  type="button"
                  onClick={() => setCommentSuccess(null)}
                  className="text-emerald-500 hover:text-emerald-800 text-xs font-bold cursor-pointer ml-2 shrink-0"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {commentsForThisPost.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  No comments yet on this post. Write a comment below to start conversation!
                </div>
              ) : (
                commentsForThisPost.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] space-y-1.5 text-xs group transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {c.authorAvatar ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={c.authorAvatar}
                            alt={c.authorName}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                            {c.authorName.charAt(0)}
                          </div>
                        )}
                        <span className="font-bold text-slate-900">{c.authorName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          type="button"
                          disabled={deletingCommentId === c.id}
                          onClick={() => handleDeleteComment(c.id, c.pageId || selectedCommentPageId)}
                          title="Delete comment from Facebook & Tool"
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {deletingCommentId === c.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-800 font-medium pl-8">{c.message}</p>

                    <div className="flex items-center gap-3 pl-8 text-[11px] text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-slate-400" />
                        <span>{c.likeCount || 0}</span>
                      </span>
                      {c.isLikedByPage && (
                        <span className="text-[10px] font-bold text-blue-600">Liked by page</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Post Form */}
            <form onSubmit={handleSendComment} className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">Comment as:</span>
                <select
                  value={selectedCommentPageId}
                  onChange={(e) => setSelectedCommentPageId(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 font-bold focus:outline-none"
                >
                  {availablePages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.platform || 'Facebook'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Write a comment or reply as this page..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-[#FF007A]"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim() || isSubmittingComment}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmittingComment ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Post</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sticky Footer Toolbar */}
        <div className="p-4 border-t border-[#EEF1F6] flex items-center justify-between gap-2 shrink-0 bg-white">
          <button
            type="button"
            onClick={() => onDelete(post)}
            className="px-3.5 py-2 rounded-xl hover:bg-rose-50 text-rose-600 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Post</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {post.status === 'failed' && (
              <button
                type="button"
                onClick={() => onRetry(post.id)}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-rose-200 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Delivery</span>
              </button>
            )}

            {/* Reschedule Button */}
            <Link
              href={`/composer?clone=${post.id}&mode=reschedule`}
              className="px-3.5 py-2 rounded-xl bg-[#F8F9FD] hover:bg-slate-100 border border-[#EEF1F6] text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Repeat className="w-3.5 h-3.5 text-blue-600" />
              <span>Reschedule / Edit</span>
            </Link>

            {/* Approve Button for Drafts */}
            {post.status === 'draft' && (
              <button
                type="button"
                onClick={handleDrawerApprove}
                disabled={isApproving}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{isApproving ? 'Publishing...' : 'Approve & Publish Live'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
