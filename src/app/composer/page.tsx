'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { PostType } from '@/types';
import {
  findSensitiveWords,
  sanitizeSensitiveWords,
} from '@/lib/utils/sensitive-words';
import {
  PenSquare,
  Image as ImageIcon,
  Video as VideoIcon,
  Link as LinkIcon,
  Type,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Hash,
  MessageSquare,
  Sliders,
  Play,
  RotateCw,
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
  const { pages, categories, settings, createPost } = useApp();

  // Form State
  const [postType, setPostType] = useState<PostType>('image');
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1080&auto=format&fit=crop&q=80');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [includeComment, setIncludeComment] = useState(true);
  const [commentText, setCommentText] = useState('');

  // Targets
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  // Scheduling
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [useInterval, setUseInterval] = useState(true);
  const [intervalMin, setIntervalMin] = useState(30);
  const [intervalMax, setIntervalMax] = useState(90);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Initialize with all active pages selected
  useEffect(() => {
    setSelectedPageIds(pages.filter((p) => p.isActive).map((p) => p.id));
  }, [pages]);

  // Sensitive words check
  const detectedSensitive = findSensitiveWords(message, settings.sensitiveWords);

  const handleSanitizeWords = () => {
    const { sanitized } = sanitizeSensitiveWords(message, settings.sensitiveWords);
    setMessage(sanitized);
  };

  const handleAddCategoryTags = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat || !cat.tags.length) return;
    const tagString = '\n\n' + cat.tags.join(' ');
    setMessage((prev) => prev.trim() + tagString);
  };

  const handleAiGenerateCaption = () => {
    const sampleHeadlines = [
      'हिमाचल प्रदेश में अगले 48 घंटों में भारी बर्फबारी का नया अलर्ट जारी, कई मार्ग बंद होने की आशंका।',
      'हिमाचल कैबिनेट बैठक के बड़े फैसले: नई नौकरियों और विकास परियोजनाओं को मिली हरी झंडी।',
      'मनाली-लेह मार्ग पर ताज़ा बर्फबारी के बाद सैलानियों की भारी भीड़, होटल कारोबारियों में उत्साह।',
    ];
    const picked = sampleHeadlines[Math.floor(Math.random() * sampleHeadlines.length)];
    setMessage(picked + '\n\nपूरी विस्तृत रिपोर्ट के लिए नीचे दिए लिंक पर क्लिक करें 👇');
    if (includeComment && !commentText) {
      setCommentText('👉 विस्तृत समाचार यहाँ पढ़ें: https://khabarmonkey.com/latest-news');
    }
  };

  const togglePageSelection = (id: string) => {
    setSelectedPageIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const selectAllPages = () => {
    setSelectedPageIds(pages.map((p) => p.id));
  };

  const deselectAllPages = () => {
    setSelectedPageIds([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && postType === 'text') {
      alert('Please enter a message for your post.');
      return;
    }
    if (selectedPageIds.length === 0) {
      alert('Please select at least one social channel.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      createPost({
        postType,
        message,
        mediaUrl: postType === 'image' || postType === 'video' ? mediaUrl : undefined,
        thumbnailUrl: postType === 'video' ? thumbnailUrl : undefined,
        linkUrl: postType === 'link' ? linkUrl : undefined,
        commentText: includeComment ? commentText : undefined,
        pageIds: selectedPageIds,
        status: scheduleMode === 'now' ? 'published' : 'scheduled',
        scheduledAt: scheduleMode === 'schedule' ? scheduledDateTime || new Date(Date.now() + 3600000).toISOString() : undefined,
        intervalMinSeconds: useInterval ? intervalMin : 0,
        intervalMaxSeconds: useInterval ? intervalMax : 0,
      });

      setIsSubmitting(false);
      setSuccessToast(true);

      setTimeout(() => {
        router.push('/library');
      }, 1200);
    }, 600);
  };

  const platformBadge: Record<string, { label: string; icon: string; color: string }> = {
    facebook: { label: 'FB Page', icon: '📘', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    instagram: { label: 'Instagram', icon: '📸', color: 'bg-pink-50 text-pink-700 border-pink-200' },
    threads: { label: 'Threads', icon: '🧵', color: 'bg-slate-100 text-slate-800 border-slate-300' },
    telegram: { label: 'Telegram', icon: '✈️', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    youtube: { label: 'YouTube Shorts', icon: '▶️', color: 'bg-red-50 text-red-700 border-red-200' },
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <PenSquare className="w-6 h-6 text-blue-600" />
            <span>Create & Schedule Post</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Publish text, image cards, reels or links across multiple channels simultaneously.
          </p>
        </div>

        {/* AI Generator Helper Button */}
        <button
          type="button"
          onClick={handleAiGenerateCaption}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-violet-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Generate News Headline (AI)</span>
        </button>
      </div>

      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-3 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            Post successfully {scheduleMode === 'now' ? 'published' : 'scheduled'}! Redirecting to Post Library...
          </span>
        </div>
      )}

      {/* Main Composer Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Post Content (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Post Type Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
              1. Select Post Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPostType('image')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                  postType === 'image'
                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>Image Card</span>
              </button>

              <button
                type="button"
                onClick={() => setPostType('video')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                  postType === 'video'
                    ? 'bg-red-50 border-red-600 text-red-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <VideoIcon className="w-4 h-4 text-red-600" />
                <span>Video / Short</span>
              </button>

              <button
                type="button"
                onClick={() => setPostType('link')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                  postType === 'link'
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <LinkIcon className="w-4 h-4 text-indigo-600" />
                <span>Article Link</span>
              </button>

              <button
                type="button"
                onClick={() => setPostType('text')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                  postType === 'text'
                    ? 'bg-slate-100 border-slate-600 text-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Type className="w-4 h-4 text-slate-600" />
                <span>Text Only</span>
              </button>
            </div>
          </div>

          {/* 2. Message / Caption Area */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                2. Caption / Message (Hindi / English)
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {message.length} characters
              </span>
            </div>

            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="ताज़ा समाचार या पोस्ट का विवरण यहाँ लिखें..."
              className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 bg-slate-50/50"
            />

            {/* Sensitive Word Warning Shield */}
            {detectedSensitive.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-amber-800">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Sensitive words detected:</strong> {detectedSensitive.join(', ')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSanitizeWords}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-all shrink-0 self-start sm:self-auto"
                >
                  Sanitize / Break Words (Safe for FB)
                </button>
              </div>
            )}

            {/* Category Quick Hashtags */}
            <div className="pt-2">
              <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1">
                <Hash className="w-3 h-3" />
                <span>Quick Append Category Hashtags:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleAddCategoryTags(cat.id)}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Media or Link Input */}
          {(postType === 'image' || postType === 'video' || postType === 'link') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                3. {postType === 'link' ? 'Article URL' : `${postType.toUpperCase()} Media URL`}
              </label>

              {postType === 'link' ? (
                <div>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://khabarmonkey.com/himachal-news-article"
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Facebook scraper will read open graph (OG) tags to build rich preview cards.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder={`Paste public ${postType} URL (e.g. https://.../image.jpg)`}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                  />

                  {mediaUrl && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-4">
                      {postType === 'image' ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={mediaUrl}
                          alt="preview"
                          className="w-24 h-24 rounded-lg object-cover border border-slate-300"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-slate-800 flex items-center justify-center text-white">
                          <Play className="w-8 h-8 opacity-80" />
                        </div>
                      )}
                      <div className="text-xs text-slate-600 space-y-1">
                        <div className="font-bold text-slate-800">Media Preview Loaded</div>
                        <div className="text-[11px] text-slate-400 break-all">{mediaUrl}</div>
                        {postType === 'video' && (
                          <div className="text-[11px] text-blue-600 font-semibold">
                            Supports YouTube Shorts 9:16 vertical cross-post & FB Video
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. First Comment Toggle */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900">
                  Post Link in First Comment (Engagement Booster)
                </span>
              </div>
              <input
                type="checkbox"
                checked={includeComment}
                onChange={(e) => setIncludeComment(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              News pages drop the story link in the first comment to keep the main caption clean and avoid FB algorithm downranking for external links.
            </p>

            {includeComment && (
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="👉 विस्तृत समाचार यहाँ पढ़ें: https://khabarmonkey.com/full-story"
                className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
              />
            )}
          </div>
        </div>

        {/* Right Column: Channels & Scheduling (1 Col) */}
        <div className="space-y-6">
          {/* Target Channels Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Target Channels</h3>
                <span className="text-xs text-slate-500">
                  {selectedPageIds.length} of {pages.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAllPages}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  All
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={deselectAllPages}
                  className="text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Channel List */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {pages.map((page) => {
                const isSelected = selectedPageIds.includes(page.id);
                const badge = platformBadge[page.platform] || {
                  label: page.platform,
                  icon: '📢',
                  color: 'bg-slate-100 text-slate-800',
                };

                return (
                  <div
                    key={page.id}
                    onClick={() => togglePageSelection(page.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50/60 border-blue-400 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent div
                        className="w-4 h-4 text-blue-600 rounded pointer-events-none"
                      />
                      <span className="text-base shrink-0">{badge.icon}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{page.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {(page.fanCount / 1000).toFixed(1)}k followers
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Schedule & Intervals Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Publishing Options</h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScheduleMode('now')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  scheduleMode === 'now'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Publish Now
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('schedule')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  scheduleMode === 'schedule'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Schedule Time
              </button>
            </div>

            {scheduleMode === 'schedule' && (
              <div className="space-y-2 pt-2">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Select Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Non-Blocking Random Staggered Interval */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Staggered Interval (Anti-Ban)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={useInterval}
                  onChange={(e) => setUseInterval(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Randomizes posting gaps between pages to prevent Facebook API rate-limits and shadowbans.
              </p>

              {useInterval && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      Min Gap (Sec)
                    </label>
                    <input
                      type="number"
                      value={intervalMin}
                      onChange={(e) => setIntervalMin(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      Max Gap (Sec)
                    </label>
                    <input
                      type="number"
                      value={intervalMax}
                      onChange={(e) => setIntervalMax(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Processing Post...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {scheduleMode === 'now' ? 'Publish Immediately' : 'Queue Scheduled Post'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
