'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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

  // Connection form fields
  // Telegram
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  // Facebook
  const [fbMode, setFbMode] = useState<'token' | 'oauth'>('token');
  const [fbAccessToken, setFbAccessToken] = useState('');
  const [fbPageId, setFbPageId] = useState('');
  // Generic / YouTube / Threads
  const [accountNameInput, setAccountNameInput] = useState('');

  // Status & loading
  const [isVerifying, setIsVerifying] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://soical.vercel.app';

  const redirectUriMap: Record<Platform, string> = {
    facebook: `${currentOrigin}/api/auth/callback/facebook`,
    instagram: `${currentOrigin}/api/auth/callback/facebook`,
    threads: `${currentOrigin}/api/auth/callback/threads`,
    youtube: `${currentOrigin}/api/auth/callback/youtube`,
    telegram: 'No redirect URI needed (Bot Token & Channel ID Direct)',
  };

  // Check for pending imported pages from Facebook OAuth callback
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(new RegExp('(^| )sap_pending_fb_import=([^;]+)'));
      if (match) {
        try {
          const parsed = JSON.parse(decodeURIComponent(match[2]));
          if (parsed.pages && parsed.pages.length > 0) {
            const firstPage = parsed.pages[0];
            const newAcc = addAccount('facebook', `${firstPage.name} (Meta Account)`, {
              accessToken: parsed.userToken,
              avatarUrl: firstPage.avatarUrl || '/icons/social/facebook.png',
              fanCount: firstPage.fanCount,
            });

            const pagesToAdd: SocialPage[] = parsed.pages.map((p: any, idx: number) => ({
              id: `pg_fb_${Date.now()}_${idx}`,
              accountId: newAcc.id,
              platform: 'facebook',
              pageId: p.id,
              name: p.name,
              avatarUrl: p.avatarUrl || '/icons/social/facebook.png',
              fanCount: p.fanCount || 0,
              isActive: true,
              accessToken: p.accessToken || parsed.userToken,
              targetUrl: `https://facebook.com/${p.id}`,
              category: 'Facebook Page',
              permissions: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
            }));

            addPages(pagesToAdd);
            setConnectSuccess(`Successfully imported ${parsed.pages.length} Facebook Page(s) live via OAuth!`);
            // Clear the cookie
            document.cookie = 'sap_pending_fb_import=; path=/; max-age=0; SameSite=Lax';
          }
        } catch (e) {
          console.error('Failed importing pending Facebook pages:', e);
        }
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

  // 3. Generic Connect
  const handleGenericConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNameInput.trim()) return;
    addAccount(connectPlatformChoice, accountNameInput.trim());
    setAccountNameInput('');
    setConnectModalOpen(false);
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
  ];

  const totalConnected = platformsConfig.filter((p) => {
    const hasAccount = accounts.some((a) => a.platform === p.id);
    const hasPages = pages.some((page) => page.platform === p.id);
    return hasAccount || hasPages;
  }).length;

  return (
    <div className="space-y-7 font-sans animate-fade-in pb-10">
      {/* 1. Page Header (Tasklify Clean Neutral Studio) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Connected Accounts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Manage your social networks, OAuth authentications, and multi-channel publishing destinations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Reset Workspace Data Button */}
          {accounts.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Are you sure you want to clear all connected accounts and posts?')) {
                  clearAllData();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-700 text-xs font-bold transition-all shadow-2xs"
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
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
                          <span>{page.fanCount.toLocaleString()} Audience</span>
                          <span>•</span>
                          <span className="font-mono text-[10px] text-slate-400">ID: {page.pageId}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
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

            {/* 3. INSTAGRAM, YOUTUBE, THREADS */}
            {connectPlatformChoice !== 'telegram' && connectPlatformChoice !== 'facebook' && (
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
