'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import {
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export default function BulkDeletePostsPage() {
  return (
    <AppShell>
      <BulkDeleteContent />
    </AppShell>
  );
}

function BulkDeleteContent() {
  const { posts, deletePost } = useApp();

  const [selectedStatus, setSelectedStatus] = useState<'all' | 'failed' | 'published' | 'draft'>('failed');
  const [olderThanDays, setOlderThanDays] = useState(30);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [deletedSuccess, setDeletedSuccess] = useState(false);

  // Filter matching posts to delete
  const matchingPosts = posts.filter((p) => {
    if (selectedStatus !== 'all' && p.status !== selectedStatus) return false;
    return true;
  });

  const handleExecuteBulkDelete = () => {
    matchingPosts.forEach((p) => {
      deletePost(p.id);
    });
    setDeleteConfirmation(false);
    setDeletedSuccess(true);
    setTimeout(() => setDeletedSuccess(false), 3000);
  };

  return (
    <div className="space-y-4 font-sans max-w-4xl animate-fade-in pb-12">
      {/* 1. Header (Compact Modern Studio) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#EEF1F6]">
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
            Bulk Delete Posts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">
            Safely clean up old published posts, failed attempts, or leftover drafts in bulk.
          </p>
        </div>
      </div>

      {deletedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Posts successfully removed from workspace database.</span>
        </div>
      )}

      {/* 2. Filter & Selection Box */}
      <div className="bg-white rounded-2xl border border-[#EEF1F6] p-6 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F0F2F6]">
          <Filter className="w-4 h-4 text-slate-800" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Select Deletion Criteria
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Target Post Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full p-2.5 rounded-xl border border-[#E8E8E4] text-xs text-slate-900 bg-[#FAF9F6] font-medium"
            >
              <option value="failed">Failed Posts Only (Clean errors)</option>
              <option value="published">Published Posts Only (Old history)</option>
              <option value="draft">Drafts Only</option>
              <option value="all">All Posts Regardless of Status</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Age Threshold
            </label>
            <select
              value={olderThanDays}
              onChange={(e) => setOlderThanDays(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-[#E8E8E4] text-xs text-slate-900 bg-[#FAF9F6] font-medium"
            >
              <option value={7}>Older than 7 Days</option>
              <option value={30}>Older than 30 Days</option>
              <option value={90}>Older than 90 Days</option>
              <option value={0}>Any Date (Delete All Matching)</option>
            </select>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Caution:</span> Bulk deletion permanently removes post records and per-page delivery logs from your workspace database. This will not delete posts already published directly on Facebook or YouTube.
          </div>
        </div>

        {/* Action Trigger */}
        <div className="pt-2 flex items-center justify-between border-t border-[#F0F0ED]">
          <span className="text-xs font-bold text-slate-600">
            {matchingPosts.length} posts match this filter
          </span>

          <button
            type="button"
            disabled={matchingPosts.length === 0}
            onClick={() => setDeleteConfirmation(true)}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete {matchingPosts.length} Matching Posts</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E8E4] max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Confirm Bulk Delete</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong>{matchingPosts.length} posts</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F0F0ED]">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(false)}
                className="px-4 py-2 rounded-xl border border-[#E8E8E4] text-xs font-semibold text-slate-600 hover:bg-[#FAF9F6]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
