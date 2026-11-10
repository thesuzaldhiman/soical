'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { PostType } from '@/types';
import {
  PenSquare,
  Image as ImageIcon,
  Video as VideoIcon,
  Upload,
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  RotateCw,
  Eye,
  Check,
  ShieldAlert,
  MessageSquare,
  Sliders,
} from 'lucide-react';
import { findSensitiveWords, sanitizeText } from '@/lib/utils/sensitive-words';

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
  const [firstComment, setFirstComment] = useState('👉 पूरी खबर व ताज़ा अपडेट पढ़ें: https://khabarmonkey.com');
  const [intervalMin, setIntervalMin] = useState(30);
  const [intervalMax, setIntervalMax] = useState(90);
  const [mediaUrl, setMediaUrl] = useState(
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1080&auto=format&fit=crop&q=80'
  );
  const [mediaFileName, setMediaFileName] = useState<string | null>(null);

  // Scheduling
  const [isScheduleMode, setIsScheduleMode] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // Status & Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

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

  const handlePublish = (immediate: boolean) => {
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

    setTimeout(() => {
      createPost({
        postType,
        message,
        mediaUrl: mediaUrl || undefined,
        commentText: firstComment || undefined,
        intervalMinSeconds: intervalMin,
        intervalMaxSeconds: intervalMax,
        pageIds: selectedPageIds,
        status: immediate ? 'published' : 'scheduled',
        scheduledAt: immediate ? undefined : scheduledDateTime,
      });

      setIsSubmitting(false);
      setSuccessToast(true);

      setTimeout(() => {
        router.push('/dashboard');
      }, 1200);
    }, 600);
  };

  const platformIcons: Record<string, string> = {
    facebook: '📘',
    instagram: '📸',
    threads: '🧵',
    telegram: '✈️',
    youtube: '▶️',
  };

  return (
    <div className="space-y-8 font-sans max-w-5xl mx-auto animate-fade-in">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EBEBE8]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Create Post
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Draft, attach media, select destination channels, and publish or schedule content.
          </p>
        </div>

        {/* Selected Channels Count Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E8E8E4] text-xs font-semibold text-slate-700 shadow-2xs self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{selectedPageIds.length} Destinations Selected</span>
        </div>
      </div>

      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            Post successfully {isScheduleMode ? 'scheduled' : 'published'}! Returning to Dashboard...
          </span>
        </div>
      )}

      {/* Main Grid: Composer (Left) + Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Composer (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Account / Destination Selection */}
          <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Select Publishing Destinations
              </label>
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
            </div>

            {/* Channels Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {pages.map((page) => {
                const isSelected = selectedPageIds.includes(page.id);
                return (
                  <div
                    key={page.id}
                    onClick={() => togglePageSelection(page.id)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#FAF9F6] border-slate-900 shadow-2xs font-bold text-slate-900'
                        : 'bg-white border-[#E8E8E4] text-slate-600 hover:bg-[#FAF9F6] opacity-75'
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
                      <span className="text-base shrink-0">
                        {platformIcons[page.platform] || '📢'}
                      </span>
                      <span className="truncate">{page.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Post Content Editor */}
          <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs space-y-3">
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
              className="w-full p-4 rounded-xl border border-[#EEF1F6] text-xs leading-relaxed text-slate-900 placeholder:text-slate-400 bg-[#F8F9FD] focus:outline-none focus:border-[#FF007A]"
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
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors shrink-0 shadow-2xs"
                >
                  Auto-Obfuscate
                </button>
              </div>
            )}
          </div>

          {/* First Comment & Anti-Ban Delay Staggering */}
          <div className="bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#F0F2F6]">
              <MessageSquare className="w-4 h-4 text-[#FF007A]" />
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                3. First Comment Auto-Trigger (Link/CTA)
              </label>
            </div>

            <textarea
              rows={2}
              value={firstComment}
              onChange={(e) => setFirstComment(e.target.value)}
              placeholder="Paste article link or comment CTA here to keep the main post clean..."
              className="w-full p-3 rounded-xl border border-[#EEF1F6] text-xs text-slate-900 bg-[#F8F9FD] focus:outline-none focus:border-[#FF007A]"
            />

            {/* Anti-Ban Page Delay Range */}
            <div className="pt-2 border-t border-[#F0F2F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Anti-Ban Dispatch Delay</span>
                  <span className="text-[11px] text-slate-400">Random gap between cross-posting each page</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={intervalMin}
                  onChange={(e) => setIntervalMin(Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded-lg border border-[#EEF1F6] bg-[#F8F9FD] text-center"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={intervalMax}
                  onChange={(e) => setIntervalMax(Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded-lg border border-[#EEF1F6] bg-[#F8F9FD] text-center"
                />
                <span className="text-slate-500 font-sans font-bold">sec</span>
              </div>
            </div>
          </div>

          {/* Step 3: Media Upload Area */}
          <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                3. Attach Image or Video
              </label>
              {mediaUrl && (
                <button
                  type="button"
                  onClick={removeMedia}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                >
                  Remove Media
                </button>
              )}
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,video/*"
              className="hidden"
            />

            {mediaUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-[#E8E8E4] bg-slate-900 flex items-center justify-center max-h-64">
                {postType === 'video' ? (
                  <div className="py-12 flex flex-col items-center justify-center text-white space-y-2">
                    <Play className="w-12 h-12 fill-white opacity-90" />
                    <span className="text-xs font-semibold">
                      {mediaFileName || 'Video file attached for Shorts/Reels'}
                    </span>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={mediaUrl}
                    alt="attached media"
                    className="w-full h-56 object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={removeMedia}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-[#DCDCD8] hover:border-slate-400 rounded-2xl bg-[#FAF9F6] text-center cursor-pointer transition-colors space-y-2"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-[#E8E8E4] flex items-center justify-center mx-auto text-slate-500 shadow-2xs">
                  <Upload className="w-4 h-4" />
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
          <div className="bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                4. Publishing Time
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleMode(false)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    !isScheduleMode
                      ? 'bg-gradient-to-r from-[#FF007A] to-[#FF4E98] text-white shadow-xs'
                      : 'bg-[#F6F8FD] text-slate-600 hover:bg-[#EEF1F6]'
                  }`}
                >
                  Publish Now
                </button>
                <button
                  type="button"
                  onClick={() => setIsScheduleMode(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isScheduleMode
                      ? 'bg-gradient-to-r from-[#7928CA] to-[#9333EA] text-white shadow-xs'
                      : 'bg-[#F6F8FD] text-slate-600 hover:bg-[#EEF1F6]'
                  }`}
                >
                  Schedule Post
                </button>
              </div>
            </div>

            {isScheduleMode && (
              <div className="pt-2 border-t border-[#F0F2F6] space-y-2 animate-fade-in">
                <label className="text-xs font-semibold text-slate-700 block">
                  Select Future Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#EEF1F6] text-xs text-slate-900 bg-[#F8F9FD] focus:outline-none focus:border-[#FF007A]"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handlePublish(!isScheduleMode)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF007A] to-[#FF2E93] hover:from-[#E6006E] hover:to-[#E62080] disabled:opacity-50 text-white font-bold text-xs transition-all shadow-[0_4px_14px_rgba(255,0,122,0.3)] flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Processing Post...</span>
                  </>
                ) : isScheduleMode ? (
                  <>
                    <Clock className="w-4 h-4 stroke-[2.5]" />
                    <span>Schedule Post for Later</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 stroke-[2.5]" />
                    <span>Publish to {selectedPageIds.length} Channels Now</span>
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
            <span>Post Live Preview</span>
          </div>

          <div className="bg-white rounded-3xl border border-[#E8E8E4] p-5 shadow-2xs space-y-3">
            {/* Author bar */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                KM
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  Khabar Monkey (Official)
                </div>
                <div className="text-[10px] text-slate-400">Just now • 🌐 Public</div>
              </div>
            </div>

            {/* Post text */}
            <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
              {message || 'Your post message text will appear here...'}
            </p>

            {/* Media Box */}
            {mediaUrl && (
              <div className="rounded-xl overflow-hidden border border-[#E8E8E4] bg-slate-900">
                {postType === 'video' ? (
                  <div className="h-48 flex items-center justify-center text-white">
                    <Play className="w-10 h-10 fill-white opacity-80" />
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

            {/* Social engagement footer */}
            <div className="pt-2 border-t border-[#F2F2EE] flex items-center justify-between text-xs text-slate-400">
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
