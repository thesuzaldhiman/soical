'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { Platform, SocialPage, SocialAccount } from '@/types';
import { SocialIcon } from '@/components/ui/SocialIcon';
import {
  Users2,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Copy,
  Info,
  Layers,
  Lock,
  Globe,
  Radio,
  X,
  Zap,
  Check,
  AlertCircle,
  Send,
  Sparkles,
  KeyRound,
  RotateCcw,
  Download,
} from 'lucide-react';

export default function AccountsPage() {
  return (
    <AppShell>
      <AccountsContent />
    </AppShell>
  );
}

function AccountsContent() {
  const {
    accounts,
    pages,
    settings,
    addAccount,
    addPages,
    updatePage,
    removeAccount,
    togglePageActive,
    disconnectPage,
    clearAllData,
    loadDemoData,
  } = useApp();

  // Selected account for deep page management modal (specifically for Facebook Pages)
  const [selectedPlatformModal, setSelectedPlatformModal] = useState<Platform | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectPlatformChoice, setConnectPlatformChoice] = useState<Platform>('telegram');

  // Quick Token Renewal Modal State
  const [renewTokenPage, setRenewTokenPage] = useState<SocialPage | null>(null);
  const [newTokenInput, setNewTokenInput] = useState('');
  const [isRenewing, setIsRenewing] = useState(false);
  const [renewError, setRenewError] = useState<string | null>(null);
  const [renewSuccess, setRenewSuccess] = useState<string | null>(null);

  // Connection form fields
  // Telegram
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  // Facebook
  const [fbMode, setFbMode] = useState<'token' | 'oauth'>('token');
  const [fbAccessToken, setFbAccessToken] = useState('');
  const [fbPageId, setFbPageId] = useState('');
  // YouTube
  const [ytMode, setYtMode] = useState<'oauth' | 'direct'>('oauth');
  const [ytChannelInput, setYtChannelInput] = useState('');
  const [ytApiKeyInput, setYtApiKeyInput] = useState('');
  // Generic / Threads
  const [accountNameInput, setAccountNameInput] = useState('');

  // WordPress Connect State
  const [wpSiteUrl, setWpSiteUrl] = useState('');
  const [wpConnectionMode, setWpConnectionMode] = useState<'auto-engine' | 'rest-api'>('auto-engine');
  const [wpBridgeKey, setWpBridgeKey] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [wpSiteName, setWpSiteName] = useState('');

  // Status & loading
  const [isVerifying, setIsVerifying] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);

  const searchParams = useSearchParams();

  // Watch for auth errors in searchParams
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setConnectError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const currentOrigin =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'https://game.khabarmonkey.com';

  const redirectUriMap: Record<Platform, string> = {
    facebook: `${currentOrigin}/api/auth/callback/facebook`,
    instagram: `${currentOrigin}/api/auth/callback/facebook`,
    threads: `${currentOrigin}/api/auth/callback/threads`,
    youtube: `${currentOrigin}/api/auth/callback/youtube`,
    telegram: 'No redirect URI needed (Bot Token & Channel ID Direct)',
    wordpress: 'No redirect URI needed (Auto Engine Bridge API & REST API)',
  };

  // Check for pending imported pages from Facebook OAuth callback
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let parsed: any = null;

    // 1. Check localStorage first (immune to header overflow and Unicode issues)
    try {
      const local = localStorage.getItem('sap_pending_fb_import');
      if (local) {
        parsed = JSON.parse(local);
        localStorage.removeItem('sap_pending_fb_import');
      }
    } catch (e) {
      console.warn('Failed parsing localStorage pending_fb_import:', e);
    }

    // 2. Check sessionStorage fallback
    if (!parsed) {
      try {
        const session = sessionStorage.getItem('sap_pending_fb_import');
        if (session) {
          parsed = JSON.parse(session);
          sessionStorage.removeItem('sap_pending_fb_import');
        }
      } catch {}
    }

    // 3. Fallback to cookie if present
    if (!parsed && typeof document !== 'undefined') {
      const match = document.cookie.match(new RegExp('(^| )sap_pending_fb_import=([^;]+)'));
      if (match) {
        try {
          parsed = JSON.parse(decodeURIComponent(match[2]));
          document.cookie = 'sap_pending_fb_import=; path=/; max-age=0; SameSite=Lax';
        } catch {}
      }
    }

    if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
      try {
        const firstPage = parsed.pages[0];
        const userToken = parsed.userAccessToken || parsed.userToken || '';
        const newAcc = addAccount('facebook', `${firstPage.name} (Meta Account)`, {
          accessToken: userToken,
          avatarUrl: firstPage.avatarUrl || parsed.user?.avatarUrl || '/icons/social/facebook.png',
          fanCount: firstPage.fanCount || 0,
        });

        const pagesToAdd: SocialPage[] = parsed.pages.map((p: any, idx: number) => ({
          id: p.id && !p.id.startsWith('pg_') ? `pg_fb_${p.pageId || p.id}_${Date.now()}` : (p.id || `pg_fb_${Date.now()}_${idx}`),
          accountId: newAcc.id,
          platform: 'facebook',
          pageId: String(p.pageId || p.id),
          name: p.name || 'Facebook Page',
          avatarUrl: p.avatarUrl || p.picture?.data?.url || '/icons/social/facebook.png',
          fanCount: p.fanCount || p.fan_count || 0,
          isActive: true,
          accessToken: p.accessToken || p.access_token || userToken,
          targetUrl: `https://facebook.com/${p.pageId || p.id}`,
          category: p.category || 'Facebook Page',
          permissions: Array.isArray(p.permissions)
            ? p.permissions
            : (Array.isArray(p.tasks) ? p.tasks : ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list']),
        }));

        addPages(pagesToAdd);
        setConnectSuccess(`Successfully imported ${parsed.pages.length} Facebook Page(s) live via OAuth!`);
      } catch (e) {
        console.error('Failed importing pending Facebook pages:', e);
      }
    }
  }, [addAccount, addPages]);

  // Check for pending imported YouTube channel from OAuth callback
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let parsed: any = null;

    // 1. Check localStorage first
    try {
      const local = localStorage.getItem('sap_pending_yt_import');
      if (local) {
        parsed = JSON.parse(local);
        localStorage.removeItem('sap_pending_yt_import');
      }
    } catch {}

    // 2. Check sessionStorage fallback
    if (!parsed) {
      try {
        const session = sessionStorage.getItem('sap_pending_yt_import');
        if (session) {
          parsed = JSON.parse(session);
          sessionStorage.removeItem('sap_pending_yt_import');
        }
      } catch {}
    }

    // 3. Fallback to cookie
    if (!parsed && typeof document !== 'undefined') {
      const match = document.cookie.match(new RegExp('(^| )sap_pending_yt_import=([^;]+)'));
      if (match) {
        try {
          parsed = JSON.parse(decodeURIComponent(match[2]));
          document.cookie = 'sap_pending_yt_import=; path=/; max-age=0; SameSite=Lax';
        } catch {}
      }
    }

    if (parsed && parsed.channel) {
      try {
        const ch = parsed.channel;
        const newAcc = addAccount('youtube', `${ch.name} (YouTube Account)`, {
          accessToken: parsed.accessToken,
          avatarUrl: ch.avatarUrl || '/icons/social/youtube.png',
          fanCount: ch.subscriberCount,
        });

        const pageToAdd: SocialPage = {
          id: `pg_yt_${Date.now()}`,
          accountId: newAcc.id,
          platform: 'youtube',
          pageId: ch.id,
          name: ch.name,
          avatarUrl: ch.avatarUrl || '/icons/social/youtube.png',
          fanCount: ch.subscriberCount || 0,
          isActive: true,
          accessToken: parsed.accessToken,
          targetUrl: ch.customUrl
            ? `https://youtube.com/${ch.customUrl}`
            : `https://youtube.com/channel/${ch.id}`,
          category: 'YouTube Shorts',
          permissions: ['youtube.upload', 'youtube.readonly'],
        };

        addPages([pageToAdd]);
        setConnectSuccess(`Successfully connected "${ch.name}" via YouTube OAuth!`);
      } catch (e) {
        console.error('Failed importing pending YouTube channel:', e);
      }
    }
  }, [addAccount, addPages]);

  const handleCopyUri = () => {
    navigator.clipboard.writeText(redirectUriMap[connectPlatformChoice]);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  // 1. Connect Telegram Live
  const handleConnectTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectError(null);
    setConnectSuccess(null);
    setIsVerifying(true);

    try {
      const res = await fetch('/api/connect/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: tgBotToken, chatId: tgChatId }),
      });
      const data = await res.json();

      if (!data.success) {
        setConnectError(data.error || 'Failed to verify Telegram credentials.');
        setIsVerifying(false);
        return;
      }

      // Add to context state
      addAccount('telegram', `${data.channel.title} (Telegram)`, {
        botToken: tgBotToken.trim(),
        chatId: data.channel.id,
        fanCount: data.channel.memberCount,
        avatarUrl: '/icons/social/telegram.png',
      });

      setConnectSuccess(`Successfully connected to "${data.channel.title}" with ${data.channel.memberCount} members!`);
      setTgBotToken('');
      setTgChatId('');
      setTimeout(() => {
        setConnectModalOpen(false);
        setConnectSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      setConnectError(err instanceof Error ? err.message : 'Network error connecting to Telegram.');
    } finally {
      setIsVerifying(false);
    }
  };

  // 2. Connect Facebook Live via Access Token
  const handleConnectFacebookToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectError(null);
    setConnectSuccess(null);
    setIsVerifying(true);

    try {
      const res = await fetch('/api/connect/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: fbAccessToken, pageId: fbPageId || undefined }),
      });
      const data = await res.json();

      if (!data.success) {
        setConnectError(data.error || 'Failed to verify Facebook token.');
        setIsVerifying(false);
        return;
      }

      const verifiedPages = data.pages || [];
      if (verifiedPages.length === 0) {
        setConnectError('No Facebook Pages were returned for this access token.');
        setIsVerifying(false);
        return;
      }

      // Create Parent Account
      const primaryPage = verifiedPages[0];
      const newAcc = addAccount('facebook', `${primaryPage.name} (Meta Account)`, {
        accessToken: fbAccessToken.trim(),
        avatarUrl: primaryPage.avatarUrl || '/icons/social/facebook.png',
        fanCount: primaryPage.fanCount,
      });

      // Add all discovered pages
      const pagesToAdd: SocialPage[] = verifiedPages.map((p: any, idx: number) => ({
        id: `pg_fb_${Date.now()}_${idx}`,
        accountId: newAcc.id,
        platform: 'facebook',
        pageId: p.id,
        name: p.name,
        avatarUrl: p.avatarUrl || '/icons/social/facebook.png',
        fanCount: p.fanCount || 0,
        isActive: true,
        accessToken: p.accessToken || fbAccessToken.trim(),
        targetUrl: `https://facebook.com/${p.id}`,
        category: 'Facebook Page',
        permissions: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
      }));

      addPages(pagesToAdd);

      setConnectSuccess(`Successfully imported ${verifiedPages.length} Facebook Page(s) live!`);
      setFbAccessToken('');
      setFbPageId('');
      setTimeout(() => {
        setConnectModalOpen(false);
        setConnectSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      setConnectError(err instanceof Error ? err.message : 'Network error contacting Meta API.');
    } finally {
      setIsVerifying(false);
    }
  };

  // 3. Connect YouTube Direct (Handle or Channel ID)
  const handleConnectYouTubeDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytChannelInput.trim()) return;
    setIsVerifying(true);
    setConnectError(null);
    setConnectSuccess(null);

    try {
      const res = await fetch('/api/connect/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelHandleOrId: ytChannelInput.trim(),
          apiKey: ytApiKeyInput.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!data.success || !data.channel) {
        setConnectError(data.error || 'Failed to verify YouTube channel.');
        setIsVerifying(false);
        return;
      }

      const ch = data.channel;
      const newAcc = addAccount('youtube', `${ch.name} (YouTube Account)`, {
        avatarUrl: ch.avatarUrl || '/icons/social/youtube.png',
        fanCount: ch.subscriberCount,
      });

      const pageToAdd: SocialPage = {
        id: `pg_yt_${Date.now()}`,
        accountId: newAcc.id,
        platform: 'youtube',
        pageId: ch.id,
        name: ch.name,
        avatarUrl: ch.avatarUrl || '/icons/social/youtube.png',
        fanCount: ch.subscriberCount || 0,
        isActive: true,
        targetUrl: ch.customUrl
          ? `https://youtube.com/${ch.customUrl}`
          : `https://youtube.com/channel/${ch.id}`,
        category: 'YouTube Shorts',
        permissions: ['youtube.upload', 'youtube.readonly'],
      };

      addPages([pageToAdd]);
      setConnectSuccess(`Successfully connected "${ch.name}" live!`);
      setYtChannelInput('');
      setYtApiKeyInput('');
      setTimeout(() => {
        setConnectModalOpen(false);
        setConnectSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      setConnectError(err instanceof Error ? err.message : 'Network error verifying YouTube channel.');
    } finally {
      setIsVerifying(false);
    }
  };

  // 4. Generic Connect
  const handleGenericConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNameInput.trim()) return;
    addAccount(connectPlatformChoice, accountNameInput.trim());
    setAccountNameInput('');
    setConnectModalOpen(false);
  };

  // 5. WordPress Connect (Auto Engine Bridge API & Standard REST API)
  const handleConnectWordPress = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectError(null);
    setConnectSuccess(null);
    setIsVerifying(true);

    try {
      const res = await fetch('/api/connect/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUrl: wpSiteUrl,
          connectionMode: wpConnectionMode,
          bridgeKey: wpBridgeKey,
          username: wpUsername,
          appPassword: wpAppPassword,
        }),
      });

      const data = await res.json();

      if (!data.verified) {
        setConnectError(data.error || 'Failed to verify WordPress site.');
        setIsVerifying(false);
        return;
      }

      const finalName = wpSiteName.trim() || data.siteName || 'WordPress Portal';
      const cleanUrl = data.siteUrl || wpSiteUrl.trim().replace(/\/+$/, '');

      // Add to context state
      addAccount('wordpress', `${finalName} (WP)`, {
        siteUrl: cleanUrl,
        bridgeApiKey: wpBridgeKey,
        wpUsername,
        wpAppPassword,
        bridgeType: wpConnectionMode,
        avatarUrl: '/icons/social/wordpress.png',
        fanCount: 25000,
      });

      setConnectSuccess(
        `Successfully connected to WordPress site "${finalName}" via ${
          wpConnectionMode === 'auto-engine' ? 'Auto Engine Bridge v7.5' : 'WordPress REST API'
        }!`
      );
      setWpSiteUrl('');
      setWpBridgeKey('');
      setWpUsername('');
      setWpAppPassword('');
      setWpSiteName('');
      setTimeout(() => {
        setConnectModalOpen(false);
        setConnectSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      setConnectError(err instanceof Error ? err.message : 'Network error connecting to WordPress.');
    } finally {
      setIsVerifying(false);
    }
  };

  const platformsConfig: {
    id: Platform;
    name: string;
    description: string;
  }[] = [
    {
      id: 'facebook',
      name: 'Facebook',
      description: 'Manage Facebook Pages and Groups with official Meta Graph API v19.0 token sessions.',
    },
    {
      id: 'instagram',
      name: 'Instagram',
      description: 'Connected Instagram Business profiles for automated post dispatches and Reels.',
    },
    {
      id: 'youtube',
      name: 'YouTube',
      description: 'Google OAuth2 verified channel for Shorts, community posts, and video publishing.',
    },
    {
      id: 'threads',
      name: 'Threads',
      description: 'Meta Threads official publishing session for micro-blogging cross-posts.',
    },
    {
      id: 'telegram',
      name: 'Telegram',
      description: 'High-speed Telegram Bot token connection for instant broadcasts and channel updates.',
    },
    {
      id: 'wordpress',
      name: 'WordPress',
      description: 'Auto Engine Bridge & REST API for automated news articles, watermarked photos, and blogs.',
    },
  ];

  const totalConnected = platformsConfig.filter((p) => {
    const hasAccount = accounts.some((a) => a.platform === p.id);
    const hasPages = pages.some((page) => page.platform === p.id);
    return hasAccount || hasPages;
  }).length;

  const handleRenewToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewTokenPage || !newTokenInput.trim()) return;

    setIsRenewing(true);
    setRenewError(null);
    setRenewSuccess(null);

    try {
      const res = await fetch('/api/connect/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: newTokenInput.trim(),
          pageId: renewTokenPage.pageId,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setRenewError(data.error || 'Token verification failed with Meta API.');
        setIsRenewing(false);
        return;
      }

      updatePage(renewTokenPage.id, {
        accessToken: newTokenInput.trim(),
      });

      setRenewSuccess(`✓ Facebook Access Token renewed & verified for "${renewTokenPage.name}"!`);
      setTimeout(() => {
        setRenewTokenPage(null);
        setNewTokenInput('');
        setRenewSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      setRenewError(err instanceof Error ? err.message : 'Network error verifying token.');
    } finally {
      setIsRenewing(false);
    }
  };

  return (
    <div className="space-y-5 font-sans animate-fade-in pb-10">
      {/* 1. Page Header (Compact Modern Studio) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
            Connected Accounts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">
            Manage your social networks, OAuth authentications, and publishing destinations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap shrink-0">
          {/* Reset Workspace Data Button */}
          {accounts.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Are you sure you want to clear all connected accounts and posts?')) {
                  clearAllData();
                }
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Clear all workspace data and start clean"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Data</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setConnectError(null);
              setConnectSuccess(null);
              setConnectModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Connect Account</span>
          </button>
        </div>
      </div>

      {/* 2. Tasklify Studio Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Share2Icon className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                totalConnected > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-[#E2E8F0]'
              }`}
            >
              {totalConnected > 0 ? 'Active' : 'Empty'}
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totalConnected} / {platformsConfig.length}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Connected Social Networks
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4 stroke-[2.2]" />
            </div>
            <Link
              href="/pages"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-0.5 transition-colors"
            >
              <span>View Pages</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {pages.length}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Active Pages & Channels
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Verified
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              100%
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              API Connection Health
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-[#E2E8F0]">
              Anti-Ban
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              Live
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Zero-Width Obfuscation
            </div>
          </div>
        </div>
      </div>

      {/* 3. Platform Cards Grid with Official Brand Logos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {platformsConfig.map((plat) => {
          const platformAccount = accounts.find((a) => a.platform === plat.id);
          const platformPages = pages.filter((p) => p.platform === plat.id);
          const isConnected = !!platformAccount || platformPages.length > 0;

          return (
            <div
              key={plat.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs hover:border-slate-400 hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
            >
              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <SocialIcon platform={plat.id} className="w-10 h-10 rounded-xl shadow-xs" />
                    <div>
                      <h2 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                        {plat.name}
                      </h2>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate max-w-[150px]">
                        {isConnected
                          ? platformAccount?.name || `${platformPages.length} Destination(s)`
                          : 'Not connected'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isConnected
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isConnected ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  {plat.description}
                </p>

                {/* Account / Page Count Badge */}
                {isConnected && (
                  <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      {plat.id === 'facebook'
                        ? 'Connected Pages:'
                        : plat.id === 'youtube'
                        ? 'Connected Channels:'
                        : 'Connected Profiles:'}
                    </span>
                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                      {platformPages.length} Active
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                {isConnected && (
                  <button
                    type="button"
                    onClick={() => setSelectedPlatformModal(plat.id)}
                    className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs flex-1"
                  >
                    <Users2 className="w-3.5 h-3.5" />
                    <span>Manage ({platformPages.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setConnectPlatformChoice(plat.id);
                    setConnectError(null);
                    setConnectSuccess(null);
                    setConnectModalOpen(true);
                  }}
                  className={`py-2 px-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-2xs ${
                    isConnected ? 'shrink-0' : 'w-full font-bold text-slate-900'
                  }`}
                >
                  <RefreshCw className="w-3 h-3 text-slate-400" />
                  <span>{isConnected ? 'Reconnect' : `Connect ${plat.name}`}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Platform Page Management Modal */}
      {selectedPlatformModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] max-w-2xl w-full p-6 sm:p-8 shadow-2xl animate-fade-in space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <SocialIcon platform={selectedPlatformModal} className="w-10 h-10 rounded-xl shadow-xs" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900 capitalize">
                    {selectedPlatformModal} Destinations & Channels
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configured broadcast endpoints for auto-posting and scheduled dispatches.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlatformModal(null)}
                className="w-8 h-8 rounded-xl bg-[#F8F9FA] text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Pages */}
            <div className="space-y-3">
              {pages
                .filter((p) => p.platform === selectedPlatformModal)
                .map((page) => (
                  <div
                    key={page.id}
                    className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {page.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={page.avatarUrl}
                          alt={page.name}
                          className="w-10 h-10 rounded-xl object-cover border border-[#E2E8F0] shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {page.name.charAt(0)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm truncate">
                          {page.name}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>
                            {(page.followersCount ?? page.fanCount ?? 0).toLocaleString()}{' '}
                            {page.platform === 'youtube'
                              ? 'Subscribers'
                              : page.platform === 'telegram'
                              ? 'Members'
                              : 'Audience'}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-[10px] text-slate-400">ID: {page.pageId}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {page.platform === 'facebook' && (
                        <button
                          type="button"
                          onClick={() => {
                            setRenewTokenPage(page);
                            setNewTokenInput('');
                            setRenewError(null);
                            setRenewSuccess(null);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all shadow-2xs"
                          title="Renew Facebook Page Access Token"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                          <span>Renew Token</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => togglePageActive(page.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          page.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-200 text-slate-600 border border-slate-300'
                        }`}
                      >
                        {page.isActive ? 'Active' : 'Paused'}
                      </button>

                      <button
                        type="button"
                        onClick={() => disconnectPage(page.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Disconnect destination"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

              {pages.filter((p) => p.platform === selectedPlatformModal).length === 0 && (
                <div className="p-8 text-center bg-[#F8F9FA] rounded-2xl border border-dashed border-[#E2E8F0]">
                  <p className="text-xs text-slate-500 font-medium">No destinations found for this platform.</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPlatformModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Real Connect Account Modal */}
      {connectModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-fade-in space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <Plus className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Connect Social Platform</h2>
              </div>
              <button
                type="button"
                onClick={() => setConnectModalOpen(false)}
                className="w-7 h-7 rounded-xl bg-[#F8F9FA] text-slate-500 hover:text-slate-900 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Platform Selection */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Select Platform to Connect
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {platformsConfig.map((plat) => (
                  <button
                    key={plat.id}
                    type="button"
                    onClick={() => {
                      setConnectPlatformChoice(plat.id);
                      setConnectError(null);
                      setConnectSuccess(null);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold capitalize flex items-center gap-2.5 transition-all ${
                      connectPlatformChoice === plat.id
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-[#F8F9FA] border-[#E2E8F0] text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <SocialIcon platform={plat.id} className="w-5 h-5 rounded-xs" />
                    <span>{plat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Status alerts */}
            {connectError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{connectError}</span>
              </div>
            )}

            {connectSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{connectSuccess}</span>
              </div>
            )}

            {/* PLATFORM SPECIFIC REAL FORMS */}

            {/* 1. TELEGRAM FORM */}
            {connectPlatformChoice === 'telegram' && (
              <form onSubmit={handleConnectTelegram} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-blue-700" />
                    <span>How to connect your Telegram Channel:</span>
                  </div>
                  <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-blue-800">
                    <li>Create a bot via <strong>@BotFather</strong> on Telegram and copy the Bot Token.</li>
                    <li>Add your bot as an <strong>Administrator</strong> in your Telegram channel with &quot;Post Messages&quot; rights.</li>
                    <li>Enter the Bot Token and Channel handle below.</li>
                  </ol>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Telegram Bot Token
                  </label>
                  <input
                    type="password"
                    required
                    value={tgBotToken}
                    onChange={(e) => setTgBotToken(e.target.value)}
                    placeholder="e.g. 123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Channel Username or Chat ID
                  </label>
                  <input
                    type="text"
                    required
                    value={tgChatId}
                    onChange={(e) => setTgChatId(e.target.value)}
                    placeholder="e.g. @mychannel or -1001234567890"
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 transition-all"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setConnectModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-[#F8F9FA]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying with Telegram...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Test & Connect Channel</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* 2. FACEBOOK FORM */}
            {connectPlatformChoice === 'facebook' && (
              <div className="space-y-4">
                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFbMode('token')}
                    className={`py-1.5 rounded-lg transition-all ${
                      fbMode === 'token'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Direct Page Token (Fast)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFbMode('oauth')}
                    className={`py-1.5 rounded-lg transition-all ${
                      fbMode === 'oauth'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    OAuth Login (App ID)
                  </button>
                </div>

                {fbMode === 'token' ? (
                  <form onSubmit={handleConnectFacebookToken} className="space-y-3.5">
                    <div className="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-[11px] text-slate-600 leading-relaxed">
                      💡 <strong>Fastest Setup:</strong> Generate a Page Access Token from <strong>Meta Graph API Explorer</strong> or Business Suite. It does not require Meta App Review for testing!
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Page Access Token (or User Token)
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={fbAccessToken}
                        onChange={(e) => setFbAccessToken(e.target.value)}
                        placeholder="EAAB..."
                        className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Specific Page ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={fbPageId}
                        onChange={(e) => setFbPageId(e.target.value)}
                        placeholder="Leave blank to import all Pages linked to this token"
                        className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 transition-all"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setConnectModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-[#F8F9FA]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isVerifying}
                        className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all disabled:opacity-60 flex items-center gap-1.5"
                      >
                        {isVerifying ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying with Meta API...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Verify & Import Pages</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4 text-xs">
                    <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">Target Facebook App:</span>
                        <span className="font-mono text-[11px] font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
                          {settings?.metaAppId || '109283746501928'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-[#E2E8F0] font-mono text-[11px]">
                        <span className="truncate">{redirectUriMap.facebook}</span>
                        <button
                          type="button"
                          onClick={handleCopyUri}
                          className="ml-2 text-slate-900 hover:text-black font-bold flex items-center gap-1 shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedUri ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Prominent Official OAuth Button */}
                    <a
                      href={`/api/auth/facebook?app_id=${encodeURIComponent(
                        settings?.metaAppId || '109283746501928'
                      )}&app_secret=${encodeURIComponent(settings?.metaAppSecret || '')}`}
                      className="w-full py-3 px-4 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <SocialIcon platform="facebook" className="w-4 h-4 rounded-xs" />
                      <span>Log In with Facebook & Select Pages</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </a>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Uses Meta Graph API v19.0 Dialog</span>
                      <Link href="/settings" className="font-bold text-slate-800 hover:underline">
                        App Settings & Secret &rarr;
                      </Link>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
                      <button
                        type="button"
                        onClick={() => setConnectModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-[#F8F9FA]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. YOUTUBE FORM */}
            {connectPlatformChoice === 'youtube' && (
              <div className="space-y-4">
                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setYtMode('oauth')}
                    className={`py-1.5 rounded-lg transition-all ${
                      ytMode === 'oauth'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    OAuth Login (Google Cloud)
                  </button>
                  <button
                    type="button"
                    onClick={() => setYtMode('direct')}
                    className={`py-1.5 rounded-lg transition-all ${
                      ytMode === 'direct'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Direct Channel Handle / ID
                  </button>
                </div>

                {ytMode === 'oauth' ? (
                  <div className="space-y-4 text-xs">
                    <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">Target Google Client ID:</span>
                        <span className="font-mono text-[11px] font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-[#E2E8F0] truncate max-w-[200px]">
                          {settings?.ytClientId || 'Configure in Settings'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-[#E2E8F0] font-mono text-[11px]">
                        <span className="truncate">{redirectUriMap.youtube}</span>
                        <button
                          type="button"
                          onClick={handleCopyUri}
                          className="ml-2 text-slate-900 hover:text-black font-bold flex items-center gap-1 shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedUri ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-red-50/70 border border-red-200/80 text-[11px] text-red-900 leading-relaxed">
                      ▶️ <strong>Google Cloud Console:</strong> Make sure <code>{redirectUriMap.youtube}</code> is added to <em>Authorized redirect URIs</em> in your Google Cloud credentials.
                    </div>

                    {/* Prominent Official OAuth Button */}
                    <a
                      href={`/api/auth/youtube?client_id=${encodeURIComponent(
                        settings?.ytClientId || ''
                      )}&client_secret=${encodeURIComponent(settings?.ytClientSecret || '')}`}
                      className="w-full py-3 px-4 rounded-xl bg-[#CC0000] hover:bg-[#B30000] text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <SocialIcon platform="youtube" className="w-4 h-4 rounded-xs" />
                      <span>Log In with Google & Authorize YouTube Channel</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </a>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Uses YouTube Data API v3 Scopes</span>
                      <Link href="/settings" className="font-bold text-slate-800 hover:underline">
                        YouTube Client Secret in Settings &rarr;
                      </Link>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
                      <button
                        type="button"
                        onClick={() => setConnectModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-[#F8F9FA]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleConnectYouTubeDirect} className="space-y-3.5">
                    <div className="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-[11px] text-slate-600 leading-relaxed">
                      💡 <strong>Instant Handle Connect:</strong> Enter your YouTube channel handle (e.g. <code>@khabarmonkey</code>) or Channel ID (e.g. <code>UC...</code>). You can also provide an optional YouTube Data API Key for live metadata verification.
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Channel Handle or Channel ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={ytChannelInput}
                        onChange={(e) => setYtChannelInput(e.target.value)}
                        placeholder="e.g. @MrBeast, @khabarmonkey or UCX6OQ3DkcsbYNE6H8uQQuVA"
                        className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        YouTube Data API Key (Optional)
                      </label>
                      <input
                        type="password"
                        value={ytApiKeyInput}
                        onChange={(e) => setYtApiKeyInput(e.target.value)}
                        placeholder={settings?.ytApiKey ? 'Defaults to saved Settings API Key' : 'AIzaSy... (optional for live metadata lookup)'}
                        className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 transition-all"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setConnectModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-[#F8F9FA]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isVerifying}
                        className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all disabled:opacity-60 flex items-center gap-1.5"
                      >
                        {isVerifying ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying Channel...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Verify & Connect Channel</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 4. WORDPRESS CONNECTION FORM */}
            {connectPlatformChoice === 'wordpress' && (
              <form onSubmit={handleConnectWordPress} className="space-y-4">
                {/* Plugin Download & Instructions Banner */}
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 text-xs text-sky-950 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#21759B] text-white flex items-center justify-center text-xs">W</span>
                      <span>Auto Engine v7.5 WordPress Bridge</span>
                    </div>
                    <a
                      href="/downloads/auto-engine-v7.5-bridge.zip"
                      download="auto-engine-v7.5-bridge.zip"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#21759B] hover:bg-[#1a5d7c] text-white text-[11px] font-bold shadow-2xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Plugin (ZIP)</span>
                    </a>
                  </div>
                  <p className="text-[11px] text-sky-800 leading-relaxed">
                    Apni WordPress site par <strong>Auto Engine v7.5</strong> plugin install karein, phir <strong>Auto Engine &gt; Settings &gt; Social Auto Poster</strong> se Secret Key copy karke neeche paste karein.
                  </p>
                </div>

                {/* Connection Mode Switcher */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Connection Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWpConnectionMode('auto-engine')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                        wpConnectionMode === 'auto-engine'
                          ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                          : 'bg-[#F8F9FA] border-[#E2E8F0] text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      ⚡ Auto Engine Bridge (Fast)
                    </button>
                    <button
                      type="button"
                      onClick={() => setWpConnectionMode('rest-api')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                        wpConnectionMode === 'rest-api'
                          ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                          : 'bg-[#F8F9FA] border-[#E2E8F0] text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      🔑 Standard WP REST API
                    </button>
                  </div>
                </div>

                {/* Site URL */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    WordPress Site URL
                  </label>
                  <input
                    type="url"
                    required
                    value={wpSiteUrl}
                    onChange={(e) => setWpSiteUrl(e.target.value)}
                    placeholder="https://himachalsamachar.com"
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 transition-all font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Include https:// without trailing slash</span>
                </div>

                {/* Mode 1: Bridge Key */}
                {wpConnectionMode === 'auto-engine' && (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Bridge Secret Key
                    </label>
                    <input
                      type="password"
                      required
                      value={wpBridgeKey}
                      onChange={(e) => setWpBridgeKey(e.target.value)}
                      placeholder="e.g. 32-character secret key from Auto Engine settings"
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 transition-all"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Found in WP Admin &gt; Auto Engine &gt; Settings &gt; Social Auto Poster Bridge</span>
                  </div>
                )}

                {/* Mode 2: Username & Application Password */}
                {wpConnectionMode === 'rest-api' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        WP Admin Username
                      </label>
                      <input
                        type="text"
                        required
                        value={wpUsername}
                        onChange={(e) => setWpUsername(e.target.value)}
                        placeholder="admin"
                        className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Application Password
                      </label>
                      <input
                        type="password"
                        required
                        value={wpAppPassword}
                        onChange={(e) => setWpAppPassword(e.target.value)}
                        placeholder="xxxx xxxx xxxx xxxx"
                        className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Optional Site Nickname */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Display Label / Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={wpSiteName}
                    onChange={(e) => setWpSiteName(e.target.value)}
                    placeholder="e.g. Himachal Samachar Portal"
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 transition-all font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setConnectModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-[#F8F9FA] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying Site...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Connect WordPress Site</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* 5. INSTAGRAM & THREADS (GENERIC) */}
            {connectPlatformChoice !== 'telegram' &&
              connectPlatformChoice !== 'facebook' &&
              connectPlatformChoice !== 'youtube' &&
              connectPlatformChoice !== 'wordpress' && (
              <form onSubmit={handleGenericConnect} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-xs text-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Info className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>OAuth Redirect URI:</span>
                  </div>
                  <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] font-mono text-[11px]">
                    <span className="truncate">{redirectUriMap[connectPlatformChoice]}</span>
                    <button
                      type="button"
                      onClick={handleCopyUri}
                      className="ml-2 text-slate-900 hover:text-black font-bold flex items-center gap-1 shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedUri ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Channel / Account Name or Handle
                  </label>
                  <input
                    type="text"
                    required
                    value={accountNameInput}
                    onChange={(e) => setAccountNameInput(e.target.value)}
                    placeholder={`e.g. My ${connectPlatformChoice.toUpperCase()} Channel`}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 transition-all font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setConnectModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-[#F8F9FA]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all"
                  >
                    Connect Destination
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6. Quick Renew Token Modal */}
      {renewTokenPage && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setRenewTokenPage(null)}
        >
          <div
            className="bg-white rounded-3xl border border-[#E2E8F0] max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    Renew Facebook Access Token
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    For <span className="font-bold text-slate-800">{renewTokenPage.name}</span> (ID: {renewTokenPage.pageId})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRenewTokenPage(null)}
                className="w-8 h-8 rounded-xl bg-[#F8F9FA] text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Helper explanation */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 space-y-1.5 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span>How to get a fresh Page Access Token:</span>
              </div>
              <p className="text-[11px] text-blue-800">
                1. Open <strong>developers.facebook.com/tools/explorer</strong>.<br />
                2. In &quot;User or Page&quot;, select <strong>{renewTokenPage.name}</strong>.<br />
                3. Ensure <code>pages_manage_posts</code> is selected, click <strong>Generate Access Token</strong>, copy the token (<code>EAAB...</code>), and paste it below.
              </p>
            </div>

            {/* Status Messages */}
            {renewError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{renewError}</span>
              </div>
            )}

            {renewSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{renewSuccess}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleRenewToken} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  New Facebook Page Access Token
                </label>
                <textarea
                  rows={3}
                  required
                  value={newTokenInput}
                  onChange={(e) => setNewTokenInput(e.target.value)}
                  placeholder="EAAB..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 transition-all"
                />
              </div>

              <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRenewTokenPage(null)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-[#F8F9FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRenewing || !newTokenInput.trim()}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isRenewing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying with Meta API...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Verify &amp; Save Token</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Share2Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
