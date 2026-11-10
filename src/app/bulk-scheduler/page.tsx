'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import {
  CalendarClock,
  Upload,
  Download,
  CheckCircle2,
  Sliders,
  FileSpreadsheet,
  AlertCircle,
  Play,
} from 'lucide-react';

export default function BulkSchedulerPage() {
  return (
    <AppShell>
      <BulkSchedulerContent />
    </AppShell>
  );
}

function BulkSchedulerContent() {
  const { posts, pages } = useApp();
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [importedRowsCount, setImportedRowsCount] = useState<number>(0);
  const [intervalMin, setIntervalMin] = useState(30);
  const [intervalMax, setIntervalMax] = useState(90);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleDownloadSampleCsv = () => {
    const csvContent =
      'post_type,message,media_url,scheduled_at,page_ids,page_interval_min,page_interval_max\n' +
      'image,"Breaking: Snowfall alert in Himachal Pradesh",https://images.unsplash.com/photo-1542601906990-b4d3fb778b09,2026-11-12 10:00:00,"pg_1|pg_2",30,90\n' +
      'text,"Good morning from Devbhoomi!",,2026-11-12 14:00:00,"pg_1",0,0\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'bulk_schedule_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setImportedRowsCount(12); // Simulated parsing of CSV rows
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 3000);
  };

  const scheduledPosts = posts.filter((p) => p.status === 'scheduled');

  return (
    <div className="space-y-8 font-sans max-w-5xl animate-fade-in">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EBEBE8]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Bulk Scheduler
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Schedule hundreds of posts at once via CSV import with non-blocking staggered intervals.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadSampleCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E8E8E4] bg-white hover:bg-[#FAF9F6] text-slate-700 text-xs font-bold transition-all shadow-2xs self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Download Sample CSV</span>
        </button>
      </div>

      {uploadSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            Successfully imported {importedRowsCount} posts from {csvFileName}! Added to scheduled queue.
          </span>
        </div>
      )}

      {/* 2. Upload Box */}
      <div className="bg-white rounded-2xl border border-[#E8E8E4] p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#F0F0ED]">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-800" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Upload Schedule CSV
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            CSV File with message, date, and page targets
          </span>
        </div>

        <label className="p-8 border-2 border-dashed border-[#DCDCD8] hover:border-slate-500 rounded-2xl bg-[#FAF9F6] text-center cursor-pointer transition-colors block space-y-2">
          <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
          <div className="w-10 h-10 rounded-xl bg-white border border-[#E8E8E4] flex items-center justify-center mx-auto text-slate-500 shadow-2xs">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              {csvFileName ? `Selected: ${csvFileName}` : 'Click to select CSV file for bulk scheduling'}
            </span>
            <span className="text-[11px] text-slate-400">
              Columns: post_type, message, media_url, scheduled_at, page_ids, page_interval_min, page_interval_max
            </span>
          </div>
        </label>
      </div>

      {/* 3. Anti-Ban Interval Configuration */}
      <div className="bg-white rounded-2xl border border-[#E8E8E4] p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F0F0ED]">
          <Sliders className="w-4 h-4 text-slate-800" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Staggered Multi-Page Gap (Anti-Rate-Limit)
          </h2>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed font-normal">
          When a scheduled post targets multiple Facebook Pages or Channels, the queue runner will randomize the delay between each page dispatch.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Minimum Interval Gap (Seconds)
            </label>
            <input
              type="number"
              min="0"
              max="300"
              value={intervalMin}
              onChange={(e) => setIntervalMin(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-[#E8E8E4] text-xs font-bold text-slate-900 bg-[#FAF9F6]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Maximum Interval Gap (Seconds)
            </label>
            <input
              type="number"
              min="10"
              max="600"
              value={intervalMax}
              onChange={(e) => setIntervalMax(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-[#E8E8E4] text-xs font-bold text-slate-900 bg-[#FAF9F6]"
            />
          </div>
        </div>
      </div>

      {/* 4. Current Scheduled Queue Preview */}
      <div className="bg-white rounded-2xl border border-[#E8E8E4] p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#F0F0ED]">
          <h2 className="text-base font-bold text-slate-900">Active Scheduled Queue</h2>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            {scheduledPosts.length} Queued
          </span>
        </div>

        <div className="divide-y divide-[#F2F2EE]">
          {scheduledPosts.map((post) => (
            <div key={post.id} className="py-3 flex items-center justify-between gap-4 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800 truncate">{post.message}</p>
                <span className="text-[11px] text-slate-400">
                  Scheduled for {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : 'Soon'} • {post.pageIds.length} target pages
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold uppercase text-[10px] border border-blue-200 shrink-0">
                Scheduled
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
