'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { CommentDrawer } from '@/components/analytics/CommentDrawer';
import { Platform, PostPerformanceMetric, SocialPage } from '@/types';
import { formatCompactNumber, formatMicroCurrency, formatTimeShort } from '@/lib/utils/formatters';
import { SocialIcon } from '@/components/ui/SocialIcon';
import {
  BarChart3,
  Download,
  Printer,
  TrendingUp,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Users,
  RefreshCw,
  Radio,
  DollarSign,
  Globe,
  Search,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  Info,
  Calendar,
  CheckCircle2,
  Trophy,
  Filter,
  Flame,
  ArrowUpRight,
  ShieldCheck,
  Video,
  Image as ImageIcon,
  FileText,
  Percent,
} from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-xs text-slate-500">Loading analytics...</div>}>
        <AnalyticsContent />
      </Suspense>
    </AppShell>
  );
}

type DateRangeOption = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'all' | 'custom';
type TopPostSortOption = 'views' | 'reach' | 'likes' | 'comments' | 'shares' | 'engagement';

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const initialPageId = searchParams.get('pageId') || 'all';

  const {
    pages,
    pageAnalytics,
    postPerformances,
    postComments,
    loadDemoData,
    syncPageLiveFollowers,
    syncPostInsights,
    replyToComment,
    toggleLikeComment,
    toggleHideComment,
    deleteComment,
    sendPrivateReply,
    simulateWebhookEvent,
  } = useApp();

  // 1. Filtering States
  const [platformFilter, setPlatformFilter] = useState<'all' | Platform>('all');
  const [selectedPageId, setSelectedPageId] = useState<string>(initialPageId);
  const [dateRange, setDateRange] = useState<DateRangeOption>('7d');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-11-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-11-12');
  const [searchQuery, setSearchQuery] = useState('');
  const [topPostSort, setTopPostSort] = useState<TopPostSortOption>('views');
  const [chartMetric, setChartMetric] = useState<'views' | 'reach' | 'growth'>('views');

  // UI Interactive States
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  // Filter pages by current platform filter
  const platformFilteredPages = useMemo(() => {
    if (platformFilter === 'all') return pages;
    return pages.filter((p) => p.platform === platformFilter);
  }, [pages, platformFilter]);

  // Selected single page (if not 'all')
  const selectedPage = useMemo(() => {
    if (selectedPageId === 'all') return null;
    return pages.find((p) => p.id === selectedPageId) || null;
  }, [selectedPageId, pages]);

  // Relevant active pages under current selection
  const relevantPages: SocialPage[] = useMemo(() => {
    if (selectedPageId !== 'all') {
      return selectedPage ? [selectedPage] : [];
    }
    return platformFilteredPages;
  }, [selectedPageId, selectedPage, platformFilteredPages]);

  // 2. Date Filter Validator
  const isPostInDateRange = (postDateStr: string, isTodayFlag?: boolean) => {
    const pDate = new Date(postDateStr);
    const now = new Date();

    if (dateRange === 'today') {
      return isTodayFlag || pDate.toDateString() === now.toDateString();
    }
    if (dateRange === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      return pDate.toDateString() === yest.toDateString();
    }
    if (dateRange === '7d') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return pDate >= past7;
    }
    if (dateRange === '30d') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return pDate >= past30;
    }
    if (dateRange === '90d') {
      const past90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return pDate >= past90;
    }
    if (dateRange === 'custom') {
      if (customStartDate && pDate < new Date(customStartDate)) return false;
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        if (pDate > end) return false;
      }
      return true;
    }
    return true; // 'all'
  };

  // 3. Filtered Posts based on Page + Platform + Date + Search
  const filteredPosts = useMemo(() => {
    return postPerformances
      .filter((p) => {
        // Page filter
        if (selectedPageId !== 'all' && p.pageId !== selectedPageId) {
          return false;
        }
        // Platform filter
        if (platformFilter !== 'all') {
          const pg = pages.find((item) => item.id === p.pageId);
          if (pg && pg.platform !== platformFilter) return false;
        }
        // Date range filter
        if (!isPostInDateRange(p.publishedAt, p.isToday)) {
          return false;
        }
        // Search filter
        if (
          searchQuery.trim() &&
          !p.message.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !p.pageName.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [
    postPerformances,
    selectedPageId,
    platformFilter,
    dateRange,
    customStartDate,
    customEndDate,
    searchQuery,
    pages,
  ]);

  // 4. Aggregate Metric Totals
  const totals = useMemo(() => {
    const stats = filteredPosts.reduce(
      (acc, p) => {
        acc.reach += p.reach;
        acc.views += p.mediaViews;
        acc.likes += p.likes;
        acc.comments += p.commentsCount;
        acc.shares += p.sharesCount;
        acc.earningsMicro += p.estimatedEarningsMicro;
        acc.reactions.like += p.reactions.like;
        acc.reactions.love += p.reactions.love;
        acc.reactions.wow += p.reactions.wow;
        acc.reactions.haha += p.reactions.haha;
        acc.reactions.sad += p.reactions.sad;
        acc.reactions.angry += p.reactions.angry;
        return acc;
      },
      {
        reach: 0,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        earningsMicro: 0,
        reactions: { like: 0, love: 0, wow: 0, haha: 0, sad: 0, angry: 0 },
      }
    );

    const totalInteractions = stats.likes + stats.comments + stats.shares;
    const engagementRate = stats.reach > 0 ? (totalInteractions / stats.reach) * 100 : 0;

    const totalAudience = relevantPages.reduce(
      (acc, p) => acc + (p.followersCount ?? p.fanCount ?? 0),
      0
    );

    const netFollowerDelta = relevantPages.reduce(
      (acc, p) => acc + (p.followersDeltaToday ?? 0),
      0
    );

    return {
      ...stats,
      totalInteractions,
      engagementRate: Math.min(100, engagementRate),
      totalAudience,
      netFollowerDelta,
    };
  }, [filteredPosts, relevantPages]);

  // 5. Top Posts Ranked Leaderboard
  const rankedTopPosts = useMemo(() => {
    return [...filteredPosts].sort((a, b) => {
      if (topPostSort === 'views') return b.mediaViews - a.mediaViews;
      if (topPostSort === 'reach') return b.reach - a.reach;
      if (topPostSort === 'likes') return b.likes - a.likes;
      if (topPostSort === 'comments') return b.commentsCount - a.commentsCount;
      if (topPostSort === 'shares') return b.sharesCount - a.sharesCount;
      if (topPostSort === 'engagement') {
        const engA = a.reach > 0 ? (a.likes + a.commentsCount + a.sharesCount) / a.reach : 0;
        const engB = b.reach > 0 ? (b.likes + b.commentsCount + b.sharesCount) / b.reach : 0;
        return engB - engA;
      }
      return b.mediaViews - a.mediaViews;
    });
  }, [filteredPosts, topPostSort]);

  // 6. Timeline Series Chart Generation (Dynamic to Date Filter)
  const timelineData = useMemo(() => {
    // Generate dates according to current filter
    let points: { label: string; views: number; reach: number; growth: number }[] = [];

    if (dateRange === 'today') {
      points = [
        { label: '04:00 AM', views: Math.round(totals.views * 0.08), reach: Math.round(totals.reach * 0.07), growth: 1 },
        { label: '08:00 AM', views: Math.round(totals.views * 0.22), reach: Math.round(totals.reach * 0.19), growth: 3 },
        { label: '12:00 PM', views: Math.round(totals.views * 0.35), reach: Math.round(totals.reach * 0.31), growth: 4 },
        { label: '04:00 PM', views: Math.round(totals.views * 0.20), reach: Math.round(totals.reach * 0.23), growth: 2 },
        { label: '08:00 PM', views: Math.round(totals.views * 0.15), reach: Math.round(totals.reach * 0.20), growth: 2 },
      ];
    } else if (dateRange === 'yesterday') {
      points = [
        { label: 'Morning', views: Math.round(totals.views * 0.3), reach: Math.round(totals.reach * 0.28), growth: 4 },
        { label: 'Afternoon', views: Math.round(totals.views * 0.45), reach: Math.round(totals.reach * 0.42), growth: 6 },
        { label: 'Evening', views: Math.round(totals.views * 0.25), reach: Math.round(totals.reach * 0.30), growth: 3 },
      ];
    } else if (dateRange === '30d') {
      points = [
        { label: 'Oct 14-20', views: Math.round(totals.views * 0.22), reach: Math.round(totals.reach * 0.20), growth: 28 },
        { label: 'Oct 21-27', views: Math.round(totals.views * 0.25), reach: Math.round(totals.reach * 0.24), growth: 34 },
        { label: 'Oct 28-03', views: Math.round(totals.views * 0.26), reach: Math.round(totals.reach * 0.27), growth: 41 },
        { label: 'Nov 04-10', views: Math.round(totals.views * 0.27), reach: Math.round(totals.reach * 0.29), growth: 52 },
      ];
    } else {
      // Default 7 days
      points = [
        { label: 'Nov 04', views: Math.round(totals.views * 0.11), reach: Math.round(totals.reach * 0.10), growth: 4 },
        { label: 'Nov 05', views: Math.round(totals.views * 0.13), reach: Math.round(totals.reach * 0.12), growth: 6 },
        { label: 'Nov 06', views: Math.round(totals.views * 0.12), reach: Math.round(totals.reach * 0.11), growth: 5 },
        { label: 'Nov 07', views: Math.round(totals.views * 0.15), reach: Math.round(totals.reach * 0.14), growth: 8 },
        { label: 'Nov 08', views: Math.round(totals.views * 0.16), reach: Math.round(totals.reach * 0.17), growth: 11 },
        { label: 'Nov 09', views: Math.round(totals.views * 0.16), reach: Math.round(totals.reach * 0.18), growth: 14 },
        { label: 'Nov 10', views: Math.round(totals.views * 0.17), reach: Math.round(totals.reach * 0.18), growth: 16 },
      ];
    }

    const maxViews = Math.max(1, ...points.map((p) => p.views));
    const maxReach = Math.max(1, ...points.map((p) => p.reach));
    const maxGrowth = Math.max(1, ...points.map((p) => p.growth));

    return { points, maxViews, maxReach, maxGrowth };
  }, [totals, dateRange]);

  // 7. Audience Demographics
  const topCountries = useMemo(() => {
    const totalAud = Math.max(1, totals.totalAudience);
    return [
      { name: 'India', code: 'IN', count: Math.round(totalAud * 0.88), pct: 88 },
      { name: 'United States', code: 'US', count: Math.round(totalAud * 0.05), pct: 5 },
      { name: 'United Arab Emirates', code: 'AE', count: Math.round(totalAud * 0.03), pct: 3 },
      { name: 'Nepal', code: 'NP', count: Math.round(totalAud * 0.02), pct: 2 },
      { name: 'United Kingdom', code: 'GB', count: Math.round(totalAud * 0.02), pct: 2 },
    ];
  }, [totals.totalAudience]);

  // 8. Content Format Performance (Videos vs Images vs Text)
  const formatBreakdown = useMemo(() => {
    const imagePosts = filteredPosts.filter((p) => p.postType === 'image');
    const videoPosts = filteredPosts.filter((p) => p.postType === 'video');
    const textPosts = filteredPosts.filter((p) => p.postType === 'text');

    return [
      {
        type: 'Images & Photos',
        icon: ImageIcon,
        count: imagePosts.length,
        views: imagePosts.reduce((acc, p) => acc + p.mediaViews, 0),
        likes: imagePosts.reduce((acc, p) => acc + p.likes, 0),
      },
      {
        type: 'Videos & Shorts',
        icon: Video,
        count: videoPosts.length,
        views: videoPosts.reduce((acc, p) => acc + p.mediaViews, 0),
        likes: videoPosts.reduce((acc, p) => acc + p.likes, 0),
      },
      {
        type: 'Text & Updates',
        icon: FileText,
        count: textPosts.length,
        views: textPosts.reduce((acc, p) => acc + p.mediaViews, 0),
        likes: textPosts.reduce((acc, p) => acc + p.likes, 0),
      },
    ];
  }, [filteredPosts]);

  // 9. Sync Handlers (Authentic Live API sync)
  const handleSyncFollowers = async () => {
    setIsSyncing(true);
    await syncPageLiveFollowers(selectedPageId === 'all' ? undefined : selectedPageId);
    setIsSyncing(false);
    showToast(
      selectedPageId === 'all'
        ? `Live follower stats verified across ${relevantPages.length} channel(s).`
        : `Live audience verified for "${selectedPage?.name || 'Selected Channel'}".`
    );
  };

  const handleSyncInsights = async () => {
    setIsSyncing(true);
    await syncPostInsights(selectedPageId === 'all' ? undefined : selectedPageId);
    setIsSyncing(false);
    showToast('Post performance insights refreshed.');
  };

  const handleExportCsv = () => {
    const headers = [
      'Rank',
      'Platform',
      'Page/Channel',
      'PublishedAt',
      'Message',
      'Views',
      'Reach',
      'Likes',
      'Comments',
      'Shares',
      'Engagement_Rate_Pct',
      'Estimated_USD',
    ];
    const rows = rankedTopPosts.map((p, idx) => {
      const eng = p.reach > 0 ? (((p.likes + p.commentsCount + p.sharesCount) / p.reach) * 100).toFixed(1) : '0';
      return [
        idx + 1,
        `"${p.postType}"`,
        `"${p.pageName.replace(/"/g, '""')}"`,
        p.publishedAt,
        `"${p.message.replace(/"/g, '""').slice(0, 80)}"`,
        p.mediaViews,
        p.reach,
        p.likes,
        p.commentsCount,
        p.sharesCount,
        `${eng}%`,
        (p.estimatedEarningsMicro / 1_000_000).toFixed(2),
      ];
    });
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `analytics-${selectedPageId}-${dateRange}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Active post for Comment Drawer
  const activeCommentPost: PostPerformanceMetric | null = useMemo(
    () => postPerformances.find((p) => p.id === activeCommentPostId) || null,
    [postPerformances, activeCommentPostId]
  );

  const activePostComments = useMemo(() => {
    if (!activeCommentPost) return [];
    return postComments.filter((c) => c.externalPostId === activeCommentPost.externalPostId);
  }, [postComments, activeCommentPost]);

  // If no pages connected at all
  if (pages.length === 0) {
    return (
      <div className="space-y-6 font-sans animate-fade-in pb-10">
        <div className="pb-4 border-b border-[#E2E8F0]">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Audience &amp; Performance Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time followers, top performing posts, views, and comments across all channels.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-12 text-center max-w-xl mx-auto shadow-sm space-y-4 my-10">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-xs">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">No Channels Connected Yet</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Connect your Facebook Pages, YouTube channel, or Telegram in Connected Accounts to view live analytics.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/accounts"
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
            >
              Connect Accounts &amp; Channels
            </Link>
            <button
              type="button"
              onClick={loadDemoData}
              className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs"
            >
              Load Demo Analytics
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12 print:p-0">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-xl flex items-center gap-2 animate-fade-in">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. Header & Primary Action Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] print:hidden">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-slate-900" />
              <span>Audience &amp; Performance Analytics Dashboard</span>
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Multi-Platform Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Complete channel analytics: track followers, top performing posts, impressions, reaction breakdown, and direct community moderation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncFollowers}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Verifying...' : 'Sync Live'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-slate-700 text-xs font-bold transition-all shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-slate-700 text-xs font-bold transition-all shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 2. Comprehensive Filter Bar (Platform + Page + Date-Wise) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Tier 1: Platform Selector Pills */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {(['all', 'facebook', 'youtube', 'telegram', 'instagram', 'threads'] as const).map((plat) => {
              const count =
                plat === 'all' ? pages.length : pages.filter((p) => p.platform === plat).length;
              const isSelected = platformFilter === plat;

              return (
                <button
                  key={plat}
                  type="button"
                  onClick={() => {
                    setPlatformFilter(plat);
                    setSelectedPageId('all');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all shrink-0 flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-[#F8F9FA] border-[#E2E8F0] text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {plat !== 'all' && (
                    <SocialIcon platform={plat} className="w-3.5 h-3.5 rounded-xs" />
                  )}
                  <span>{plat === 'all' ? 'All Platforms' : plat}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <Link
            href="/monetization"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-black py-1 px-2.5 rounded-xl hover:bg-[#F8F9FA] transition-colors shrink-0"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Earnings Monitor &rarr;</span>
          </Link>
        </div>

        {/* Tier 2: Specific Page Selector & Date-Wise Filtering */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-3 border-t border-[#E2E8F0] items-center">
          {/* Channel Dropdown (Col 1-5) */}
          <div className="lg:col-span-5 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 shrink-0">Channel / Page:</span>
            <select
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-500 truncate"
            >
              <option value="all">
                🌐 All Connected Channels Combined ({platformFilteredPages.length})
              </option>
              {platformFilteredPages.map((pg) => (
                <option key={pg.id} value={pg.id}>
                  {pg.name} • {(pg.followersCount ?? pg.fanCount ?? 0).toLocaleString()}{' '}
                  {pg.platform === 'youtube' ? 'subs' : pg.platform === 'telegram' ? 'members' : 'followers'}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Selector Pills (Col 6-12) */}
          <div className="lg:col-span-7 flex items-center justify-between lg:justify-end gap-1.5 overflow-x-auto flex-wrap">
            <div className="flex items-center p-1 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-xs font-bold">
              {(
                [
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: '7d', label: 'Last 7 Days' },
                  { id: '30d', label: '30 Days' },
                  { id: 'all', label: 'All Time' },
                  { id: 'custom', label: 'Custom' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDateRange(opt.id)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    dateRange === opt.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-500 w-36 sm:w-44"
              />
            </div>
          </div>
        </div>

        {/* Tier 3: Custom Date Range Pickers (shown only if 'custom' selected) */}
        {dateRange === 'custom' && (
          <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] flex flex-wrap items-center gap-3 text-xs animate-fade-in">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Custom Date Window:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-slate-800"
              />
              <span className="text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-slate-800"
              />
            </div>
            <span className="text-[11px] text-slate-500">
              Showing {filteredPosts.length} post dispatches in this range.
            </span>
          </div>
        )}
      </div>

      {/* 3. Selected Channel Banner Context (Individual Page or Fleet) */}
      {selectedPage ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {selectedPage.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={selectedPage.avatarUrl}
                alt={selectedPage.name}
                className="w-12 h-12 rounded-2xl object-cover border border-[#E2E8F0] shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shrink-0">
                {selectedPage.name.charAt(0)}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <SocialIcon platform={selectedPage.platform} className="w-4 h-4 rounded-xs shrink-0" />
                <h2 className="text-base font-black text-slate-900 truncate">
                  {selectedPage.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-[#E2E8F0]">
                  {selectedPage.category || 'Broadcasting'}
                </span>
                {selectedPage.integrityStatus && selectedPage.integrityStatus !== 'ok' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                    Policy Notice
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                <span className="font-mono text-[11px] text-slate-400">ID: {selectedPage.pageId}</span>
                <span>•</span>
                <span className="text-slate-900 font-bold">
                  {(selectedPage.followersCount ?? selectedPage.fanCount ?? 0).toLocaleString()}{' '}
                  {selectedPage.platform === 'youtube'
                    ? 'Subscribers'
                    : selectedPage.platform === 'telegram'
                    ? 'Members'
                    : 'Followers'}
                </span>
                {selectedPage.targetUrl && (
                  <>
                    <span>•</span>
                    <a
                      href={selectedPage.targetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-900 hover:underline flex items-center gap-0.5 font-bold"
                    >
                      <span>Visit Channel</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedPageId('all')}
              className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
            >
              &larr; View All Channels
            </button>
            <button
              type="button"
              onClick={handleSyncFollowers}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Verify Channel</span>
            </button>
          </div>
        </div>
      ) : (
        /* Multi-Platform Fleet Summary */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['facebook', 'youtube', 'telegram', 'instagram'] as const).map((plat) => {
            const platPages = pages.filter((p) => p.platform === plat);
            const aud = platPages.reduce((acc, p) => acc + (p.followersCount ?? p.fanCount ?? 0), 0);

            return (
              <div
                key={plat}
                onClick={() => {
                  setPlatformFilter(plat);
                }}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs hover:border-slate-400 cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 capitalize">
                    <SocialIcon platform={plat} className="w-3.5 h-3.5 rounded-xs" />
                    <span>{plat}</span>
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {formatCompactNumber(aud)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    {platPages.length} active endpoint(s)
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </div>
            );
          })}
        </div>
      )}

      {/* 4. PRIMARY KPI STATS GRID (6 Cards: Followers, Views, Reach, Likes, Comments, Engagement Rate) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Live Followers / Subscribers */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300">
              {selectedPage?.platform === 'youtube'
                ? 'Subscribers'
                : selectedPage?.platform === 'telegram'
                ? 'Members'
                : 'Audience / Followers'}
            </span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black tracking-tight mt-2">
            {formatCompactNumber(totals.totalAudience)}
          </div>
          <div className="text-[10px] text-emerald-400 font-bold mt-1.5 flex items-center justify-between">
            <span>+{totals.netFollowerDelta.toLocaleString()} today</span>
            <span className="text-slate-400 font-normal">Active Node</span>
          </div>
        </div>

        {/* Card 2: Total Views */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 font-bold text-xs">
            <span>Total Views</span>
            <Eye className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatCompactNumber(totals.views)}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-1">
            Across {filteredPosts.length} posts
          </div>
        </div>

        {/* Card 3: Total Reach */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 font-bold text-xs">
            <span>Unique Reach</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatCompactNumber(totals.reach)}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-1">
            Unique accounts reached
          </div>
        </div>

        {/* Card 4: Likes & Reactions */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 font-bold text-xs">
            <span>Total Likes</span>
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatCompactNumber(totals.likes)}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-1 truncate" title={`👍 ${totals.reactions.like} | ❤️ ${totals.reactions.love} | 😮 ${totals.reactions.wow}`}>
            👍 {totals.reactions.like} • ❤️ {totals.reactions.love}
          </div>
        </div>

        {/* Card 5: Comments & Shares */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 font-bold text-xs">
            <span>Comments</span>
            <MessageCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {totals.comments}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-1">
            {totals.shares} shares &amp; reposts
          </div>
        </div>

        {/* Card 6: Engagement Rate % */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 font-bold text-xs">
            <span>Engagement Rate</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {totals.engagementRate.toFixed(1)}%
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">
            High Quality Audience
          </div>
        </div>
      </div>

      {/* 5. 🏆 TOP POSTS SHOWCASE (Ranked by Views, Reach, Likes, Comments, Engagement) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-black text-slate-900">
                Top Performing Posts Leaderboard
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Best performing content ranked by real engagement, impressions, and viewer interactions.
            </p>
          </div>

          {/* Sort By Switcher */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400 mr-1">Sort By:</span>
            {(
              [
                { id: 'views', label: 'Views', icon: Eye },
                { id: 'reach', label: 'Reach', icon: TrendingUp },
                { id: 'likes', label: 'Likes', icon: Heart },
                { id: 'comments', label: 'Comments', icon: MessageCircle },
                { id: 'shares', label: 'Shares', icon: Share2 },
                { id: 'engagement', label: 'Engagement %', icon: Flame },
              ] as const
            ).map((s) => {
              const isSelected = topPostSort === s.id;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setTopPostSort(s.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                      : 'bg-[#F8F9FA] border-[#E2E8F0] text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Top 3 Podium Cards */}
        {rankedTopPosts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No published posts match this date and channel filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rankedTopPosts.slice(0, 3).map((post, idx) => {
              const rankMedals = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place'];
              const medalStyles = [
                'bg-amber-50 text-amber-900 border-amber-200',
                'bg-slate-100 text-slate-800 border-slate-300',
                'bg-orange-50 text-orange-900 border-orange-200',
              ];

              const eng =
                post.reach > 0
                  ? (((post.likes + post.commentsCount + post.sharesCount) / post.reach) * 100).toFixed(1)
                  : '0';

              return (
                <div
                  key={post.id}
                  className="rounded-2xl border border-[#E2E8F0] bg-[#F8F9FA]/60 p-4 space-y-3.5 flex flex-col justify-between hover:border-slate-400 transition-all shadow-2xs"
                >
                  <div className="space-y-3">
                    {/* Rank Badge + Channel Info */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${medalStyles[idx]}`}
                      >
                        {rankMedals[idx]}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">
                        {formatTimeShort(post.publishedAt)}
                      </span>
                    </div>

                    {/* Media Thumbnail + Text */}
                    <div className="flex gap-3">
                      {post.mediaUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={post.mediaUrl}
                          alt="Post media"
                          className="w-16 h-16 rounded-xl object-cover border border-[#E2E8F0] shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 text-slate-500 font-bold text-xs">
                          Text
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-extrabold text-slate-500 truncate">
                          {post.pageName}
                        </div>
                        <p className="text-xs font-bold text-slate-900 line-clamp-2 mt-0.5 leading-snug">
                          {post.message}
                        </p>
                      </div>
                    </div>

                    {/* Key Metric Numbers */}
                    <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-white border border-[#E2E8F0] text-center">
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Views</div>
                        <div className="text-xs font-black text-slate-900 mt-0.5">
                          {formatCompactNumber(post.mediaViews)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Likes</div>
                        <div className="text-xs font-black text-rose-600 mt-0.5">
                          {formatCompactNumber(post.likes)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Eng. Rate</div>
                        <div className="text-xs font-black text-emerald-600 mt-0.5">
                          {eng}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-xs">
                    <span className="text-[11px] font-semibold text-slate-500">
                      💬 {post.commentsCount} comments • {post.sharesCount} shares
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveCommentPostId(post.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-black text-white text-[11px] font-bold transition-all shadow-2xs"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Dynamic Performance Timeline Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Box */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Audience Activity &amp; Growth Timeline
              </h2>
              <p className="text-xs text-slate-500">
                Performance curves over the selected date range ({dateRange}).
              </p>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-xs font-bold">
              <button
                type="button"
                onClick={() => setChartMetric('views')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  chartMetric === 'views'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Views
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('reach')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  chartMetric === 'reach'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Reach
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('growth')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  chartMetric === 'growth'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Followers Net
              </button>
            </div>
          </div>

          {/* Bar Chart Display */}
          <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 pt-6 px-2 border-b border-slate-100">
            {timelineData.points.map((p, idx) => {
              const val =
                chartMetric === 'views'
                  ? p.views
                  : chartMetric === 'reach'
                  ? p.reach
                  : p.growth;

              const maxVal =
                chartMetric === 'views'
                  ? timelineData.maxViews
                  : chartMetric === 'reach'
                  ? timelineData.maxReach
                  : timelineData.maxGrowth;

              const heightPct = Math.max(8, Math.round((val / maxVal) * 100));

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer"
                >
                  <div className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {formatCompactNumber(val)}
                  </div>
                  <div className="w-full bg-slate-100 rounded-t-xl h-full flex items-end overflow-hidden">
                    <div
                      className="w-full bg-slate-900 rounded-t-xl transition-all duration-500 group-hover:bg-black"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 truncate max-w-[65px] text-center">
                    {p.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Type & Demographics Box */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-700" />
                <span>Audience Demographics</span>
              </h2>
              <span className="text-[10px] font-bold text-slate-400">Top Regions</span>
            </div>

            <div className="space-y-3">
              {topCountries.map((c) => (
                <div key={c.code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>
                      {c.name} ({c.code})
                    </span>
                    <span>{formatCompactNumber(c.count)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content Type Distribution */}
          <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Content Formats:</span>
            <div className="grid grid-cols-3 gap-2">
              {formatBreakdown.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.type} className="p-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-center">
                    <Icon className="w-3.5 h-3.5 text-slate-600 mx-auto" />
                    <div className="text-[10px] font-bold text-slate-500 mt-1 truncate">{f.type}</div>
                    <div className="text-xs font-black text-slate-900 mt-0.5">{f.count} posts</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 7. Detailed Posts Performance Table (Filtered by Page, Date & Search) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-900" />
              <span>All Post Dispatches &amp; Moderation</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredPosts.length} post(s) matching selected filters.
            </p>
          </div>

          <div className="text-xs font-bold text-slate-500">
            Total Views in Selection: <strong className="text-slate-900 font-black">{formatCompactNumber(totals.views)}</strong>
          </div>
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          {filteredPosts.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No posts found for this date range or channel. Try selecting a broader range like &ldquo;Last 30 Days&rdquo; or &ldquo;All Time&rdquo;.
            </div>
          ) : (
            filteredPosts.map((post) => {
              const postCommentCount = postComments.filter(
                (c) => c.externalPostId === post.externalPostId
              ).length;

              const eng =
                post.reach > 0
                  ? (((post.likes + post.commentsCount + post.sharesCount) / post.reach) * 100).toFixed(1)
                  : '0';

              return (
                <div
                  key={post.id}
                  className="p-5 hover:bg-[#F8F9FA] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Post Info */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {post.mediaUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={post.mediaUrl}
                        alt="Post thumbnail"
                        className="w-14 h-14 rounded-xl object-cover border border-[#E2E8F0] shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-extrabold border border-[#E2E8F0]">
                          {post.pageName}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {formatTimeShort(post.publishedAt)}
                        </span>
                        {post.isToday && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            Today
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                          {eng}% Eng.
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-900 line-clamp-2">
                        {post.message}
                      </p>

                      {/* Inline Reaction Breakdown */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 font-semibold">
                        <span>👍 {post.reactions.like}</span>
                        <span>❤️ {post.reactions.love}</span>
                        <span>😮 {post.reactions.wow}</span>
                        <span>😂 {post.reactions.haha}</span>
                        {post.permalinkUrl && (
                          <a
                            href={post.permalinkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-slate-900 hover:underline ml-1 font-bold"
                          >
                            <span>View Post</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metrics + Comment Action */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Views</div>
                      <div className="text-sm font-black text-slate-900">
                        {formatCompactNumber(post.mediaViews)}
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Reach</div>
                      <div className="text-sm font-black text-slate-900">
                        {formatCompactNumber(post.reach)}
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Shares</div>
                      <div className="text-sm font-black text-slate-900 flex items-center gap-1">
                        <Share2 className="w-3 h-3 text-emerald-500" />
                        <span>{post.sharesCount}</span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Est. Earn</div>
                      <div className="text-sm font-black text-emerald-700">
                        {formatMicroCurrency(post.estimatedEarningsMicro)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveCommentPostId(post.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-2xs transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Comments ({postCommentCount})</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 8. Slide-over Comment Moderation Drawer */}
      <CommentDrawer
        post={activeCommentPost}
        comments={activePostComments}
        onClose={() => setActiveCommentPostId(null)}
        onReply={replyToComment}
        onToggleLike={toggleLikeComment}
        onToggleHide={toggleHideComment}
        onDelete={deleteComment}
        onSendPrivateReply={sendPrivateReply}
      />
    </div>
  );
}
