'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { YouTubeSyncRule, YouTubeSyncLog, YouTubeContentFilter, YouTubePublishMode } from '@/types';
import {
  Video,
  Sparkles,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Check,
  Share2,
  Film,
  Zap,
  Globe,
  Download,
  Calendar,
  Eye,
  Sliders,
  FileText,
  Search,
  Flame,
  FlaskConical,
} from 'lucide-react';

export default function YouTubeSyncPage() {
  const {
    pages,
    youtubeRules,
    youtubeLogs,
    saveYouTubeRule,
    deleteYouTubeRule,
    toggleYouTubeRule,
    triggerYouTubeSync,
    triggerYouTubeTestPost,
    refreshYouTubeRules,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'rules' | 'logs' | 'test'>('rules');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Test Post Modal State
  const [testModalRule, setTestModalRule] = useState<YouTubeSyncRule | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testSelectedPageId, setTestSelectedPageId] = useState<string>('');
  const [testStep, setTestStep] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [testStatusMsg, setTestStatusMsg] = useState<string>('');
  const [testResultData, setTestResultData] = useState<any>(null);
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);

  // Form State
  const [channelInput, setChannelInput] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedChannel, setResolvedChannel] = useState<{
    channelId: string;
    channelTitle: string;
    channelHandle?: string;
    channelAvatar?: string;
    feedUrl: string;
    canonicalUrl: string;
  } | null>(null);
  const [sampleVideos, setSampleVideos] = useState<any[]>([]);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [ruleName, setRuleName] = useState('');
  const [filterType, setFilterType] = useState<YouTubeContentFilter>('shorts_only');
  const [publishMode, setPublishMode] = useState<YouTubePublishMode>('save_as_draft');
  const [targetPageIds, setTargetPageIds] = useState<string[]>([]);
  const [includeDescription, setIncludeDescription] = useState(true);
  const [customHashtags, setCustomHashtags] = useState('#news #trending #viral');
  const [linkInComment, setLinkInComment] = useState(true);
  const [maxVideosPerCheck, setMaxVideosPerCheck] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Triggering State
  const [runningRuleId, setRunningRuleId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ id: string; msg: string; type: 'success' | 'error' } | null>(null);

  // Test Direct Downloader State
  const [testVideoUrl, setTestVideoUrl] = useState('');
  const [isTestDownloading, setIsTestDownloading] = useState(false);
  const [testTargetPageId, setTestTargetPageId] = useState<string>(pages[0]?.id || '');
  const [testPostResult, setTestPostResult] = useState<any>(null);

  // YouTube Server Cookies State (Bypass Bot Check)
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const [cookiesStatus, setCookiesStatus] = useState<{ hasCookies: boolean; fileSizeBytes?: number; updatedAt?: string } | null>(null);
  const [cookieInputText, setCookieInputText] = useState('');
  const [isSavingCookies, setIsSavingCookies] = useState(false);
  const [cookieSaveMsg, setCookieSaveMsg] = useState<string | null>(null);

  const fetchCookieStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/youtube-sync/cookies');
      const data = await res.json();
      if (data.success) {
        setCookiesStatus({
          hasCookies: data.hasCookies,
          fileSizeBytes: data.fileSizeBytes,
          updatedAt: data.updatedAt,
        });
      }
    } catch {}
  }, []);

  const handleSaveCookies = async () => {
    if (!cookieInputText.trim()) {
      alert('Please paste cookies.txt content.');
      return;
    }
    setIsSavingCookies(true);
    setCookieSaveMsg(null);
    try {
      const res = await fetch('/api/youtube-sync/cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookiesContent: cookieInputText }),
      });
      const data = await res.json();
      if (data.success) {
        setCookieSaveMsg('Cookies successfully saved on server! YouTube bot check is now bypassed.');
        setCookieInputText('');
        await fetchCookieStatus();
      } else {
        alert(data.error || 'Failed saving cookies.');
      }
    } catch (e: any) {
      alert(e.message || 'Error saving cookies.');
    } finally {
      setIsSavingCookies(false);
    }
  };

  // Auto-refresh rules and cookie status on mount
  useEffect(() => {
    refreshYouTubeRules();
    fetchCookieStatus();
  }, [refreshYouTubeRules, fetchCookieStatus]);

  // Statistics
  const stats = useMemo(() => {
    const totalRules = youtubeRules.length;
    const activeRules = youtubeRules.filter((r) => r.isActive).length;
    const totalSynced = youtubeRules.reduce((sum, r) => sum + (r.totalSyncedCount || 0), 0);
    const successLogs = youtubeLogs.filter((l) => l.status === 'published' || l.status === 'draft_saved').length;

    return { totalRules, activeRules, totalSynced, successLogs };
  }, [youtubeRules, youtubeLogs]);

  // Open Modal for New Rule
  const handleOpenNewModal = () => {
    setEditingRuleId(null);
    setChannelInput('');
    setResolvedChannel(null);
    setSampleVideos([]);
    setResolveError(null);
    setRuleName('');
    setFilterType('shorts_only');
    setPublishMode('auto_publish');
    setTargetPageIds(pages.filter((p) => p.platform === 'facebook').slice(0, 2).map((p) => p.id));
    setIncludeDescription(true);
    setCustomHashtags('#news #trending #viral');
    setLinkInComment(true);
    setMaxVideosPerCheck(1);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (rule: YouTubeSyncRule) => {
    setEditingRuleId(rule.id);
    setChannelInput(rule.channelUrl);
    setResolvedChannel({
      channelId: rule.channelId,
      channelTitle: rule.channelTitle,
      channelHandle: rule.channelHandle,
      channelAvatar: rule.channelAvatar,
      feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${rule.channelId}`,
      canonicalUrl: `https://www.youtube.com/channel/${rule.channelId}`,
    });
    setSampleVideos([]);
    setResolveError(null);
    setRuleName(rule.name);
    setFilterType(rule.filterType || 'shorts_only');
    setPublishMode(rule.publishMode || 'auto_publish');
    setTargetPageIds(rule.targetPageIds || []);
    setIncludeDescription(rule.includeDescription !== false);
    setCustomHashtags(rule.customHashtags || '');
    setLinkInComment(rule.linkInComment !== false);
    setMaxVideosPerCheck(rule.maxVideosPerCheck || 1);
    setIsModalOpen(true);
  };

  // Resolve YouTube Channel
  const handleResolveChannel = async () => {
    if (!channelInput.trim()) {
      setResolveError('Please enter a YouTube Channel URL, @handle, or Channel ID.');
      return;
    }

    setIsResolving(true);
    setResolveError(null);

    try {
      const res = await fetch('/api/youtube-sync/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: channelInput.trim() }),
      });

      const data = await res.json();
      if (!data.success) {
        setResolveError(data.error || 'Could not find or resolve this YouTube channel.');
        return;
      }

      setResolvedChannel(data.channel);
      setSampleVideos(data.sampleVideos || []);
      if (!ruleName) {
        setRuleName(`${data.channel.channelTitle} Auto-Sync`);
      }
    } catch (err: unknown) {
      setResolveError(err instanceof Error ? err.message : 'Network error resolving channel');
    } finally {
      setIsResolving(false);
    }
  };

  // Save Rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedChannel) {
      setResolveError('Please verify the YouTube Channel first by clicking "Verify Channel".');
      return;
    }

    if (targetPageIds.length === 0) {
      setResolveError('Please select at least 1 destination Facebook Page or Instagram Profile.');
      return;
    }

    setIsSaving(true);
    try {
      const ruleToSave: YouTubeSyncRule = {
        id: editingRuleId || `ytsync_${Date.now()}`,
        name: ruleName.trim() || `${resolvedChannel.channelTitle} Sync`,
        channelUrl: channelInput.trim(),
        channelId: resolvedChannel.channelId,
        channelTitle: resolvedChannel.channelTitle,
        channelHandle: resolvedChannel.channelHandle,
        channelAvatar: resolvedChannel.channelAvatar,
        isActive: true,
        filterType,
        targetPageIds,
        maxVideosPerCheck,
        includeDescription,
        customHashtags: customHashtags.trim(),
        linkInComment,
        publishMode,
        processedVideoIds: editingRuleId
          ? youtubeRules.find((r) => r.id === editingRuleId)?.processedVideoIds || []
          : [],
        totalSyncedCount: editingRuleId
          ? youtubeRules.find((r) => r.id === editingRuleId)?.totalSyncedCount || 0
          : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const ok = await saveYouTubeRule(ruleToSave);
      if (ok) {
        setIsModalOpen(false);
        setSaveSuccessMsg(`Channel rule "${ruleToSave.name}" saved & activated!`);
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      } else {
        setResolveError('Failed saving rule to database.');
      }
    } catch (err: unknown) {
      setResolveError(err instanceof Error ? err.message : 'Error saving rule');
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger Manual Sync
  const handleTriggerSync = async (ruleId: string, ruleName: string) => {
    setRunningRuleId(ruleId);
    setSyncFeedback(null);

    try {
      const data = await triggerYouTubeSync(ruleId);
      if (data && data.success) {
        const res = data.result;
        if (res.processedCount > 0) {
          setSyncFeedback({
            id: ruleId,
            type: 'success',
            msg: `Success! Synced ${res.processedCount} new video(s) from "${ruleName}" to your Facebook pages!`,
          });
        } else {
          setSyncFeedback({
            id: ruleId,
            type: 'success',
            msg: `Channel "${ruleName}" is up-to-date! No new videos or shorts found since last check.`,
          });
        }
      } else {
        setSyncFeedback({
          id: ruleId,
          type: 'error',
          msg: data?.error || 'Failed executing sync.',
        });
      }
    } catch {
      setSyncFeedback({
        id: ruleId,
        type: 'error',
        msg: 'Network error executing sync.',
      });
    } finally {
      setRunningRuleId(null);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  // Open Test Post Modal
  const handleOpenTestModal = (rule: YouTubeSyncRule) => {
    setTestModalRule(rule);
    const defaultPage =
      rule.targetPageIds?.[0] ||
      pages.find((p) => p.platform === 'facebook')?.id ||
      pages[0]?.id ||
      '';
    setTestSelectedPageId(defaultPage);
    setTestStep('idle');
    setTestStatusMsg('');
    setTestResultData(null);
    setIsTestModalOpen(true);
  };

  // Execute Test Post
  const handleExecuteTest = async (ruleId: string, pageId?: string) => {
    setTestStep('running');
    setTestingRuleId(ruleId);
    setTestStatusMsg('1/3: Channel feed se fresh video select ho rahi hai...');

    const timer = setTimeout(() => {
      setTestStatusMsg('2/3: High-quality MP4 server par download ho rahi hai (yt-dlp)...');
    }, 2500);

    const timer2 = setTimeout(() => {
      setTestStatusMsg('3/3: Video Post Library me draft ke taur par save ho rahi hai...');
    }, 6000);

    try {
      const targetPage = pageId || testSelectedPageId;
      const data = await triggerYouTubeTestPost(ruleId, { targetPageId: targetPage });
      clearTimeout(timer);
      clearTimeout(timer2);

      if (data && data.success && data.testResult) {
        setTestStep('success');
        setTestResultData(data.testResult);
        setTestStatusMsg(`Success! "${data.testResult.video?.title}" आपकी Post Library me draft ke taur par save ho gayi hai!`);
        await refreshYouTubeRules();
      } else {
        setTestStep('error');
        setTestStatusMsg(data?.error || data?.testResult?.error || 'Test download failed. Please check server logs.');
      }
    } catch (err: unknown) {
      clearTimeout(timer);
      clearTimeout(timer2);
      setTestStep('error');
      setTestStatusMsg(err instanceof Error ? err.message : 'Network error executing test post');
    } finally {
      setTestingRuleId(null);
    }
  };

  // Delete Rule
  const handleDeleteRule = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete YouTube rule "${name}"?`)) {
      await deleteYouTubeRule(id);
    }
  };

  // Toggle Page Selection in Modal
  const handleTogglePage = (pageId: string) => {
    setTargetPageIds((prev) =>
      prev.includes(pageId) ? prev.filter((p) => p !== pageId) : [...prev, pageId]
    );
  };

  // Test Single Video Download & Publish
  const handleTestDownloadAndPost = async () => {
    if (!testVideoUrl.trim()) {
      alert('Please enter a YouTube video or Shorts URL.');
      return;
    }
    if (!testTargetPageId) {
      alert('Please select a destination Facebook Page.');
      return;
    }

    setIsTestDownloading(true);
    setTestPostResult(null);

    try {
      // Step 1: Extract Video ID
      let videoId = testVideoUrl.trim();
      const match =
        videoId.match(/(?:watch\?v=|shorts\/|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/i) ||
        videoId.match(/^([a-zA-Z0-9_-]{11})$/);
      if (match) {
        videoId = match[1];
      }

      // Step 2: Call download API / generate
      const res = await fetch('/api/youtube-sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          singleVideoId: videoId,
          targetPageId: testTargetPageId,
        }),
      });

      const data = await res.json();
      setTestPostResult(data);
    } catch (err: unknown) {
      setTestPostResult({ success: false, error: String(err) });
    } finally {
      setIsTestDownloading(false);
    }
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* ── Top Header Banner ── */}
        <div className="relative rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white p-6 sm:p-8 shadow-xl overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold border border-white/20">
                <Flame className="w-3.5 h-3.5 text-amber-300" />
                <span>YouTube to Facebook &amp; Instagram Auto-Pilot</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                Auto-Download YouTube Shorts &amp; Videos to Your Facebook Pages
              </h1>
              <p className="text-sm text-red-100 leading-relaxed">
                Connect any YouTube channel. Our background engine automatically monitors the feed, downloads newly published Shorts / Videos into high-quality MP4 on your server, and auto-dispatches them to your selected Facebook Pages.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setIsCookieModalOpen(true)}
                className={`px-4 py-3 rounded-2xl text-xs font-black shadow-lg transition-all hover:scale-[1.02] flex items-center gap-2 cursor-pointer border ${
                  cookiesStatus?.hasCookies
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400'
                    : 'bg-amber-400 hover:bg-amber-500 text-slate-950 border-amber-300'
                }`}
                title="Manage YouTube cookies.txt to bypass datacenter bot challenges"
              >
                <span>🍪</span>
                <span>{cookiesStatus?.hasCookies ? 'Cookies Active ✓' : 'Add Cookies (Bypass Bot)'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewModal}
                className="px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 text-red-600 text-xs font-black shadow-lg transition-all hover:scale-[1.02] flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add YouTube Channel</span>
              </button>

              <button
                type="button"
                onClick={() => refreshYouTubeRules()}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer"
                title="Refresh Status"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Success Toast ── */}
        {saveSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-3 shadow-xs animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* ── Stat Metric Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-[#EEF1F6] p-4 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Connected Channels
            </span>
            <div className="text-2xl font-black text-slate-900">{stats.totalRules}</div>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <span>●</span> {stats.activeRules} Active on Auto-Pilot
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#EEF1F6] p-4 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Videos Synced
            </span>
            <div className="text-2xl font-black text-red-600">{stats.totalSynced}</div>
            <p className="text-[11px] text-slate-500 font-medium">Downloaded &amp; published</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#EEF1F6] p-4 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Target Pages Connected
            </span>
            <div className="text-2xl font-black text-slate-900">{pages.length}</div>
            <p className="text-[11px] text-slate-500 font-medium">Facebook &amp; Instagram destinations</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#EEF1F6] p-4 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Sync Frequency
            </span>
            <div className="text-2xl font-black text-indigo-600">15 Mins</div>
            <p className="text-[11px] text-slate-500 font-medium">Real-time RSS watcher</p>
          </div>
        </div>

        {/* ── Tab Switcher ── */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'rules'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Active Channel Rules ({youtubeRules.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'logs'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Sync Activity &amp; Live Posts ({youtubeLogs.length})</span>
          </button>
        </div>

        {/* ── Feedback Message ── */}
        {syncFeedback && (
          <div
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 shadow-xs animate-fade-in ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{syncFeedback.msg}</span>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: CHANNEL RULES GRID */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            {youtubeRules.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white border border-[#EEF1F6] shadow-xs space-y-4 max-w-xl mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mx-auto text-2xl shadow-inner">
                  <Video className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-base text-slate-900">
                    No YouTube Channels Added Yet
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Add your first YouTube channel to start automatically downloading its daily Shorts and publishing them directly to your Facebook pages!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenNewModal}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add First YouTube Channel</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {youtubeRules.map((rule) => {
                  const isRunning = runningRuleId === rule.id;
                  const targetPages = pages.filter((p) => rule.targetPageIds?.includes(p.id));

                  return (
                    <div
                      key={rule.id}
                      className={`bg-white rounded-3xl border p-5 shadow-xs transition-all flex flex-col justify-between space-y-4 ${
                        rule.isActive ? 'border-[#EEF1F6] hover:border-slate-300' : 'border-slate-200 bg-slate-50/50 opacity-80'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Channel Header */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {rule.channelAvatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={rule.channelAvatar}
                                alt={rule.channelTitle}
                                className="w-11 h-11 rounded-full object-cover border-2 border-red-500/20 shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm shrink-0">
                                YT
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-black text-sm text-slate-900 leading-tight truncate">
                                {rule.channelTitle}
                              </h4>
                              <p className="text-[11px] text-slate-400 font-mono truncate">
                                {rule.channelHandle || rule.channelId}
                              </p>
                            </div>
                          </div>

                          {/* Active / Pause Switch */}
                          <button
                            type="button"
                            onClick={() => toggleYouTubeRule(rule.id)}
                            className={`p-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              rule.isActive
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-slate-100 border-slate-200 text-slate-500'
                            }`}
                            title={rule.isActive ? 'Click to Pause' : 'Click to Activate'}
                          >
                            {rule.isActive ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Badges Bar */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-bold border border-red-200 flex items-center gap-1">
                            <Flame className="w-3 h-3 text-red-600" />
                            <span>
                              {rule.filterType === 'shorts_only'
                                ? 'Shorts Only (<60s)'
                                : rule.filterType === 'videos_only'
                                ? 'Long Videos Only'
                                : 'All Videos & Shorts'}
                            </span>
                          </span>

                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                            {rule.publishMode === 'auto_publish' ? '⚡ Auto-Publish Live' : '📋 Save as Draft'}
                          </span>

                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                            Max {rule.maxVideosPerCheck || 1} / run
                          </span>
                        </div>

                        {/* Target Facebook Pages */}
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Target Pages ({targetPages.length}):
                          </span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {targetPages.slice(0, 3).map((tp) => (
                              <span
                                key={tp.id}
                                className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200/80 truncate max-w-[130px]"
                              >
                                {tp.name}
                              </span>
                            ))}
                            {targetPages.length > 3 && (
                              <span className="text-[10px] text-slate-400 font-bold">
                                +{targetPages.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Sync Stats */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Total Synced:</span>
                          <strong className="text-slate-900 font-bold font-mono">
                            {rule.totalSyncedCount || 0} videos
                          </strong>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {/* Test Post Button: Picks a new video every time and adds to Library */}
                          <button
                            type="button"
                            onClick={() => handleOpenTestModal(rule)}
                            disabled={testingRuleId === rule.id || isRunning}
                            className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            title="Download the next fresh video from this channel into Post Library as draft (Auto-rotates to a new video every time)"
                          >
                            <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                            <span>Test to Library</span>
                          </button>

                          {/* Live Sync Now Button */}
                          <button
                            type="button"
                            onClick={() => handleTriggerSync(rule.id, rule.channelTitle)}
                            disabled={isRunning || testingRuleId === rule.id}
                            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                            title="Check for newly uploaded videos"
                          >
                            {isRunning ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Syncing...</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5" />
                                <span>Sync Now</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(rule)}
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Rule"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id, rule.name)}
                            className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: SYNC LOGS & HISTORY */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-3xl border border-[#EEF1F6] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-sm text-slate-900">
                  Recent YouTube Sync Events
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time history of videos fetched from YouTube and posted to Facebook / Instagram.
                </p>
              </div>
              <button
                type="button"
                onClick={() => refreshYouTubeRules()}
                className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {youtubeLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No sync events yet. When a new video is posted on your monitored channels, it will appear here.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {youtubeLogs.map((log) => (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-3 min-w-0">
                      {log.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={log.thumbnailUrl}
                          alt={log.videoTitle}
                          className="w-16 h-12 rounded-xl object-cover bg-slate-900 shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="w-16 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                          <Film className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 truncate">{log.videoTitle}</span>
                          {log.isShort && (
                            <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 font-bold text-[9px]">
                              Short
                            </span>
                          )}
                          {log.isTest && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-bold text-[9px] border border-purple-200">
                              🧪 Test Post
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span>From: <strong className="text-slate-700">{log.ruleName}</strong></span>
                          <span>•</span>
                          <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                          {log.videoUrl && (
                            <>
                              <span>•</span>
                              <a
                                href={log.videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-red-600 hover:underline inline-flex items-center gap-0.5"
                              >
                                <span>YouTube</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status & Live Link */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          log.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : log.status === 'draft_saved'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : log.status === 'downloading'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {log.status === 'published'
                          ? '✓ Published to FB'
                          : log.status === 'draft_saved'
                          ? '📋 Saved in Library'
                          : log.status === 'downloading'
                          ? '⏳ Downloading MP4...'
                          : '✗ Failed'}
                      </span>

                      {log.publishedTargets?.map(
                        (pt) =>
                          pt.postUrl && (
                            <a
                              key={pt.pageId}
                              href={pt.postUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 inline-flex items-center gap-1"
                            >
                              <span>View Post</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TEST POST TO FACEBOOK MODAL ("Har Bar Naya Video") */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {isTestModalOpen && testModalRule && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full p-6 space-y-5 shadow-2xl relative my-8">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">
                      Test Video Download &amp; Save to Post Library
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Channel: <strong className="text-slate-700">{testModalRule.channelTitle}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  disabled={testStep === 'running'}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Informative Banner */}
              <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 border border-purple-200/80 rounded-2xl flex items-start gap-3 text-xs text-purple-950 shadow-2xs">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-extrabold text-purple-900 block">
                    ⚡ Auto-Rotation &amp; Post Library Integration:
                  </span>
                  <p className="text-[11px] text-purple-800 leading-relaxed">
                    हर बार टेस्ट बटन दबाने पर इस चैनल से <strong>एक बिल्कुल नई (Fresh) वीडियो</strong> डाउनलोड होकर सीधे आपकी <strong>Post Library</strong> में Draft के रूप में सेव हो जाएगी। फिर आप Library से जब चाहें 1-क्लिक में Facebook पर पोस्ट कर सकते हैं!
                  </p>
                </div>
              </div>

              {/* Channel & Rule Summary */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {testModalRule.channelAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={testModalRule.channelAvatar}
                      alt={testModalRule.channelTitle}
                      className="w-10 h-10 rounded-full object-cover border border-red-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 font-bold flex items-center justify-center shrink-0">
                      YT
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-black text-xs text-slate-900 truncate">
                      {testModalRule.channelTitle}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono block truncate">
                      {testModalRule.channelHandle || testModalRule.channelId}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-[10px] border border-purple-200">
                    {testModalRule.filterType === 'shorts_only'
                      ? 'Shorts Only (9:16)'
                      : testModalRule.filterType === 'videos_only'
                      ? 'Videos Only'
                      : 'All Videos'}
                  </span>
                </div>
              </div>

              {/* Target Facebook Page Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Pre-selected Target Facebook Page:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Will be pre-filled on the Draft in Library</span>
                </label>
                <select
                  value={testSelectedPageId}
                  onChange={(e) => setTestSelectedPageId(e.target.value)}
                  disabled={testStep === 'running'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  {pages
                    .filter((p) => p.platform === 'facebook')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Facebook Page)
                      </option>
                    ))}
                  {pages.filter((p) => p.platform !== 'facebook').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.platform})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Display Area */}
              {testStep === 'running' && (
                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-center gap-3 text-xs text-purple-900 font-bold animate-pulse">
                  <RefreshCw className="w-5 h-5 text-purple-600 animate-spin shrink-0" />
                  <div className="space-y-0.5">
                    <span>{testStatusMsg}</span>
                    <p className="text-[10px] text-purple-700 font-normal">
                      Server downloading via yt-dlp &amp; saving to Post Library...
                    </p>
                  </div>
                </div>
              )}

              {testStep === 'error' && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 text-xs text-rose-900 font-bold">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div className="space-y-0.5">
                      <span>Error: {testStatusMsg}</span>
                      <p className="text-[10px] text-rose-700 font-normal">
                        {testStatusMsg.includes('not a bot') || testStatusMsg.includes('Sign in')
                          ? 'YouTube Cloud Datacenter Bot Block: YouTube requires authenticated cookies to download from cloud hosting.'
                          : 'Please verify that your server has Python and FFmpeg installed and the YouTube video is publicly accessible.'}
                      </p>
                    </div>
                  </div>

                  {(testStatusMsg.includes('not a bot') || testStatusMsg.includes('Sign in')) && (
                    <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-rose-800 font-semibold">
                        🍪 Cookies add karne ke baad ye problem permanent solve ho jayegi:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCookieModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <span>🍪 Add YouTube Cookies</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {testStep === 'success' && testResultData && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>🎉 Video Successfully Downloaded &amp; Saved to Post Library!</span>
                  </div>

                  <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                    यह वीडियो सफलतापूर्वक आपके सर्वर पर डाउनलोड हो गई है और आपकी <strong>Post Library</strong> में Draft के रूप में सेव कर दी गई है।
                  </p>

                  {/* Video Details Card */}
                  <div className="bg-white rounded-xl border border-emerald-200 p-3 flex items-start gap-3">
                    {testResultData.video?.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={testResultData.video.thumbnailUrl}
                        alt={testResultData.video.title}
                        className="w-20 h-14 rounded-lg object-cover bg-slate-900 shrink-0 border border-slate-200"
                      />
                    )}
                    <div className="min-w-0 space-y-1">
                      <h5 className="font-extrabold text-xs text-slate-900 line-clamp-2">
                        {testResultData.video?.title}
                      </h5>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        {testResultData.video?.isShort ? (
                          <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 font-bold">Short (9:16)</span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-bold">Video</span>
                        )}
                        {testResultData.video?.fileSizeBytes && (
                          <span>{(testResultData.video.fileSizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                        )}
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 font-bold">
                          ✓ In Post Library
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Link to Post Library */}
                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    <Link
                      href="/library?status=draft"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>📂 Open Post Library</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleExecuteTest(testModalRule.id, testSelectedPageId)}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Test Next New Video 🔄</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  disabled={testStep === 'running'}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>

                {testStep !== 'success' && (
                  <button
                    type="button"
                    onClick={() => handleExecuteTest(testModalRule.id, testSelectedPageId)}
                    disabled={testStep === 'running'}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {testStep === 'running' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Downloading &amp; Saving to Library...</span>
                      </>
                    ) : (
                      <>
                        <FlaskConical className="w-3.5 h-3.5" />
                        <span>Download &amp; Save to Post Library</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* YOUTUBE COOKIES MANAGER MODAL */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {isCookieModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl relative my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg">
                    🍪
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">
                      YouTube Server Cookies (Bypass Bot Checks)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Allows server to download from YouTube on Hostinger without bot blocks
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCookieModalOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Status Badge */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                  cookiesStatus?.hasCookies
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-bold'
                    : 'bg-amber-50 border-amber-200 text-amber-950 font-bold'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{cookiesStatus?.hasCookies ? '✅ Cookies Active on Server' : '⚠️ No Cookies Configured'}</span>
                  {cookiesStatus?.fileSizeBytes && (
                    <span className="text-[10px] text-slate-500 font-normal">
                      ({(cookiesStatus.fileSizeBytes / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>
                {cookiesStatus?.updatedAt && (
                  <span className="text-[10px] text-slate-500 font-normal">
                    Updated: {new Date(cookiesStatus.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Instructions */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-700 space-y-1.5 leading-relaxed">
                <p className="font-bold text-slate-900">💡 How to get cookies.txt (1-minute guide):</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Browser me extension install karein: <strong>Get cookies.txt LOCALLY</strong></li>
                  <li>YouTube.com par jayein (apne kisi bhi normal account se login).</li>
                  <li>Extension icon par click karein aur <strong>Export</strong> ya text copy karein.</li>
                  <li>Neeche diye box me paste karke <strong>Save Cookies</strong> dabayein.</li>
                </ol>
              </div>

              {cookieSaveMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{cookieSaveMsg}</span>
                </div>
              )}

              {/* Cookie Content Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Paste Netscape Format cookies.txt:
                </label>
                <textarea
                  rows={6}
                  value={cookieInputText}
                  onChange={(e) => setCookieInputText(e.target.value)}
                  placeholder={`# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t...\tSAPISID\t...\n.youtube.com\tTRUE\t/\tTRUE\t...\t__Secure-3PSID\t...`}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none text-slate-800"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCookieModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveCookies}
                  disabled={isSavingCookies || !cookieInputText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingCookies ? 'Saving...' : 'Save Cookies on Server'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ADD / EDIT RULE MODAL */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 shadow-2xl relative my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">
                      {editingRuleId ? 'Edit YouTube Auto-Sync Rule' : 'Add New YouTube Channel Watcher'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Auto-downloads newly uploaded videos and posts them to your Facebook pages.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {resolveError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{resolveError}</span>
                </div>
              )}

              <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
                {/* Step 1: YouTube Channel Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    YouTube Channel URL or Handle <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={channelInput}
                      onChange={(e) => setChannelInput(e.target.value)}
                      placeholder="e.g. @aajtak or https://youtube.com/@mkbhd"
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-[#F8F9FD] focus:bg-white focus:outline-none focus:border-red-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleResolveChannel}
                      disabled={isResolving}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      {isResolving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Verify Channel</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Resolved Channel Card Preview */}
                {resolvedChannel && (
                  <div className="p-3.5 rounded-2xl bg-red-50/50 border border-red-200/80 flex items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-3">
                      {resolvedChannel.channelAvatar && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolvedChannel.channelAvatar}
                          alt={resolvedChannel.channelTitle}
                          className="w-12 h-12 rounded-full object-cover border-2 border-red-500/20"
                        />
                      )}
                      <div>
                        <h4 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                          <span>{resolvedChannel.channelTitle}</span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                            Verified ✓
                          </span>
                        </h4>
                        <p className="text-[10px] text-slate-500 font-mono">
                          ID: {resolvedChannel.channelId}
                        </p>
                      </div>
                    </div>

                    <a
                      href={resolvedChannel.canonicalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-red-600 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Open Channel</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Sample Latest Videos Preview */}
                {sampleVideos.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 block">
                      Latest Feed Items ({sampleVideos.length}):
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {sampleVideos.slice(0, 3).map((sv) => (
                        <div key={sv.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] space-y-1">
                          {sv.thumbnailUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={sv.thumbnailUrl} alt={sv.title} className="w-full aspect-video rounded-lg object-cover" />
                          )}
                          <p className="font-bold text-slate-800 line-clamp-1">{sv.title}</p>
                          <span className={`px-1 rounded text-[9px] font-bold ${sv.isShort ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                            {sv.isShort ? 'Short (<60s)' : 'Video'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rule Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Automation Rule Name
                  </label>
                  <input
                    type="text"
                    required
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g. Aaj Tak Shorts to News Page"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-[#F8F9FD] focus:bg-white focus:outline-none focus:border-red-500 font-medium"
                  />
                </div>

                {/* Filter Type & Publishing Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Content Type Filter
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as YouTubeContentFilter)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-[#F8F9FD] font-semibold"
                    >
                      <option value="shorts_only">⚡ Shorts Only (&lt; 60 seconds) - Recommended</option>
                      <option value="videos_only">🎬 Long Videos Only</option>
                      <option value="all">🌐 All Videos &amp; Shorts</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Publishing Mode
                    </label>
                    <select
                      value={publishMode}
                      onChange={(e) => setPublishMode(e.target.value as YouTubePublishMode)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-[#F8F9FD] font-semibold"
                    >
                      <option value="save_as_draft">📋 Save to Post Library for Review (Draft) - Recommended</option>
                      <option value="auto_publish">⚡ Direct Auto-Publish (Live to Facebook)</option>
                    </select>
                  </div>
                </div>

                {/* Target Facebook Pages Multi-Select */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 block">
                      Select Target Facebook Pages &amp; Instagram Profiles <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {targetPageIds.length} Selected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1 border border-slate-200 rounded-2xl bg-[#F8F9FD]">
                    {pages.map((p) => {
                      const isSelected = targetPageIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleTogglePage(p.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                            isSelected
                              ? 'bg-blue-50/70 border-blue-500 text-blue-950 font-bold'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              f
                            </span>
                            <span className="text-xs truncate">{p.name}</span>
                          </div>
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Hashtags & Options */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Custom Hashtags (Appended to Post)
                  </label>
                  <input
                    type="text"
                    value={customHashtags}
                    onChange={(e) => setCustomHashtags(e.target.value)}
                    placeholder="#news #viral #reels"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-[#F8F9FD]"
                  />
                </div>

                <div className="flex items-center gap-4 flex-wrap pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDescription}
                      onChange={(e) => setIncludeDescription(e.target.checked)}
                      className="rounded accent-red-600"
                    />
                    <span>Include YouTube Video Description</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkInComment}
                      onChange={(e) => setLinkInComment(e.target.checked)}
                      className="rounded accent-red-600"
                    />
                    <span>Put Original Video Link in 1st Comment (Credit &amp; Reach)</span>
                  </label>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !resolvedChannel}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Save &amp; Activate Auto-Pilot</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
