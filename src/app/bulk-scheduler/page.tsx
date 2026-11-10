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
  Plus,
  Trash2,
  Sparkles,
  Layers,
  Clock,
  Hash,
  MessageSquare,
  Image as ImageIcon,
  Check,
} from 'lucide-react';

interface BulkPostItem {
  id: string;
  title: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  scheduledAt: string;
}

export default function BulkSchedulerPage() {
  return (
    <AppShell>
      <BulkSchedulerContent />
    </AppShell>
  );
}

function BulkSchedulerContent() {
  const { pages, createPost } = useApp();

  // Step 1: Common Settings
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>(
    pages.filter((p) => p.isActive).map((p) => p.id)
  );
  const [startDateTime, setStartDateTime] = useState('2026-11-12T10:00');
  const [gapMinutes, setGapMinutes] = useState(30);
  const [jitterMinutes, setJitterMinutes] = useState(5);
  const [pageIntervalMin, setPageIntervalMin] = useState(30);
  const [pageIntervalMax, setPageIntervalMax] = useState(90);
  const [globalComment, setGlobalComment] = useState('👉 पूरी खबर पढ़ें: https://khabarmonkey.com');
  const [captionSuffix, setCaptionSuffix] = useState('#News #BreakingNews #India');
  const [hashtagPool, setHashtagPool] = useState(
    '#HimachalNews #Shimla #Manali #Dharamshala #Devbhoomi #ViralNews #TodayNews #Pahadi #Himalayas #Trending'
  );
  const [poolPickMin, setPoolPickMin] = useState(2);
  const [poolPickMax, setPoolPickMax] = useState(4);

  // Step 2 & 3: Posts List
  const [bulkItems, setBulkItems] = useState<BulkPostItem[]>([
    {
      id: 'bulk_1',
      title: 'कुल्लू मनाली में ताज़ा बर्फबारी, सैलानियों के चेहरों पर लौटी मुस्कान',
      mediaUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      scheduledAt: '2026-11-12T10:00',
    },
    {
      id: 'bulk_2',
      title: 'शिमला में पर्यटकों की भारी भीड़, होटल कारोबारियों में उत्साह',
      mediaUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      scheduledAt: '2026-11-12T10:35',
    },
    {
      id: 'bulk_3',
      title: 'रोहतांग दर्रे में बर्फ के बीच रोमांचित करते दृश्य ❄️ #Shorts',
      mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      mediaType: 'video',
      scheduledAt: '2026-11-12T11:10',
    },
  ]);

  const [pastedTitles, setPastedTitles] = useState('');
  const [isSchedulingAll, setIsSchedulingAll] = useState(false);
  const [scheduleSuccessMsg, setScheduleSuccessMsg] = useState<string | null>(null);

  // Calculate random tags from pool
  const getRandomPoolTags = () => {
    const tags = hashtagPool
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter((t) => t.startsWith('#'));
    if (tags.length === 0) return '';
    const count = Math.floor(Math.random() * (poolPickMax - poolPickMin + 1)) + poolPickMin;
    const shuffled = [...tags].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).join(' ');
  };

  // Recalculate scheduled times with gap + jitter
  const handleRecalculateTimes = () => {
    let currentMs = new Date(startDateTime).getTime();
    const updated = bulkItems.map((item, idx) => {
      if (idx > 0) {
        const jitter = (Math.random() * 2 - 1) * jitterMinutes * 60 * 1000;
        currentMs += gapMinutes * 60 * 1000 + jitter;
      }
      const isoStr = new Date(currentMs).toISOString().slice(0, 16);
      return { ...item, scheduledAt: isoStr };
    });
    setBulkItems(updated);
  };

  // Apply pasted titles
  const handleApplyPastedTitles = () => {
    const lines = pastedTitles.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    setBulkItems((prev) => {
      return prev.map((item, index) => {
        if (lines[index]) {
          return { ...item, title: lines[index] };
        }
        return item;
      });
    });
  };

  // Add sample placeholder image post
  const handleAddSamplePost = () => {
    const newId = `bulk_${Date.now()}`;
    const lastItemTime =
      bulkItems.length > 0
        ? new Date(new Date(bulkItems[bulkItems.length - 1].scheduledAt).getTime() + gapMinutes * 60000).toISOString().slice(0, 16)
        : startDateTime;

    setBulkItems((prev) => [
      ...prev,
      {
        id: newId,
        title: `ताज़ा अपडेट #${prev.length + 1} - ऑटो शेड्यूल पोस्ट`,
        mediaUrl: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&auto=format&fit=crop&q=80',
        mediaType: 'image',
        scheduledAt: lastItemTime,
      },
    ]);
  };

  // Remove a post from bulk list
  const handleRemoveItem = (id: string) => {
    setBulkItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Schedule All Posts
  const handleScheduleAll = async () => {
    if (bulkItems.length === 0) return;
    setIsSchedulingAll(true);

    for (const item of bulkItems) {
      const finalCaption = `${item.title}\n\n${captionSuffix} ${getRandomPoolTags()}`.trim();
      createPost({
        postType: item.mediaType,
        message: finalCaption,
        mediaUrl: item.mediaUrl,
        commentText: globalComment,
        pageIds: selectedPageIds,
        status: 'scheduled',
        scheduledAt: new Date(item.scheduledAt).toISOString(),
        intervalMinSeconds: pageIntervalMin,
        intervalMaxSeconds: pageIntervalMax,
      });
    }

    await new Promise((r) => setTimeout(r, 600));
    setIsSchedulingAll(false);
    setScheduleSuccessMsg(`Successfully scheduled ${bulkItems.length} posts across ${selectedPageIds.length} social channels!`);
    setTimeout(() => setScheduleSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-7 font-sans max-w-5xl animate-fade-in pb-12">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EEF1F6]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Bulk Post Scheduler
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Schedule multiple posts at once with anti-ban staggered intervals, hashtag pooling, and automatic first-comment links.
          </p>
        </div>

        <Link
          href="/library"
          className="text-xs font-bold text-[#FF007A] hover:underline self-start sm:self-auto"
        >
          View Post Library →
        </Link>
      </div>

      {scheduleSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{scheduleSuccessMsg}</span>
        </div>
      )}

      {/* STEP 1: Common Settings */}
      <div className="bg-white rounded-2xl border border-[#EEF1F6] p-6 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F0F2F6]">
          <span className="w-6 h-6 rounded-full bg-gradient-to-r from-[#FF007A] to-[#FF4E98] text-white text-xs font-black flex items-center justify-center">
            1
          </span>
          <h2 className="font-extrabold text-sm text-slate-900">
            Common Settings (Applied to All Posts in Batch)
          </h2>
        </div>

        {/* Target Pages */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            Target Destinations ({selectedPageIds.length} Channels Selected)
          </label>
          <div className="flex flex-wrap gap-2">
            {pages.map((p) => {
              const isSelected = selectedPageIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    setSelectedPageIds((prev) =>
                      isSelected ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                    )
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-[#F8F9FD] border border-[#EEF1F6] text-slate-600 hover:bg-[#F0F2F6]'
                  }`}
                >
                  <span>{isSelected ? '✓' : '+'}</span>
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Timing and Intervals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Gap Between Posts (Min)
            </label>
            <input
              type="number"
              min={5}
              value={gapMinutes}
              onChange={(e) => setGapMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Random Jitter (± Min)
            </label>
            <input
              type="number"
              min={0}
              max={15}
              value={jitterMinutes}
              onChange={(e) => setJitterMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Page Interval (Sec)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={pageIntervalMin}
                onChange={(e) => setPageIntervalMin(Number(e.target.value))}
                className="w-1/2 px-2.5 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900"
              />
              <span className="text-xs text-slate-400">–</span>
              <input
                type="number"
                value={pageIntervalMax}
                onChange={(e) => setPageIntervalMax(Number(e.target.value))}
                className="w-1/2 px-2.5 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* First Comment & Hashtags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              First Comment Link / CTA (Optional)
            </label>
            <textarea
              rows={2}
              value={globalComment}
              onChange={(e) => setGlobalComment(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900"
              placeholder="Link will be posted as the first comment automatically..."
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Caption Suffix / Static Tags
            </label>
            <textarea
              rows={2}
              value={captionSuffix}
              onChange={(e) => setCaptionSuffix(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900"
              placeholder="#News #Viral #Breaking"
            />
          </div>
        </div>

        {/* Hashtag Pool (Original Plugin Signature Feature) */}
        <div className="pt-2 border-t border-[#F0F2F6] space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">
              Hashtag Pool (Randomly appends 2-4 tags per post for algorithm safety)
            </label>
            <span className="text-[10px] font-bold text-[#FF007A] bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
              Anti-Ban Variance Active
            </span>
          </div>
          <textarea
            rows={2}
            value={hashtagPool}
            onChange={(e) => setHashtagPool(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900"
          />
        </div>
      </div>

      {/* STEP 2: Titles Multi-Line Paste */}
      <div className="bg-white rounded-2xl border border-[#EEF1F6] p-6 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F0F2F6]">
          <span className="w-6 h-6 rounded-full bg-gradient-to-r from-[#7928CA] to-[#9333EA] text-white text-xs font-black flex items-center justify-center">
            2
          </span>
          <h2 className="font-extrabold text-sm text-slate-900">
            Paste Post Titles (1 Line = 1 Post)
          </h2>
        </div>

        <div className="space-y-3">
          <textarea
            rows={4}
            value={pastedTitles}
            onChange={(e) => setPastedTitles(e.target.value)}
            placeholder={"कुल्लू मनाली में ताज़ा बर्फबारी...\nशिमला में पर्यटकों की भारी भीड़...\nरोहतांग दर्रे में बर्फ के बीच दृश्य..."}
            className="w-full p-3 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF007A]"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyPastedTitles}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
            >
              Apply Titles to Cards
            </button>
            <button
              type="button"
              onClick={handleRecalculateTimes}
              className="px-4 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] hover:bg-[#EEF1F6] text-slate-700 font-bold text-xs transition-colors"
            >
              Re-Calculate Time Intervals
            </button>
            <button
              type="button"
              onClick={handleAddSamplePost}
              className="px-4 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] hover:bg-[#EEF1F6] text-slate-700 font-bold text-xs transition-colors ml-auto"
            >
              + Add Post Card
            </button>
          </div>
        </div>
      </div>

      {/* STEP 3: Queue Preview Cards & Sticky Action Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-extrabold text-sm text-slate-900">
            Scheduled Posts Queue ({bulkItems.length} Posts Ready)
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Spanning {startDateTime.slice(0, 10)} to future slots
          </span>
        </div>

        <div className="space-y-3">
          {bulkItems.map((item, index) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-[#EEF1F6] p-4 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center shrink-0">
                  {index + 1}
                </span>

                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.mediaUrl}
                    alt="media"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => {
                      const updated = [...bulkItems];
                      updated[index].title = e.target.value;
                      setBulkItems(updated);
                    }}
                    className="w-full font-bold text-xs text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#FF007A] focus:outline-none"
                  />
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <span className="uppercase font-bold">{item.mediaType}</span>
                    <span>•</span>
                    <span>{selectedPageIds.length} target channels</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] text-xs font-mono text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="datetime-local"
                    value={item.scheduledAt}
                    onChange={(e) => {
                      const updated = [...bulkItems];
                      updated[index].scheduledAt = e.target.value;
                      setBulkItems(updated);
                    }}
                    className="bg-transparent focus:outline-none text-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className="w-8 h-8 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-6 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
        <div className="bg-slate-950 text-white rounded-2xl px-6 py-3.5 shadow-2xl flex items-center gap-6 pointer-events-auto border border-slate-800 animate-slide-up">
          <div>
            <div className="font-extrabold text-xs">
              {bulkItems.length} Posts in Batch
            </div>
            <div className="text-[10px] text-slate-400">
              {selectedPageIds.length} Channels Target
            </div>
          </div>

          <button
            type="button"
            disabled={isSchedulingAll || bulkItems.length === 0}
            onClick={handleScheduleAll}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF007A] to-[#FF4E98] hover:from-[#E6006E] hover:to-[#E62080] disabled:opacity-50 text-white font-black text-xs transition-all shadow-[0_4px_14px_rgba(255,0,122,0.4)] flex items-center gap-2 hover:scale-105 active:scale-95"
          >
            {isSchedulingAll ? (
              <span>Scheduling Posts...</span>
            ) : (
              <>
                <CalendarClock className="w-4 h-4" />
                <span>Schedule All {bulkItems.length} Posts</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
