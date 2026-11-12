'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { PostType, Platform, SocialPage } from '@/types';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { findSensitiveWords, sanitizeText } from '@/lib/utils/sensitive-words';
import {
  UploadCloud,
  Check,
  Clock,
  ShieldAlert,
  Send,
  Eye,
  RotateCw,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Link2,
  MessageSquare,
  CheckCircle2,
  Plus,
  ExternalLink,
  Search,
  Hash,
  Save,
  Sparkles,
  Play,
  Globe,
  ChevronLeft,
  ChevronRight,
  Eraser,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Share2,
  MoreHorizontal,
  Bookmark,
  Repeat,
  Key,
} from 'lucide-react';

const POST_TYPES: { id: PostType; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'text', label: 'Text', desc: 'Status update', icon: FileText },
  { id: 'image', label: 'Image', desc: 'Photo + caption', icon: ImageIcon },
  { id: 'video', label: 'Video', desc: 'Reel / Short', icon: VideoIcon },
  { id: 'link', label: 'Link', desc: 'Article share', icon: Link2 },
];

function getLocalDateTimeOffset(hoursAhead: number, fixedHour?: number): string {
  const date = new Date();
  if (typeof fixedHour === 'number') {
    if (hoursAhead >= 24) {
      date.setDate(date.getDate() + 1);
    } else if (date.getHours() >= fixedHour) {
      date.setDate(date.getDate() + 1);
    }
    date.setHours(fixedHour, 0, 0, 0);
  } else {
    date.setHours(date.getHours() + hoursAhead);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function ComposerPage() {
  return (
    <AppShell>
      <ComposerContent />
    </AppShell>
  );
}

function ComposerContent() {
  const router = useRouter();
  const { pages, accounts, categories, settings, createPost } = useApp();

  // Selected Destinations (Page IDs)
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>(
    pages.filter((p) => p.isActive).map((p) => p.id)
  );

  // Post Content
  const [postType, setPostType] = useState<PostType>('text');
  const [message, setMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [mediaMode, setMediaMode] = useState<'upload' | 'url'>('upload');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFileName, setMediaFileName] = useState<string | null>(null);

  // Scheduling
  const [isScheduleMode, setIsScheduleMode] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // Right Sidebar Filters & Preview
  const [pageSearch, setPageSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [showPreview, setShowPreview] = useState(true);

  // Status & Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishingMessage, setPublishingMessage] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    text: string;
    postUrl?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sensitive Words Check
  const detectedSensitiveWords = useMemo(() => findSensitiveWords(message), [message]);

  // Platforms present in connected pages
  const availablePlatforms = useMemo(() => {
    const set = new Set<Platform>();
    pages.forEach((p) => set.add(p.platform));
    return Array.from(set);
  }, [pages]);

  // Filtered pages for right panel
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

  // Group filtered pages by parent account
  const groupedPages = useMemo(() => {
    const groups = new Map<string, { accountName: string; platform?: Platform; pages: SocialPage[] }>();

    filteredPages.forEach((page) => {
      const acc = accounts.find((a) => a.id === page.accountId);
      const key = acc ? acc.id : `other_${page.platform}`;
      const accountName = acc ? acc.name : `${page.platform} channels`;
      if (!groups.has(key)) {
        groups.set(key, { accountName, platform: acc?.platform || page.platform, pages: [] });
      }
      groups.get(key)!.pages.push(page);
    });

    return Array.from(groups.entries()).map(([id, data]) => ({ id, ...data }));
  }, [filteredPages, accounts]);

  // Category quick-select helpers
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

  // Collect hashtags from categories linked to currently selected pages
  const suggestedHashtags = useMemo(() => {
    const tags = new Set<string>();
    categories.forEach((cat) => {
      const touchesSelected = cat.pageIds.some((pid) => selectedPageIds.includes(pid));
      if (touchesSelected) {
        cat.tags.forEach((t) => tags.add(t.startsWith('#') ? t : `#${t}`));
      }
    });
    return Array.from(tags);
  }, [categories, selectedPageIds]);

  // Selected pages summary
  const selectedPagesList = useMemo(
    () => pages.filter((p) => selectedPageIds.includes(p.id)),
    [pages, selectedPageIds]
  );

  const platformBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedPagesList.forEach((p) => {
      counts[p.platform] = (counts[p.platform] || 0) + 1;
    });
    return Object.entries(counts);
  }, [selectedPagesList]);

  const [previewPlatform, setPreviewPlatform] = useState<Platform>('facebook');

  const previewPage = useMemo(() => {
    const matchSelected = selectedPagesList.find((p) => p.platform === previewPlatform);
    if (matchSelected) return matchSelected;
    const matchConnected = pages.find((p) => p.platform === previewPlatform);
    if (matchConnected) return matchConnected;
    return selectedPagesList[0] || pages[0];
  }, [selectedPagesList, pages, previewPlatform]);

  const allSelected = pages.length > 0 && pages.every((p) => selectedPageIds.includes(p.id));

  // Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFileName(file.name);
    if (file.type.startsWith('video/')) {
      setPostType('video');
    } else {
      setPostType('image');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setMediaUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaUrl('');
    setMediaFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const togglePageSelection = (id: string) => {
    setSelectedPageIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedPageIds([]);
    } else {
      setSelectedPageIds(pages.map((p) => p.id));
    }
  };

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

  const handleInsertHashtags = () => {
    if (suggestedHashtags.length === 0) return;
    const missing = suggestedHashtags.filter((tag) => !message.includes(tag));
    if (missing.length === 0) return;
    const prefix = message.trim() ? `${message.trimEnd()}\n\n` : '';
    setMessage(`${prefix}${missing.join(' ')}`);
  };

  const handleMoveLinkToComment = () => {
    if (!linkUrl.trim()) return;
    const clean = linkUrl.trim();
    if (!firstComment.includes(clean)) {
      setFirstComment((prev) => (prev.trim() ? `${prev.trim()} ${clean}` : `Read more: ${clean}`));
    }
    setLinkUrl('');
  };

  const handleResetForm = () => {
    setMessage('');
    setLinkUrl('');
    setFirstComment('');
    removeMedia();
    setScheduledDateTime('');
    setIsScheduleMode(false);
    setStatusBanner(null);
  };

  const handlePublish = async (mode: 'now' | 'schedule' | 'draft') => {
    setStatusBanner(null);

    const activeMediaUrl = postType === 'image' || postType === 'video' ? mediaUrl.trim() : '';
    const activeLinkUrl = postType === 'link' ? linkUrl.trim() : '';
    const intervalMin = settings?.pageIntervalMinSeconds ?? 0;
    const intervalMax = settings?.pageIntervalMaxSeconds ?? 0;

    if (mode !== 'draft') {
      if (!message.trim() && !activeMediaUrl && !activeLinkUrl) {
        setStatusBanner({
          type: 'error',
          text: 'Please enter a caption/message, attach media, or add a link before publishing.',
        });
        return;
      }
      if (selectedPageIds.length === 0) {
        setStatusBanner({
          type: 'error',
          text: 'Please select at least one Page or Channel from the right panel.',
        });
        return;
      }
      if (mode === 'schedule' && !scheduledDateTime) {
        setStatusBanner({
          type: 'error',
          text: 'Please choose a future date and time to schedule this post.',
        });
        return;
      }
    }

    setIsSubmitting(true);

    if (mode === 'draft') {
      createPost({
        postType,
        message,
        mediaUrl: activeMediaUrl || undefined,
        linkUrl: activeLinkUrl || undefined,
        commentText: firstComment.trim() || undefined,
        intervalMinSeconds: intervalMin,
        intervalMaxSeconds: intervalMax,
        pageIds: selectedPageIds,
        status: 'draft',
      });
      setIsSubmitting(false);
      setStatusBanner({
        type: 'success',
        text: 'Draft saved! Opening Dashboard...',
      });
      setTimeout(() => router.push('/dashboard'), 1000);
      return;
    }

    if (mode === 'schedule') {
      createPost({
        postType,
        message,
        mediaUrl: activeMediaUrl || undefined,
        linkUrl: activeLinkUrl || undefined,
        commentText: firstComment.trim() || undefined,
        intervalMinSeconds: intervalMin,
        intervalMaxSeconds: intervalMax,
        pageIds: selectedPageIds,
        status: 'scheduled',
        scheduledAt: scheduledDateTime,
      });
      setIsSubmitting(false);
      setStatusBanner({
        type: 'success',
        text: 'Post scheduled successfully! Returning to Dashboard...',
      });
      setTimeout(() => router.push('/dashboard'), 1200);
      return;
    }

    // Immediate live publish
    setPublishingMessage(`Broadcasting to ${selectedPageIds.length} destination(s)...`);
    const targetPages = pages.filter((p) => selectedPageIds.includes(p.id));

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postType,
          message,
          mediaUrl: activeMediaUrl || undefined,
          linkUrl: activeLinkUrl || undefined,
          commentText: firstComment.trim() || undefined,
          targets: targetPages.map((p) => {
            const acc = accounts.find((a) => a.id === p.accountId);
            return {
              id: p.id,
              platform: p.platform,
              name: p.name,
              pageId: p.pageId,
              botToken: p.botToken || acc?.botToken,
              chatId: p.chatId || p.pageId,
              accessToken: p.accessToken || acc?.accessToken,
            };
          }),
        }),
      });

      const data = await res.json();

      createPost({
        postType,
        message,
        mediaUrl: activeMediaUrl || undefined,
        linkUrl: activeLinkUrl || undefined,
        commentText: firstComment.trim() || undefined,
        intervalMinSeconds: intervalMin,
        intervalMaxSeconds: intervalMax,
        pageIds: selectedPageIds,
        status: data.overallStatus || 'published',
        results: data.results,
      });

      const hasFailed = data.results?.some((r: any) => r.status === 'failed');
      const allFailed = data.results?.length > 0 && data.results?.every((r: any) => r.status === 'failed');

      setIsSubmitting(false);
      setPublishingMessage(null);

      if (allFailed) {
        setStatusBanner({
          type: 'error',
          text: data.results[0]?.error || 'Failed to publish to selected channels.',
        });
        return;
      }

      if (hasFailed) {
        setStatusBanner({
          type: 'error',
          text: 'Published with warnings: Some destinations failed (e.g. token expired). Redirecting to Dashboard...',
        });
        setTimeout(() => router.push('/dashboard'), 2500);
        return;
      }

      setStatusBanner({
        type: 'success',
        text: 'Post published across all selected channels! Returning to Dashboard...',
        postUrl: data.results?.find((r: { postUrl?: string }) => r.postUrl)?.postUrl,
      });

      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch {
      createPost({
        postType,
        message,
        mediaUrl: activeMediaUrl || undefined,
        linkUrl: activeLinkUrl || undefined,
        commentText: firstComment.trim() || undefined,
        intervalMinSeconds: intervalMin,
        intervalMaxSeconds: intervalMax,
        pageIds: selectedPageIds,
        status: 'published',
      });
      setIsSubmitting(false);
      setPublishingMessage(null);
      setStatusBanner({
        type: 'success',
        text: 'Post queued for delivery! Returning to Dashboard...',
      });
      setTimeout(() => {
        router.push('/dashboard');
      }, 1400);
    }
  };

  return (
    <div className="space-y-4 font-sans max-w-6xl mx-auto animate-fade-in pb-12">
      {/* 1. Studio Header (Compact Modern Studio) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
            Create New Post
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">
            Choose post format, craft your caption &amp; first comment, pick categories or pages, and publish safely.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8F9FA] text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] text-xs font-bold text-slate-800 shadow-2xs">
            <span
              className={`w-2 h-2 rounded-full ${
                selectedPageIds.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
            <span>{selectedPageIds.length} Pages Selected</span>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      {statusBanner && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-4 animate-fade-in shadow-2xs ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{statusBanner.text}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {statusBanner.type === 'error' && (
              <Link
                href="/pages"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-300 hover:bg-rose-100 text-rose-900 font-bold text-xs transition-colors shadow-2xs"
              >
                <Key className="w-3.5 h-3.5 text-rose-700" />
                <span>Renew Token in Pages</span>
              </Link>
            )}
            {statusBanner.postUrl && (
              <a
                href={statusBanner.postUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline text-emerald-950 font-bold shrink-0"
              >
                <span>View Live Post</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Main 2-Column Workspace (Left: Composer Form | Right: Select Pages + Live Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* LEFT COLUMN (7 Cols): Composer Card */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-2xs space-y-6">
          {/* 1. Post Type Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Post Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {POST_TYPES.map((type) => {
                const Icon = type.icon;
                const active = postType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setPostType(type.id)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      active
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-[#F8F9FA] border-[#E2E8F0] text-slate-700 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        active ? 'bg-white/15 text-white' : 'bg-white border border-[#E2E8F0] text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold leading-tight">{type.label}</div>
                      <div
                        className={`text-[10px] truncate mt-0.5 ${
                          active ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        {type.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional Media Upload / URL (for Image or Video) */}
          {(postType === 'image' || postType === 'video') && (
            <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-3.5 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  {postType === 'video' ? (
                    <VideoIcon className="w-4 h-4 text-slate-600" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-slate-600" />
                  )}
                  <span>{postType === 'video' ? 'Attach Video / Reel' : 'Attach Image'}</span>
                </span>

                <div className="flex items-center gap-2">
                  <div className="inline-flex p-0.5 rounded-xl bg-white border border-[#E2E8F0] text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setMediaMode('upload')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        mediaMode === 'upload'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaMode('url')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        mediaMode === 'url'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Paste URL
                    </button>
                  </div>

                  {mediaUrl && (
                    <button
                      type="button"
                      onClick={removeMedia}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 px-2 py-1"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept={postType === 'video' ? 'video/*' : 'image/*'}
                className="hidden"
              />

              {mediaMode === 'url' ? (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => {
                      setMediaUrl(e.target.value);
                      setMediaFileName(null);
                    }}
                    placeholder={
                      postType === 'video'
                        ? 'https://example.com/video.mp4'
                        : 'https://example.com/news-banner.jpg'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Public HTTPS URL works best for live Facebook Page &amp; Telegram publishing.
                  </p>
                </div>
              ) : mediaUrl ? (
                <div className="rounded-2xl border border-[#E2E8F0] bg-slate-50 p-3 space-y-2.5">
                  <div className="relative rounded-xl overflow-hidden max-h-72 w-full bg-slate-950/5 border border-[#E2E8F0] flex items-center justify-center p-2">
                    {postType === 'video' ? (
                      <video src={mediaUrl} controls className="max-h-68 w-auto rounded-lg object-contain" />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={mediaUrl} alt="Upload preview" className="max-h-68 w-auto rounded-lg object-contain" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-mono text-[11px] text-slate-600 truncate max-w-[200px]">
                      {mediaFileName || 'Attached File'}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] font-bold text-slate-700 hover:text-slate-900 underline"
                      >
                        Change file
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMediaUrl('');
                          setMediaFileName('');
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="py-6 px-4 border-2 border-dashed border-[#E2E8F0] hover:border-slate-400 rounded-xl cursor-pointer text-center space-y-2 transition-colors bg-white"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-slate-700 mx-auto flex items-center justify-center">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Click to upload {postType === 'video' ? 'video (MP4, MOV)' : 'image (JPG, PNG, WebP)'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Or switch to &ldquo;Paste URL&rdquo; for direct CDN image/video links
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conditional Link URL Input (for Link post type) */}
          {postType === 'link' && (
            <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-slate-600" />
                  <span>Destination Link URL</span>
                </label>
                {linkUrl.trim() && (
                  <button
                    type="button"
                    onClick={handleMoveLinkToComment}
                    className="text-[11px] font-bold text-slate-700 hover:text-black underline"
                  >
                    Move to First Comment (Anti-Ban)
                  </button>
                )}
              </div>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://khabarmonkey.com/breaking-news-article"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-500"
              />
              <p className="text-[11px] text-slate-500">
                Tip: Moving links into the First Comment helps avoid Meta feed reach throttling.
              </p>
            </div>
          )}

          {/* 2. Message / Caption */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Message / Caption
              </label>

              <div className="flex items-center gap-2.5">
                <span
                  className={`text-[11px] font-semibold ${
                    message.length > 1024 ? 'text-amber-600' : 'text-slate-400'
                  }`}
                >
                  {message.length} characters
                  {message.length > 1024 ? ' (TG caption limit: 1024)' : ''}
                </span>

                {suggestedHashtags.length > 0 && (
                  <button
                    type="button"
                    onClick={handleInsertHashtags}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F8F9FA] hover:bg-slate-200/70 border border-[#E2E8F0] text-[11px] font-bold text-slate-700 transition-colors"
                    title="Insert default hashtags from selected categories"
                  >
                    <Hash className="w-3 h-3 text-slate-500" />
                    <span>Add Category Tags ({suggestedHashtags.length})</span>
                  </button>
                )}

                {message.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMessage('')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                    title="Clear caption"
                  >
                    <Eraser className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your post message here..."
              className="w-full p-4 rounded-2xl border border-[#E2E8F0] text-xs sm:text-[13px] leading-relaxed text-slate-900 placeholder:text-slate-400 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 transition-all font-medium"
            />

            {/* Anti-Ban Sensitive Word Scanner Notice */}
            {detectedSensitiveWords.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start justify-between gap-3 animate-fade-in">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Sensitive Words Detected: </span>
                    <span className="font-semibold text-amber-700">
                      [{detectedSensitiveWords.join(', ')}]
                    </span>
                    <p className="text-[11px] text-amber-800/80 mt-0.5 leading-relaxed">
                      Meta spam filters may flag these terms. Sanitize safely with zero-width breaks.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMessage(sanitizeText(message))}
                  className="px-3 py-1.5 rounded-xl bg-amber-200/70 hover:bg-amber-200 text-amber-950 font-bold text-[11px] shrink-0 transition-colors"
                >
                  Auto-Sanitize
                </button>
              </div>
            )}
          </div>

          {/* 3. First Comment (optional) */}
          <div className="space-y-2.5 pt-1 border-t border-[#E2E8F0]">
            <div className="flex flex-wrap items-baseline justify-between gap-2 pt-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span>First Comment (optional)</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                Posted as the first comment after publishing
              </span>
            </div>

            <textarea
              rows={3}
              value={firstComment}
              onChange={(e) => setFirstComment(e.target.value)}
              placeholder="Optional: add a comment or cloaked article link to the post..."
              className="w-full p-3.5 rounded-2xl border border-[#E2E8F0] text-xs leading-relaxed text-slate-900 placeholder:text-slate-400 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 transition-all font-medium"
            />
          </div>

          {/* 4. When to Publish + Anti-Ban Interval */}
          <div className="space-y-5 pt-4 border-t border-[#E2E8F0]">
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                When to Publish
              </label>

              <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsScheduleMode(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    !isScheduleMode
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Publish Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsScheduleMode(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    isScheduleMode
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Schedule</span>
                </button>
              </div>

              {isScheduleMode && (
                <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-3 animate-fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-700">
                      Select Date &amp; Time
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setScheduledDateTime(getLocalDateTimeOffset(1))}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:border-slate-400 text-[11px] font-semibold text-slate-700"
                      >
                        +1 Hour
                      </button>
                      <button
                        type="button"
                        onClick={() => setScheduledDateTime(getLocalDateTimeOffset(0, 20))}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:border-slate-400 text-[11px] font-semibold text-slate-700"
                      >
                        8:00 PM
                      </button>
                      <button
                        type="button"
                        onClick={() => setScheduledDateTime(getLocalDateTimeOffset(24, 9))}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:border-slate-400 text-[11px] font-semibold text-slate-700"
                      >
                        Tomorrow 9 AM
                      </button>
                    </div>
                  </div>
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-slate-900 bg-white focus:outline-none focus:border-slate-500 font-medium"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 5. Footer Action Buttons */}
          <div className="pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={isSubmitting || selectedPageIds.length === 0}
                onClick={() => handlePublish(isScheduleMode ? 'schedule' : 'now')}
                className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>{publishingMessage || 'Processing...'}</span>
                  </>
                ) : isScheduleMode ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Schedule Post ({selectedPageIds.length})</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Publish Now ({selectedPageIds.length})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handlePublish('draft')}
                className="px-4 py-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>Save Draft</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols): Live Preview (Top) + Select Pages Sidebar */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-6">
          {/* Card 1: Live Social Preview (Placed at the top for immediate visual feedback) */}
          {showPreview && (
            <div className="bg-white rounded-3xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4 animate-fade-in">
              {/* Header with Live Preview Title & Platform Switcher Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-xs font-black tracking-wider text-slate-900 uppercase">
                    Live Preview
                  </span>
                </div>

                {/* Platform Toggle Tabs with Official Logos Only (No Names) */}
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0]">
                  {(
                    [
                      { id: 'facebook', label: 'Facebook' },
                      { id: 'youtube', label: 'YouTube' },
                      { id: 'instagram', label: 'Instagram' },
                      { id: 'telegram', label: 'Telegram' },
                      { id: 'threads', label: 'Threads' },
                      { id: 'wordpress', label: 'WordPress' },
                    ] as const
                  ).map((plat) => {
                    const isActive = previewPlatform === plat.id;
                    return (
                      <button
                        key={plat.id}
                        type="button"
                        onClick={() => setPreviewPlatform(plat.id as Platform)}
                        title={plat.label}
                        aria-label={plat.label}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          isActive
                            ? 'bg-white shadow-xs border border-[#CBD5E1] scale-105'
                            : 'hover:bg-white/70 border border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <SocialIcon platform={plat.id} className="w-5 h-5 rounded-xs shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PLATFORM SPECIFIC PREVIEWS */}
              {previewPlatform === 'facebook' && (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs space-y-3 p-4">
                  {/* Author Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {previewPage?.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={previewPage.avatarUrl}
                          alt={previewPage.name}
                          className="w-10 h-10 rounded-full object-cover border border-[#E2E8F0]"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                          {previewPage?.name?.charAt(0) || 'F'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {previewPage?.name || 'Facebook Page'}
                          </span>
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[9px] font-bold">
                            ✓
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{isScheduleMode && scheduledDateTime ? 'Scheduled' : 'Just now'}</span>
                          <span>•</span>
                          <Globe className="w-3 h-3 text-slate-400" />
                        </div>
                      </div>
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* Caption */}
                  <p className="text-[13px] text-slate-900 leading-relaxed whitespace-pre-line font-normal break-words">
                    {message || 'Your Facebook post caption will appear here in real-time as you compose...'}
                  </p>

                  {/* Link Card Preview */}
                  {postType === 'link' && linkUrl.trim() && (
                    <div className="rounded-xl border border-[#E2E8F0] overflow-hidden bg-[#F8F9FA]">
                      <div className="p-3 border-b border-[#E2E8F0] flex items-center gap-2 text-slate-500 text-xs">
                        <Link2 className="w-4 h-4" />
                        <span className="font-mono text-[11px] truncate">{linkUrl}</span>
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-bold text-slate-900 line-clamp-1">Shared Article Link</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Click preview to visit original webpage</p>
                      </div>
                    </div>
                  )}

                  {/* Media (Uncropped full aspect container) */}
                  {(postType === 'image' || postType === 'video') && mediaUrl && (
                    <div className="rounded-xl overflow-hidden border border-[#E2E8F0] bg-slate-950/5 flex items-center justify-center p-1">
                      {postType === 'video' ? (
                        <video src={mediaUrl} controls className="max-h-[380px] w-auto max-w-full rounded-lg object-contain" />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={mediaUrl}
                          alt="Post preview"
                          className="max-h-[380px] w-auto max-w-full rounded-lg object-contain shadow-xs"
                        />
                      )}
                    </div>
                  )}

                  {/* Reactions Summary */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 pb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center -space-x-1">
                        <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center border border-white">👍</span>
                        <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center border border-white">❤️</span>
                        <span className="w-4 h-4 rounded-full bg-amber-400 text-white text-[9px] flex items-center justify-center border border-white">😮</span>
                      </div>
                      <span className="font-semibold text-slate-600">428</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>24 comments</span>
                      <span>•</span>
                      <span>12 shares</span>
                    </div>
                  </div>

                  {/* Facebook Action Buttons */}
                  <div className="grid grid-cols-3 border-t border-b border-[#E2E8F0] py-1 text-slate-600 text-xs font-semibold">
                    <button type="button" className="py-1.5 flex items-center justify-center gap-1.5 hover:bg-slate-50 rounded-lg">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Like</span>
                    </button>
                    <button type="button" className="py-1.5 flex items-center justify-center gap-1.5 hover:bg-slate-50 rounded-lg">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Comment</span>
                    </button>
                    <button type="button" className="py-1.5 flex items-center justify-center gap-1.5 hover:bg-slate-50 rounded-lg">
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                  </div>

                  {/* Pinned First Comment */}
                  {firstComment.trim() && (
                    <div className="flex items-start gap-2 pt-1">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {previewPage?.name?.charAt(0) || 'F'}
                      </div>
                      <div className="bg-[#F0F2F5] rounded-2xl p-2.5 text-xs space-y-0.5 flex-1">
                        <div className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                          <span>{previewPage?.name || 'Page'}</span>
                          <span className="text-[9px] bg-slate-200 text-slate-700 px-1 rounded-sm font-semibold">Author</span>
                        </div>
                        <p className="text-slate-800 text-xs whitespace-pre-line">{firstComment}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {previewPlatform === 'youtube' && (
                <div className="bg-[#0f0f0f] text-white rounded-2xl border border-slate-800 overflow-hidden shadow-xs space-y-3 p-4">
                  {/* Channel Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {previewPage?.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={previewPage.avatarUrl}
                          alt={previewPage.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-red-600/40"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                          {previewPage?.name?.charAt(0) || 'Y'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">
                            {previewPage?.name || 'YouTube Channel'}
                          </span>
                          <span className="w-3.5 h-3.5 rounded-full bg-slate-700 text-white text-[9px] flex items-center justify-center font-bold">
                            ✓
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          @{previewPage?.name?.toLowerCase().replace(/\s+/g, '') || 'channel'} • YouTube
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-full bg-[#cc0000] hover:bg-red-600 text-white text-xs font-bold tracking-wide transition-colors shrink-0"
                    >
                      Subscribe
                    </button>
                  </div>

                  {/* Video / Media Player Container */}
                  <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center min-h-[220px] border border-white/10">
                    {(postType === 'video' || postType === 'image') && mediaUrl ? (
                      postType === 'video' ? (
                        <video
                          src={mediaUrl}
                          controls
                          className="max-h-[380px] w-auto max-w-full rounded-lg object-contain"
                        />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={mediaUrl}
                          alt="YouTube video thumbnail"
                          className="max-h-[380px] w-auto max-w-full rounded-lg object-contain"
                        />
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center">
                          <Play className="w-6 h-6 fill-red-500" />
                        </div>
                        <p className="text-xs text-slate-300 font-medium">Video / Short Preview</p>
                        <p className="text-[11px] text-slate-500 max-w-xs">
                          Upload an MP4 or image to preview as a YouTube Short / Video
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Video Title & Details */}
                  <div className="space-y-1.5 pt-1">
                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
                      {message?.split('\n')[0] || 'Your YouTube Video Title / Description'}
                    </h3>
                    <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed line-clamp-3 font-normal">
                      {message || 'Description, tags, and links will be visible in the YouTube video description box.'}
                    </p>
                  </div>

                  {/* YouTube Action Buttons */}
                  <div className="flex items-center justify-between pt-1 pb-1 border-t border-b border-white/10 text-xs text-slate-300">
                    <div className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1.5">
                      <button type="button" className="flex items-center gap-1.5 hover:text-white font-semibold pr-2 border-r border-white/20">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>1.2K</span>
                      </button>
                      <button type="button" className="pl-1 hover:text-white">
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button type="button" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5 font-semibold">
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>

                    <button type="button" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5 font-semibold">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Comments</span>
                    </button>
                  </div>

                  {/* Pinned Auto-Comment */}
                  {firstComment.trim() && (
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <span>📌</span>
                        <span className="font-semibold text-slate-300">Pinned by {previewPage?.name || 'Creator'}</span>
                      </div>
                      <p className="text-slate-200 whitespace-pre-line pl-4">{firstComment}</p>
                    </div>
                  )}
                </div>
              )}

              {previewPlatform === 'telegram' && (
                <div className="bg-[#0e1621] text-white rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#2AABEE] flex items-center justify-center text-white font-bold text-xs">
                        ✈️
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1">
                          <span>{previewPage?.name || 'Telegram Channel'}</span>
                          <span className="text-[#2AABEE]">✓</span>
                        </div>
                        <div className="text-[10px] text-slate-400">broadcast channel</div>
                      </div>
                    </div>
                  </div>

                  {/* Telegram Message Bubble */}
                  <div className="bg-[#182533] rounded-2xl p-3 border border-slate-700/60 space-y-2.5 max-w-sm ml-auto">
                    {(postType === 'image' || postType === 'video') && mediaUrl && (
                      <div className="rounded-xl overflow-hidden bg-black/40 flex items-center justify-center">
                        {postType === 'video' ? (
                          <video src={mediaUrl} controls className="max-h-[320px] w-auto max-w-full rounded-lg object-contain" />
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={mediaUrl}
                            alt="Telegram preview"
                            className="max-h-[320px] w-auto max-w-full rounded-lg object-contain"
                          />
                        )}
                      </div>
                    )}

                    <p className="text-xs text-slate-100 whitespace-pre-line leading-relaxed">
                      {message || 'Your Telegram channel post will appear here...'}
                    </p>

                    <div className="flex items-center justify-end gap-1.5 text-[10px] text-slate-400 pt-1">
                      <span>👁 1.4K</span>
                      <span>•</span>
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {firstComment.trim() && (
                    <div className="bg-[#182533]/80 rounded-xl p-2.5 text-xs text-slate-300 border border-slate-700 flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-[#2AABEE]" />
                      <span className="truncate">Auto Comment: {firstComment}</span>
                    </div>
                  )}
                </div>
              )}

              {previewPlatform === 'instagram' && (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs space-y-3">
                  {/* IG Header */}
                  <div className="flex items-center justify-between p-3 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full p-0.5 bg-linear-to-tr from-amber-500 via-rose-500 to-purple-600">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-xs text-slate-900">
                          {previewPage?.name?.charAt(0) || 'I'}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-900">
                        {previewPage?.name?.toLowerCase().replace(/\s+/g, '_') || 'instagram_account'}
                      </span>
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* IG Media (Uncropped) */}
                  <div className="bg-slate-950/5 flex items-center justify-center min-h-[220px]">
                    {(postType === 'image' || postType === 'video') && mediaUrl ? (
                      postType === 'video' ? (
                        <video src={mediaUrl} controls className="max-h-[380px] w-auto max-w-full object-contain" />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={mediaUrl}
                          alt="Instagram preview"
                          className="max-h-[380px] w-auto max-w-full object-contain"
                        />
                      )
                    ) : (
                      <div className="text-xs text-slate-400 py-12 text-center">
                        Upload an image or video to view Instagram preview
                      </div>
                    )}
                  </div>

                  {/* IG Action Icons */}
                  <div className="px-3 space-y-2 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Heart className="w-5 h-5 text-rose-500 fill-rose-500 cursor-pointer" />
                        <MessageSquare className="w-5 h-5 text-slate-800 cursor-pointer" />
                        <Share2 className="w-5 h-5 text-slate-800 cursor-pointer" />
                      </div>
                      <Bookmark className="w-5 h-5 text-slate-800 cursor-pointer" />
                    </div>

                    <div className="text-xs font-bold text-slate-900">
                      Liked by creators and 892 others
                    </div>

                    <p className="text-xs text-slate-800 leading-snug">
                      <strong className="font-bold mr-1.5">
                        {previewPage?.name?.toLowerCase().replace(/\s+/g, '_') || 'instagram_account'}
                      </strong>
                      <span className="whitespace-pre-line font-normal">{message}</span>
                    </p>

                    {firstComment.trim() && (
                      <p className="text-[11px] text-slate-500 font-medium pt-0.5">
                        <span className="font-bold text-slate-700">First comment:</span> {firstComment}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {previewPlatform === 'threads' && (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs p-4 space-y-3">
                  {/* Threads Author Bar */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative">
                        {previewPage?.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={previewPage.avatarUrl}
                            alt={previewPage.name}
                            className="w-10 h-10 rounded-full object-cover border border-[#E2E8F0]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">
                            {previewPage?.name?.charAt(0) || 'T'}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black text-white flex items-center justify-center text-[9px] border border-white font-bold">
                          @
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {previewPage?.name?.toLowerCase().replace(/\s+/g, '_') || 'threads_user'}
                          </span>
                          <span className="text-[11px] text-slate-400">• Just now</span>
                        </div>
                        <div className="text-[11px] text-slate-400">Threads</div>
                      </div>
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* Caption / Thread Text */}
                  <p className="text-[13px] text-slate-900 leading-relaxed whitespace-pre-line font-normal break-words">
                    {message || 'What’s new? Start your thread here in real-time...'}
                  </p>

                  {/* Media */}
                  {(postType === 'image' || postType === 'video') && mediaUrl && (
                    <div className="rounded-2xl overflow-hidden border border-[#E2E8F0] bg-slate-950/5 flex items-center justify-center p-1">
                      {postType === 'video' ? (
                        <video src={mediaUrl} controls className="max-h-[380px] w-auto max-w-full rounded-xl object-contain" />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={mediaUrl}
                          alt="Threads preview"
                          className="max-h-[380px] w-auto max-w-full rounded-xl object-contain shadow-xs"
                        />
                      )}
                    </div>
                  )}

                  {/* Threads Action Icons */}
                  <div className="flex items-center gap-4 text-slate-800 pt-1">
                    <Heart className="w-4.5 h-4.5 cursor-pointer hover:text-rose-500 transition-colors" />
                    <MessageSquare className="w-4.5 h-4.5 cursor-pointer hover:text-slate-900 transition-colors" />
                    <Repeat className="w-4.5 h-4.5 cursor-pointer hover:text-emerald-600 transition-colors" />
                    <Share2 className="w-4.5 h-4.5 cursor-pointer hover:text-slate-900 transition-colors" />
                  </div>

                  {/* Threads Stats */}
                  <div className="text-[11px] text-slate-400 pt-1">
                    <span>14 replies</span>
                    <span className="mx-1.5">•</span>
                    <span>128 likes</span>
                  </div>

                  {/* Thread Reply / First Comment */}
                  {firstComment.trim() && (
                    <div className="relative pl-6 pt-2 border-t border-slate-100 space-y-1">
                      <div className="absolute left-2.5 top-0 bottom-4 w-0.5 bg-slate-200" />
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                        <span>@{previewPage?.name?.toLowerCase().replace(/\s+/g, '_') || 'threads_user'}</span>
                        <span className="text-[10px] text-slate-400 font-normal">reply</span>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-line">{firstComment}</p>
                    </div>
                  )}
                </div>
              )}

              {/* WordPress Blog Post Preview */}
              {previewPlatform === 'wordpress' && (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs p-4 space-y-3.5">
                  {/* Top WP Site Banner */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#21759B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        W
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900 truncate flex items-center gap-1">
                          <span>{previewPage?.name || 'WordPress Portal'}</span>
                          <span className="text-[10px] text-emerald-600 font-bold">● Live</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {previewPage?.siteUrl || 'https://himachalsamachar.com'}
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold shrink-0">
                      <span>⚡ Auto Engine v7.5</span>
                    </span>
                  </div>

                  {/* Category & Timestamp */}
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase tracking-wider">
                      {previewPage?.category || 'News Update'}
                    </span>
                    <span className="text-[11px] text-slate-400">• Just now</span>
                    <span className="text-[11px] text-slate-400">• 3 min read</span>
                  </div>

                  {/* Article Title */}
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug break-words">
                    {message?.split('\n')[0] || 'Your Article Headline Will Appear Here...'}
                  </h3>

                  {/* Author Byline */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">By {previewPage?.name || 'Editorial Staff'}</span>
                    <span>•</span>
                    <span>Verified Publisher</span>
                  </div>

                  {/* Featured Image Container */}
                  {(postType === 'image' || postType === 'video') && mediaUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-[#E2E8F0] bg-slate-950/5 flex items-center justify-center p-1">
                      {postType === 'video' ? (
                        <video src={mediaUrl} controls className="max-h-[340px] w-auto max-w-full rounded-lg object-contain" />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={mediaUrl}
                          alt="WordPress featured image"
                          className="max-h-[340px] w-auto max-w-full rounded-lg object-contain shadow-xs"
                        />
                      )}
                      <div className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span>💧 Watermark Active</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-[#F8F9FA] text-center text-xs text-slate-400">
                      Optional: Add image to display as WordPress Featured Image
                    </div>
                  )}

                  {/* Article Body Excerpt */}
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-normal break-words space-y-1.5">
                    <p>{message || 'Article content and paragraphs will be published directly to your WordPress posts table with automated SEO formatting and content cleaning.'}</p>
                  </div>

                  {/* Pinned Note / First Comment */}
                  {firstComment.trim() && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-0.5">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-amber-800">📌 Editor Update / Note:</span>
                      <p className="text-amber-950 whitespace-pre-line">{firstComment}</p>
                    </div>
                  )}

                  {/* Footer Bar */}
                  <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-slate-500">
                    <span className="text-[11px] font-semibold text-[#21759B]">🔗 wp-admin/post.php</span>
                    <button type="button" className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition-colors">
                      Read Full Post ↗
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card 2: Select Pages (Quick Select by Category + Account Grouping) */}
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
                  onClick={toggleSelectAll}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-black cursor-pointer"
                >
                  <span
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                      allSelected
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-300'
                    }`}
                  >
                    {allSelected && <Check className="w-3 h-3 stroke-[3]" />}
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
                          ? 'text-slate-900 shadow-2xs'
                          : 'bg-white border-[#E2E8F0] text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span>{cat.name}</span>
                      <span className="text-[10px] opacity-70">{cat.validIds.length}</span>
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
                  Connect your Facebook Pages, YouTube, or Telegram channels to start broadcasting.
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
        </div>
      </div>
    </div>
  );
}
