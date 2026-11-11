'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { MonetizationProgramType, MonetizationStatus, SocialPage } from '@/types';
import { formatCompactNumber, formatMicroCurrency, formatTimeShort } from '@/lib/utils/formatters';
import {
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Search,
  Download,
  ExternalLink,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Clock,
  Info,
  Layers,
} from 'lucide-react';

export default function MonetizationPage() {
  return (
    <AppShell>
      <MonetizationContent />
    </AppShell>
  );
}

const PROGRAM_LABELS: Record<MonetizationProgramType, string> = {
  content_monetization: 'Content Monetization',
  stars: 'Stars',
  subscriptions: 'Subscriptions',
  in_stream_legacy: 'In-Stream (Legacy)',
  ads_on_reels_legacy: 'Ads on Reels (Legacy)',
};

const STATUS_META: Record<
  MonetizationStatus,
  { label: string; className: string }
> = {
  monetized_active: {
    label: 'Monetized & Active',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  restricted: {
    label: 'Restricted / Paused',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  not_monetized: {
    label: 'Not Monetized Yet',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  insights_permission_missing: {
    label: 'Missing #200 Access',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

function MonetizationContent() {
  const { pages, syncMonetizationAll } = useApp();
  const [statusFilter, setStatusFilter] = useState<'all' | MonetizationStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fbPages = useMemo(
    () => pages.filter((p) => p.platform === 'facebook'),
    [pages]
  );

  const summary = useMemo(() => {
    let todayMicro = 0;
    let last7dMicro = 0;
    let last30dMicro = 0;
    let activeCount = 0;
    let alertCount = 0;
    let missingAccessCount = 0;
    const formats = { photosAndText: 0, reels: 0, videos: 0, stories: 0 };

    fbPages.forEach((pg) => {
      const m = pg.monetization;
      if (m) {
        todayMicro += m.todayEarningsMicro;
        last7dMicro += m.last7dEarningsMicro;
        last30dMicro += m.last30dEarningsMicro;
        formats.photosAndText += m.breakdownByFormatMicro.photosAndText;
        formats.reels += m.breakdownByFormatMicro.reels;
        formats.videos += m.breakdownByFormatMicro.videos;
        formats.stories += m.breakdownByFormatMicro.stories;

        if (m.status === 'monetized_active') activeCount += 1;
        if (m.status === 'insights_permission_missing') missingAccessCount += 1;
      }
      if (pg.integrityStatus && pg.integrityStatus !== 'ok') {
        alertCount += 1;
      }
    });

    const totalFormats =
      formats.photosAndText + formats.reels + formats.videos + formats.stories || 1;

    return {
      todayMicro,
      last7dMicro,
      last30dMicro,
      activeCount,
      alertCount,
      missingAccessCount,
      formats,
      totalFormats,
    };
  }, [fbPages]);

  const filteredPages = useMemo(() => {
    return fbPages
      .filter((pg) => {
        const status = pg.monetization?.status || 'not_monetized';
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        const matchesQuery =
          !searchQuery.trim() ||
          pg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pg.pageId.includes(searchQuery.trim());
        return matchesStatus && matchesQuery;
      })
      .sort(
        (a, b) =>
          (b.monetization?.last30dEarningsMicro || 0) -
          (a.monetization?.last30dEarningsMicro || 0)
      );
  }, [fbPages, statusFilter, searchQuery]);

  const handleScanAll = () => {
    setIsScanning(true);
    syncMonetizationAll();
    setTimeout(() => {
      setIsScanning(false);
      setToastMsg(
        `Scanned ${fbPages.length} Facebook pages via content_monetization_earnings & integrity status.`
      );
      setTimeout(() => setToastMsg(null), 3200);
    }, 450);
  };

  const handleExportCsv = () => {
    const headers = [
      'Page_Name',
      'Page_ID',
      'Followers',
      'Monetization_Status',
      'Integrity_Status',
      'Active_Programs',
      'Today_USD',
      'Last_7d_USD',
      'Last_30d_USD',
    ];
    const rows = filteredPages.map((pg: SocialPage) => {
      const m = pg.monetization;
      return [
        `"${pg.name.replace(/"/g, '""')}"`,
        pg.pageId,
        pg.followersCount ?? pg.fanCount,
        m?.status || 'not_monetized',
        pg.integrityStatus || 'ok',
        `"${(m?.activePrograms || []).join('; ')}"`,
        ((m?.todayEarningsMicro || 0) / 1_000_000).toFixed(2),
        ((m?.last7dEarningsMicro || 0) / 1_000_000).toFixed(2),
        ((m?.last30dEarningsMicro || 0) / 1_000_000).toFixed(2),
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `fb-monetization-pages-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 font-sans animate-fade-in pb-10">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. Header (Compact Modern Studio) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2.5 border-b border-[#EEF1F6]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>Multi-Page Monetization &amp; Integrity</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-extrabold">
              100-Page Portfolio View
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
            Sabhi connected Facebook Pages ki estimated kamai, active monetization tools aur policy alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#EEF1F6] bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleScanAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>Scan All ({fbPages.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Top Portfolio KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-100">
            <span>Today&apos;s Est. Earnings</span>
            <DollarSign className="w-4 h-4 text-emerald-200" />
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight">
            {formatMicroCurrency(summary.todayMicro)}
          </div>
          <div className="text-[11px] text-emerald-100 font-semibold">
            7d: {formatMicroCurrency(summary.last7dMicro)} • 30d:{' '}
            {formatMicroCurrency(summary.last30dMicro)}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EEF1F6] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Monetized &amp; Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {summary.activeCount}{' '}
            <span className="text-sm font-bold text-slate-400">/ {fbPages.length} Pages</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Detected via active <code className="text-[10px]">content_monetization_earnings</code>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EEF1F6] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Policy / Integrity Alerts</span>
            <ShieldAlert
              className={`w-4 h-4 ${
                summary.alertCount > 0 ? 'text-amber-500' : 'text-emerald-500'
              }`}
            />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {summary.alertCount}
          </div>
          <div className="text-[11px] text-amber-700 font-semibold">
            Real-time <code className="text-[10px]">business_integrity</code> webhook alerts
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EEF1F6] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Missing Admin Insights (#200)</span>
            <Lock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {summary.missingAccessCount}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Pages jahan token admin ko Monetization Insights role chahiye
          </div>
        </div>
      </div>

      {/* 3. Format Revenue Breakdown (7-Day Content Monetization Split) */}
      <div className="bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#FF007A]" />
              <span>7-Day Earnings Breakdown by Content Format</span>
            </h2>
            <p className="text-xs text-slate-500">
              Facebook Content Monetization me Photos/Text, Reels, Videos aur Stories sab se kamai hoti hai.
            </p>
          </div>
          <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 self-start">
            7d Total: {formatMicroCurrency(summary.last7dMicro)}
          </span>
        </div>

        {/* Stacked Progress Bar */}
        <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-slate-100">
          <div
            className="bg-[#FF007A]"
            style={{
              width: `${Math.round((summary.formats.photosAndText / summary.totalFormats) * 100)}%`,
            }}
            title="Photos & Text Posts"
          />
          <div
            className="bg-indigo-500"
            style={{
              width: `${Math.round((summary.formats.reels / summary.totalFormats) * 100)}%`,
            }}
            title="Reels"
          />
          <div
            className="bg-cyan-500"
            style={{
              width: `${Math.round((summary.formats.videos / summary.totalFormats) * 100)}%`,
            }}
            title="Videos"
          />
          <div
            className="bg-amber-400"
            style={{
              width: `${Math.round((summary.formats.stories / summary.totalFormats) * 100)}%`,
            }}
            title="Stories"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] flex items-center justify-between">
            <span className="flex items-center gap-2 font-bold text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF007A]" />
              Photos &amp; Text
            </span>
            <span className="font-black text-slate-900">
              {formatMicroCurrency(summary.formats.photosAndText)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] flex items-center justify-between">
            <span className="flex items-center gap-2 font-bold text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              Reels
            </span>
            <span className="font-black text-slate-900">
              {formatMicroCurrency(summary.formats.reels)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] flex items-center justify-between">
            <span className="flex items-center gap-2 font-bold text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              Videos
            </span>
            <span className="font-black text-slate-900">
              {formatMicroCurrency(summary.formats.videos)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] flex items-center justify-between">
            <span className="flex items-center gap-2 font-bold text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Stories
            </span>
            <span className="font-black text-slate-900">
              {formatMicroCurrency(summary.formats.stories)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Filter Bar + 100-Page Table */}
      <div className="bg-white rounded-2xl border border-[#EEF1F6] shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] overflow-hidden">
        <div className="p-4 border-b border-[#EEF1F6] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {(
              [
                { id: 'all', label: `All (${fbPages.length})` },
                { id: 'monetized_active', label: 'Monetized' },
                { id: 'restricted', label: 'Restricted / Warning' },
                { id: 'not_monetized', label: 'Not Monetized' },
                { id: 'insights_permission_missing', label: 'Error #200' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  statusFilter === tab.id
                    ? 'bg-gradient-to-r from-[#FF007A] to-[#FF4E98] text-white shadow-2xs'
                    : 'bg-[#F8F9FD] text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search page name or Page ID..."
              className="pl-8 pr-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-medium text-slate-800 focus:outline-none focus:border-[#FF007A] w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FD] border-b border-[#EEF1F6] text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Facebook Page</th>
                <th className="py-3 px-4">Monetization Status &amp; Tools</th>
                <th className="py-3 px-4">Integrity (Webhook)</th>
                <th className="py-3 px-4 text-right">Today</th>
                <th className="py-3 px-4 text-right">7 Days</th>
                <th className="py-3 px-4 text-right">30 Days</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1F6] text-xs">
              {filteredPages.map((pg) => {
                const m = pg.monetization;
                const statusKey: MonetizationStatus = m?.status || 'not_monetized';
                const statusBadge = STATUS_META[statusKey];
                const integrity = pg.integrityStatus || 'ok';

                return (
                  <tr key={pg.id} className="hover:bg-[#FAFBFD] transition-colors">
                    {/* Page */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3 min-w-[210px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pg.avatarUrl}
                          alt={pg.name}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 truncate max-w-[200px]">
                            {pg.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            ID: {pg.pageId} •{' '}
                            {formatCompactNumber(pg.followersCount ?? pg.fanCount)} fol.
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status & Tools */}
                    <td className="py-3.5 px-4 min-w-[220px]">
                      <div className="space-y-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>
                        {m && m.activePrograms.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {m.activePrograms.map((prog) => (
                              <span
                                key={prog}
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold"
                              >
                                {PROGRAM_LABELS[prog]}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">
                            {m?.lastError || 'No active programs'}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Integrity */}
                    <td className="py-3.5 px-4 min-w-[170px]">
                      {integrity === 'ok' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>OK (Good Standing)</span>
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-amber-700 font-extrabold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span className="uppercase">{integrity}</span>
                          </span>
                          {pg.integrityAlertReason && (
                            <p className="text-[10px] text-amber-800 max-w-[210px] leading-snug">
                              {pg.integrityAlertReason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Today */}
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 whitespace-nowrap">
                      {formatMicroCurrency(m?.todayEarningsMicro || 0, m?.currency)}
                    </td>

                    {/* 7d */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-700 whitespace-nowrap">
                      {formatMicroCurrency(m?.last7dEarningsMicro || 0, m?.currency)}
                    </td>

                    {/* 30d */}
                    <td className="py-3.5 px-4 text-right font-black text-emerald-700 whitespace-nowrap">
                      {formatMicroCurrency(m?.last30dEarningsMicro || 0, m?.currency)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/analytics?pageId=${pg.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F8F9FD] hover:bg-pink-50 text-slate-700 hover:text-[#FF007A] border border-[#EEF1F6] text-[11px] font-bold transition-colors"
                        >
                          <BarChart3 className="w-3 h-3" />
                          <span>Analytics</span>
                        </Link>
                        <a
                          href="https://business.facebook.com/latest/monetization/overview"
                          target="_blank"
                          rel="noreferrer"
                          title="Open Meta Business Suite for invites & bank payouts"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-[#EEF1F6] text-[11px] font-bold transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Suite</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-[#F8F9FD] border-t border-[#EEF1F6] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Last batch scan: {formatTimeShort(fbPages[0]?.monetization?.lastSyncedAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-500" />
            Note: New program invites &amp; bank payout settings Meta Business Suite me hi accept/manage hote hain.
          </span>
        </div>
      </div>
    </div>
  );
}
