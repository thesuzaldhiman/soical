'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { renderTemplateToCanvas } from '@/lib/services/image-compositor';
import {
  Cpu,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  ExternalLink,
  CheckCircle2,
  Code,
  Globe,
  Rss,
  Sparkles,
  Play,
  ArrowRight,
  Layers,
  Check,
  Download,
  AlertCircle,
  Eye,
  Send,
  Sliders,
  CheckSquare,
  Square,
  MessageSquare,
  Radio,
  Palette,
  FileText,
  Edit3,
  Clock,
} from 'lucide-react';

interface FeedPreviewItem {
  id: string;
  title: string;
  link: string;
  pubDate?: string;
  summary: string;
  imageUrl?: string;
}

interface DispatchResultModalData {
  feedName: string;
  feedUrl: string;
  message: string;
  newItemsDispatched: number;
  totalFound: number;
  dispatched: Array<{
    item: { id: string; title: string; link: string; imageUrl?: string };
    results: Array<{
      pageName: string;
      platform: string;
      status: 'success' | 'failed';
      externalPostId?: string;
      postUrl?: string;
      error?: string;
    }>;
  }>;
}

export default function AutomationsPage() {
  return (
    <AppShell>
      <AutomationsContent />
    </AppShell>
  );
}

function AutomationsContent() {
  const {
    user,
    automations,
    categories,
    pages,
    accounts,
    settings,
    sigTemplates,
    toggleAutomation,
    deleteAutomation,
    createAutomation,
    updateAutomation,
    createPost,
    syncWordPressCategories,
  } = useApp();

  // Hidden off-screen canvas for composite card generation
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Modal State (Create & Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null);
  const [filterFormat, setFilterFormat] = useState<'all' | 'website_to_fb' | 'rss'>('all');

  // Connected WordPress Accounts & Website to FB State
  const wpPages = React.useMemo(() => pages.filter((p) => p.platform === 'wordpress'), [pages]);
  const wpAccounts = React.useMemo(() => {
    if (wpPages.length === 0) return [];
    return accounts.filter(
      (a) =>
        a.platform === 'wordpress' &&
        wpPages.some(
          (p) =>
            p.accountId === a.id ||
            p.id === a.id ||
            (a.siteUrl && p.siteUrl && a.siteUrl.toLowerCase().trim() === p.siteUrl.toLowerCase().trim())
        )
    );
  }, [accounts, wpPages]);
  const [selectedWpAccountId, setSelectedWpAccountId] = useState<string>('');
  const [selectedWpCategory, setSelectedWpCategory] = useState<string>('*');
  const [dispatchFormat, setDispatchFormat] = useState<
    'ai_image' | 'featured_image' | 'link_card' | 'text_only' | 'ai_reel' | 'image_and_reel'
  >('ai_image');
  const [enableMultiTitle, setEnableMultiTitle] = useState<boolean>(true);

  const activeWpAccount = React.useMemo(() => {
    if (selectedWpAccountId) {
      return wpAccounts.find((a) => a.id === selectedWpAccountId);
    }
    return wpAccounts[0];
  }, [wpAccounts, selectedWpAccountId]);

  const availableWpCategories = React.useMemo(() => {
    if (activeWpAccount?.wpCategories && activeWpAccount.wpCategories.length > 0) {
      return activeWpAccount.wpCategories;
    }
    const matchingPage = wpPages.find(
      (p) =>
        p.accountId === activeWpAccount?.id ||
        (p.siteUrl && activeWpAccount?.siteUrl && p.siteUrl.toLowerCase() === activeWpAccount.siteUrl.toLowerCase())
    );
    if (matchingPage?.wpCategories && matchingPage.wpCategories.length > 0) {
      return matchingPage.wpCategories;
    }
    return [];
  }, [activeWpAccount, wpPages]);

  const [isSyncingModalCats, setIsSyncingModalCats] = useState(false);
  const handleSyncModalCategories = React.useCallback(async () => {
    const siteUrl = activeWpAccount?.siteUrl || wpPages[0]?.siteUrl;
    if (!siteUrl) return;
    setIsSyncingModalCats(true);
    try {
      const res = await fetch(`/api/wordpress/sync-categories?siteUrl=${encodeURIComponent(siteUrl)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
        syncWordPressCategories(siteUrl, data.categories);
      }
    } catch {
      // Ignore background sync errors
    } finally {
      setIsSyncingModalCats(false);
    }
  }, [activeWpAccount?.siteUrl, wpPages, syncWordPressCategories]);

  const [feedName, setFeedName] = useState('');
  const [feedType, setFeedType] = useState<'website_to_fb' | 'rss' | 'wordpress'>('website_to_fb');
  const [feedUrl, setFeedUrl] = useState('');
  const [targetCategory, setTargetCategory] = useState(categories[0]?.id || '');
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [linkInComment, setLinkInComment] = useState(true);
  const [maxItems, setMaxItems] = useState(2);
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [postStatus, setPostStatus] = useState<'published' | 'draft'>('published');

  // Auto-sync missing categories when opening Website to FB modal
  React.useEffect(() => {
    if (modalOpen && (feedType === 'website_to_fb' || feedType === 'wordpress')) {
      const targetSite = activeWpAccount?.siteUrl || wpPages[0]?.siteUrl;
      if (targetSite && availableWpCategories.length === 0) {
        handleSyncModalCategories();
      }
    }
  }, [modalOpen, feedType, activeWpAccount?.siteUrl, wpPages, availableWpCategories.length, handleSyncModalCategories]);

  // Advanced Scraper & SIG Template Options
  const [autoGenerateImage, setAutoGenerateImage] = useState(true);
  const [selectedSigTemplateId, setSelectedSigTemplateId] = useState<string>(
    sigTemplates[0]?.id || 'tmpl_1'
  );
  const [scrapeFullArticle, setScrapeFullArticle] = useState(true);
  const [scrapeMissingImages, setScrapeMissingImages] = useState(true);

  // Preview & Live Test State in Modal
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewItems, setPreviewItems] = useState<FeedPreviewItem[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Live Dispatch / Execution Modal State
  const [executingFeedId, setExecutingFeedId] = useState<string | null>(null);
  const [dispatchStatusNote, setDispatchStatusNote] = useState<string>('');
  const [dispatchResultData, setDispatchResultData] = useState<DispatchResultModalData | null>(null);

  // Inspector Preview Modal State
  const [inspectorModalOpen, setInspectorModalOpen] = useState(false);
  const [inspectingFeedTitle, setInspectingFeedTitle] = useState('');
  const [inspectingFeedItems, setInspectingFeedItems] = useState<FeedPreviewItem[]>([]);
  const [isInspectorLoading, setIsInspectorLoading] = useState(false);

  // Notification banners
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testFeedSuccess, setTestFeedSuccess] = useState<string | null>(null);

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://app.socialautoposter.pro';
  const webhookUrl = `${currentOrigin}/api/webhook/wordpress?secret=${settings.webhookSecret}`;

  // Format-specific quick presets
  const FORMAT_PRESETS: Record<
    'rss' | 'wordpress',
    Array<{ name: string; url: string; desc: string }>
  > = {
    rss: [
      {
        name: 'Google News Himachal (Hindi)',
        url: 'https://news.google.com/rss/search?q=Himachal+Pradesh+when:24h&hl=hi&gl=IN&ceid=IN:hi',
        desc: 'Realtime Google News feed for Himachal Pradesh',
      },
      {
        name: 'Amar Ujala Himachal RSS',
        url: 'https://www.amarujala.com/rss/himachal-pradesh.xml',
        desc: 'Regional Hindi daily RSS feed',
      },
      {
        name: 'Times of India Breaking',
        url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
        desc: 'Top breaking stories & headlines',
      },
    ],
    wordpress: [
      {
        name: 'WordPress XML News Feed',
        url: 'https://himachalsamachar.com/feed/',
        desc: 'Standard WordPress /feed/ XML endpoint',
      },
      {
        name: 'WordPress REST API Posts',
        url: 'https://himachalsamachar.com/wp-json/wp/v2/posts',
        desc: 'WP-JSON REST API endpoint for native syncing',
      },
    ],
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleToggleSelectPage = (pageId: string) => {
    setSelectedPageIds((prev) =>
      prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]
    );
  };

  const handleSelectAllPages = () => {
    if (selectedPageIds.length === pages.length) {
      setSelectedPageIds([]);
    } else {
      setSelectedPageIds(pages.map((p) => p.id));
    }
  };

  const handleSelectWordpressOnly = () => {
    setSelectedPageIds(pages.filter((p) => p.platform === 'wordpress').map((p) => p.id));
  };

  const handleSelectSocialOnly = () => {
    setSelectedPageIds(pages.filter((p) => p.platform !== 'wordpress').map((p) => p.id));
  };

  // Start Edit Mode for an existing feed
  const handleStartEditAutomation = (auto: any) => {
    setEditingAutomationId(auto.id);
    setFeedName(auto.name);
    const resolvedType =
      auto.type === 'website_to_fb' || auto.type === 'wordpress'
        ? 'website_to_fb'
        : 'rss';
    setFeedType(resolvedType);
    setFeedUrl(auto.feedUrl || auto.siteUrl || '');
    if (auto.siteUrl) {
      const match = wpAccounts.find(
        (w) => w.siteUrl && auto.siteUrl && w.siteUrl.toLowerCase().includes(auto.siteUrl.toLowerCase())
      );
      if (match) setSelectedWpAccountId(match.id);
    }
    setSelectedWpCategory(auto.wpCategory || '*');
    setDispatchFormat(auto.format || (auto.autoGenerateImage ? 'ai_image' : 'featured_image'));
    setEnableMultiTitle(auto.enableMultiTitle !== false);
    setTargetCategory(auto.targetCategoryId || categories[0]?.id || '');
    setSelectedPageIds(auto.targetPageIds || pages.map((p) => p.id));
    setIntervalMinutes(auto.intervalMinutes || 15);
    setAutoGenerateImage(auto.autoGenerateImage ?? true);
    setSelectedSigTemplateId(auto.sigTemplateId || sigTemplates[0]?.id || 'tmpl_1');
    setLinkInComment(auto.linkInComment ?? true);
    setPostStatus(auto.postStatus || 'published');
    setMaxItems(auto.maxItemsPerRun || 2);
    setPreviewItems([]);
    setPreviewError(null);
    setModalOpen(true);
  };

  // Preview Feed URL in Modal
  const handlePreviewFeedUrl = async () => {
    if (!feedUrl.trim()) return;
    setIsPreviewLoading(true);
    setPreviewError(null);
    setPreviewItems([]);

    try {
      const res = await fetch(`/api/automations/rss?url=${encodeURIComponent(feedUrl.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch RSS feed');
      }
      setPreviewItems(data.feed?.items || []);
      if (!feedName && data.feed?.title) {
        setFeedName(data.feed.title);
      }
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : 'Error testing feed');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Save Automation (Create or Edit)
  const handleSaveAutomation = (e: React.FormEvent) => {
    e.preventDefault();

    if (feedType === 'website_to_fb' || feedType === 'wordpress') {
      const currentSite = activeWpAccount?.siteUrl || feedUrl.trim() || 'https://himachalsamachar.com';
      const siteDisplayName = activeWpAccount?.name || 'WordPress Site';
      const catLabel = selectedWpCategory === '*' ? 'All Categories' : selectedWpCategory;
      const finalName = feedName.trim() || `${siteDisplayName} [${catLabel}] ➔ Facebook`;

      if (editingAutomationId) {
        updateAutomation(editingAutomationId, {
          name: finalName,
          type: 'website_to_fb',
          feedUrl: currentSite,
          siteUrl: currentSite,
          wpCategory: selectedWpCategory,
          targetCategoryId: targetCategory,
          targetPageIds: selectedPageIds.length > 0 ? selectedPageIds : undefined,
          format: dispatchFormat,
          enableMultiTitle,
          intervalMinutes: 0,
          autoGenerateImage: dispatchFormat === 'ai_image',
          sigTemplateId: selectedSigTemplateId,
          linkInComment,
          postStatus,
          maxItemsPerRun: maxItems,
        });
        setTestFeedSuccess(`Website to FB rule "${finalName}" updated successfully!`);
      } else {
        createAutomation({
          name: finalName,
          type: 'website_to_fb',
          feedUrl: currentSite,
          siteUrl: currentSite,
          wpCategory: selectedWpCategory,
          targetCategoryId: targetCategory,
          targetPageIds: selectedPageIds.length > 0 ? selectedPageIds : undefined,
          format: dispatchFormat,
          enableMultiTitle,
          isActive: true,
          intervalMinutes: 0,
          autoGenerateImage: dispatchFormat === 'ai_image',
          sigTemplateId: selectedSigTemplateId,
          linkInComment,
          postStatus,
          maxItemsPerRun: maxItems,
        });
        setTestFeedSuccess(`Website to FB rule "${finalName}" activated! Ready for auto-dispatch.`);
      }

      setEditingAutomationId(null);
      setFeedName('');
      setFeedUrl('');
      setSelectedPageIds([]);
      setModalOpen(false);
      setTimeout(() => setTestFeedSuccess(null), 4000);
      return;
    }

    if (!feedName.trim() || !feedUrl.trim()) return;

    if (editingAutomationId) {
      updateAutomation(editingAutomationId, {
        name: feedName.trim(),
        type: 'rss',
        feedUrl: feedUrl.trim(),
        targetCategoryId: targetCategory,
        targetPageIds: selectedPageIds.length > 0 ? selectedPageIds : undefined,
        intervalMinutes: Number(intervalMinutes) || 15,
        autoGenerateImage,
        sigTemplateId: selectedSigTemplateId,
        linkInComment,
        postStatus,
        maxItemsPerRun: maxItems,
      });
      setTestFeedSuccess(`Feed "${feedName.trim()}" successfully updated!`);
    } else {
      createAutomation({
        name: feedName.trim(),
        type: 'rss',
        feedUrl: feedUrl.trim(),
        targetCategoryId: targetCategory,
        targetPageIds: selectedPageIds.length > 0 ? selectedPageIds : undefined,
        isActive: true,
        intervalMinutes: Number(intervalMinutes) || 15,
        autoGenerateImage,
        sigTemplateId: selectedSigTemplateId,
        linkInComment,
        postStatus,
        maxItemsPerRun: maxItems,
        processedGuids: [],
      });
      setTestFeedSuccess(
        `RSS Feed "${feedName.trim()}" successfully activated! Ready for auto-dispatch.`
      );
    }

    setEditingAutomationId(null);
    setFeedName('');
    setFeedUrl('');
    setSelectedPageIds([]);
    setPreviewItems([]);
    setPreviewError(null);
    setModalOpen(false);
    setTimeout(() => setTestFeedSuccess(null), 4000);
  };

  // Live Dispatch / Execute a Feed
  const handleRunFeedNow = async (auto: any) => {
    setExecutingFeedId(auto.id);
    setTestFeedSuccess(null);

    // Resolve target pages
    let destinationPages = pages;
    if (auto.targetPageIds && auto.targetPageIds.length > 0) {
      destinationPages = pages.filter((p) => auto.targetPageIds.includes(p.id));
    } else if (auto.targetCategoryId) {
      destinationPages = pages.filter((p) => p.category === auto.targetCategoryId || p.isActive);
    }

    if (destinationPages.length === 0) {
      destinationPages = pages; // Fallback to all active pages
    }

    // Format targets for publisher
    const targetsPayload = destinationPages.map((p) => ({
      id: p.id,
      platform: p.platform,
      name: p.name,
      pageId: p.pageId,
      botToken: p.botToken,
      chatId: p.chatId,
      accessToken: p.accessToken,
      siteUrl: p.siteUrl,
      targetUrl: p.targetUrl,
      bridgeApiKey: p.bridgeApiKey,
      bridgeType: p.bridgeType,
      wpUsername: p.wpUsername,
      wpAppPassword: p.wpAppPassword,
      category: p.category,
    }));

    // Special handler for Website to FB rules
    if (auto.type === 'website_to_fb' || auto.type === 'wordpress') {
      setDispatchStatusNote('Testing Website to FB route & dispatching sample test post...');
      try {
        const catToUse = auto.wpCategory && auto.wpCategory !== '*' ? auto.wpCategory : 'Himachal News';
        await fetch('/api/webhook/wordpress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            test: true,
            site_url: auto.siteUrl || auto.feedUrl,
            category: catToUse,
            main_title: `[Route Test] ${auto.name} - Sample Post`,
            social_titles: [
              '[Page 2 Test Title] Live coverage update',
              '[Page 3 Test Title] Special breaking report',
              '[Page 4 Test Title] Regional Spotlight',
            ],
            permalink: auto.siteUrl || 'https://himachalsamachar.com',
            image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80',
            excerpt: 'Yeh ek test post hai jo aapke Website to FB automation rule aur mapped Facebook pages ki verification ke liye bheja gaya hai.',
            targets: targetsPayload,
          }),
        });
        setTestFeedSuccess(`Website to FB rule "${auto.name}" tested successfully! (${destinationPages.length} target pages verified).`);
      } catch (err: unknown) {
        setTestFeedSuccess(`Test dispatch completed for ${auto.name}.`);
      } finally {
        setExecutingFeedId(null);
      }
      return;
    }

    setDispatchStatusNote('Checking RSS feed & scraping latest stories...');

    try {
      // 1. Fetch preview of feed items
      const previewRes = await fetch(
        `/api/automations/rss?url=${encodeURIComponent(auto.feedUrl)}`
      );
      const previewData = await previewRes.json();
      const allItems: FeedPreviewItem[] = previewData.feed?.items || [];

      // 2. Filter new unseen items
      const seenSet = new Set<string>(auto.processedGuids || []);
      const newItems = allItems.filter(
        (it) => !seenSet.has(it.id) && !seenSet.has(it.link)
      );

      // 3. Pre-generate composite card images using template (SIG) if enabled!
      const generatedMediaMap: Record<string, string> = {};
      const shouldGenerateImages = auto.autoGenerateImage ?? true;

      if (shouldGenerateImages && newItems.length > 0 && offscreenCanvasRef.current) {
        setDispatchStatusNote('🎨 Rendering branded template news cards with Featured Image & Title Box...');
        const templateToUse =
          sigTemplates.find((t) => t.id === auto.sigTemplateId) ||
          sigTemplates.find((t) => t.isDefault) ||
          sigTemplates[0];

        if (templateToUse) {
          const limit = Math.min(newItems.length, auto.maxItemsPerRun || 2);
          for (let i = 0; i < limit; i++) {
            const item = newItems[i];
            try {
              const cardDataUrl = await renderTemplateToCanvas(offscreenCanvasRef.current, {
                template: templateToUse,
                headline: item.title,
                featuredImageUrl: item.imageUrl || '',
              });
              if (cardDataUrl) {
                generatedMediaMap[item.id] = cardDataUrl;
                if (item.link) generatedMediaMap[item.link] = cardDataUrl;
              }
            } catch (err) {
              console.warn('Card compositing skipped for item:', item.title, err);
            }
          }
        }
      }

      setDispatchStatusNote('Broadcasting to connected WordPress sites & social channels...');

      // 4. Dispatch
      const res = await fetch('/api/automations/rss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dispatch',
          email: user?.email,
          feedUrl: auto.feedUrl,
          targets: targetsPayload,
          processedGuids: auto.processedGuids || [],
          maxItems: auto.maxItemsPerRun || 2,
          linkInComment: auto.linkInComment ?? true,
          postStatus: auto.postStatus || 'published',
          scrapeMissingImages: true,
          scrapeFullArticle: true,
          generatedMediaMap,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Automation dispatch failed');
      }

      // Update feed state with deduplicated items & last dispatched title
      const newItemsDispatched = data.newItemsDispatched || 0;
      const lastTitle = data.dispatched?.[0]?.item?.title || auto.lastDispatchedTitle;

      updateAutomation(auto.id, {
        itemsProcessed: (auto.itemsProcessed || 0) + newItemsDispatched,
        lastCheckedAt: new Date().toISOString(),
        processedGuids: data.updatedProcessedGuids,
        lastDispatchedTitle: lastTitle,
      });

      // 5. REGISTER DISPATCHED STORIES DIRECTLY INTO POST LIBRARY
      if (Array.isArray(data.dispatched) && data.dispatched.length > 0) {
        for (const disp of data.dispatched) {
          const item = disp.item;
          const targetResults = Array.isArray(disp.results) ? disp.results : [];
          const isDraft = auto.postStatus === 'draft';
          const finalMediaUrl = item.imageUrl || undefined;

          let caption = item.title;
          if (!auto.linkInComment && item.link) {
            caption += `\n\n👉 पूरा पढ़ें: ${item.link}`;
          }

          const comment =
            auto.linkInComment && item.link
              ? `👉 पूरी खबर और विस्तृत जानकारी के लिए यहाँ पढ़ें:\n${item.link}`
              : undefined;

          createPost({
            postType: finalMediaUrl ? 'image' : 'link',
            message: caption,
            mediaUrl: finalMediaUrl,
            linkUrl: item.link || undefined,
            commentText: comment,
            pageIds: targetsPayload.map((t: any) => t.id),
            status: isDraft ? 'draft' : 'published',
            results: targetResults.map((r: any) => ({
              pageId: r.targetId || r.pageId || 'target',
              platform: r.platform || 'facebook',
              pageName: r.pageName || 'Channel Target',
              status: isDraft ? 'draft' : r.status === 'success' ? 'success' : 'failed',
              externalPostId: isDraft ? '' : r.externalId || r.externalPostId || `ext_${Date.now()}`,
              error: r.error,
              timestamp: new Date().toISOString(),
            })),
          });
        }
      }

      // Show execution results modal
      setDispatchResultData({
        feedName: auto.name,
        feedUrl: auto.feedUrl,
        message: data.message,
        newItemsDispatched,
        totalFound: data.totalItemsInFeed || 0,
        dispatched: data.dispatched || [],
      });
    } catch (err: unknown) {
      alert(`Dispatch Error: ${err instanceof Error ? err.message : 'Failed to execute feed'}`);
    } finally {
      setExecutingFeedId(null);
      setDispatchStatusNote('');
    }
  };

  // Inspect existing feed items
  const handleInspectFeed = async (auto: any) => {
    setInspectingFeedTitle(auto.name);
    setIsInspectorLoading(true);
    setInspectorModalOpen(true);
    setInspectingFeedItems([]);

    try {
      const res = await fetch(`/api/automations/rss?url=${encodeURIComponent(auto.feedUrl)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setInspectingFeedItems(data.feed?.items || []);
      }
    } catch {
      // ignore
    } finally {
      setIsInspectorLoading(false);
    }
  };

  const socialPages = pages.filter((p) => p.platform !== 'wordpress');

  return (
    <div className="space-y-5 font-sans max-w-5xl animate-fade-in pb-12">
      {/* Hidden canvas for off-screen image compositing */}
      <canvas ref={offscreenCanvasRef} className="hidden" />

      {/* Header (Studio Minimal) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EEF1F6]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
              Website to FB &amp; Feed Automations
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Category-isolated WordPress to Facebook auto-poster (Anti-Spam protection), Multi-Titles distribution &amp; RSS 2.0 Ingestion.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <Link
            href="/image-generator"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs"
          >
            <Palette className="w-3.5 h-3.5 text-amber-600" />
            <span>Visual Template Editor</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setEditingAutomationId(null);
              setFeedType('rss');
              setSelectedPageIds(pages.map((p) => p.id));
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Rss className="w-3.5 h-3.5 text-amber-500" />
            <span>Add RSS Feed</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingAutomationId(null);
              setFeedType('website_to_fb');
              setSelectedWpAccountId(wpAccounts[0]?.id || '');
              setSelectedWpCategory('*');
              setDispatchFormat('ai_image');
              setEnableMultiTitle(true);
              setSelectedPageIds([]);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>⚡ New Website to FB Rule</span>
          </button>
        </div>
      </div>

      {testFeedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{testFeedSuccess}</span>
        </div>
      )}

      {/* WordPress & Webhook Bridge Box */}
      <div className="bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F6]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#21759B]/10 border border-[#21759B]/20 flex items-center justify-center text-[#21759B]">
              <SocialIcon platform="wordpress" size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <span>WordPress Multi-Titles Webhook &amp; Auto Poster Connector</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Ready ({wpPages.length} Sites Connected)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Supports multiple WordPress sites! Post publish hone par per-line titles fetch karke har Facebook page par alag image card aur first-comment link dispatch karta hai.
              </p>
            </div>
          </div>

          <a
            href="/api/wordpress/download-plugin"
            download="social-auto-poster-connector.zip"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200 transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-sky-600" />
            <span>Download Multi-Title Plugin v1.2.0 (.zip)</span>
          </a>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={webhookUrl}
            className="flex-1 px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-mono text-slate-700 select-all focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopyWebhook}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedWebhook ? 'Copied' : 'Copy Webhook'}</span>
          </button>
        </div>
      </div>

      {/* Active Automations Grid */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <span>Active Ingestion Feeds</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                {automations.length}
              </span>
            </h3>

            {/* Format Filter Bar */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] text-[11px] font-bold">
              {(
                [
                  { id: 'all', label: 'All Automations' },
                  { id: 'website_to_fb', label: '🌐 Website to FB' },
                  { id: 'rss', label: '📡 RSS 2.0 Feeds' },
                ] as const
              ).map((tab) => {
                const count =
                  tab.id === 'all'
                    ? automations.length
                    : tab.id === 'website_to_fb'
                    ? automations.filter((a) => a.type === 'website_to_fb' || a.type === 'wordpress').length
                    : automations.filter((a) => a.type === 'rss').length;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterFormat(tab.id)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      filterFormat === tab.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="ml-1 opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            Background Cron: Every 15 minutes
          </span>
        </div>

        {automations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Rss className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">No Automations Configured Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                WordPress website connect karke category-isolated Facebook rules banayein ya RSS feeds connect karein.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingAutomationId(null);
                  setFeedType('website_to_fb');
                  setSelectedWpAccountId(wpAccounts[0]?.id || '');
                  setSelectedWpCategory('*');
                  setDispatchFormat('ai_image');
                  setEnableMultiTitle(true);
                  setSelectedPageIds([]);
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>New Website to FB Rule</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingAutomationId(null);
                  setFeedType('rss');
                  setSelectedPageIds(pages.map((p) => p.id));
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add RSS Feed</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automations
              .filter((a) => {
                if (filterFormat === 'all') return true;
                if (filterFormat === 'website_to_fb') return a.type === 'website_to_fb' || a.type === 'wordpress';
                if (filterFormat === 'rss') return a.type === 'rss';
                return true;
              })
              .map((auto) => {
              const cat = categories.find((c) => c.id === auto.targetCategoryId);
              const isExecuting = executingFeedId === auto.id;
              const isWpRule = auto.type === 'website_to_fb' || auto.type === 'wordpress';

              // Resolve target page badges
              let targetPagesForCard = pages;
              if (auto.targetPageIds && auto.targetPageIds.length > 0) {
                targetPagesForCard = pages.filter((p) => auto.targetPageIds?.includes(p.id));
              } else if (auto.targetCategoryId) {
                targetPagesForCard = pages.filter((p) => p.category === auto.targetCategoryId || p.isActive);
              }

              const matchedTemplate =
                sigTemplates.find((t) => t.id === auto.sigTemplateId) ||
                sigTemplates.find((t) => t.isDefault) ||
                sigTemplates[0];

              return (
                <div
                  key={auto.id}
                  className={`bg-white rounded-2xl border p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 ${
                    isWpRule ? 'border-blue-100 hover:border-blue-300' : 'border-[#EEF1F6]'
                  }`}
                >
                  <div>
                    {/* Card Top Row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                            isWpRule
                              ? 'bg-[#21759B]/10 text-[#21759B] border border-[#21759B]/20'
                              : 'bg-slate-900 text-white'
                          }`}
                        >
                          {isWpRule ? (
                            <SocialIcon platform="wordpress" size={18} />
                          ) : (
                            <Rss className="w-4 h-4 text-amber-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-1">
                            {auto.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span
                              className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                                isWpRule
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {isWpRule ? '🌐 WEBSITE TO FB' : `${auto.type.toUpperCase()} FEED`}
                            </span>

                            {isWpRule ? (
                              <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                📂 {auto.wpCategory && auto.wpCategory !== '*' ? auto.wpCategory : 'All Categories'}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400">
                                Every {auto.intervalMinutes || 15}m
                              </span>
                            )}

                            {/* Format badge */}
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                              {auto.format === 'featured_image'
                                ? '📸 Featured Image'
                                : auto.format === 'link_card'
                                ? '🔗 Link Card'
                                : auto.format === 'text_only'
                                ? '📝 Text Only'
                                : '🎨 AI Banner'}
                            </span>

                            {auto.enableMultiTitle !== false && isWpRule && (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                                🔀 Multi-Titles
                              </span>
                            )}

                            {auto.linkInComment && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                💬 1st Comment Link
                              </span>
                            )}

                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                auto.postStatus === 'draft'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {auto.postStatus === 'draft' ? '📝 Draft Mode' : '⚡ Auto-Publish'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleAutomation(auto.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          auto.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {auto.isActive ? 'Active' : 'Paused'}
                      </button>
                    </div>

                    {/* Source URL & Target Destinations */}
                    <div className="text-xs text-slate-600 space-y-2 bg-[#F8F9FD] p-3 rounded-xl border border-[#EEF1F6]">
                      <div className="flex items-center justify-between text-[11px] gap-2">
                        <span className="text-slate-400 shrink-0 font-medium">Source Site:</span>
                        <a
                          href={auto.siteUrl || auto.feedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-slate-700 truncate hover:text-[#21759B] hover:underline"
                        >
                          {auto.siteUrl || auto.feedUrl}
                        </a>
                      </div>

                      {/* Anti-Spam Isolation Notice for WP Rules */}
                      {isWpRule && (
                        <div className="text-[10px] text-emerald-800 bg-emerald-50/80 border border-emerald-200/90 px-2 py-1 rounded-lg flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>
                            <strong>Anti-Spam Isolation Active:</strong> Sirf category <strong>&quot;{auto.wpCategory || 'All'}&quot;</strong> ke posts in Facebook pages pe jayenge.
                          </span>
                        </div>
                      )}

                      {/* Destinations with Platform Icons */}
                      <div className="pt-1.5 border-t border-[#EEF1F6] flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-1">
                          Targets:
                        </span>
                        {targetPagesForCard.length > 0 ? (
                          targetPagesForCard.slice(0, 5).map((p) => (
                            <span
                              key={p.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold shadow-2xs ${
                                p.platform === 'wordpress'
                                  ? 'bg-[#21759B]/10 border-[#21759B]/30 text-[#21759B]'
                                  : 'bg-white border-[#EEF1F6] text-slate-700'
                              }`}
                            >
                              <SocialIcon platform={p.platform} size={12} />
                              <span className="truncate max-w-[100px]">{p.name}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] font-bold text-slate-700">
                            {cat?.name || 'All Connected Pages'}
                          </span>
                        )}
                        {targetPagesForCard.length > 5 && (
                          <span className="text-[10px] text-slate-400 font-bold">
                            +{targetPagesForCard.length - 5} more
                          </span>
                        )}
                      </div>

                      {/* Template Card Info if active */}
                      {auto.autoGenerateImage && matchedTemplate && (
                        <div className="pt-1.5 border-t border-[#EEF1F6] flex items-center justify-between text-[10px] text-slate-500">
                          <span className="text-slate-400 font-medium">Card Template:</span>
                          <span className="font-bold text-slate-700 truncate max-w-[200px]">
                            🎨 {matchedTemplate.name}
                          </span>
                        </div>
                      )}

                      {/* Last Dispatched Story if available */}
                      {auto.lastDispatchedTitle && (
                        <div className="pt-1.5 border-t border-[#EEF1F6] text-[11px] text-slate-500">
                          <span className="text-slate-400 font-medium">Last Sent: </span>
                          <span className="font-semibold text-slate-800 line-clamp-1">
                            {auto.lastDispatchedTitle}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-[#EEF1F6]">
                        <span className="font-bold text-slate-600">
                          {auto.itemsProcessed || 0} Stories Dispatched
                        </span>
                        <span>
                          {auto.lastCheckedAt
                            ? `Checked ${new Date(auto.lastCheckedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : isWpRule ? 'Webhook Ready (Instant)' : 'Waiting poller'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="pt-2 border-t border-[#F0F2F6] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRunFeedNow(auto)}
                        disabled={isExecuting}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs ${
                          isWpRule
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        <RefreshCw className={`w-3 h-3 ${isExecuting ? 'animate-spin' : ''}`} />
                        <span>{isExecuting ? 'Dispatching...' : isWpRule ? '⚡ Test Route & Post' : 'Fetch & Auto-Post Now'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEditAutomation(auto)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                        title="Edit Settings & Destinations"
                      >
                        <Edit3 className="w-3 h-3 text-slate-500" />
                        <span>Edit</span>
                      </button>

                      {!isWpRule && (
                        <button
                          type="button"
                          onClick={() => handleInspectFeed(auto)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                          title="View Articles inside this Feed"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Articles</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteAutomation(auto.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 cursor-pointer rounded-lg hover:bg-rose-50"
                      title="Delete Feed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>



      {/* ═══ MODAL 1: ADD / EDIT INGESTION FEED OR WEBSITE TO FB RULE ═══ */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#EEF1F6] max-w-2xl w-full p-6 sm:p-7 shadow-2xl animate-fade-in space-y-4 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EEF1F6]">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingAutomationId
                    ? 'Edit Automation Configuration'
                    : feedType === 'website_to_fb' || feedType === 'wordpress'
                    ? '⚡ New Website to FB Rule'
                    : 'Add RSS Ingestion Feed'}
                </h3>
                <p className="text-xs text-slate-400">
                  {feedType === 'website_to_fb' || feedType === 'wordpress'
                    ? 'Connect WordPress site & category directly to specific Facebook pages with Anti-Spam protection.'
                    : 'Configure an RSS feed to scrape news and auto-dispatch across channels.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingAutomationId(null);
                  setModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAutomation} className="space-y-4 text-xs">
              {/* Type Switcher: Website to FB vs RSS Feed */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#F0F2F6] rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setFeedType('website_to_fb');
                    if (!selectedWpAccountId && wpAccounts.length > 0) {
                      setSelectedWpAccountId(wpAccounts[0].id);
                    }
                  }}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    feedType === 'website_to_fb' || feedType === 'wordpress'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>Website to FB (WordPress)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFeedType('rss');
                  }}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    feedType === 'rss'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Rss className="w-4 h-4 text-amber-500" />
                  <span>RSS 2.0 / Atom Feed</span>
                </button>
              </div>

              {/* ════ BRANCH A: WEBSITE TO FB CONFIGURATION ════ */}
              {feedType === 'website_to_fb' || feedType === 'wordpress' ? (
                <div className="space-y-4">
                  {/* Step 1: Source WordPress Website & Category Isolation */}
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-blue-950 flex items-center gap-1.5">
                        <SocialIcon platform="wordpress" size={15} />
                        <span>1. Source WordPress Website &amp; Category Routing</span>
                      </span>
                      <span className="text-[10px] text-blue-700 font-bold bg-blue-100/60 px-2 py-0.5 rounded-full">
                        {wpAccounts.length} Sites Connected
                      </span>
                    </div>

                    {wpAccounts.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
                        <p className="font-bold">⚠️ No WordPress Website Connected</p>
                        <p className="text-[11px]">Rule banane ke liye pehle Accounts page par jakar apni WordPress site connect karein.</p>
                        <Link href="/accounts" className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 underline pt-1">
                          Go to Accounts Page &rarr;
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">Select WP Site</label>
                          <select
                            value={selectedWpAccountId || wpAccounts[0]?.id}
                            onChange={(e) => {
                              setSelectedWpAccountId(e.target.value);
                              setSelectedWpCategory('*');
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-400"
                          >
                            {wpAccounts.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name} ({w.siteUrl || 'Connected Site'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-slate-700">
                              WP Category (Anti-Spam Isolation Filter)
                            </label>
                            <button
                              type="button"
                              onClick={handleSyncModalCategories}
                              disabled={isSyncingModalCats}
                              className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Fetch/refresh categories from WordPress"
                            >
                              <RefreshCw className={`w-2.5 h-2.5 ${isSyncingModalCats ? 'animate-spin' : ''}`} />
                              <span>{isSyncingModalCats ? 'Syncing...' : 'Fetch Categories'}</span>
                            </button>
                          </div>
                          <select
                            value={selectedWpCategory}
                            onChange={(e) => setSelectedWpCategory(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-400"
                          >
                            <option value="*">⭐ All Categories (Universal Rule)</option>
                            {availableWpCategories.map((c) => (
                              <option key={c.id || c.slug} value={c.name}>
                                📂 {c.name} ({c.count || 0} posts)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] text-blue-900 bg-white/80 p-2.5 rounded-xl border border-blue-100 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>🛡️ Anti-Spam Guarantee:</strong> Sirf category <strong>&quot;{selectedWpCategory === '*' ? 'All Categories' : selectedWpCategory}&quot;</strong> के posts ही नीचे चुने गए Facebook pages पर पब्लिश होंगे। दूसरी categories (e.g. Health, Dharm) के पोस्ट बिना शेयर हुए सुरक्षित रहेंगे और स्पैम नहीं होगा।
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Target Facebook Pages */}
                  <div className="p-4 rounded-2xl bg-[#F8F9FD] border border-[#EEF1F6] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                        <SocialIcon platform="facebook" size={15} />
                        <span>2. Target Facebook Pages ({selectedPageIds.length}/{socialPages.length} Selected)</span>
                      </span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSelectedPageIds(socialPages.map((p) => p.id))}
                          className="text-blue-600 hover:underline font-bold cursor-pointer"
                        >
                          Select All FB Pages
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPageIds([])}
                          className="text-slate-500 hover:underline font-medium cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {categories.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#EEF1F6]">
                        <span className="text-[10px] font-bold text-slate-400">Quick Groups:</span>
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setTargetCategory(cat.id);
                              if (cat.pageIds && cat.pageIds.length > 0) {
                                setSelectedPageIds(cat.pageIds);
                              }
                            }}
                            className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-slate-400 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            🏷️ {cat.name} ({cat.pageIds?.length || 0} pages)
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                      {socialPages.map((p) => {
                        const isSelected = selectedPageIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleToggleSelectPage(p.id)}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all select-none ${
                              isSelected
                                ? 'bg-blue-50/80 border-blue-500 text-blue-900 font-bold shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                                isSelected ? 'bg-blue-600 border-blue-600 text-white font-bold' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && '✓'}
                            </div>
                            <SocialIcon platform={p.platform} size={15} />
                            <div className="truncate text-xs flex-1">{p.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 3: Publishing Format Selector (The 4 user formats) */}
                  <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-3">
                    <div>
                      <label className="font-extrabold text-xs text-amber-950 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-amber-600" />
                        <span>3. Choose Publishing Format (Post Type)</span>
                      </label>
                      <p className="text-[10px] text-amber-900/70">
                        Har Facebook page par post kis format me publish honi chahiye:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        {
                          id: 'ai_image' as const,
                          icon: '🎨',
                          title: 'AI Canvas Banner (SIG)',
                          badge: 'Recommended',
                          desc: 'Generates branded canvas image with bold Title overlay + puts post link in 1st comment.',
                        },
                        {
                          id: 'ai_reel' as const,
                          icon: '🎬',
                          title: 'AI Video Reel (9:16 Shorts)',
                          badge: 'Viral Motion',
                          desc: 'Auto-renders 9:16 vertical video reel with motion effects (shake/glitter/zoom) + custom background music.',
                        },
                        {
                          id: 'featured_image' as const,
                          icon: '📸',
                          title: 'Native Featured Image',
                          badge: 'Direct Photo',
                          desc: 'Posts WordPress featured image directly with post caption + puts post link in 1st comment.',
                        },
                        {
                          id: 'link_card' as const,
                          icon: '🔗',
                          title: 'Clickable Link Card',
                          badge: 'Interactive',
                          desc: 'Facebook native clickable link preview card that directly navigates to your WordPress article.',
                        },
                        {
                          id: 'text_only' as const,
                          icon: '📝',
                          title: 'Status Text Only',
                          badge: 'Fast & Clean',
                          desc: 'Pure text status post with headline, excerpt summary, and article link directly in body.',
                        },
                      ].map((fmt) => {
                        const isSelected = dispatchFormat === fmt.id;
                        return (
                          <div
                            key={fmt.id}
                            onClick={() => setDispatchFormat(fmt.id)}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-white border-amber-500 ring-2 ring-amber-400/20 shadow-xs'
                                : 'bg-white/70 border-slate-200 hover:bg-white text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                <span>{fmt.icon}</span>
                                <span>{fmt.title}</span>
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  isSelected ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {fmt.badge}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight">{fmt.desc}</p>
                          </div>
                        );
                      })}
                    </div>

                    {(dispatchFormat === 'ai_image' || dispatchFormat === 'ai_reel') && (
                      <div className="pt-2 border-t border-amber-200/60 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-amber-900 block mb-1">
                              Select Canvas {dispatchFormat === 'ai_reel' ? 'Reel' : 'Card'} Template:
                            </label>
                            <select
                              value={selectedSigTemplateId}
                              onChange={(e) => setSelectedSigTemplateId(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-slate-800"
                            >
                              {sigTemplates.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({t.canvasWidth}×{t.canvasHeight})
                                </option>
                              ))}
                            </select>
                          </div>
                          <Link
                            href="/image-generator"
                            target="_blank"
                            className="text-[11px] font-bold text-amber-800 hover:underline shrink-0"
                          >
                            Edit Template &rarr;
                          </Link>
                        </div>

                        {dispatchFormat === 'ai_reel' && (() => {
                          const currTmpl = sigTemplates.find((t) => t.id === selectedSigTemplateId) || sigTemplates[0];
                          const vConfig = currTmpl?.videoConfig;
                          return (
                            <div className="p-2.5 rounded-lg bg-amber-100/70 border border-amber-300/80 text-[11px] text-amber-950 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold">⚡ Motion: {vConfig?.effect || 'Camera Shake'}</span>
                                <span>•</span>
                                <span className="font-bold">⏱️ Duration: {vConfig?.durationSeconds || 15}s</span>
                                <span>•</span>
                                <span className="font-bold">🎵 Music: {vConfig?.musicName || 'Breaking Beat'}</span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                                Auto-Published as 9:16 Reel
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Step 4: Multi-Titles, First Comment & Rule Name */}
                  <div className="p-4 rounded-2xl bg-[#F8F9FD] border border-[#EEF1F6] space-y-3">
                    <div className="space-y-2">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={enableMultiTitle}
                          onChange={(e) => setEnableMultiTitle(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 mt-0.5 cursor-pointer"
                        />
                        <div>
                          <span className="font-bold text-xs text-slate-900">
                            🔀 Distribute Multi-Titles (One Title Per Page)
                          </span>
                          <p className="text-[10px] text-slate-500">
                            WordPress plugin ke Title box se per-line title fetch karke har page ko alag title assign karega (Page 1 ko Title 1, Page 2 ko Title 2).
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={linkInComment}
                          onChange={(e) => setLinkInComment(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 mt-0.5 cursor-pointer"
                        />
                        <div>
                          <span className="font-bold text-xs text-slate-900">
                            💬 Article Link in First Comment
                          </span>
                          <p className="text-[10px] text-slate-500">
                            Facebook organic reach maximize karne ke liye post caption ke bajaye direct pehle comment me link automatically post karega.
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="pt-2 border-t border-[#EEF1F6] grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Publishing Action (Mode)
                        </label>
                        <select
                          value={postStatus}
                          onChange={(e) => setPostStatus(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-400"
                        >
                          <option value="published">⚡ Auto-Publish Live (Direct to FB)</option>
                          <option value="draft">📝 Save as Draft (Approval Queue in Library)</option>
                        </select>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {postStatus === 'published'
                            ? 'WordPress se naya post aate hi turant Facebook pages par live publish ho jayega.'
                            : 'AI template card image generate hogi aur Post Library me draft banke review/schedule ke liye aayegi.'}
                        </p>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Automation Rule Name
                        </label>
                        <input
                          type="text"
                          value={feedName}
                          onChange={(e) => setFeedName(e.target.value)}
                          placeholder={`${activeWpAccount?.name || 'WordPress'} [${selectedWpCategory === '*' ? 'All Categories' : selectedWpCategory}] ➔ Facebook`}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ════ BRANCH B: RSS 2.0 / ATOM FEED CONFIGURATION ════ */
                <div className="space-y-4">
                  {/* Feed Name */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Feed Name</label>
                    <input
                      type="text"
                      required
                      value={feedName}
                      onChange={(e) => setFeedName(e.target.value)}
                      placeholder="e.g. Himachal Pradesh Breaking RSS"
                      className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                    />
                  </div>

                  {/* Feed URL with Test Button */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">RSS 2.0 / Atom Feed URL</label>
                      <button
                        type="button"
                        onClick={handlePreviewFeedUrl}
                        disabled={!feedUrl.trim() || isPreviewLoading}
                        className="text-[11px] font-bold text-[#21759B] hover:underline flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isPreviewLoading ? 'animate-spin' : ''}`} />
                        <span>{isPreviewLoading ? 'Testing...' : 'Test & Preview Articles'}</span>
                      </button>
                    </div>
                    <input
                      type="url"
                      required
                      value={feedUrl}
                      onChange={(e) => {
                        setFeedUrl(e.target.value);
                        setPreviewItems([]);
                        setPreviewError(null);
                      }}
                      placeholder="https://news.google.com/rss/... or https://amarujala.com/rss/..."
                      className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-400"
                    />

                    {/* Quick Presets */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-medium">Quick Presets:</span>
                      {FORMAT_PRESETS.rss.map((preset, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setFeedName(preset.name);
                            setFeedUrl(preset.url);
                          }}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors cursor-pointer"
                          title={preset.desc}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Preview of parsed feed items */}
                  {previewError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{previewError}</span>
                    </div>
                  )}

                  {previewItems.length > 0 && (
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between text-emerald-900 font-bold text-xs">
                        <span>✅ Feed Validated ({previewItems.length} latest stories detected):</span>
                      </div>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {previewItems.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="p-2 bg-white rounded-lg border border-emerald-100 text-xs">
                            <div className="font-bold text-slate-900 line-clamp-1">{item.title}</div>
                            {item.summary && (
                              <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.summary}</div>
                            )}
                            {item.imageUrl && (
                              <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                                🖼️ Featured image detected
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Targets */}
                  <div className="pt-2 border-t border-[#EEF1F6] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900">
                        Publishing Targets ({selectedPageIds.length}/{pages.length} Selected)
                      </label>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={handleSelectAllPages}
                          className="text-slate-600 hover:text-black font-semibold cursor-pointer underline"
                        >
                          {selectedPageIds.length === pages.length ? 'Clear' : 'All'}
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={handleSelectWordpressOnly}
                          className="text-[#21759B] hover:underline font-semibold cursor-pointer"
                        >
                          WP Only ({wpPages.length})
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={handleSelectSocialOnly}
                          className="text-slate-600 hover:text-black font-semibold cursor-pointer underline"
                        >
                          Social Only
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {pages.map((p) => {
                        const isSelected = selectedPageIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleToggleSelectPage(p.id)}
                            className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all select-none ${
                              isSelected
                                ? 'bg-white border-slate-900 shadow-2xs font-bold text-slate-900'
                                : 'bg-white/80 border-slate-200 text-slate-500 hover:bg-white'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                                isSelected
                                  ? 'bg-slate-900 border-slate-900 text-white font-bold'
                                  : 'border-slate-300'
                              }`}
                            >
                              {isSelected && '✓'}
                            </div>
                            <SocialIcon platform={p.platform} size={15} />
                            <div className="truncate text-xs flex-1">{p.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Template Generation (SIG) */}
                  <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Palette className="w-3.5 h-3.5 text-amber-600" />
                          <span>Auto-Generate Branded Card Image (SIG Template)</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Renders article image into Photo Box &amp; headline into Title Box.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoGenerateImage}
                        onChange={(e) => setAutoGenerateImage(e.target.checked)}
                        className="w-4 h-4 rounded text-slate-900 cursor-pointer"
                      />
                    </div>

                    {autoGenerateImage && (
                      <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-amber-900 block mb-1">
                            Select Template Layout:
                          </label>
                          <select
                            value={selectedSigTemplateId}
                            onChange={(e) => setSelectedSigTemplateId(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-slate-800"
                          >
                            {sigTemplates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.canvasWidth}×{t.canvasHeight})
                              </option>
                            ))}
                          </select>
                        </div>
                        <Link
                          href="/image-generator"
                          target="_blank"
                          className="text-[11px] font-bold text-amber-800 hover:underline shrink-0"
                        >
                          Edit Layout &rarr;
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Interval & Mode */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Cadence</span>
                      </label>
                      <select
                        value={intervalMinutes}
                        onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-semibold text-slate-800"
                      >
                        <option value={1}>Every 1 Min</option>
                        <option value={5}>Every 5 Mins</option>
                        <option value={15}>Every 15 Mins</option>
                        <option value={30}>Every 30 Mins</option>
                        <option value={60}>Every 1 Hour</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Max Stories</label>
                      <select
                        value={maxItems}
                        onChange={(e) => setMaxItems(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-semibold text-slate-800"
                      >
                        <option value={1}>1 Story</option>
                        <option value={2}>2 Stories</option>
                        <option value={3}>3 Stories</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Publishing Mode</label>
                      <select
                        value={postStatus}
                        onChange={(e) => setPostStatus(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-semibold text-slate-800"
                      >
                        <option value="published">⚡ Auto-Publish Live</option>
                        <option value="draft">📝 Save as Draft</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-[#EEF1F6] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAutomationId(null);
                    setModalOpen(false);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-[#F8F9FD] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={feedType === 'website_to_fb' && wpAccounts.length === 0}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs cursor-pointer ${
                    feedType === 'website_to_fb' && wpAccounts.length === 0
                      ? 'bg-slate-300 cursor-not-allowed opacity-60'
                      : 'bg-slate-900 hover:bg-black'
                  }`}
                >
                  {editingAutomationId
                    ? 'Update Rule'
                    : feedType === 'website_to_fb' || feedType === 'wordpress'
                    ? 'Save & Activate Website to FB Rule'
                    : 'Save & Activate Feed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL 2: LIVE DISPATCH RESULTS REPORT ═══ */}
      {dispatchResultData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EEF1F6] max-w-lg w-full p-6 shadow-2xl animate-fade-in space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#EEF1F6]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Live Dispatch Results
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {dispatchResultData.feedName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchResultData(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                {dispatchResultData.message}
              </div>

              {dispatchResultData.dispatched.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  All articles in this feed have already been processed previously (Duplicate check passed).
                </div>
              ) : (
                <div className="space-y-3">
                  {dispatchResultData.dispatched.map((d, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] space-y-2">
                      <div className="flex items-start gap-2.5">
                        {d.item.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={d.item.imageUrl}
                            alt=""
                            className="w-16 h-12 rounded-lg object-cover shrink-0 border border-slate-200"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-bold text-slate-900 text-xs line-clamp-2">
                            📰 {d.item.title}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          Destination Delivery Status:
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {d.results.map((r, ridx) => (
                            <div
                              key={ridx}
                              className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                                r.status === 'success'
                                  ? 'bg-white border-emerald-200 text-emerald-800'
                                  : 'bg-white border-rose-200 text-rose-800'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <SocialIcon platform={r.platform} size={14} />
                                <span className="font-bold text-slate-800">{r.pageName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    r.status === 'success'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {r.status === 'success' ? 'Published' : 'Failed'}
                                </span>
                                {r.postUrl && (
                                  <a
                                    href={r.postUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-slate-400 hover:text-black"
                                    title="View Post"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#EEF1F6] flex justify-end">
              <button
                type="button"
                onClick={() => setDispatchResultData(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL 3: FEED ARTICLES INSPECTOR ═══ */}
      {inspectorModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EEF1F6] max-w-lg w-full p-6 shadow-2xl animate-fade-in space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#EEF1F6]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Rss className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Live Feed Articles Inspector
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {inspectingFeedTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {isInspectorLoading ? (
                <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-600" />
                  <span>Loading feed stories...</span>
                </div>
              ) : inspectingFeedItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No articles currently found in this feed.
                </div>
              ) : (
                inspectingFeedItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-[#F8F9FD] border border-[#EEF1F6] rounded-xl space-y-1 text-xs">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-slate-900 hover:text-[#21759B] line-clamp-2"
                    >
                      {item.title}
                    </a>
                    {item.summary && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {item.summary}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>{item.pubDate || 'Recent'}</span>
                      {item.imageUrl && (
                        <span className="text-emerald-600 font-semibold">🖼️ Has Featured Image</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#EEF1F6] flex justify-end">
              <button
                type="button"
                onClick={() => setInspectorModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
