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
  UploadCloud,
  CheckCircle2,
  Trash2,
  Clock,
  Video as VideoIcon,
  FileText,
  Check,
  RotateCw,
  Layers,
  Sparkles,
  Search,
  Plus,
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

function formatDurationShort(totalMinutes: number): string {
  if (totalMinutes < 60) return `${Math.round(totalMinutes)}m`;
  const hrs = (totalMinutes / 60).toFixed(1).replace(/\.0$/, '');
  return `${hrs}h`;
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
  const { pages, accounts, categories, settings, createPost } = useApp();

  // Selected Destinations (Page IDs)
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>(
    pages.filter((p) => p.isActive).map((p) => p.id)
  );

  // Right sidebar filters
  const [pageSearch, setPageSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');

  // STEP 1: Timing & Common Settings
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

  // STEP 2 & 3: Post Cards Queue
  const [bulkItems, setBulkItems] = useState<BulkPostItem[]>([]);
  const [pastedTitles, setPastedTitles] = useState('');
  const [onlyEmptyCards, setOnlyEmptyCards] = useState(false);

  // Execution Status
  const [isSchedulingAll, setIsSchedulingAll] = useState(false);
  const [scheduleSuccessMsg, setScheduleSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Categories with counts & selection states (exact match with /composer)
  const categoriesWithCounts = useMemo(() => {
    const existingIds = new Set(pages.map((p) => p.id));
    return categories.map((cat) => {
      const validIds = cat.pageIds.filter((id) => existingIds.has(id));
      const allSelected = validIds.length > 0 && validIds.every((id) => selectedPageIds.includes(id));
      const someSelected = validIds.some((id) => selectedPageIds.includes(id));
      return {
        ...cat,
        validIds,
        allSelected,
        someSelected,
      };
    });
  }, [categories, pages, selectedPageIds]);

  // Suggested tags from selected categories
  const suggestedCategoryTags = useMemo(() => {
    const tags = new Set<string>();
    categories.forEach((cat) => {
      const touchesSelected = cat.pageIds.some((pid) => selectedPageIds.includes(pid));
      if (touchesSelected) {
        cat.tags.forEach((t) => tags.add(t.startsWith('#') ? t : `#${t}`));
      }
    });
    return Array.from(tags);
  }, [categories, selectedPageIds]);

  // Available platforms among connected pages
  const availablePlatforms = useMemo(() => {
    const set = new Set<Platform>();
    pages.forEach((p) => set.add(p.platform));
    return Array.from(set);
  }, [pages]);

  // Filtered pages for right sidebar
  const filteredPages = useMemo(() => {
    const q = pageSearch.trim().toLowerCase();
    return pages.filter((p) => {
      const matchesPlatform = platformFilter === 'all' || p.platform === platformFilter;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.platform.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q);
      return matchesPlatform && matchesQuery;
    });
  }, [pages, pageSearch, platformFilter]);

  // Group pages by parent account (exact match with /composer)
  const groupedPages = useMemo(() => {
    const groups = new Map<string, { accountName: string; platform?: Platform; pages: SocialPage[] }>();

    filteredPages.forEach((page) => {
      const acc = accounts.find((a) => a.id === page.accountId);
      const key = acc ? acc.id : `other_${page.platform}`;
      const accountName = acc ? `${acc.platform.toUpperCase()} — ${acc.name}` : `${page.platform.toUpperCase()} Channels`;
      if (!groups.has(key)) {
        groups.set(key, { accountName, platform: acc?.platform || page.platform, pages: [] });
      }
      groups.get(key)!.pages.push(page);
    });

    return Array.from(groups.entries()).map(([id, data]) => ({ id, ...data }));
  }, [filteredPages, accounts]);

  // Parsed Hashtags in pool count
  const parsedPoolTags = useMemo(() => {
    return hashtagPool
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));
  }, [hashtagPool]);

  // Selected pages breakdown by platform
  const platformBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    const selected = pages.filter((p) => selectedPageIds.includes(p.id));
    selected.forEach((p) => {
      counts[p.platform] = (counts[p.platform] || 0) + 1;
    });
    return Object.entries(counts);
  }, [pages, selectedPageIds]);

  // Toggle Category Pages (Select / Deselect all pages in category)
  const toggleCategoryPages = (validIds: string[], isAllSelected: boolean) => {
    if (validIds.length === 0) return;
    if (isAllSelected) {
      setSelectedPageIds((prev) => prev.filter((id) => !validIds.includes(id)));
    } else {
      setSelectedPageIds((prev) => Array.from(new Set([...prev, ...validIds])));
    }
  };

  const toggleAccountGroup = (groupPages: SocialPage[]) => {
    const ids = groupPages.map((p) => p.id);
    const allGroupSelected = ids.every((id) => selectedPageIds.includes(id));
    if (allGroupSelected) {
      setSelectedPageIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedPageIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const togglePageSelection = (pageId: string) => {
    setSelectedPageIds((prev) =>
      prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]
    );
  };

  const allPagesSelected = pages.length > 0 && pages.every((p) => selectedPageIds.includes(p.id));

  const toggleSelectAllPages = () => {
    if (allPagesSelected) {
      setSelectedPageIds([]);
    } else {
      setSelectedPageIds(pages.map((p) => p.id));
    }
  };

  // Add category tags into Hashtag Pool
  const handleAddCategoryTagsToPool = () => {
    if (suggestedCategoryTags.length === 0) return;
    const existing = new Set(parsedPoolTags);
    const newTags = suggestedCategoryTags.filter((t) => !existing.has(t));
    if (newTags.length === 0) {
      alert('Selected categories ke saare tags already pool me hain.');
      return;
    }
    setHashtagPool((prev) => (prev.trim() ? `${prev.trim()} ${newTags.join(' ')}` : newTags.join(' ')));
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

  // Batch timeline summary
  const batchDurationText = useMemo(() => {
    if (bulkItems.length <= 1) return 'Single slot';
    const totalMin = (bulkItems.length - 1) * gapMinutes;
    return `Spanning ~${formatDurationShort(totalMin)} total window`;
  }, [bulkItems.length, gapMinutes]);

  return (
    <div className="space-y-4 font-sans max-w-6xl mx-auto animate-fade-in pb-20">
      {/* Studio Header (Compact Modern Studio) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-slate-900" />
            <span>Bulk Post Scheduler</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">
            Ek saath multiple media upload karein, targets chunein, aur schedule karein.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] text-xs font-bold text-slate-800 shadow-2xs">
            <span
              className={`w-2 h-2 rounded-full ${
                selectedPageIds.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
            <span>{selectedPageIds.length} Pages Selected</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] text-xs font-bold text-slate-800 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>{bulkItems.length} Posts in Batch</span>
          </div>
        </div>
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

      {/* 2-Column Studio Grid: Left Main Workflow (7 cols) + Right Sticky Pages & Category Sidebar (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* LEFT COLUMN (7 Cols): Step 1 Timing/Settings, Step 2 Images/Videos, Step 3 Titles, and Queue */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: Common Settings */}
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-2xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0]">
              <span className="w-7 h-7 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <h2 className="font-black text-sm sm:text-base text-slate-900">
                  Common settings (sab posts par lagu)
                </h2>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Timing gaps, caption footer tags, first comment link, aur hashtag pool
                </p>
              </div>
            </div>

            {/* 4 Timing & Gap Inputs in One Responsive 2x2 Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Pehli post ka time */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Pehli post ka time
                </label>
                <input
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
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
                  className="w-full p-3.5 rounded-2xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-500 leading-relaxed font-medium"
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
                  className="w-full p-3.5 rounded-2xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-500 leading-relaxed font-medium"
                />
              </div>
            </div>

            {/* Hashtag Pool (Original Plugin Feature) */}
            <div className="pt-2 border-t border-[#E2E8F0] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Hashtag pool — yaha 20-30 tags save karo (space / comma / nayi line se alag)
                </label>
                {suggestedCategoryTags.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddCategoryTagsToPool}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    + Auto-fill category tags
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={hashtagPool}
                onChange={(e) => setHashtagPool(e.target.value)}
                placeholder="#AstroMahima #SanatanDharma #Bhakti #HinduDharma #Dharmik #Spirituality #Shorts ..."
                className="w-full p-3.5 rounded-2xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-500 leading-relaxed font-medium font-mono"
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
                    tags title ke end me lagenge (YouTube + Facebook).
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
              <span className="w-7 h-7 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <h2 className="font-black text-sm sm:text-base text-slate-900">
                  Images / Videos jodo
                </h2>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Select multiple files to generate cards automatically
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Computer se upload (multiple)</span>
              </button>

              <Link
                href="/library"
                className="px-4 py-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-slate-700 font-bold text-xs transition-colors flex items-center gap-2 shadow-2xs"
              >
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Media Library se select</span>
              </Link>

              <button
                type="button"
                onClick={handleAddTextPost}
                className="px-4 py-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-slate-700 font-bold text-xs transition-colors flex items-center gap-2 shadow-2xs cursor-pointer"
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
              <span className="w-7 h-7 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <h2 className="font-black text-sm sm:text-base text-slate-900">
                  Titles / captions
                </h2>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Paste all headlines at once — 1 line = 1 post card
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              <textarea
                rows={4}
                value={pastedTitles}
                onChange={(e) => setPastedTitles(e.target.value)}
                placeholder={"Yaha saare titles paste karo — ek line = ek post.\nPehli line pehle card me, doosri doosre me..."}
                className="w-full p-4 rounded-2xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-500 leading-relaxed font-medium"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleApplyPastedTitles}
                    className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <span>Titles lagao (order me)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFillTitlesFromFileName}
                    className="py-2.5 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] hover:bg-slate-200/70 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                  >
                    File ke naam se title bharo
                  </button>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={onlyEmptyCards}
                    onChange={(e) => setOnlyEmptyCards(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                  />
                  <span>Sirf khaali wale cards me</span>
                </label>
              </div>
            </div>
          </div>

          {/* Cards Section / Post Cards Queue */}
          <div className="space-y-4">
            {bulkItems.length === 0 ? (
              <div className="py-14 px-4 rounded-3xl border-2 border-dashed border-[#E2E8F0] bg-white text-center space-y-3 shadow-2xs">
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
                      className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Re-Calculate Times</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 font-bold text-xs transition-colors cursor-pointer"
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
        </div>

        {/* RIGHT COLUMN (5 Cols, Sticky): Select Pages & Channels by Category + Account Grouping */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-6">
          {/* Card: Select Pages Sidebar (Exact layout & aesthetic from /composer) */}
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-black text-slate-900">Select Pages</h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-[#E2E8F0] text-[11px] font-bold text-slate-700">
                  {pages.length}
                </span>
              </div>

              {pages.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAllPages}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-black cursor-pointer"
                >
                  <span
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                      allPagesSelected
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-300'
                    }`}
                  >
                    {allPagesSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                  <span>Select All</span>
                </button>
              )}
            </div>

            {/* Quick Select by Category */}
            {categoriesWithCounts.length > 0 && (
              <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F8F9FA]/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-slate-400" />
                    <span>Quick Select by Category</span>
                  </span>
                  <Link
                    href="/categories"
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-900"
                  >
                    Manage
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPageIds([])}
                    className={`px-3 py-1 rounded-full border text-[11px] font-bold transition-all cursor-pointer ${
                      selectedPageIds.length === 0
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-[#E2E8F0] text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    None
                  </button>

                  {categoriesWithCounts.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategoryPages(cat.validIds, cat.allSelected)}
                      style={{
                        borderColor: cat.allSelected ? cat.color : undefined,
                        backgroundColor: cat.allSelected ? `${cat.color}18` : undefined,
                      }}
                      className={`px-3 py-1 rounded-full border text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        cat.allSelected
                          ? 'text-slate-900 shadow-2xs font-extrabold'
                          : 'bg-white border-[#E2E8F0] text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span>{cat.name}</span>
                      <span className="text-[10px] opacity-70 font-semibold">{cat.validIds.length}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search & Platform Filter */}
            {pages.length > 0 && (
              <div className="px-5 py-3 border-b border-[#E2E8F0] space-y-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pageSearch}
                    onChange={(e) => setPageSearch(e.target.value)}
                    placeholder="Search pages or channels..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                  />
                </div>

                {availablePlatforms.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPlatformFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                        platformFilter === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'bg-[#F8F9FA] text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All
                    </button>
                    {availablePlatforms.map((plat) => (
                      <button
                        key={plat}
                        type="button"
                        onClick={() => setPlatformFilter(plat)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize flex items-center gap-1 transition-colors cursor-pointer ${
                          platformFilter === plat
                            ? 'bg-slate-900 text-white'
                            : 'bg-[#F8F9FA] text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <SocialIcon platform={plat} className="w-3 h-3 rounded-xs" />
                        <span>{plat}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Account-Grouped Pages Checklist */}
            {pages.length === 0 ? (
              <div className="p-6 text-center space-y-2.5">
                <p className="text-xs font-bold text-slate-700">No channels connected yet</p>
                <p className="text-[11px] text-slate-400">
                  Connect your Facebook Pages, YouTube, or Telegram channels.
                </p>
                <Link
                  href="/accounts"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-2xs mt-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect Account</span>
                </Link>
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No pages match &ldquo;{pageSearch}&rdquo;
              </div>
            ) : (
              <div className="p-4 max-h-80 overflow-y-auto space-y-4">
                {groupedPages.map((group) => {
                  const allGroupChecked = group.pages.every((p) => selectedPageIds.includes(p.id));
                  return (
                    <div key={group.id} className="space-y-1.5">
                      <div className="px-2 flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
                          {group.accountName}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleAccountGroup(group.pages)}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                        >
                          {allGroupChecked ? 'Unselect' : 'Select all'}
                        </button>
                      </div>

                      <div className="space-y-1">
                        {group.pages.map((page) => {
                          const isSelected = selectedPageIds.includes(page.id);
                          return (
                            <div
                              key={page.id}
                              onClick={() => togglePageSelection(page.id)}
                              className={`px-3 py-2 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'bg-[#F8F9FA] border-slate-900/80 text-slate-900 font-bold shadow-2xs'
                                  : 'bg-white border-transparent hover:border-[#E2E8F0] hover:bg-[#F8F9FA]/60 text-slate-700 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                                    isSelected
                                      ? 'bg-slate-900 border-slate-900 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>

                                <div className="relative shrink-0">
                                  {page.avatarUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={page.avatarUrl}
                                      alt={page.name}
                                      className="w-7 h-7 rounded-full object-cover border border-[#E2E8F0]"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                                      {page.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <span className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 border border-[#E2E8F0]">
                                    <SocialIcon platform={page.platform} className="w-2.5 h-2.5" />
                                  </span>
                                </div>

                                <div className="min-w-0">
                                  <div className="truncate text-xs leading-tight">{page.name}</div>
                                  <div className="text-[10px] text-slate-400 capitalize flex items-center gap-1.5 mt-0.5">
                                    <span>{page.platform}</span>
                                    {page.category && (
                                      <>
                                        <span>•</span>
                                        <span className="truncate">{page.category}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Summary Bar */}
            <div className="px-5 py-3.5 border-t border-[#E2E8F0] bg-[#F8F9FA]">
              <div className="w-full py-2 px-3 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">
                  {selectedPageIds.length} page{selectedPageIds.length === 1 ? '' : 's'} selected
                </span>
                {platformBreakdown.length > 0 && (
                  <span className="text-[11px] font-semibold text-slate-500 capitalize">
                    {platformBreakdown.map(([plat, count]) => `${count} ${plat}`).join(' · ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Batch Execution Summary Card */}
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <CalendarClock className="w-4 h-4 text-slate-400" />
              <span>Batch Queue Summary</span>
            </div>

            <div className="space-y-2 text-xs text-slate-600 font-medium">
              <div className="flex items-center justify-between py-1 border-b border-[#F0F2F6]">
                <span className="text-slate-500">Total Posts in Batch:</span>
                <span className="font-bold text-slate-900">{bulkItems.length}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F0F2F6]">
                <span className="text-slate-500">Destinations Selected:</span>
                <span className="font-bold text-slate-900">{selectedPageIds.length} pages</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F0F2F6]">
                <span className="text-slate-500">Total Dispatches:</span>
                <span className="font-bold text-slate-900">{bulkItems.length * selectedPageIds.length}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Timeline Window:</span>
                <span className="font-bold text-slate-900">{batchDurationText}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isSchedulingAll || bulkItems.length === 0 || selectedPageIds.length === 0}
              onClick={handleScheduleAll}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              {isSchedulingAll ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Scheduling Batch...</span>
                </>
              ) : (
                <>
                  <CalendarClock className="w-4 h-4" />
                  <span>Schedule All ({bulkItems.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
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
              className="px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-950 disabled:opacity-50 font-black text-xs transition-all shadow-md flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
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
