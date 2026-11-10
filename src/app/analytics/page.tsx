'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import {
  BarChart3,
  Download,
  Printer,
  TrendingUp,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Calendar,
  Layers,
} from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <AppShell>
      <AnalyticsContent />
    </AppShell>
  );
}

function AnalyticsContent() {
  const { analytics, posts, pages } = useApp();
  const [dateRange, setDateRange] = useState<'7d' | '30d'>('7d');

  const totalLikes = analytics.reduce((acc, c) => acc + c.likes, 0);
  const totalComments = analytics.reduce((acc, c) => acc + c.comments, 0);
  const totalShares = analytics.reduce((acc, c) => acc + c.shares, 0);
  const totalReach = analytics.reduce((acc, c) => acc + c.reach, 0);
  const totalViews = analytics.reduce((acc, c) => acc + c.views, 0);

  const maxReach = Math.max(...analytics.map((a) => a.reach));

  const handleExportCsv = () => {
    const headers = ['Date', 'Reach', 'Views', 'Likes', 'Comments', 'Shares'];
    const rows = analytics.map((a) => [a.date, a.reach, a.views, a.likes, a.comments, a.shares]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `social-analytics-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-8 print:p-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <span>FB & Social Performance Analytics</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Consolidated reach, engagement metrics, and growth tracking across all connected pages.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-semibold">
            <span>Total Reach</span>
            <Eye className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {(totalReach / 1000).toFixed(1)}k
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+18.4% this week</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-semibold">
            <span>Video Views</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {(totalViews / 1000).toFixed(1)}k
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">Shorts & Reels</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-semibold">
            <span>Likes / Reactions</span>
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {totalLikes.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">Direct engagement</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-semibold">
            <span>Comments</span>
            <MessageCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {totalComments.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">Community replies</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-semibold">
            <span>Shares / Forwards</span>
            <Share2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {totalShares.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">High Virality</div>
        </div>
      </div>

      {/* Daily Reach Trend Chart (Visual Interactive Bar Chart) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Daily Audience Reach Trend</h2>
            <p className="text-xs text-slate-500">Unique user impressions across Facebook & YouTube</p>
          </div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Last 7 Days
          </span>
        </div>

        {/* Bar Visualizer */}
        <div className="h-64 flex items-end justify-between gap-2 sm:gap-6 pt-6 px-2 border-b border-slate-100">
          {analytics.map((metric, i) => {
            const heightPercent = Math.round((metric.reach / maxReach) * 100);

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                <div className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {(metric.reach / 1000).toFixed(0)}k
                </div>
                <div className="w-full bg-slate-100 rounded-t-xl h-full flex items-end overflow-hidden">
                  <div
                    className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-xl transition-all duration-500 group-hover:from-blue-500 group-hover:to-violet-400"
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-600">{metric.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Posts Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">Top Performing Dispatched Posts</h2>
        <div className="divide-y divide-slate-100">
          {posts
            .filter((p) => p.status === 'published')
            .map((post) => (
              <div key={post.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  {post.mediaUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={post.mediaUrl}
                      alt="post"
                      className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                  )}
                  <p className="font-semibold text-slate-800 truncate max-w-md">
                    {post.message}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-slate-600 shrink-0 font-medium">
                  <span>👍 5.4k</span>
                  <span>💬 960</span>
                  <span>🔄 820</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
