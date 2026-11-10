'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ExternalLink,
  Trash2,
  Download,
  Calendar,
  Share2,
  Info,
} from 'lucide-react';

export default function LogsPage() {
  return (
    <AppShell>
      <LogsContent />
    </AppShell>
  );
}

function LogsContent() {
  const { posts, pages, retryPost } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Flatten all post results into individual log entries
  const allLogs = posts.flatMap((post) =>
    post.results.map((res, index) => ({
      id: `${post.id}_res_${index}`,
      postId: post.id,
      postMessage: post.message,
      postType: post.postType,
      mediaUrl: post.mediaUrl,
      pageId: res.pageId,
      pageName: res.pageName,
      platform: res.platform,
      status: res.status,
      externalPostId: res.externalPostId,
      commentId: res.commentId,
      error: res.error,
      timestamp: res.timestamp,
    }))
  );

  // Filter logs
  const filteredLogs = allLogs.filter((log) => {
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (platformFilter !== 'all' && log.platform !== platformFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = log.postMessage.toLowerCase().includes(q);
      const matchPage = log.pageName.toLowerCase().includes(q);
      const matchId = (log.externalPostId || '').toLowerCase().includes(q);
      if (!matchMsg && !matchPage && !matchId) return false;
    }
    return true;
  });

  const successCount = allLogs.filter((l) => l.status === 'success').length;
  const failureCount = allLogs.filter((l) => l.status === 'failed').length;

  const platformIcons: Record<string, string> = {
    facebook: '📘',
    instagram: '📸',
    threads: '🧵',
    telegram: '✈️',
    youtube: '▶️',
  };

  const handleExportCSV = () => {
    const headers = ['Log ID', 'Post ID', 'Platform', 'Target Page', 'Status', 'External Post ID', 'Error', 'Timestamp'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.postId,
      l.platform,
      `"${l.pageName.replace(/"/g, '""')}"`,
      l.status,
      l.externalPostId || '',
      `"${(l.error || '').replace(/"/g, '""')}"`,
      l.timestamp,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `social_auto_poster_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBEBE8]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            System & Publishing Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time audit log of all social dispatches, API responses, comment triggers, and anti-ban delays.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E8E8E4] text-xs font-semibold text-slate-700 hover:bg-[#FAF9F6] transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI mini-cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-4.5 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Dispatch Events</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{allLogs.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Recorded across all channels</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-4.5 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivered Successfully</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{successCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {allLogs.length > 0 ? ((successCount / allLogs.length) * 100).toFixed(1) : 100}% delivery rate
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-4.5 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Failed / Blocked</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">{failureCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Actionable API errors requiring review</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E8E8E4] p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by caption, page, or external ID..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#F8F8F6] border border-[#E8E8E4] text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          {/* Status filter */}
          <div className="inline-flex items-center p-1 rounded-xl bg-[#F8F8F6] border border-[#E8E8E4]">
            {(['all', 'success', 'failed'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  statusFilter === s
                    ? 'bg-slate-950 text-white shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Platform select */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#F8F8F6] border border-[#E8E8E4] text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">All Platforms</option>
            <option value="facebook">📘 Facebook</option>
            <option value="instagram">📸 Instagram</option>
            <option value="threads">🧵 Threads</option>
            <option value="telegram">✈️ Telegram</option>
            <option value="youtube">▶️ YouTube</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-[#E8E8E4] overflow-hidden shadow-2xs">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No logs found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No publishing activity matches the specified search and filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EBEBE8] bg-[#FAF9F6] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Platform & Target</th>
                  <th className="py-3 px-4">Post Snippet</th>
                  <th className="py-3 px-4">External ID / Details</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F2EE] text-xs">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-[#FAF9F6] transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          {log.status === 'success' ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Failed
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{platformIcons[log.platform] || '🌐'}</span>
                            <div>
                              <div className="font-bold text-slate-800">{log.pageName}</div>
                              <div className="text-[10px] text-slate-400 capitalize">{log.platform} Channel</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          <p className="truncate text-slate-700 font-medium">{log.postMessage}</p>
                          <span className="text-[10px] uppercase font-bold text-slate-400">{log.postType}</span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {log.status === 'success' ? (
                            <div className="space-y-0.5">
                              <div className="font-mono text-[11px] text-slate-700 font-semibold">
                                {log.externalPostId || 'Published'}
                              </div>
                              {log.commentId && (
                                <div className="text-[10px] text-emerald-600">
                                  + Comment ID: {log.commentId}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-rose-600 font-medium text-[11px] truncate max-w-xs block">
                              {log.error || 'Unknown dispatch error'}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-medium text-[11px]">
                          {new Date(log.timestamp).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-[#F2F2EE] transition-colors"
                            >
                              {isExpanded ? 'Hide' : 'Payload'}
                            </button>

                            {log.status === 'failed' && (
                              <button
                                type="button"
                                onClick={() => retryPost(log.postId)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors inline-flex items-center gap-1"
                              >
                                <RotateCw className="w-3 h-3" />
                                <span>Retry</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Raw Payload Inspector */}
                      {isExpanded && (
                        <tr className="bg-[#FAF9F6]">
                          <td colSpan={6} className="p-4 border-t border-[#F0F0ED]">
                            <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 font-mono text-[11px] space-y-2 overflow-x-auto shadow-inner">
                              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5">
                                <span>API Event Payload & Diagnostics</span>
                                <span>ID: {log.id}</span>
                              </div>
                              <pre className="text-slate-300">
                                {JSON.stringify(
                                  {
                                    postId: log.postId,
                                    pageId: log.pageId,
                                    pageName: log.pageName,
                                    platform: log.platform,
                                    status: log.status,
                                    externalPostId: log.externalPostId,
                                    commentId: log.commentId,
                                    error: log.error,
                                    timestamp: log.timestamp,
                                  },
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
