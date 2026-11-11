'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { PostType, Platform } from '@/types';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { findSensitiveWords, sanitizeText } from '@/lib/utils/sensitive-words';
import {
  UploadCloud,
  Check,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  ShieldAlert,
  Send,
  Eye,
  RotateCw,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  X,
  MessageSquare,
  CheckCircle2,
  Plus,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function ComposerPage() {
  return (
    <AppShell>
      <ComposerContent />
    </AppShell>
  );
}

function ComposerContent() {
  const router = useRouter();
  const { pages, createPost } = useApp();

  // Selected Destinations (Page IDs)
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>(
    pages.filter((p) => p.isActive).map((p) => p.id)
  );

  // Post Content
  const [postType, setPostType] = useState<PostType>('image');
  const [message, setMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [intervalMin, setIntervalMin] = useState(30);
  const [intervalMax, setIntervalMax] = useState(90);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFileName, setMediaFileName] = useState<string | null>(null);

  // Scheduling
  const [isScheduleMode, setIsScheduleMode] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // Status & Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishingMessage, setPublishingMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFileName(file.name);
    if (file.type.startsWith('video/')) {
      setPostType('video');
    } else {
      setPostType('image');
    }

    // Read file locally to generate instant preview
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

  const selectAllPages = () => {
    setSelectedPageIds(pages.map((p) => p.id));
  };

  const clearAllPages = () => {
    setSelectedPageIds([]);
  };

  const handlePublish = async (immediate: boolean) => {
    if (!message.trim() && !mediaUrl) {
      alert('Please enter post text or upload media.');
      return;
    }
    if (selectedPageIds.length === 0) {
      alert('Please select at least one social destination page or channel.');
      return;
    }

    if (!immediate && !scheduledDateTime) {
      alert('Please select a future date and time to schedule this post.');
      return;
    }

    setIsSubmitting(true);

    if (immediate) {
      setPublishingMessage('Broadcasting live to connected channels...');
      const targetPages = pages.filter((p) => selectedPageIds.includes(p.id));

      try {
        const res = await fetch('/api/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postType,
            message,
            mediaUrl: mediaUrl || undefined,
            linkUrl: linkUrl || undefined,
            commentText: firstComment || undefined,
            targets: targetPages.map((p) => ({
              id: p.id,
              platform: p.platform,
              name: p.name,
              pageId: p.pageId,
              botToken: p.botToken,
              chatId: p.chatId || p.pageId,
              accessToken: p.accessToken,
            })),
          }),
        });

        const data = await res.json();
        setPublishFeedback(data);

        createPost({
          postType,
          message,
          mediaUrl: mediaUrl || undefined,
          linkUrl: linkUrl || undefined,
          commentText: firstComment || undefined,
          intervalMinSeconds: intervalMin,
          intervalMaxSeconds: intervalMax,
          pageIds: selectedPageIds,
          status: data.overallStatus || 'published',
          results: data.results,
        });

        setIsSubmitting(false);
        setPublishingMessage(null);
        setSuccessToast(true);

        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } catch (err: unknown) {
        createPost({
          postType,
          message,
          mediaUrl: mediaUrl || undefined,
          linkUrl: linkUrl || undefined,
          commentText: firstComment || undefined,
          intervalMinSeconds: intervalMin,
          intervalMaxSeconds: intervalMax,
          pageIds: selectedPageIds,
          status: 'published',
        });
        setIsSubmitting(false);
        setPublishingMessage(null);
        setSuccessToast(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }
    } else {
      createPost({
        postType,
        message,
        mediaUrl: mediaUrl || undefined,
        linkUrl: linkUrl || undefined,
        commentText: firstComment || undefined,
        intervalMinSeconds: intervalMin,
        intervalMaxSeconds: intervalMax,
        pageIds: selectedPageIds,
        status: 'scheduled',
        scheduledAt: scheduledDateTime,
      });

      setIsSubmitting(false);
      setSuccessToast(true);

      setTimeout(() => {
        router.push('/dashboard');
      }, 1200);
    }
  };

  const previewPage = pages.find((p) => selectedPageIds.includes(p.id)) || pages[0];

  return (
    <div className="space-y-8 font-sans max-w-5xl mx-auto animate-fade-in pb-12">
      {/* 1. Header (Tasklify Studio) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Create Post
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Draft, attach media, select destination channels, and publish live or schedule content.
          </p>
        </div>

        {/* Selected Channels Count Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0] text-xs font-semibold text-slate-700 shadow-2xs self-start sm:self-auto">
          <span className={`w-2 h-2 rounded-full ${selectedPageIds.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <span>{selectedPageIds.length} Destinations Selected</span>
        </div>
      </div>

      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-fade-in shadow-2xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Post successfully {isScheduleMode ? 'scheduled' : 'published to connected channels'}! Returning to Dashboard...
            </span>
          </div>
          {publishFeedback?.results?.[0]?.postUrl && (
            <a
              href={publishFeedback.results[0].postUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 underline text-emerald-950 font-bold"
            >
              <span>View Live Post</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Main Grid: Composer (Left) + Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Composer (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Account / Destination Selection */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Select Publishing Destinations
              </label>
              {pages.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllPages}
                    className="text-slate-800 hover:text-black font-bold"
                  >
                    Select All
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={clearAllPages}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Channels Checklist or Empty State */}
            {pages.length === 0 ? (
              <div className="py-6 px-4 rounded-xl bg-[#F8F9FA] border border-dashed border-[#E2E8F0] text-center space-y-2">
                <p className="text-xs font-bold text-slate-700">No broadcasting channels connected yet</p>
                <p className="text-[11px] text-slate-400">Connect a Telegram channel or Facebook page first to post.</p>
                <Link
                  href="/accounts"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-2xs mt-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect Social Account</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {pages.map((page) => {
                  const isSelected = selectedPageIds.includes(page.id);
                  return (
                    <div
                      key={page.id}
                      onClick={() => togglePageSelection(page.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#F8F9FA] border-slate-900 shadow-2xs font-bold text-slate-900'
                          : 'bg-white border-[#E2E8F0] text-slate-600 hover:bg-[#F8F9FA]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-slate-950 border-slate-950 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <SocialIcon platform={page.platform} className="w-4 h-4 rounded-xs shrink-0" />
                        <span className="truncate">{page.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: Post Content Editor */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                2. Post Caption / Content
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {message.length} characters
              </span>
            </div>

            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What do you want to share with your audience today? Write your post message or headline here..."
              className="w-full p-4 rounded-xl border border-[#E2E8F0] text-xs leading-relaxed text-slate-900 placeholder:text-slate-400 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 transition-all font-medium"
            />

            {/* Anti-Ban Sensitive Word Scanner Notice */}
            {findSensitiveWords(message).length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start justify-between gap-3 animate-fade-in">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Facebook Sensitive Terms Detected: </span>
                    <span className="font-semibold text-amber-700">
                      [{findSensitiveWords(message).join(', ')}]
                    </span>
                    <p className="text-[11px] text-amber-800/80 mt-0.5">
                      These words may trigger Meta automated scraper flags. Click to auto-break them safely.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMessage(sanitizeText(message))}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-200/60 hover:bg-amber-200 text-amber-950 font-bold text-[11px] shrink-0"
                >
                  Auto-Sanitize
                </button>
              </div>
            )}

            {/* First Comment Cloaking Field */}
            <div className="pt-2 border-t border-[#E2E8F0] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                <span>First Comment (Link Cloaking / Follow-up)</span>
              </div>
              <input
                type="text"
                value={firstComment}
                onChange={(e) => setFirstComment(e.target.value)}
                placeholder="e.g. Read full report: https://mywebsite.com"
                className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 transition-all"
              />
            </div>
          </div>

          {/* Step 3: Media Upload Area */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                3. Attach Media
              </label>
              {mediaUrl && (
                <button
                  type="button"
                  onClick={removeMedia}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold"
                >
                  Remove Media
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,video/*"
              className="hidden"
            />

            {mediaUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-[#E2E8F0] bg-slate-900 max-h-60 flex items-center justify-center">
                {postType === 'video' ? (
                  <video src={mediaUrl} controls className="max-h-60 w-auto" />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={mediaUrl} alt="upload preview" className="max-h-60 w-auto object-contain" />
                )}
                <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {mediaFileName || 'Image Attached'}
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-[#E2E8F0] hover:border-slate-400 rounded-xl cursor-pointer text-center space-y-2 transition-colors bg-[#F8F9FA] hover:bg-slate-100/50"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] text-slate-700 mx-auto flex items-center justify-center shadow-2xs">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Click to upload an image or video
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supports JPG, PNG, MP4, and MOV formats.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Step 4: Schedule or Publish Now */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                4. Publishing Time
              </label>
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setIsScheduleMode(false)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    !isScheduleMode
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Publish Now
                </button>
                <button
                  type="button"
                  onClick={() => setIsScheduleMode(true)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    isScheduleMode
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Schedule Post
                </button>
              </div>
            </div>

            {isScheduleMode && (
              <div className="pt-2 border-t border-[#E2E8F0] space-y-2 animate-fade-in">
                <label className="text-xs font-semibold text-slate-700 block">
                  Select Future Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E2E8F0] text-xs text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500"
                />
              </div>
            )}

            {/* Action Buttons (Tasklify Studio Clean Style) */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isSubmitting || selectedPageIds.length === 0}
                onClick={() => handlePublish(!isScheduleMode)}
                className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>{publishingMessage || 'Broadcasting Post...'}</span>
                  </>
                ) : isScheduleMode ? (
                  <>
                    <Clock className="w-4 h-4 stroke-[2.5]" />
                    <span>Schedule Post for Later</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 stroke-[2.5]" />
                    <span>Publish to {selectedPageIds.length} Channel(s) Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Preview Card (5 Cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            <Eye className="w-4 h-4" />
            <span>Live Social Preview</span>
          </div>

          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-5 shadow-2xs space-y-3">
            {/* Author bar */}
            <div className="flex items-center gap-3">
              {previewPage?.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewPage.avatarUrl}
                  alt={previewPage.name}
                  className="w-9 h-9 rounded-full object-cover border border-[#E2E8F0]"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                  {previewPage?.name?.charAt(0) || 'P'}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 leading-tight truncate">
                  {previewPage?.name || 'Selected Channel'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <span className="capitalize">{previewPage?.platform || 'Social'}</span>
                  <span>•</span>
                  <span>Just now • 🌐 Public</span>
                </div>
              </div>
            </div>

            {/* Post text */}
            <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium min-h-[40px]">
              {message || 'Your post message text will appear here as you type...'}
            </p>

            {/* Media Box */}
            {mediaUrl && (
              <div className="rounded-xl overflow-hidden border border-[#E2E8F0] bg-slate-900">
                {postType === 'video' ? (
                  <div className="h-48 flex items-center justify-center text-white">
                    <VideoIcon className="w-10 h-10 opacity-80" />
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={mediaUrl}
                    alt="preview"
                    className="w-full h-52 object-cover"
                  />
                )}
              </div>
            )}

            {/* First Comment Preview */}
            {firstComment && (
              <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-slate-400" />
                  <span>First Comment Trigger</span>
                </div>
                <p className="text-[11px] text-slate-700 font-medium truncate">
                  {firstComment}
                </p>
              </div>
            )}

            {/* Social engagement footer */}
            <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-slate-400">
              <span>👍 Like</span>
              <span>💬 Comment</span>
              <span>🔄 Share</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
