'use client';

import React, { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { SocialPage, Platform } from '@/types';
import { SocialIcon } from '@/components/ui/SocialIcon';
import {
  CalendarClock,
  Upload,
  CheckCircle2,
  Trash2,
  Clock,
  Video as VideoIcon,
  FileText,
  Check,
  RotateCw,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface BulkPostItem {
  id: string;
  title: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'text';
  fileName?: string;
  scheduledAt: string;
}

function getDefaultStartTime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15);
  d.setSeconds(0);
  d.setMilliseconds(0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function cleanFileNameToTitle(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  return withoutExt
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function BulkSchedulerPage() {
  return (
    <AppShell>
      <BulkSchedulerContent />
    </AppShell>
  );
}

function BulkSchedulerContent() {
  const router = useRouter();
  const { pages, accounts, settings, createPost } = useApp();

  // STEP 1: Common Settings
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>(
    pages.filter((p) => p.isActive).map((p) => p.id)
  );

  const [startDateTime, setStartDateTime] = useState(getDefaultStartTime());
  const [gapMinutes, setGapMinutes] = useState(30);
  const [jitterMinutes, setJitterMinutes] = useState(0);
  const [pageIntervalMin, setPageIntervalMin] = useState(settings?.pageIntervalMinSeconds ?? 0);
  const [pageIntervalMax, setPageIntervalMax] = useState(settings?.pageIntervalMaxSeconds ?? 0);

  const [globalComment, setGlobalComment] = useState('');
  const [captionSuffix, setCaptionSuffix] = useState('');

  const [hashtagPool, setHashtagPool] = useState(
    '#AstroMahima #SanatanDharma #Bhakti #HinduDharma #Dharmik #Spirituality #Shorts'
  );
  const [poolPickMin, setPoolPickMin] = useState(3);
  const [poolPickMax, setPoolPickMax] = useState(4);

  // STEP 2 & 3: Uploaded Post Cards
  const [bulkItems, setBulkItems] = useState<BulkPostItem[]>([]);
  const [pastedTitles, setPastedTitles] = useState('');
  const [onlyEmptyCards, setOnlyEmptyCards] = useState(false);

  // Execution Status
  const [isSchedulingAll, setIsSchedulingAll] = useState(false);
  const [scheduleSuccessMsg, setScheduleSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Group pages by parent account (matching screenshot "Facebook — Rahul Thakur" grouping)
  const groupedPages = useMemo(() => {
    const groups = new Map<string, { accountName: string; platform: Platform; pages: SocialPage[] }>();

    pages.forEach((page) => {
      const acc = accounts.find((a) => a.id === page.accountId);
      const key = acc ? acc.id : `other_${page.platform}`;
      const accountName = acc ? `${acc.platform.toUpperCase()} — ${acc.name}` : `${page.platform.toUpperCase()} Pages`;
      if (!groups.has(key)) {
        groups.set(key, { accountName, platform: acc?.platform || page.platform, pages: [] });
      }
      groups.get(key)!.pages.push(page);
    });

    return Array.from(groups.entries()).map(([id, data]) => ({ id, ...data }));
  }, [pages, accounts]);

  // Hashtags in pool count
  const parsedPoolTags = useMemo(() => {
    return hashtagPool
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));
  }, [hashtagPool]);

  // Account Group Selection Handlers
  const handleSelectAllInGroup = (groupPages: SocialPage[]) => {
    const ids = groupPages.map((p) => p.id);
    setSelectedPageIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleDeselectAllInGroup = (groupPages: SocialPage[]) => {
    const ids = new Set(groupPages.map((p) => p.id));
    setSelectedPageIds((prev) => prev.filter((id) => !ids.has(id)));
  };

  const togglePageSelection = (pageId: string) => {
    setSelectedPageIds((prev) =>
      prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]
    );
  };

  // Random Tag Generator
  const getRandomPoolTags = () => {
    if (parsedPoolTags.length === 0) return '';
    const min = Math.min(poolPickMin, parsedPoolTags.length);
    const max = Math.min(Math.max(poolPickMax, min), parsedPoolTags.length);
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const shuffled = [...parsedPoolTags].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).join(' ');
  };

  // Compute time for i-th item with gap + jitter
  const computeTimeForIndex = (index: number, baseDateStr: string) => {
    const baseMs = new Date(baseDateStr).getTime();
    if (isNaN(baseMs)) return baseDateStr;
    if (index === 0) return baseDateStr;
    const jitter = jitterMinutes > 0 ? (Math.random() * 2 - 1) * jitterMinutes * 60 * 1000 : 0;
    const targetMs = baseMs + index * gapMinutes * 60 * 1000 + jitter;
    const pad = (n: number) => String(n).padStart(2, '0');
    const d = new Date(targetMs);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Recalculate scheduled times for all cards
  const handleRecalculateTimes = () => {
    if (bulkItems.length === 0) return;
    setBulkItems((prev) =>
      prev.map((item, index) => ({
        ...item,
        scheduledAt: computeTimeForIndex(index, startDateTime),
      }))
    );
  };

  // Multiple File Upload Handler (Step 2)
  const handleMultipleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: BulkPostItem[] = [];
    const startIndex = bulkItems.length;

    Array.from(files).forEach((file, i) => {
      const isVideo = file.type.startsWith('video/');
      const mediaType = isVideo ? 'video' : 'image';
      const cleanTitle = cleanFileNameToTitle(file.name);
      const scheduledAt = computeTimeForIndex(startIndex + i, startDateTime);
      const tempId = `bulk_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;

      // Generate local object URL for instant preview
      const objectUrl = URL.createObjectURL(file);

      newItems.push({
        id: tempId,
        title: cleanTitle,
        mediaUrl: objectUrl,
        mediaType,
        fileName: file.name,
        scheduledAt,
      });
    });

    setBulkItems((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Add pure text post
  const handleAddTextPost = () => {
    const newIndex = bulkItems.length;
    const tempId = `bulk_text_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const scheduledAt = computeTimeForIndex(newIndex, startDateTime);

    setBulkItems((prev) => [
      ...prev,
      {
        id: tempId,
        title: '',
        mediaUrl: '',
        mediaType: 'text',
        scheduledAt,
      },
    ]);
  };

  // Apply Pasted Titles (Step 3)
  const handleApplyPastedTitles = () => {
    const lines = pastedTitles
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      alert('Pehle titles paste karein — ek line = ek post.');
      return;
    }

    if (bulkItems.length === 0) {
      // Auto-create text cards if no cards exist
      const autoCards: BulkPostItem[] = lines.map((line, idx) => ({
        id: `bulk_title_${Date.now()}_${idx}`,
        title: line,
        mediaUrl: '',
        mediaType: 'text',
        scheduledAt: computeTimeForIndex(idx, startDateTime),
      }));
      setBulkItems(autoCards);
      return;
    }

    let lineIndex = 0;
    setBulkItems((prev) =>
      prev.map((item) => {
        if (onlyEmptyCards && item.title.trim().length > 0) {
          return item;
        }
        if (lineIndex < lines.length) {
          const newTitle = lines[lineIndex];
          lineIndex++;
          return { ...item, title: newTitle };
        }
        return item;
      })
    );
  };

  // Fill Titles from File Names
  const handleFillTitlesFromFileName = () => {
    setBulkItems((prev) =>
      prev.map((item) => {
        if (item.fileName) {
          return { ...item, title: cleanFileNameToTitle(item.fileName) };
        }
        return item;
      })
    );
  };

  // Remove single post
  const handleRemoveItem = (id: string) => {
    setBulkItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Clear all items
  const handleClearAll = () => {
    if (confirm('Kya aap saare post cards hatana chahte hain?')) {
      setBulkItems([]);
    }
  };

  // Schedule All Posts (Execute)
  const handleScheduleAll = async () => {
    if (bulkItems.length === 0) {
      alert('Schedule karne ke liye pehle kam se kam ek post jodein.');
      return;
    }
    if (selectedPageIds.length === 0) {
      alert('Pehle kam se kam ek target Page ya Channel select karein.');
      return;
    }

    setIsSchedulingAll(true);

    for (const item of bulkItems) {
      const tags = getRandomPoolTags();
      const parts = [item.title.trim()];
      if (captionSuffix.trim()) parts.push(captionSuffix.trim());
      if (tags) parts.push(tags);
      const finalMessage = parts.filter(Boolean).join('\n\n');

      createPost({
        postType: item.mediaType === 'video' ? 'video' : item.mediaType === 'image' ? 'image' : 'text',
        message: finalMessage,
        mediaUrl: item.mediaUrl || undefined,
        commentText: globalComment.trim() || undefined,
        pageIds: selectedPageIds,
        status: 'scheduled',
        scheduledAt: new Date(item.scheduledAt).toISOString(),
        intervalMinSeconds: pageIntervalMin,
        intervalMaxSeconds: pageIntervalMax,
      });
    }

    await new Promise((r) => setTimeout(r, 600));
    setIsSchedulingAll(false);
    setScheduleSuccessMsg(
      `Ek saath ${bulkItems.length} posts schedule ho gayi hain across ${selectedPageIds.length} channels!`
    );

    setTimeout(() => {
      router.push('/dashboard');
    }, 1800);
  };

  return (
    <div className="space-y-6 font-sans max-w-6xl mx-auto animate-fade-in pb-28">
      {/* Top Banner (Matching the Orange-Amber Header in Screenshot) */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            <CalendarClock className="w-7 h-7 stroke-[2.3]" />
            <span>Bulk Scheduler</span>
          </h1>
          <p className="text-xs sm:text-sm text-amber-50 font-medium mt-1">
            Ek saath bahut saari images/videos select karo, titles lagao, time auto-set — ek click me sab schedule.
          </p>
        </div>

        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors self-start sm:self-auto backdrop-blur-xs shadow-2xs"
        >
          <span>Post Library</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {scheduleSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-fade-in shadow-2xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{scheduleSuccessMsg} Dashboard khul raha hai...</span>
          </div>
          <Link href="/dashboard" className="underline font-bold text-emerald-950">
            View on Dashboard
          </Link>
        </div>
      )}

      {/* Hidden Multi-file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleMultipleFileUpload}
        multiple
        accept="image/*,video/*"
        className="hidden"
      />

      {/* STEP 1: Common Settings */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-2xs space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[#E2E8F0]">
          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
            1
          </span>
          <h2 className="font-black text-sm sm:text-base text-slate-900">
            Common settings (sab posts par lagu)
          </h2>
        </div>

        {/* Kaha post karna hai (Grouped by Account with "Sab" | "Koi nahi" buttons) */}
        <div className="space-y-4">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Kaha post karna hai
          </label>

          {groupedPages.length === 0 ? (
            <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-dashed border-[#E2E8F0] text-center space-y-2">
              <p className="text-xs font-bold text-slate-700">Koi broadcasting page ya channel connect nahi hai</p>
              <Link
                href="/accounts"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xs"
              >
                <span>Connect Account</span>
              </Link>
            </div>
          ) : (
            groupedPages.map((group) => {
              return (
                <div key={group.id} className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="font-bold text-slate-800">{group.accountName}</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllInGroup(group.pages)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      Sab
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => handleDeselectAllInGroup(group.pages)}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Koi nahi
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {group.pages.map((page) => {
                      const isSelected = selectedPageIds.includes(page.id);
                      return (
                        <button
                          key={page.id}
                          type="button"
                          onClick={() => togglePageSelection(page.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#F8F9FA] border-slate-900 text-slate-900 font-bold shadow-2xs'
                              : 'bg-white border-[#E2E8F0] text-slate-600 hover:bg-[#F8F9FA]'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-slate-900 border-slate-900 text-white'
                                : 'bg-white border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <SocialIcon platform={page.platform} className="w-3.5 h-3.5 rounded-xs shrink-0" />
                          <span>{page.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4 Timing & Gap Inputs in One Responsive Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* 1. Pehli post ka time */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Pehli post ka time
            </label>
            <input
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => {
                setStartDateTime(e.target.value);
                // optionally update times
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-500 font-medium"
            />
          </div>

          {/* 2. Do posts ke beech gap (minute) */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Do posts ke beech gap (minute)
            </label>
            <input
              type="number"
              min={1}
              max={1440}
              value={gapMinutes}
              onChange={(e) => setGapMinutes(Math.max(1, Number(e.target.value)))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-500 font-medium"
              placeholder="30"
            />
          </div>

          {/* 3. Random ± (minute) — natural dikhe */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Random ± (minute) — natural dikhe
            </label>
            <input
              type="number"
              min={0}
              max={60}
              value={jitterMinutes}
              onChange={(e) => setJitterMinutes(Math.max(0, Number(e.target.value)))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-500 font-medium"
              placeholder="0"
            />
          </div>

          {/* 4. Pages ke beech gap (second, min – max) */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Pages ke beech gap (second, min – max)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={pageIntervalMin}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPageIntervalMin(val);
                  if (val > pageIntervalMax) setPageIntervalMax(val);
                }}
                className="w-1/2 px-3 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-500 font-medium text-center"
                placeholder="0"
              />
              <span className="text-slate-400 font-bold">–</span>
              <input
                type="number"
                min={0}
                value={pageIntervalMax}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPageIntervalMax(val);
                  if (val < pageIntervalMin) setPageIntervalMin(val);
                }}
                className="w-1/2 px-3 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-500 font-medium text-center"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* First Comment & Caption Suffix Textareas (2 Cols) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              First comment (sab posts me, optional)
            </label>
            <textarea
              rows={3}
              value={globalComment}
              onChange={(e) => setGlobalComment(e.target.value)}
              placeholder="Link ya koi line..."
              className="w-full p-3 rounded-2xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-500 leading-relaxed font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Har caption ke neeche jodo (hashtags / line, optional)
            </label>
            <textarea
              rows={3}
              value={captionSuffix}
              onChange={(e) => setCaptionSuffix(e.target.value)}
              placeholder="#himachal #news"
              className="w-full p-3 rounded-2xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-500 leading-relaxed font-medium"
            />
          </div>
        </div>

        {/* Hashtag Pool (Original Plugin Feature) */}
        <div className="pt-2 border-t border-[#E2E8F0] space-y-2.5">
          <label className="text-xs font-bold text-slate-700 block">
            Hashtag pool — yaha 20-30 tags save karo (space / comma / nayi line se alag)
          </label>
          <textarea
            rows={3}
            value={hashtagPool}
            onChange={(e) => setHashtagPool(e.target.value)}
            placeholder="#AstroMahima #SanatanDharma #Bhakti #HinduDharma #Dharmik #Spirituality #Shorts ..."
            className="w-full p-3 rounded-2xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-500 leading-relaxed font-medium font-mono"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-600">Har post me random</span>
              <input
                type="number"
                min={1}
                max={20}
                value={poolPickMin}
                onChange={(e) => setPoolPickMin(Number(e.target.value))}
                className="w-12 px-2 py-1 rounded-lg border border-[#E2E8F0] bg-[#F8F9FA] text-center font-bold text-xs"
              />
              <span className="text-slate-400">–</span>
              <input
                type="number"
                min={1}
                max={20}
                value={poolPickMax}
                onChange={(e) => setPoolPickMax(Number(e.target.value))}
                className="w-12 px-2 py-1 rounded-lg border border-[#E2E8F0] bg-[#F8F9FA] text-center font-bold text-xs"
              />
              <span className="text-slate-600">
                tags title ke end me lagenge (YouTube title + Facebook caption dono me).
              </span>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
                parsedPoolTags.length === 0
                  ? 'bg-slate-100 border-slate-200 text-slate-500'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {parsedPoolTags.length === 0 ? 'pool khaali' : `${parsedPoolTags.length} tags pool me`}
            </span>
          </div>
        </div>
      </div>

      {/* STEP 2: Images / Videos jodo */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0]">
          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
            2
          </span>
          <h2 className="font-black text-sm sm:text-base text-slate-900">
            Images / Videos jodo
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          >
            <Upload className="w-4 h-4 stroke-[2.4]" />
            <span>Computer se upload (multiple)</span>
          </button>

          <Link
            href="/library"
            className="px-4 py-3 rounded-2xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-slate-700 font-bold text-xs transition-colors flex items-center gap-2 shadow-2xs"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>Media Library se select</span>
          </Link>

          <button
            type="button"
            onClick={handleAddTextPost}
            className="px-4 py-3 rounded-2xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-slate-700 font-bold text-xs transition-colors flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Sirf text post</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
          Tip: popup me Ctrl/Shift se ek saath saari files chuno, ya seedha drag-drop karo — har file ka alag post-card ban jayega.
        </p>
      </div>

      {/* STEP 3: Titles / captions */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0]">
          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
            3
          </span>
          <h2 className="font-black text-sm sm:text-base text-slate-900">
            Titles / captions
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8">
            <textarea
              rows={4}
              value={pastedTitles}
              onChange={(e) => setPastedTitles(e.target.value)}
              placeholder={"Yaha saare titles paste karo — ek line = ek post.\nPehli line pehle card me, doosri doosre me..."}
              className="w-full p-4 rounded-2xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-500 leading-relaxed font-medium"
            />
          </div>

          <div className="lg:col-span-4 space-y-3">
            <button
              type="button"
              onClick={handleApplyPastedTitles}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Titles lagao (order me)</span>
            </button>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 px-1">
              <input
                type="checkbox"
                checked={onlyEmptyCards}
                onChange={(e) => setOnlyEmptyCards(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>Sirf khaali wale cards me</span>
            </label>

            <button
              type="button"
              onClick={handleFillTitlesFromFileName}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              File ke naam se title bharo
            </button>
          </div>
        </div>
      </div>

      {/* Cards Section / Post Cards Queue */}
      <div className="space-y-4">
        {bulkItems.length === 0 ? (
          /* Empty state matching the screenshot */
          <div className="py-14 px-4 rounded-3xl border-2 border-dashed border-[#E2E8F0] bg-white text-center space-y-3">
            <p className="text-xs sm:text-sm font-semibold text-slate-500">
              Abhi koi post nahi. Upar se images/videos jodo.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition-colors"
              >
                + Files Upload Karein
              </button>
              <button
                type="button"
                onClick={handleAddTextPost}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white text-slate-700 text-xs font-bold hover:bg-[#F8F9FA] transition-colors"
              >
                + Text Post
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2.5">
                <h3 className="font-black text-sm text-slate-900">
                  Scheduled Posts Queue ({bulkItems.length} Posts Ready)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-[#E2E8F0] text-[11px] font-bold text-slate-700">
                  {selectedPageIds.length} Target Channels
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRecalculateTimes}
                  className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Re-Calculate Times</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 font-bold text-xs transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {bulkItems.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    <span className="w-7 h-7 rounded-xl bg-slate-100 border border-[#E2E8F0] text-slate-800 font-black text-xs flex items-center justify-center shrink-0 mt-1 sm:mt-0">
                      {index + 1}
                    </span>

                    {/* Thumbnail / Media Box */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-[#E2E8F0] shrink-0 relative flex items-center justify-center text-white">
                      {item.mediaType === 'video' ? (
                        <>
                          <video src={item.mediaUrl} className="w-full h-full object-cover" />
                          <span className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <VideoIcon className="w-5 h-5 text-white" />
                          </span>
                        </>
                      ) : item.mediaType === 'image' && item.mediaUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.mediaUrl}
                          alt="thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-1 text-center">
                          <FileText className="w-5 h-5 text-slate-300" />
                          <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Text</span>
                        </div>
                      )}
                    </div>

                    {/* Title Input & Metadata */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBulkItems((prev) =>
                            prev.map((it) => (it.id === item.id ? { ...it, title: val } : it))
                          );
                        }}
                        placeholder="Post title or caption yaha likhein..."
                        className="w-full font-bold text-xs sm:text-[13px] text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-900 focus:outline-none py-1"
                      />

                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-medium">
                        <span className="uppercase font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.mediaType}
                        </span>
                        {item.fileName && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[180px] font-mono">{item.fileName}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{selectedPageIds.length} target pages</span>
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Time & Delete */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-xs font-mono text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="datetime-local"
                        value={item.scheduledAt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBulkItems((prev) =>
                            prev.map((it) => (it.id === item.id ? { ...it, scheduledAt: val } : it))
                          );
                        }}
                        className="bg-transparent focus:outline-none text-xs font-semibold"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="w-9 h-9 rounded-xl border border-[#E2E8F0] hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                      title="Remove card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar */}
      {bulkItems.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
          <div className="bg-slate-950 text-white rounded-2xl px-6 py-4 shadow-2xl flex flex-wrap items-center justify-between gap-6 pointer-events-auto border border-slate-800 animate-slide-up max-w-2xl w-full">
            <div>
              <div className="font-black text-sm">
                {bulkItems.length} Post{bulkItems.length === 1 ? '' : 's'} in Batch
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Targeting {selectedPageIds.length} social channels with {gapMinutes}m spacing
              </div>
            </div>

            <button
              type="button"
              disabled={isSchedulingAll || selectedPageIds.length === 0}
              onClick={handleScheduleAll}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs transition-all shadow-md flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              {isSchedulingAll ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Scheduling Batch...</span>
                </>
              ) : (
                <>
                  <CalendarClock className="w-4 h-4" />
                  <span>Schedule All {bulkItems.length} Posts</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
