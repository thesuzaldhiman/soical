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
  Eye,
  X,
  Copy,
  RotateCw,
  Globe,
  Loader2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { SocialIcon } from '@/components/ui/SocialIcon';

export default function LibraryPage() {
  return (
    <AppShell>
      <LibraryContent />
    </AppShell>
  );
}

function LibraryContent() {
  const router = useRouter();
  const { posts, pages, retryPost, approvePost, deletePost, isQueueProcessing, processScheduledQueueNow } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | PostStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Inspection Modal State (Full image review before approval)
  const [selectedPostForModal, setSelectedPostForModal] = useState<Post | null>(null);

  // Deletion Confirmation Modal State (Facebook vs Library options)
  const [postPendingDelete, setPostPendingDelete] = useState<Post | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [approvingPostId, setApprovingPostId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

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
    <div className="space-y-4">
      {/* Action Notification Banner */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header (Compact Modern Studio) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#EEF1F6]">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Post Library & Queue</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
            Review full-resolution card images, approve draft stories, delete from Facebook, or retry dispatches.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            <span className={`w-2 h-2 rounded-full ${isQueueProcessing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
            <span className="hidden sm:inline">{isQueueProcessing ? 'Publishing Due Posts...' : 'Auto-Scheduler Active (8s)'}</span>
            <span className="sm:hidden">{isQueueProcessing ? 'Publishing...' : 'Scheduler Active'}</span>
          </div>

          <button
            type="button"
            onClick={handleRunQueue}
            disabled={isQueueProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            title="Instantly process any scheduled posts that have reached their target time"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-500 ${isQueueProcessing ? 'animate-spin' : ''}`} />
            <span>{isQueueProcessing ? 'Running...' : `⚡ Run Due Posts (${tabCounts.scheduled})`}</span>
          </button>

          <Link
            href="/composer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>+ Create New Post</span>
          </Link>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'draft', 'scheduled', 'published', 'failed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === tab
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab === 'draft' ? 'Drafts / Approvals' : tab}</span>
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
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
              There are no posts matching your current tab ({activeTab}) or search filter.
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isExpanded = expandedLogId === post.id;
            const isApproving = approvingPostId === post.id;

            return (
              <div
                key={post.id}
                onClick={() => setSelectedPostForModal(post)}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-400 hover:shadow-sm transition-all space-y-4 cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Thumbnail & Message */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {post.mediaUrl ? (
                      <div className="relative shrink-0 overflow-hidden rounded-xl border border-slate-200 shadow-2xs group-hover:ring-2 group-hover:ring-slate-900 transition-all">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.mediaUrl}
                          alt="media"
                          className="w-20 h-20 sm:w-24 sm:h-24 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {post.postType === 'video' && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                            <Play className="w-5 h-5 fill-white" />
                          </div>
                        )}
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[9px] font-bold text-white flex items-center gap-0.5">
                          <Eye className="w-2.5 h-2.5" />
                          <span>View</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-xs font-bold text-slate-400 uppercase shrink-0 p-2 text-center">
                        <Layers className="w-5 h-5 text-slate-300 mb-1" />
                        <span className="text-[10px]">{post.postType}</span>
                      </div>
                    )}

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge(
                            post.status
                          )}`}
                        >
                          {post.status === 'draft' ? 'Awaiting Review' : post.status}
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
                        {post.status === 'scheduled' && post.scheduledAt && new Date(post.scheduledAt).getTime() <= Date.now() && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            ⚡ Due Now (Publishing...)
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-900 font-bold leading-relaxed line-clamp-3">
                        {post.message}
                      </p>

                      {post.commentText && (
                        <div className="flex items-center gap-1.5 text-xs text-blue-700 font-medium bg-blue-50/70 px-2.5 py-1 rounded-lg border border-blue-100/60 max-w-fit">
                          <MessageSquare className="w-3 h-3 text-blue-600 shrink-0" />
                          <span className="truncate max-w-md">{post.commentText}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div
                    className="flex items-center gap-2 self-end sm:self-start shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Approve & Publish Button for Drafts */}
                    {post.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(post.id)}
                        disabled={isApproving}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-60"
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
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-60"
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
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 transition-all"
                      title="Inspect full image and post details"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>Inspect</span>
                    </button>

                    {post.status === 'failed' && (
                      <button
                        type="button"
                        onClick={() => retryPost(post.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 border border-rose-200 transition-all"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                    )}

                    {/* Logs Dropdown Toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : post.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all"
                      title="View dispatch logs"
                    >
                      <span>Logs</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Delete Post Button (Opens Dual-Option Delete Dialog) */}
                    <button
                      type="button"
                      onClick={() => setPostPendingDelete(post)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                      title="Delete post (from Library or Facebook)"
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
                            : post.status === 'draft'
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <SocialIcon platform={page?.platform || 'facebook'} className="w-3.5 h-3.5 rounded-xs shrink-0" />
                        <span>{page?.name || 'Target Page'}</span>
                        {result?.status === 'success' && (
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
                  <div className="p-4 rounded-xl bg-slate-900 text-white text-xs font-mono space-y-2 animate-fade-in border border-slate-800">
                    <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider mb-2">
                      API Dispatch Logs (Per-Page Response)
                    </div>
                    {post.results.length === 0 ? (
                      <div className="text-slate-500">
                        {post.status === 'draft'
                          ? 'Post is currently saved as Draft for review and approval.'
                          : 'Post is queued. Awaiting dispatch execution.'}
                      </div>
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
          })
        )}
      </div>

      {/* MODAL 1: Full High-Resolution Post & Image Inspection Modal */}
      {selectedPostForModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
          onClick={() => setSelectedPostForModal(null)}
        >
          <div
            className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl max-w-3xl w-full p-5 sm:p-6 space-y-4 overflow-hidden my-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Post Inspection & Visual Quality Check
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

            {/* Full-Resolution Media Preview */}
            <div className="space-y-3">
              {selectedPostForModal.mediaUrl ? (
                <div className="rounded-2xl overflow-hidden max-h-[460px] w-full bg-slate-950 flex flex-col items-center justify-center p-2 relative group border border-slate-800">
                  {selectedPostForModal.postType === 'video' ? (
                    <video
                      src={selectedPostForModal.mediaUrl}
                      controls
                      className="max-h-[440px] w-auto rounded-xl object-contain shadow-2xl"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={selectedPostForModal.mediaUrl}
                      alt="Full card preview"
                      className="max-h-[440px] w-auto rounded-xl object-contain shadow-2xl"
                    />
                  )}

                  {/* Open Image in High-Res button */}
                  <a
                    href={selectedPostForModal.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-black/75 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-md backdrop-blur-md transition-all border border-white/20"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View High-Res Image</span>
                  </a>
                </div>
              ) : (
                <div className="py-10 px-4 rounded-2xl bg-slate-100 border border-dashed border-slate-200 text-center text-slate-500 text-xs">
                  This post contains text content only without attached image or video.
                </div>
              )}

              {/* Caption & Message Box */}
              <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                  <span>Caption Message</span>
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(selectedPostForModal.message)
                    }
                    className="hover:text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
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
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-900 uppercase">
                    <MessageSquare className="w-3 h-3 text-blue-700" />
                    <span>First Comment Auto-Trigger (Link Cloaked for Anti-Ban reach)</span>
                  </div>
                  <p className="text-xs text-blue-900 font-medium whitespace-pre-wrap">
                    {selectedPostForModal.commentText}
                  </p>
                </div>
              )}
            </div>

            {/* Destination Channels Dispatch Results */}
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-900">
                Target Channels &amp; Publishing Status
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
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
                          {res?.externalPostId && (
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              Facebook Post ID: {res.externalPostId}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            res?.status === 'success' || selectedPostForModal.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800'
                              : selectedPostForModal.status === 'draft'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {selectedPostForModal.status === 'draft' ? 'Awaiting Review' : res?.status || selectedPostForModal.status}
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
                  setPostPendingDelete(selectedPostForModal);
                }}
                className="px-3.5 py-2 rounded-xl hover:bg-rose-50 text-rose-600 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Post</span>
              </button>

              <div className="flex items-center gap-2">
                {/* 1-Click Approve Button inside Modal */}
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
                        ? 'Broadcasting Live to Facebook...'
                        : 'Approve & Publish Live Now'}
                    </span>
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
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Dual-Option Deletion Confirmation Dialog (Library vs Facebook Graph API) */}
      {postPendingDelete && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => !isDeleting && setPostPendingDelete(null)}
        >
          <div
            className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-6 space-y-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Delete Post Confirmation
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Choose deletion scope for this post
                  </p>
                </div>
              </div>

              {!isDeleting && (
                <button
                  type="button"
                  onClick={() => setPostPendingDelete(null)}
                  className="w-8 h-8 rounded-xl bg-[#F8F9FA] hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Post Snippet */}
            <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] flex items-center gap-3">
              {postPendingDelete.mediaUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={postPendingDelete.mediaUrl}
                  alt="Post thumbnail"
                  className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4 text-slate-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  {postPendingDelete.status} • {postPendingDelete.postType}
                </span>
                <p className="text-xs font-bold text-slate-800 line-clamp-1 mt-0.5">
                  {postPendingDelete.message}
                </p>
              </div>
            </div>

            {/* Choices based on whether post was actually published */}
            {postPendingDelete.status === 'published' ? (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-slate-600 font-medium">
                  This post has been broadcasted to connected channels. Where would you like to delete it from?
                </p>

                {/* Option 1: Permanent Facebook Graph API Deletion */}
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDeleteConfirm(true)}
                  className="w-full p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 text-left transition-all group flex items-start gap-3 cursor-pointer disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Globe className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-xs text-rose-900 flex items-center justify-between">
                      <span>Delete from Facebook Page &amp; App</span>
                      <span className="text-[10px] font-black uppercase text-rose-600">Permanent</span>
                    </div>
                    <p className="text-[11px] text-rose-700 font-medium mt-0.5">
                      Sends Graph API DELETE command to Facebook to remove the live post from your Facebook Page feed permanently.
                    </p>
                  </div>
                </button>

                {/* Option 2: App Library Only */}
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDeleteConfirm(false)}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all group flex items-start gap-3 cursor-pointer disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-xs text-slate-900">
                      Delete from Post Library Only
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Keeps the post live on Facebook, but removes it from this application&apos;s history and analytics queue.
                    </p>
                  </div>
                </button>
              </div>
            ) : (
              /* Draft Post Deletion */
              <div className="space-y-3 pt-1">
                <p className="text-xs text-slate-600 font-medium">
                  This post is a <strong>Draft</strong> and was never published to Facebook. Deleting it will remove it from your Post Library.
                </p>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDeleteConfirm(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Delete Draft from Library</span>
                </button>
              </div>
            )}

            {/* Cancel Button */}
            <div className="pt-2 border-t border-[#E2E8F0] flex justify-end">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPostPendingDelete(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
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
